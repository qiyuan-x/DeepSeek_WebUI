import { useState, useCallback } from 'react';
import { Message, PRICING } from '../types';
import { extractThinkContent } from '../utils/streamParser';
import { api } from '../services/api';

export const useChatStreaming = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const calculateCost = (modelId: string, usage: any) => {
    if (!usage) return { total: 0, prompt: 0, completion: 0 };
    const costs = PRICING[modelId as keyof typeof PRICING] || { input: 0.001, output: 0.002, currency: 'CNY' };
    const promptCost = ((usage.prompt_tokens || 0) / 1000) * costs.input;
    const completionCost = ((usage.completion_tokens || 0) / 1000) * costs.output;
    
    return {
      total: promptCost + completionCost,
      prompt: promptCost,
      completion: completionCost
    };
  };

  const parseStreamChunk = (line: string) => {
    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
      try {
        return JSON.parse(line.slice(6));
      } catch (e) {
        console.warn("Failed to parse JSON chunk", line, e);
      }
    }
    return null;
  };

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setIsLoading(false);
  };

  const executeStream = async (
    chatOptions: any,
    assistantMsgId: string,
    isThinkingMode: boolean,
    onUpdateMsg: (fullContent: string, fullReasoning: string) => void
  ) => {
    const controller = new AbortController();
    setAbortController(controller);

    let fullContent = '';
    let fullReasoning = '';
    let rawContentStream = '';
    let nativeReasoningStream = '';
    let usage: any = null;
    let memoryUsage: any = null;

    const streamRes = await api.chat(chatOptions, controller.signal);

    const reader = streamRes.body?.getReader();
    if (!reader) throw new Error("Failed to get stream reader");
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (value) {
        buffer += decoder.decode(value, { stream: !done });
      }
      
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
          if (data.usage) {
            usage = data.usage;
            continue;
          }
          if (data.memory_usage) {
            memoryUsage = data.memory_usage;
            continue;
          }
          if (data.error) {
            throw new Error(data.error);
          }
          if (!data.choices || data.choices.length === 0) continue;
          const delta = data.choices[0].delta;
          
          if (delta.reasoning_content) {
            nativeReasoningStream += delta.reasoning_content;
          }
          
          if (delta.content) {
            rawContentStream += delta.content;
          }

          const parsed = extractThinkContent(rawContentStream, nativeReasoningStream);
          fullContent = parsed.content;
          
          if (isThinkingMode) {
            fullReasoning = parsed.reasoning.trim();
          } else {
            fullReasoning = '';
          }

          // Let caller handle partial UI update
          onUpdateMsg(fullContent, fullReasoning);
        }
      }
      
      if (done) break;
    }

    if (!fullContent.trim() && fullReasoning.trim()) {
      fullContent = "*(模型仅输出了思考过程，未提供最终回复。请检查您的提示词或模型响应。)*";
      onUpdateMsg(fullContent, fullReasoning);
    }

    return { fullContent, fullReasoning, usage, memoryUsage };
  };

  return {
    isLoading,
    setIsLoading,
    abortController,
    setAbortController,
    calculateCost,
    parseStreamChunk,
    handleStop,
    executeStream
  };
};
