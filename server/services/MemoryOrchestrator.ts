import { MemoryService } from "../memoryService.js";

export class MemoryOrchestrator {
  static ingestMemoryAsync(
    effectiveMemoryMode: string,
    skipMemoryIngest: boolean | undefined,
    lastUserMsg: any,
    fullResponse: string,
    messages: any[],
    totalUserRounds: number | undefined,
    memorySummarizeFrequency: number | undefined,
    llmProvider: any,
    apiKey: string,
    selectedModel: string,
    conversationId: string,
    conversationName: string | undefined
  ) {
    if (effectiveMemoryMode === 'off' || skipMemoryIngest || !lastUserMsg || !fullResponse) {
      return;
    }

    const round = totalUserRounds || messages.filter((m: any) => m.role === 'user').length;
    
    let recentHistoryStr = "";
    const recentMsgs = messages.slice(-11, -1);
    for (const msg of recentMsgs) {
      if (msg.role === 'user') {
        recentHistoryStr += `User: ${msg.content}\n`;
      } else if (msg.role === 'assistant') {
        recentHistoryStr += `AI: ${msg.content}\n`;
      }
    }

    const freq = memorySummarizeFrequency || 1;
    const shouldCallSimple = round > 0 && round % freq === 0;

    if (effectiveMemoryMode === 'powermem' || shouldCallSimple) {
      console.log("Starting memory ingestion in background...");
      
      const ingestTask = async () => {
        try {
          if (effectiveMemoryMode === 'powermem') {
            await MemoryService.ingest(lastUserMsg.content, fullResponse, llmProvider, apiKey, selectedModel, conversationId, conversationName, round, recentHistoryStr, false, freq);
          } else if (shouldCallSimple) {
            await MemoryService.ingestSimple(lastUserMsg.content, fullResponse, llmProvider, apiKey, selectedModel, conversationId, conversationName, round, recentHistoryStr, false);
          }
        } catch (err) {
          console.error("Ingest error:", err);
        }
      };
      
      ingestTask(); // Fire and forget
    }
  }
}
