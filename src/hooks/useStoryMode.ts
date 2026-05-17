import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '../types';
import { api } from '../services/api';
import { useSettingStore } from '../store/settingStore';
import { useUIStore } from '../store/uiStore';
import { useChatStreaming } from './useChatStreaming';

export const useStoryMode = (
  currentConvId: string | null,
  discussionMessages: Message[],
  setDiscussionMessages: React.Dispatch<React.SetStateAction<Message[]>>
) => {
  const { apiKey, model, provider, baseUrl } = useSettingStore(s => s.llmConfig);
  const { setSettingsOpen } = useUIStore();
  
  const { calculateCost, parseStreamChunk } = useChatStreaming();

  const [discussionInput, setDiscussionInput] = useState('');
  const [isDiscussionLoading, setIsDiscussionLoading] = useState(false);
  const [sessionDiscussionCost, setSessionDiscussionCost] = useState(0);
  const [nextPlotGuidance, setNextPlotGuidance] = useState('');

  const handleSendDiscussionMessage = async () => {
    if (!discussionInput.trim() || !currentConvId) return;

    if (!apiKey && provider !== 'local') {
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
      created_at: new Date(Date.now() + 10).toISOString(),
      tokens: 0,
      cost: 0,
      model: model || 'deepseek-v4-flash'
    };

    setDiscussionMessages(prev => [...prev, assistantMsg]);
    api.saveMessage(userMsg).catch(console.error);
    api.saveMessage(assistantMsg).catch(console.error);

    let fullContent = '';
    let usage: any = null;

    try {
      const streamRes = await api.chat({
        messages: discussionMessages.concat(userMsg).map(m => ({ role: m.role, content: m.content })),
        model: model || 'deepseek-v4-flash',
        temperature: 0.7,
        stream: true,
        apiKey,
        provider,
        baseUrl,
        isThinkingMode: false,
        conversationId: currentConvId + '_discussion'
      });

      const reader = streamRes.body?.getReader();
      if (!reader) throw new Error("Failed to get stream reader");
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (value) buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        if (done && buffer.trim()) {
          lines.push(buffer);
          buffer = '';
        }
        
        for (let line of lines) {
          line = line.trim();
          const data = parseStreamChunk(line);
          if (data) {
             if (data.usage) { usage = data.usage; continue; }
             if (data.error) throw new Error(data.error);
             if (!data.choices || data.choices.length === 0) continue;
             const delta = data.choices[0].delta;
             if (delta.content) {
               fullContent += delta.content;
               setDiscussionMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: fullContent } : m));
             }
          }
        }
        if (done) break;
      }

      const costData = usage ? calculateCost(model || 'deepseek-v4-flash', usage) : { total: 0, prompt: 0, completion: 0 };
      setSessionDiscussionCost(prev => prev + costData.total);

      const messageUpdate = { ...assistantMsg, content: fullContent, tokens: usage ? usage.completion_tokens : 0, cost: costData.completion };
      api.saveMessage(messageUpdate).catch(console.error);
      const userMessageUpdate = { ...userMsg, tokens: usage ? usage.prompt_tokens : 0, cost: costData.prompt };
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
    discussionInput,
    setDiscussionInput,
    isDiscussionLoading,
    sessionDiscussionCost,
    nextPlotGuidance,
    setNextPlotGuidance,
    handleSendDiscussionMessage
  };
};
