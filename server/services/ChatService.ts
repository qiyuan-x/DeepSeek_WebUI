import { MemoryService } from "../memoryService.js";
import { LLMProviderFactory } from "../providers/llm/LLMProviderFactory.js";

export class ChatService {
  /**
   * Generates a chat response and handles memory retrieval
   */
  static async generateContextAndResponse(
    messages: any[],
    systemPrompt: string | undefined,
    model: string,
    temperature: number,
    provider: string,
    baseUrl: string | undefined,
    isThinkingMode: boolean | undefined,
    reasoningEffort: string | undefined,
    conversationId: string | undefined,
    conversationName: string | undefined,
    memoryMode: string | undefined,
    useTieredMemory: boolean | undefined,
    apiKey: string
  ): Promise<{ 
    finalMessages: any[], 
    selectedModel: string, 
    llmProvider: any,
    effectiveMemoryMode: string,
    lastUserMsg: any,
    memoryUsage: any
  }> {
    let finalMessages = [...messages];
    
    // Inject system prompt if provided
    if (systemPrompt) {
      finalMessages.unshift({ role: 'system', content: systemPrompt });
    }

    let lastUserMsg = messages.filter((m: any) => m.role === 'user').pop();
    let memoryUsage: any = null;

    const llmProvider = LLMProviderFactory.getProvider(provider || 'deepseek', baseUrl);
    const selectedModel = model || (provider === 'deepseek' ? 'deepseek-v4-flash' : provider === 'openai' ? 'gpt-4o' : provider === 'dashscope' ? 'qwen-plus' : provider === 'local' ? 'llama3' : 'gemini-1.5-pro');

    const effectiveMemoryMode = memoryMode || (useTieredMemory ? 'powermem' : 'off');
    
    // Skip memory retrieval if this is the very first user message (length <= 1) to avoid lagging the initial chat.
    const isFirstMessage = messages.filter((m: any) => m.role === 'user').length <= 1;

    if (effectiveMemoryMode !== 'off' && lastUserMsg && conversationId && !isFirstMessage) {
      // 1. Retrieval
      const { context: memoryContext, usage: retrieveUsage } = effectiveMemoryMode === 'powermem' 
        ? await MemoryService.retrieve(lastUserMsg.content, llmProvider, apiKey, selectedModel, conversationId)
        : await MemoryService.retrieveSimple(conversationId, conversationName);
        
      if (retrieveUsage) {
        memoryUsage = { retrieve: retrieveUsage };
      }
      
      if (memoryContext && memoryContext.trim()) {
        // Find system message or add one
        const sysIdx = finalMessages.findIndex((m: any) => m.role === 'system');
        const factPrompt = `\n\n=== 附加背景信息 ===\n以下是关于用户和历史对话的记忆，请在回答时作为参考（但必须优先遵循上述的人物设定）：\n${memoryContext.trim()}`;
        if (sysIdx !== -1) {
          finalMessages[sysIdx].content += factPrompt;
        } else {
          finalMessages.unshift({ role: 'system', content: `你是一个助手。${factPrompt}` });
        }
      }

      // 3. Short-term memory (keep only last 5 rounds + system prompt)
      const systemMsgs = finalMessages.filter((m: any) => m.role === 'system');
      const otherMsgs = finalMessages.filter((m: any) => m.role !== 'system');
      let recentMsgs = otherMsgs.slice(-10); // 5 rounds = 10 messages
      
      // Ensure the first message after system is a user message
      if (recentMsgs.length > 0 && recentMsgs[0].role !== 'user') {
        recentMsgs.shift();
      }
      
      finalMessages = [...systemMsgs, ...recentMsgs];
    }

    // Add a strong reminder to the last user message to strictly follow the system prompt
    const sysMsg = finalMessages.find((m: any) => m.role === 'system');
    if (sysMsg && sysMsg.content) {
      const lastMsgIdx = finalMessages.length - 1;
      if (lastMsgIdx >= 0 && finalMessages[lastMsgIdx].role === 'user') {
        const originalSysPrompt = sysMsg.content.split('\n\n=== 附加背景信息 ===')[0].trim();
        if (originalSysPrompt && originalSysPrompt !== '你是一个助手。') {
          finalMessages[lastMsgIdx].content += `\n\n[系统提示：请严格遵循你的人物设定：“${originalSysPrompt}”，不要受历史对话风格的影响。]`;
        }
        if (isThinkingMode) {
          finalMessages[lastMsgIdx].content += `\n\n[系统提示：请务必在思考结束后，将你要回复用户的实际内容输出在 <think> 标签之外。不要把回复全部写在思考过程里。]`;
        }
      }
    }

    return { finalMessages, selectedModel, llmProvider, effectiveMemoryMode, lastUserMsg, memoryUsage };
  }
}
