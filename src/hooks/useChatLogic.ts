import { useState, useRef, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '../types';
import { api } from '../services/api';
import { useChatStore } from '../store/chatStore';
import { useSettingStore } from '../store/settingStore';
import { useStoryStore } from '../store/storyStore';
import { useUIStore } from '../store/uiStore';

export const useChatLogic = () => {
  const { conversations, setConversations, currentConvId, setCurrentConvId, loadConversations } = useChatStore();
  const { 
    provider, apiKey, model, temperature, theme, globalTheme, bgImage, 
    promptTemplates, storyTemplates, useTieredMemory, isPaintingEnabled, 
    paintingProvider, paintingApiKey, quickGenerate, loadSettings, setSettings 
  } = useSettingStore();
  const { 
    isStoryMode, setIsStoryMode, isTransitioning, setIsTransitioning, 
    isExitingStoryMode, setIsExitingStoryMode 
  } = useStoryStore();
  const { setSettingsOpen } = useUIStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  
  const [discussionMessages, setDiscussionMessages] = useState<Message[]>([]);
  const [discussionInput, setDiscussionInput] = useState('');
  const [isDiscussionLoading, setIsDiscussionLoading] = useState(false);
  const [sessionDiscussionCost, setSessionDiscussionCost] = useState(0);
  const [nextPlotGuidance, setNextPlotGuidance] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const lastLoadedConvId = useRef<string | null>(null);

  const [systemPrompt, setSystemPrompt] = useState('');
  const systemPromptRef = useRef(systemPrompt);
  useEffect(() => {
    systemPromptRef.current = systemPrompt;
  }, [systemPrompt]);

  const calculateCost = (modelId: string, usage: any) => {
    if (!usage) return { total: 0, prompt: 0, completion: 0 };
    const isReasoner = modelId === 'deepseek-reasoner';
    const inputPrice = isReasoner ? 0.004 : 0.001;
    const outputPrice = isReasoner ? 0.016 : 0.002;
    
    const promptCost = (usage.prompt_tokens / 1000) * inputPrice;
    const completionCost = (usage.completion_tokens / 1000) * outputPrice;
    
    return {
      total: promptCost + completionCost,
      prompt: promptCost,
      completion: completionCost
    };
  };

  const handleScroll = useCallback(() => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 50;
    isAtBottomRef.current = isAtBottom;
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isAtBottomRef.current) {
      scrollToBottom();
    }
  }, [messages]);

  const loadMessages = async (id: string) => {
    try {
      const data = await api.getMessages(id);
      if (Array.isArray(data)) {
        setMessages(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadDiscussionMessages = async (id: string) => {
    try {
      const data = await api.getMessages(id + '_discussion');
      if (Array.isArray(data)) {
        setDiscussionMessages(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (currentConvId !== lastLoadedConvId.current) {
      lastLoadedConvId.current = currentConvId;
      if (currentConvId) {
        loadMessages(currentConvId);
        loadDiscussionMessages(currentConvId);
        const conv = conversations.find(c => c.id === currentConvId);
        setSystemPrompt(conv?.system_prompt || '');
        if (conv?.is_story_mode) {
          setIsStoryMode(true);
          setSettings({ theme: 'dark' });
        } else {
          setIsStoryMode(false);
          setSettings({ theme: globalTheme });
        }
      } else {
        setMessages([]);
        setDiscussionMessages([]);
        setIsStoryMode(false);
        setSettings({ theme: globalTheme });
      }
    }
  }, [currentConvId]);

  const handleNewChat = () => {
    setCurrentConvId(null);
    setMessages([]);
    setSystemPrompt('');
    setIsStoryMode(false);
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

    if (!apiKey) {
      alert("请先在设置中配置 API Key");
      setSettingsOpen(true);
      return;
    }

    let convId = currentConvId;
    let currentConv = conversations.find(c => c.id === convId);

    if (!convId) {
      const title = new Date().toLocaleString();
      try {
        const newConv = await api.createConversation({
          title,
          system_prompt: systemPromptRef.current,
          model,
          temperature,
          is_story_mode: isStoryMode
        });
        convId = newConv.id;
        setCurrentConvId(convId);
        lastLoadedConvId.current = convId; // Prevent useEffect from overwriting optimistic messages
        await loadConversations();
        currentConv = newConv;
      } catch (error) {
        console.error("Failed to create conversation:", error);
        alert("创建对话失败，请重试");
        return;
      }
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

    const controller = new AbortController();
    setAbortController(controller);

    const assistantMsg: Message = {
      id: uuidv4(),
      conversation_id: convId!,
      role: 'assistant',
      content: '',
      reasoning_content: '',
      created_at: new Date().toISOString(),
      tokens: 0,
      cost: 0,
      memory_cost: 0,
      memory_tokens: 0,
      response_time: 0
    };

    setMessages(prev => [...prev, assistantMsg]);

    let fullContent = '';
    let fullReasoning = '';
    let usage: any = null;
    let memoryUsage: any = null;
    const startTime = Date.now();

    try {
      const streamRes = await api.chat({
        messages: messages.concat(userMsg).map(m => ({ role: m.role, content: m.content })),
        model: currentConv?.model || model,
        temperature: currentConv?.temperature || temperature,
        stream: true,
        apiKey,
        provider,
        useTieredMemory,
        conversationId: convId,
        conversationName: currentConv?.title
      }, controller.signal);

      const reader = streamRes.body?.getReader();
      if (!reader) throw new Error("Failed to get stream reader");
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.usage) {
                usage = data.usage;
                continue;
              }
              if (data.memory_usage) {
                memoryUsage = data.memory_usage;
                continue;
              }
              if (!data.choices || data.choices.length === 0) continue;
              const delta = data.choices[0].delta;
              if (delta.reasoning_content) {
                fullReasoning += delta.reasoning_content;
                setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, reasoning_content: fullReasoning } : m));
              }
              if (delta.content) {
                fullContent += delta.content;
                setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: fullContent } : m));
              }
            } catch (e) {}
          }
        }
      }

      const costData = usage ? calculateCost(currentConv?.model || model, usage) : { total: 0, prompt: 0, completion: 0 };
      const finalCost = costData.total;
      let memoryCost = 0;
      let memoryTokens = 0;
      if (memoryUsage) {
        if (memoryUsage.retrieve) {
          memoryCost += calculateCost('deepseek-chat', memoryUsage.retrieve).total;
          memoryTokens += memoryUsage.retrieve.total_tokens || 0;
        }
        if (memoryUsage.ingest) {
          memoryCost += calculateCost('deepseek-chat', memoryUsage.ingest).total;
          memoryTokens += memoryUsage.ingest.total_tokens || 0;
        }
      }
      const endTime = Date.now();
      const responseTime = (endTime - startTime) / 1000;

      // Final save
      const messageUpdate = {
        ...assistantMsg,
        content: fullContent,
        reasoning_content: fullReasoning,
        tokens: usage ? usage.completion_tokens : 0,
        cost: costData.completion,
        memory_cost: memoryCost,
        memory_tokens: memoryTokens,
        response_time: responseTime
      };
      api.saveMessage(messageUpdate).catch(console.error);

      const userMessageUpdate = {
        ...userMsg,
        tokens: usage ? usage.prompt_tokens : 0,
        cost: costData.prompt
      };
      api.saveMessage(userMessageUpdate).catch(console.error);

      setMessages(prev => prev.map(m => {
        if (m.id === assistantMsg.id) return { ...m, ...messageUpdate };
        if (m.id === userMsg.id) return { ...m, ...userMessageUpdate };
        return m;
      }));

    } catch (error: any) {
      const endTime = Date.now();
      const responseTime = (endTime - startTime) / 1000;
      
      if (error.name === 'AbortError') {
        const finalContent = fullContent + '\n\n[用户取消输出]';
        
        await api.saveMessage({
          ...assistantMsg,
          content: finalContent,
          reasoning_content: fullReasoning,
          tokens: 0, 
          cost: 0,
          response_time: responseTime
        });
        
        setMessages(prev => prev.map(m => 
          m.id === assistantMsg.id ? { ...m, content: finalContent, response_time: responseTime } : m
        ));
        return;
      }

      if (fullContent.trim() !== '' || fullReasoning.trim() !== '') {
        const finalContent = fullContent + `\n\n[网络连接中断: ${error.message}]`;
        
        await api.saveMessage({
          ...assistantMsg,
          content: finalContent,
          reasoning_content: fullReasoning,
          tokens: 0, 
          cost: 0,
          response_time: responseTime
        });
        
        setMessages(prev => prev.map(m => 
          m.id === assistantMsg.id ? { ...m, content: finalContent, response_time: responseTime } : m
        ));
      } else {
        setMessages(prev => prev.filter(m => m.id !== assistantMsg.id));
        api.deleteMessage(assistantMsg.id).catch(console.error);
        alert(error.message);
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };

  const handleStop = () => {
    abortController?.abort();
    setIsLoading(false);
    setAbortController(null);
  };

  const executeImageGeneration = async (messageId: string, prompt: string) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isGeneratingImage: true } : m));
    try {
      const { imageUrl } = await api.generateImage(prompt, paintingProvider, paintingApiKey);
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isGeneratingImage: false, imageUrl } : m));
      const msg = messages.find(m => m.id === messageId);
      if (msg) {
        api.saveMessage({ ...msg, imageUrl }).catch(console.error);
      }
    } catch (error: any) {
      console.error("Failed to generate image:", error);
      alert("图片生成失败: " + error.message);
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isGeneratingImage: false } : m));
    }
  };

  const handleSendDiscussionMessage = async () => {
    if (!discussionInput.trim() || !currentConvId) return;

    if (!apiKey) {
      alert("请先在设置中配置 API Key");
      setSettingsOpen(true);
      return;
    }

    const userMsg: Message = {
      id: uuidv4(),
      conversation_id: currentConvId + '_discussion',
      role: 'user',
      content: discussionInput,
      created_at: new Date().toISOString(),
      tokens: 0,
      cost: 0
    };

    setDiscussionMessages(prev => [...prev, userMsg]);
    setDiscussionInput('');
    setIsDiscussionLoading(true);

    const assistantMsg: Message = {
      id: uuidv4(),
      conversation_id: currentConvId + '_discussion',
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
      tokens: 0,
      cost: 0
    };

    setDiscussionMessages(prev => [...prev, assistantMsg]);

    let fullContent = '';
    let usage: any = null;

    try {
      const streamRes = await api.chat({
        messages: discussionMessages.concat(userMsg).map(m => ({ role: m.role, content: m.content })),
        model: model || 'deepseek-chat',
        temperature: 0.7,
        stream: true,
        apiKey,
        provider,
        conversationId: currentConvId + '_discussion'
      });

      const reader = streamRes.body?.getReader();
      if (!reader) throw new Error("Failed to get stream reader");
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.usage) {
                usage = data.usage;
                continue;
              }
              if (!data.choices || data.choices.length === 0) continue;
              const delta = data.choices[0].delta;
              if (delta.content) {
                fullContent += delta.content;
                setDiscussionMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: fullContent } : m));
              }
            } catch (e) {}
          }
        }
      }

      const costData = usage ? calculateCost(model || 'deepseek-chat', usage) : { total: 0, prompt: 0, completion: 0 };
      setSessionDiscussionCost(prev => prev + costData.total);

      const messageUpdate = {
        ...assistantMsg,
        content: fullContent,
        tokens: usage ? usage.completion_tokens : 0,
        cost: costData.completion
      };
      api.saveMessage(messageUpdate).catch(console.error);

      const userMessageUpdate = {
        ...userMsg,
        tokens: usage ? usage.prompt_tokens : 0,
        cost: costData.prompt
      };
      api.saveMessage(userMessageUpdate).catch(console.error);

      setDiscussionMessages(prev => prev.map(m => {
        if (m.id === assistantMsg.id) return { ...m, ...messageUpdate };
        if (m.id === userMsg.id) return { ...m, ...userMessageUpdate };
        return m;
      }));

    } catch (error: any) {
      setDiscussionMessages(prev => prev.filter(m => m.id !== assistantMsg.id));
      alert("讨论请求失败: " + error.message);
    } finally {
      setIsDiscussionLoading(false);
    }
  };

  return {
    messages,
    setMessages,
    input,
    setInput,
    isLoading,
    handleSendMessage,
    handleStop,
    discussionMessages,
    discussionInput,
    setDiscussionInput,
    handleSendDiscussionMessage,
    isDiscussionLoading,
    nextPlotGuidance,
    setNextPlotGuidance,
    executeImageGeneration,
    handleUpdateSystemPrompt,
    handleScroll,
    chatContainerRef,
    messagesEndRef,
    handleNewChat,
    systemPrompt,
    setSystemPrompt,
    sessionDiscussionCost
  };
};
