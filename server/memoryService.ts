import { ILLMProvider } from "./providers/llm/ILLMProvider.js";
import { powerMem } from "./powermem.js";
import db from "./db.js";

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

  static async retrieveSimple(conversationId: string, conversationName: string): Promise<{ context: string, usage: any }> {
    try {
      if (!conversationName) return { context: "", usage: null };

      const stmt = db.prepare("SELECT * FROM entity_memories WHERE entity_key = ? OR entity_key = ?");
      const results = stmt.all(`[${conversationName}] summary`, `[${conversationName}] profile`) as any[];

      const profileData = results.filter((e: any) => e.entity_key.includes('profile'));
      const summaryData = results.filter((e: any) => e.entity_key.includes('summary'));

      let memoryContext = "";
      if (profileData.length > 0) {
        memoryContext += `[用户画像]\n${profileData.map((p: any) => p.entity_value).join("\n")}`;
      }
      if (summaryData.length > 0) {
        memoryContext += `\n\n[历史对话总结]\n${summaryData.map((p: any) => p.entity_value).join("\n")}`;
      }

      return { context: memoryContext.trim(), usage: null };
    } catch (error) {
      console.error("Simple memory retrieval error:", error);
      return { context: "", usage: null };
    }
  }

  static async ingest(userInput: string, aiResponse: string, llmProvider: ILLMProvider, apiKey: string, model: string, conversationId: string, conversationName: string, round: number, recentHistory?: string, isReasoning = false, summarizeFreq = 5): Promise<any> {
    try {
      if (!apiKey || !conversationId) return null;

      await powerMem.init();
      if (!powerMem.isReady()) return null;

      // Fetch existing profile and summary to help LLM merge/update
      const existingData = await powerMem.getProfileAndSummary(conversationId);
      
      const existingProfileStr = existingData.length > 0 
        ? "当前该对话已有的记忆信息如下（如果已有信息发生变化或需要补充，请提供更新/合并后的完整内容）：\n" + existingData.map((p: any) => `[${p.metadata?.type}] ${p.content}`).join("\n")
        : "当前该对话没有已知的记忆信息。";

      const isSummaryRound = round > 0 && round % summarizeFreq === 0;
      const summaryInstruction = isSummaryRound 
        ? `本次对话已达到第 ${round} 轮，请结合之前的历史记录和最后的回复，生成一段近期对话的详细总结，并标记为 'summary'。` 
        : `本次对话暂不需要生成新的对话总结（配置由于每 ${summarizeFreq} 轮生成一次）。`;

      const dialogueContext = recentHistory ? `${recentHistory}\nUser: ${userInput}\nAI: ${aiResponse}` : `User: ${userInput}\nAI: ${aiResponse}`;

      const sysPrompt = `分析以下对话并提取重要的事实、用户偏好或专业背景（作为用户画像），以及本次对话的详细总结。请返回一个JSON对象，包含一个名为'memories'的数组，数组中的每个元素是一个包含'type' (必须是 'profile', 'summary', 或 'fact') 和 'content' 属性的对象。**请务必使用与用户输入相同的语言进行输出**。

规则如下：
1. **用户画像 (profile)**：请更新或生成一段文字，描述AI对当前对话中用户的整体理解（包括偏好、背景等）。如果这是第一次对话，请务必生成此项。
2. **对话总结 (summary)**：${summaryInstruction}
3. **其他记忆 (fact)**：提取对话中发生的重要事实、事件或具体细节。

如果没有发现新事实且总结无需更新，请依然返回'profile'，其他可为空。\n\n${existingProfileStr}`;

      const chatRes = await llmProvider.chat([
        {
          role: "system",
          content: sysPrompt
        },
        {
          role: "user",
          content: dialogueContext
        }
      ], { model, response_format: { type: "json_object" }, isThinkingMode: false }, apiKey);

      let jsonStr = chatRes.content || "[]";
      const usage = chatRes.usage || null;
      
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

      return usage;
    } catch (error) {
      console.error("Memory ingestion error:", error);
      throw error;
    }
  }

  static async ingestSimple(userInput: string, aiResponse: string, llmProvider: ILLMProvider, apiKey: string, model: string, conversationId: string, conversationName: string, round: number, recentHistory?: string, isReasoning = false): Promise<any> {
    try {
      if (!apiKey || !conversationId) return null;

      const summaryKey = `[${conversationId}] summary`;
      const stmt = db.prepare("SELECT * FROM entity_memories WHERE entity_key = ?");
      const existingSummary = stmt.get(summaryKey) as any;
      const existingSummaryText = existingSummary ? existingSummary.entity_value : "暂无之前的总结。";

      const dialogueContext = recentHistory ? `${recentHistory}\nUser: ${userInput}\nAI: ${aiResponse}` : `User: ${userInput}\nAI: ${aiResponse}`;

      const sysPrompt = `你是一个对话总结助手。请结合之前的对话总结以及最新发生的对话，生成一个新的、完整的对话综合总结。要求用简明扼要的语言概括整个对话的发展、核心内容以及用户的关键诉求。无需提取细粒度事实或用户画像，只需要一个全局的总结摘要。**请务必使用与用户输入相同的语言进行输出**。

之前的总结：
${existingSummaryText}

请返回一个JSON对象，包含一个 'summary' 字段，其值为你生成的最新综合总结内容。`;

      const chatRes = await llmProvider.chat([
        {
          role: "system",
          content: sysPrompt
        },
        {
          role: "user",
          content: dialogueContext
        }
      ], { model, response_format: { type: "json_object" }, isThinkingMode: false }, apiKey);

      let jsonStr = chatRes.content || "{}";
      const usage = chatRes.usage || null;
      
      const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) {
        jsonStr = match[1];
      } else {
        jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
      }

      let summaryText = "";
      try {
        const parsed = JSON.parse(jsonStr);
        summaryText = parsed.summary || parsed.content || "";
      } catch (e) {
        if (jsonStr.length > 0 && !jsonStr.includes("{")) {
          summaryText = jsonStr; 
        }
      }

      if (summaryText && summaryText.trim().length > 0) {
        if (existingSummary) {
          db.prepare("UPDATE entity_memories SET entity_value = ?, last_accessed = CURRENT_TIMESTAMP WHERE entity_key = ?").run(summaryText.trim(), summaryKey);
        } else {
          db.prepare("INSERT INTO entity_memories (entity_key, entity_value) VALUES (?, ?)").run(summaryKey, summaryText.trim());
        }
      }

      return usage;
    } catch (error) {
      console.error("Simple memory ingestion error:", error);
      throw error;
    }
  }
}
