import { useState } from 'react';
import { api } from '../services/api';
import { Message } from '../types';
import { useSettingStore } from '../store/settingStore';
import { useChatStore } from '../store/chatStore';
import { useChatStreaming } from './useChatStreaming';

export const useMemorySync = () => {
  const { isIngestingMemory, setIsIngestingMemory } = useChatStore();
  const { calculateCost } = useChatStreaming();

  const syncMemory = async (
    messages: Message[],
    currentConv: any,
    assistantMsgId: string,
    messageUpdate: any,
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  ) => {
    const { provider, baseUrl, model, apiKey } = useSettingStore.getState().llmConfig;
  const { memoryMode, memorySummarizeFrequency, powermemConfig } = useSettingStore.getState().memoryConfig;
    const convId = currentConv?.id;

    if (memoryMode === 'off' || !convId) return;

    const freq = memorySummarizeFrequency || 1;
    const userMessageCount = messages.filter((m) => m.role === 'user').length + 1; // +1 for the current pending user message
    const round = userMessageCount;

    if (memoryMode === 'powermem' || (round > 0 && round % freq === 0)) {
      setIsIngestingMemory(true);
      try {
        const ingestRes = await api.ingestMemory({
          effectiveMemoryMode: memoryMode,
          memorySummarizeFrequency: freq,
          provider: currentConv?.provider || provider,
          baseUrl: currentConv?.baseUrl || baseUrl,
          selectedModel: currentConv?.model || model,
          apiKey: currentConv?.apiKey || apiKey,
          conversationId: convId,
          conversationName: currentConv?.title || currentConv?.system_prompt?.slice(0, 20) || 'Untitled',
        });

        if (ingestRes.usage) {
          const ingestModel = currentConv?.model || model;
          const ingestCostData = calculateCost(ingestModel, ingestRes.usage).total;
          console.log("Ingested memory usage:", ingestRes.usage, "Cost:", ingestCostData);

          const newMemoryCost = (messageUpdate.memory_cost || 0) + ingestCostData;
          const newMemoryTokens =
            (messageUpdate.memory_tokens || 0) +
            (ingestRes.usage.total_tokens ||
              (ingestRes.usage.prompt_tokens || 0) + (ingestRes.usage.completion_tokens || 0) ||
              0);

          const updatedMsg = { ...messageUpdate, memory_cost: newMemoryCost, memory_tokens: newMemoryTokens };
          await api.saveMessage(updatedMsg);

          setMessages((prev) => prev.map((m) => (m.id === assistantMsgId ? { ...m, ...updatedMsg } : m)));
        } else {
          console.warn("Ingest memory returned successful but NO usage object", ingestRes);
        }
      } catch (err) {
        console.error("Failed to ingest memory via API:", err);
      } finally {
        setIsIngestingMemory(false);
      }
    }
  };

  return { syncMemory, isIngestingMemory };
};
