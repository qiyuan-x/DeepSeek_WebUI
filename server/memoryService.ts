import { GoogleGenAI, Type } from "@google/genai";
import db from "./db";

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  }
  return aiClient;
}

export class MemoryService {
  static async retrieve(query: string, apiKey: string, conversationName?: string): Promise<string> {
    try {
      if (!apiKey) {
        console.log("No API key provided for memory retrieval.");
        return "";
      }

      // 1. Get keys from SQLite, ordered by weight and last_accessed to prioritize important/recent memories
      // Filter by conversationName if provided to make memory conversation-specific
      let stmt;
      let rows;
      if (conversationName) {
        stmt = db.prepare("SELECT entity_key FROM entity_memories WHERE entity_key LIKE ? ORDER BY weight DESC, last_accessed DESC LIMIT 100");
        rows = stmt.all(`[${conversationName}]%`) as { entity_key: string }[];
      } else {
        stmt = db.prepare("SELECT entity_key FROM entity_memories ORDER BY weight DESC, last_accessed DESC LIMIT 100");
        rows = stmt.all() as { entity_key: string }[];
      }
      const keys = rows.map(r => r.entity_key);

      if (keys.length === 0) return "";

      // 2. Use DeepSeek to find relevant keys
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: "你是一个助手，负责根据用户查询从列表中识别相关的实体。请仅以逗号分隔的列表形式返回相关的键（keys）。如果没有相关的实体，请返回'NONE'。"
            },
            {
              role: "user",
              content: `User query: "${query}"\nList of known entities/facts:\n${keys.join(", ")}`
            }
          ]
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`DeepSeek API error: ${response.status} ${errText}`);
      }

      const data = await response.json();
      const relevantKeysStr = data.choices?.[0]?.message?.content || "NONE";
      
      if (relevantKeysStr.includes("NONE")) return "";

      const relevantKeys = relevantKeysStr.split(",").map(k => k.trim());

      // 3. Fetch values from SQLite and update last_accessed
      const facts: string[] = [];
      for (const key of relevantKeys) {
        const row = db.prepare("SELECT entity_value FROM entity_memories WHERE entity_key = ?").get(key) as { entity_value: string } | undefined;
        if (row) {
          facts.push(`${key}: ${row.entity_value}`);
          db.prepare("UPDATE entity_memories SET last_accessed = CURRENT_TIMESTAMP, weight = weight + 1 WHERE entity_key = ?").run(key);
        }
      }

      return facts.join("\n");
    } catch (error) {
      console.error("Memory Retrieval Error:", error);
      return "";
    }
  }

  static async ingest(userInput: string, aiResponse: string, apiKey: string, conversationId?: string, conversationName?: string, round?: number): Promise<void> {
    try {
      if (!apiKey) {
        console.log("No API key provided for memory ingestion.");
        return;
      }

      const prefix = conversationName ? `[${conversationName}] ` : "";
      const idPrefix = conversationId ? `[${conversationId}] ` : ""; // Use ID for stable querying if needed, but user requested name. Let's use name as prefix in the key.

      // Fetch existing user profile and summary for this conversation to help LLM merge/update
      const stmt = db.prepare("SELECT entity_key, entity_value FROM entity_memories WHERE entity_key LIKE ? OR entity_key LIKE ?");
      const existingData = stmt.all(`${prefix}用户画像`, `${prefix}对话总结-%`) as { entity_key: string, entity_value: string }[];
      
      const existingProfileStr = existingData.length > 0 
        ? "当前该对话已有的记忆信息如下（如果已有信息发生变化或需要补充，请使用相同的key并提供更新/合并后的完整value；如果是全新的信息类别，请使用新的key）：\n" + existingData.map(p => `${p.entity_key}: ${p.entity_value}`).join("\n")
        : "当前该对话没有已知的记忆信息。";

      const isSummaryRound = round && round > 0 && round % 5 === 0;
      const summaryInstruction = isSummaryRound 
        ? `本次对话已达到第 ${round} 轮，请生成一个名为 '${prefix}对话总结-${round - 4}-${round}轮对话' 的key，其value为这5轮对话的详细总结。` 
        : `本次对话暂不需要生成新的对话总结（每5轮生成一次）。`;

      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: `分析以下对话并提取重要的事实、用户偏好或专业背景（作为用户画像），以及本次对话的详细总结。请返回一个JSON对象，包含一个名为'memories'的数组，数组中的每个元素是一个包含'key'和'value'属性的对象。**请务必使用与用户输入相同的语言进行输出**。

规则如下：
1. **用户画像**：请更新或生成一个唯一的key '${prefix}用户画像'，其value为一段文字，描述AI对当前对话中用户的整体理解（包括偏好、背景等）。如果这是第一次对话，请务必生成此项。不要生成多个用户画像的key，只保留这一个。
2. **对话总结**：${summaryInstruction}
3. **其他记忆**：提取对话中发生的重要事实、事件或具体细节，使用描述性的key（例如 '${prefix}其他记忆-项目名称' 或 '${prefix}其他记忆-已解决的问题'），其value为具体的事实内容。

如果没有发现新事实且总结无需更新，请依然返回'用户画像'，其他可为空。\n\n${existingProfileStr}`
            },
            {
              role: "user",
              content: `User: ${userInput}\nAI: ${aiResponse}`
            }
          ],
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`DeepSeek API error: ${response.status} ${errText}`);
      }

      const data = await response.json();
      let jsonStr = data.choices?.[0]?.message?.content || "[]";
      
      // Clean up markdown formatting if present
      const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) {
        jsonStr = match[1];
      } else {
        jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
      }
      
      // DeepSeek json_object might return an object with a key containing the array
      let facts = [];
      try {
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) {
          facts = parsed;
        } else if (parsed && typeof parsed === 'object') {
          // Look for an array value
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

      console.log("Extracted facts:", facts);

      // Insert or update in SQLite
      const upsert = db.prepare(`
        INSERT INTO entity_memories (entity_key, entity_value, last_accessed, weight)
        VALUES (?, ?, CURRENT_TIMESTAMP, 1)
        ON CONFLICT(entity_key) DO UPDATE SET
          entity_value = excluded.entity_value,
          last_accessed = CURRENT_TIMESTAMP,
          weight = weight + 1
      `);

      for (const fact of facts) {
        upsert.run(fact.key, fact.value);
      }

      // Cleanup mechanism: keep only top 1000 memories by weight and recency
      // (Simplified: just delete oldest if count > 1000)
      const countRow = db.prepare("SELECT COUNT(*) as count FROM entity_memories").get() as { count: number };
      if (countRow.count > 1000) {
        db.prepare(`
          DELETE FROM entity_memories 
          WHERE entity_key IN (
            SELECT entity_key FROM entity_memories 
            ORDER BY weight ASC, last_accessed ASC 
            LIMIT ?
          )
        `).run(countRow.count - 1000);
      }

    } catch (error) {
      console.error("Memory Ingestion Error:", error);
    }
  }
}
