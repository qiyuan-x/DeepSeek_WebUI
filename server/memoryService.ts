import { ILLMProvider } from "./providers/llm/ILLMProvider.js";
import { powerMem } from "./powermem.js";

export class MemoryService {
  static async retrieve(query: string, llmProvider: ILLMProvider, apiKey: string, model: string, conversationId: string): Promise<{ context: string, usage: any }> {
    try {
      if (!apiKey || !conversationId) return { context: "", usage: null };
      
      await powerMem.init();
      if (!powerMem.isReady()) return { context: "", usage: null };

      // 1. Search for relevant facts
      const searchResults = await powerMem.search(query, conversationId, 5);
      
      let factsStr = "";
      if (searchResults.length > 0) {
        factsStr = searchResults.map((r: any) => r.content).join('\n');
      }

      // 2. Fetch Profile and Summary for this conversation
      const profileAndSummary = await powerMem.getProfileAndSummary(conversationId);
      const profileData = profileAndSummary.filter((e: any) => e.metadata?.type === 'profile');
      const summaryData = profileAndSummary.filter((e: any) => e.metadata?.type === 'summary');

      // 3. Combine everything into a single context string
      let memoryContext = factsStr ? `[相关记忆事实]\n${factsStr}` : "";
      if (profileData.length > 0) {
        memoryContext += `\n\n[用户画像]\n${profileData.map((p: any) => p.content).join("\n")}`;
      }
      if (summaryData.length > 0) {
        memoryContext += `\n\n[历史对话总结]\n${summaryData.map((p: any) => p.content).join("\n")}`;
      }

      return { context: memoryContext.trim(), usage: null };
    } catch (error) {
      console.error("Memory retrieval error:", error);
      return { context: "", usage: null };
    }
  }

  static async ingest(userInput: string, aiResponse: string, llmProvider: ILLMProvider, apiKey: string, model: string, conversationId: string, conversationName: string, round: number): Promise<any> {
    try {
      if (!apiKey || !conversationId) return null;

      await powerMem.init();
      if (!powerMem.isReady()) return null;

      // Fetch existing profile and summary to help LLM merge/update
      const existingData = await powerMem.getProfileAndSummary(conversationId);
      
      const existingProfileStr = existingData.length > 0 
        ? "当前该对话已有的记忆信息如下（如果已有信息发生变化或需要补充，请提供更新/合并后的完整内容）：\n" + existingData.map((p: any) => `[${p.metadata?.type}] ${p.content}`).join("\n")
        : "当前该对话没有已知的记忆信息。";

      const isSummaryRound = round > 0 && round % 5 === 0;
      const summaryInstruction = isSummaryRound 
        ? `本次对话已达到第 ${round} 轮，请生成一段这5轮对话的详细总结，并标记为 'summary'。` 
        : `本次对话暂不需要生成新的对话总结（每5轮生成一次）。`;

      const jsonStrResponse = await llmProvider.chat([
        {
          role: "system",
          content: `分析以下对话并提取重要的事实、用户偏好或专业背景（作为用户画像），以及本次对话的详细总结。请返回一个JSON对象，包含一个名为'memories'的数组，数组中的每个元素是一个包含'type' (必须是 'profile', 'summary', 或 'fact') 和 'content' 属性的对象。**请务必使用与用户输入相同的语言进行输出**。

规则如下：
1. **用户画像 (profile)**：请更新或生成一段文字，描述AI对当前对话中用户的整体理解（包括偏好、背景等）。如果这是第一次对话，请务必生成此项。
2. **对话总结 (summary)**：${summaryInstruction}
3. **其他记忆 (fact)**：提取对话中发生的重要事实、事件或具体细节。

如果没有发现新事实且总结无需更新，请依然返回'profile'，其他可为空。\n\n${existingProfileStr}`
        },
        {
          role: "user",
          content: `User: ${userInput}\nAI: ${aiResponse}`
        }
      ], { model, response_format: { type: "json_object" } }, apiKey);

      let jsonStr = jsonStrResponse || "[]";
      
      // Clean up markdown formatting if present
      const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) {
        jsonStr = match[1];
      } else {
        jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
      }

      let facts = [];
      try {
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) {
          facts = parsed;
        } else if (parsed && typeof parsed === 'object') {
          for (const key in parsed) {
            if (Array.isArray(parsed[key])) {
              facts = parsed[key];
              break;
            }
          }
        }
      } catch (e) {
        console.error("Failed to parse facts JSON:", e);
      }

      for (const fact of facts) {
        if (fact.type && fact.content) {
          // If it's profile or summary, we might want to update existing or add new
          if (fact.type === 'profile') {
            const existingProfile = existingData.find((e: any) => e.metadata?.type === 'profile');
            if (existingProfile) {
              await powerMem.updateMemory(existingProfile.id, fact.content);
            } else {
              await powerMem.addMemory(fact.content, conversationId, 'profile');
            }
          } else if (fact.type === 'summary') {
            await powerMem.addMemory(fact.content, conversationId, 'summary');
          } else {
            await powerMem.addMemory(fact.content, conversationId, 'fact');
          }
        }
      }

      return null;
    } catch (error) {
      console.error("Memory ingestion error:", error);
      return null;
    }
  }
}
