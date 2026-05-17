import { useState, useCallback } from 'react';
import { Message } from '../types';
import { api } from '../services/api';

export const useChatState = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [discussionMessages, setDiscussionMessages] = useState<Message[]>([]);

  const loadMessages = useCallback(async (id: string) => {
    try {
      const data = await api.getMessages(id);
      if (Array.isArray(data)) setMessages(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadDiscussionMessages = useCallback(async (id: string) => {
    try {
      const data = await api.getMessages(id + '_discussion');
      if (Array.isArray(data)) setDiscussionMessages(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setDiscussionMessages([]);
  }, []);

  const executeImageGeneration = async (
    messageId: string, 
    prompt: string, 
    paintingProvider: string, 
    paintingApiKey: string, 
    paintingModel: string
  ) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isGeneratingImage: true } : m));
    try {
      const { imageUrl } = await api.generateImage(prompt, paintingProvider, paintingApiKey, paintingModel);
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

  return {
    messages,
    setMessages,
    discussionMessages,
    setDiscussionMessages,
    loadMessages,
    loadDiscussionMessages,
    clearMessages,
    executeImageGeneration
  };
};
