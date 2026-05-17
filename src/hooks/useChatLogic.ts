import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '../types';
import { api } from '../services/api';
import { useChatStore } from '../store/chatStore';
import { useSettingStore } from '../store/settingStore';
import { useStoryStore } from '../store/storyStore';
import { useUIStore } from '../store/uiStore';
import { useChatState } from './useChatState';
import { useChatStreaming } from './useChatStreaming';
import { useChatScroll } from './useChatScroll';
import { useStoryMode } from './useStoryMode';
import { useMemorySync } from './useMemorySync';

export const useChatLogic = () => {
  const { conversations, setConversations, currentConvId, setCurrentConvId, loadConversations } = useChatStore();
  const { provider, apiKey, model, temperature, isThinkingMode, reasoningEffort, baseUrl } = useSettingStore(s => s.llmConfig);
  const { theme, globalTheme, bgImage } = useSettingStore(s => s.uiConfig);
  const { useTieredMemory, memoryMode, memorySummarizeFrequency, recentHistoryRounds, powermemConfig } = useSettingStore(s => s.memoryConfig);
  const { isPaintingEnabled, paintingProvider, paintingModel, paintingApiKey } = useSettingStore(s => s.paintingConfig);
  const { promptTemplates, storyTemplates, quickGenerate } = useSettingStore(s => s.systemConfig);
  const { loadSettings, setSettings } = useSettingStore();
  
  const { isStoryMode, setIsStoryMode } = useStoryStore();
  const { setSettingsOpen } = useUIStore();

  const {
    messages, setMessages,
    discussionMessages, setDiscussionMessages,
    loadMessages, loadDiscussionMessages,
    clearMessages, executeImageGeneration: baseExecuteImageGeneration
  } = useChatState();

  const {
    isLoading, setIsLoading,
    calculateCost, handleStop, executeStream
  } = useChatStreaming();

  const {
    chatContainerRef, messagesEndRef,
    isAtBottomRef, handleScroll, scrollToBottom
  } = useChatScroll();

  const {
    discussionInput, setDiscussionInput,
    isDiscussionLoading, sessionDiscussionCost,
    nextPlotGuidance, setNextPlotGuidance,
    handleSendDiscussionMessage
  } = useStoryMode(currentConvId, discussionMessages, setDiscussionMessages);

  const { syncMemory } = useMemorySync();

  const { drafts, setDraft } = useChatStore();
  const input = drafts[currentConvId || 'new'] || '';
  const setInput = (val: string) => setDraft(currentConvId, val);

  const lastLoadedConvId = useRef<string | null>(null);

  const [systemPrompt, setSystemPrompt] = useState('');
  const systemPromptRef = useRef(systemPrompt);
  useEffect(() => {
    systemPromptRef.current = systemPrompt;
  }, [systemPrompt]);

  useEffect(() => {
    if (isAtBottomRef.current) {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    if (currentConvId !== lastLoadedConvId.current) {
      lastLoadedConvId.current = currentConvId;
      if (currentConvId) {
        loadMessages(currentConvId);
        loadDiscussionMessages(currentConvId);
        const conv = conversations.find(c => c.id === currentConvId);
        setSystemPrompt(conv?.system_prompt || '');
        if (conv) {
           setSettings({ 
             model: conv.model || model, 
             provider: conv.provider || provider,
             temperature: conv.temperature || temperature,
             theme: conv.is_story_mode ? 'dark' : globalTheme,
             isThinkingMode: conv.is_thinking_mode ?? false
           });
           setIsStoryMode(!!conv.is_story_mode);
        }
      } else {
        clearMessages();
        setIsStoryMode(false);
        setSettings({ theme: globalTheme });
      }
    }
  }, [currentConvId]);

  const handleNewChat = () => {
    setCurrentConvId(null);
    clearMessages();
    setSystemPrompt('');
    setIsStoryMode(false);
    useChatStore.getState().setDraft(null, '');
    setSettings({ theme: globalTheme });
  };

  const handleUpdateSystemPrompt = async (newPrompt: string) => {
    setSystemPrompt(newPrompt);
    if (currentConvId) {
      try {
        await api.updateConversation(currentConvId, { system_prompt: newPrompt });
        loadConversations();
      } catch (e) {
        console.error("Failed to update system prompt", e);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    if (!apiKey && provider !== 'local') {
      alert("请先在设置中配置 API Key");
      setSettingsOpen(true);
      return;
    }

    if (memoryMode === 'powermem') {
      if ((!powermemConfig?.embeddingApiKey && powermemConfig?.embeddingProvider !== 'local') || !powermemConfig?.embeddingProvider) {
        alert("长程记忆模块 (PowerMem) 已开启，但未配置完整的向量服务(Embedding)信息。\n\n请前往 高级功能 -> 记忆模块(配置) 中补全信息，或选择本地向量服务。");
        useUIStore.getState().setActiveSettingsTab('advanced');
        setSettingsOpen(true);
        return;
      }
    }

    let convId = currentConvId;
    let currentConv = conversations.find(c => c.id === convId);

    if (!convId) {
      convId = uuidv4();
      const title = new Date().toLocaleString();
      const newConv: any = {
        id: convId,
        title,
        system_prompt: systemPromptRef.current,
        model,
        provider,
        temperature,
        is_story_mode: isStoryMode,
        is_thinking_mode: isThinkingMode,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setCurrentConvId(convId);
      lastLoadedConvId.current = convId;
      currentConv = newConv;

      // Optimistically update the UI
      useChatStore.getState().setConversations([newConv, ...conversations]);

      // Fire and forget creation in background
      api.createConversation(newConv).catch(err => {
        console.error("Failed to create conversation in background:", err);
      });
    }

    const userMsg: Message = {
      id: uuidv4(),
      conversation_id: convId!,
      role: 'user',
      content: input,
      created_at: new Date().toISOString(),
      tokens: 0,
      cost: 0
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const assistantMsg: Message = {
      id: uuidv4(),
      conversation_id: convId!,
      role: 'assistant',
      content: '',
      reasoning_content: '',
      created_at: new Date(Date.now() + 10).toISOString(),
      tokens: 0,
      cost: 0,
      memory_cost: 0,
      memory_tokens: 0,
      response_time: 0,
      status: 'generating' as const,
      model: currentConv?.model || model
    };

    setMessages(prev => [...prev, assistantMsg]);

    api.saveMessage(userMsg).then(() => api.saveMessage(assistantMsg)).catch(console.error);

    let fullContent = '';
    let fullReasoning = '';
    const startTime = Date.now();

    try {
      let historyToSend = messages.concat(userMsg).map(m => ({ role: m.role, content: m.content }));
      
      // Filter out empty messages to prevent errors with certain providers (ex: gemini)
      historyToSend = historyToSend.filter(m => m.content.trim() !== '');

      if (memoryMode !== 'off') {
        const maxMessages = (recentHistoryRounds || 5) * 2;
        if (historyToSend.length > maxMessages) {
          historyToSend = historyToSend.slice(-maxMessages); // Take the latest maxMessages
        }
      }

      const totalUserRounds = messages.filter(m => m.role === 'user').length + 1;

      const chatOptions = {
        messages: historyToSend,
        systemPrompt: systemPromptRef.current,
        model: currentConv?.model || model,
        temperature: currentConv?.temperature || temperature,
        stream: true,
        apiKey,
        provider,
        baseUrl,
        useTieredMemory,
        memoryMode,
        memorySummarizeFrequency,
        isThinkingMode,
        reasoningEffort,
        conversationId: convId,
        conversationName: currentConv?.title,
        totalUserRounds
      };

      const { fullContent: resContent, fullReasoning: resReasoning, usage, memoryUsage } = await executeStream(
        chatOptions,
        assistantMsg.id,
        isThinkingMode,
        (updatedContent, updatedReasoning) => {
          fullContent = updatedContent;
          fullReasoning = updatedReasoning;
          setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { 
            ...m, 
            content: updatedContent,
            reasoning_content: updatedReasoning 
          } : m));
        }
      );

      fullContent = resContent;
      fullReasoning = resReasoning;

      const costData = usage ? calculateCost(currentConv?.model || model, usage) : { total: 0, prompt: 0, completion: 0 };
      let memoryCost = 0;
      let memoryTokens = 0;
      if (memoryUsage) {
        if (memoryUsage.retrieve) {
          memoryCost += calculateCost('deepseek-v4-flash', memoryUsage.retrieve).total;
          memoryTokens += memoryUsage.retrieve.total_tokens || 0;
        }
        if (memoryUsage.ingest) {
          memoryCost += calculateCost('deepseek-v4-flash', memoryUsage.ingest).total;
          memoryTokens += memoryUsage.ingest.total_tokens || 0;
        }
      }
      const endTime = Date.now();
      const responseTime = (endTime - startTime) / 1000;

      const messageUpdate = {
        ...assistantMsg,
        content: fullContent,
        reasoning_content: fullReasoning,
        tokens: usage ? usage.completion_tokens : 0,
        cost: costData.completion,
        memory_cost: memoryCost,
        memory_tokens: memoryTokens,
        response_time: responseTime,
        status: 'success' as const
      };
      await api.saveMessage(messageUpdate);

      const userMessageUpdate = {
        ...userMsg,
        tokens: usage ? usage.prompt_tokens : 0,
        cost: costData.prompt
      };
      await api.saveMessage(userMessageUpdate);

      setMessages(prev => prev.map(m => {
        if (m.id === assistantMsg.id) return { ...m, ...messageUpdate };
        if (m.id === userMsg.id) return { ...m, ...userMessageUpdate };
        return m;
      }));

      // Perform synchronous ingestion to get memory usage
      await syncMemory(messages, currentConv, assistantMsg.id, messageUpdate, setMessages);

    } catch (error: any) {
      const endTime = Date.now();
      const responseTime = (endTime - startTime) / 1000;
      
      if (error.name === 'AbortError') {
        await api.saveMessage({
          ...assistantMsg,
          content: fullContent,
          reasoning_content: fullReasoning,
          tokens: 0, cost: 0,
          response_time: responseTime,
          status: 'cancelled'
        });
        setMessages(prev => prev.map(m => 
          m.id === assistantMsg.id ? { ...m, content: fullContent, reasoning_content: fullReasoning, response_time: responseTime, status: 'cancelled' } : m
        ));
        return;
      }

      if (fullContent.trim() !== '' || fullReasoning.trim() !== '') {
        await api.saveMessage({
          ...assistantMsg,
          content: fullContent,
          reasoning_content: fullReasoning,
          tokens: 0, cost: 0,
          response_time: responseTime,
          status: 'error'
        });
        setMessages(prev => prev.map(m => 
          m.id === assistantMsg.id ? { ...m, content: fullContent, reasoning_content: fullReasoning, response_time: responseTime, status: 'error' } : m
        ));
      } else {
        const errorContent = `网络或服务连接断开: ${error.message}`;
        await api.saveMessage({
          ...assistantMsg,
          content: errorContent,
          reasoning_content: '',
          status: 'error',
          response_time: responseTime
        });
        setMessages(prev => prev.map(m => 
          m.id === assistantMsg.id ? { ...m, content: errorContent, reasoning_content: '', status: 'error' } : m
        ));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const executeImageGeneration = (messageId: string, prompt: string) => {
    return baseExecuteImageGeneration(messageId, prompt, paintingProvider, paintingApiKey, paintingModel);
  };

  const handleToggleThinkingMode = async () => {
    const newVal = !isThinkingMode;
    setSettings({ isThinkingMode: newVal });
    if (currentConvId) {
      try {
        await api.updateConversation(currentConvId, { is_thinking_mode: newVal });
        const updatedConvs = await api.getConversations();
        setConversations(updatedConvs);
      } catch (err) {
        console.error("Failed to update thinking mode for conversation", err);
      }
    }
  };

  return {
    messages, setMessages,
    input, setInput,
    isLoading, handleSendMessage, handleStop,
    discussionMessages, discussionInput, setDiscussionInput,
    handleSendDiscussionMessage, isDiscussionLoading,
    nextPlotGuidance, setNextPlotGuidance,
    executeImageGeneration, handleUpdateSystemPrompt,
    handleScroll, chatContainerRef, messagesEndRef,
    handleNewChat, systemPrompt, setSystemPrompt,
    handleToggleThinkingMode,
    sessionDiscussionCost
  };
};
