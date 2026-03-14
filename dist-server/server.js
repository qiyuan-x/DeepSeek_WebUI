// server.ts
import express from "express";
import path2 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import fs2 from "fs";
import dotenv from "dotenv";
import crypto from "crypto";

// server/memoryService.ts
import { GoogleGenAI } from "@google/genai";

// server/db.ts
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var DATA_DIR = process.env.DATA_PATH || path.join(__dirname, "..", "data");
var DB_PATH = path.join(DATA_DIR, "database", "memory.db");
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}
var db = new Database(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS chat_history (
    id TEXT PRIMARY KEY,
    conversation_id TEXT,
    role TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS entity_memories (
    entity_key TEXT PRIMARY KEY,
    entity_value TEXT,
    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
    weight INTEGER DEFAULT 1
  );
`);
var db_default = db;

// server/memoryService.ts
var MemoryService = class {
  static async retrieve(query, apiKey, conversationName) {
    try {
      if (!apiKey) {
        console.log("No API key provided for memory retrieval.");
        return "";
      }
      let stmt;
      let rows;
      if (conversationName) {
        stmt = db_default.prepare("SELECT entity_key FROM entity_memories WHERE entity_key LIKE ? ORDER BY weight DESC, last_accessed DESC LIMIT 100");
        rows = stmt.all(`[${conversationName}]%`);
      } else {
        stmt = db_default.prepare("SELECT entity_key FROM entity_memories ORDER BY weight DESC, last_accessed DESC LIMIT 100");
        rows = stmt.all();
      }
      const keys = rows.map((r) => r.entity_key);
      if (keys.length === 0) return "";
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
              content: "\u4F60\u662F\u4E00\u4E2A\u52A9\u624B\uFF0C\u8D1F\u8D23\u6839\u636E\u7528\u6237\u67E5\u8BE2\u4ECE\u5217\u8868\u4E2D\u8BC6\u522B\u76F8\u5173\u7684\u5B9E\u4F53\u3002\u8BF7\u4EC5\u4EE5\u9017\u53F7\u5206\u9694\u7684\u5217\u8868\u5F62\u5F0F\u8FD4\u56DE\u76F8\u5173\u7684\u952E\uFF08keys\uFF09\u3002\u5982\u679C\u6CA1\u6709\u76F8\u5173\u7684\u5B9E\u4F53\uFF0C\u8BF7\u8FD4\u56DE'NONE'\u3002"
            },
            {
              role: "user",
              content: `User query: "${query}"
List of known entities/facts:
${keys.join(", ")}`
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
      const relevantKeys = relevantKeysStr.split(",").map((k) => k.trim());
      const facts = [];
      for (const key of relevantKeys) {
        const row = db_default.prepare("SELECT entity_value FROM entity_memories WHERE entity_key = ?").get(key);
        if (row) {
          facts.push(`${key}: ${row.entity_value}`);
          db_default.prepare("UPDATE entity_memories SET last_accessed = CURRENT_TIMESTAMP, weight = weight + 1 WHERE entity_key = ?").run(key);
        }
      }
      return facts.join("\n");
    } catch (error) {
      console.error("Memory Retrieval Error:", error);
      return "";
    }
  }
  static async ingest(userInput, aiResponse, apiKey, conversationId, conversationName, round) {
    try {
      if (!apiKey) {
        console.log("No API key provided for memory ingestion.");
        return;
      }
      const prefix = conversationName ? `[${conversationName}] ` : "";
      const idPrefix = conversationId ? `[${conversationId}] ` : "";
      const stmt = db_default.prepare("SELECT entity_key, entity_value FROM entity_memories WHERE entity_key LIKE ? OR entity_key LIKE ?");
      const existingData = stmt.all(`${prefix}\u7528\u6237\u753B\u50CF`, `${prefix}\u5BF9\u8BDD\u603B\u7ED3-%`);
      const existingProfileStr = existingData.length > 0 ? "\u5F53\u524D\u8BE5\u5BF9\u8BDD\u5DF2\u6709\u7684\u8BB0\u5FC6\u4FE1\u606F\u5982\u4E0B\uFF08\u5982\u679C\u5DF2\u6709\u4FE1\u606F\u53D1\u751F\u53D8\u5316\u6216\u9700\u8981\u8865\u5145\uFF0C\u8BF7\u4F7F\u7528\u76F8\u540C\u7684key\u5E76\u63D0\u4F9B\u66F4\u65B0/\u5408\u5E76\u540E\u7684\u5B8C\u6574value\uFF1B\u5982\u679C\u662F\u5168\u65B0\u7684\u4FE1\u606F\u7C7B\u522B\uFF0C\u8BF7\u4F7F\u7528\u65B0\u7684key\uFF09\uFF1A\n" + existingData.map((p) => `${p.entity_key}: ${p.entity_value}`).join("\n") : "\u5F53\u524D\u8BE5\u5BF9\u8BDD\u6CA1\u6709\u5DF2\u77E5\u7684\u8BB0\u5FC6\u4FE1\u606F\u3002";
      const isSummaryRound = round && round > 0 && round % 5 === 0;
      const summaryInstruction = isSummaryRound ? `\u672C\u6B21\u5BF9\u8BDD\u5DF2\u8FBE\u5230\u7B2C ${round} \u8F6E\uFF0C\u8BF7\u751F\u6210\u4E00\u4E2A\u540D\u4E3A '${prefix}\u5BF9\u8BDD\u603B\u7ED3-${round - 4}-${round}\u8F6E\u5BF9\u8BDD' \u7684key\uFF0C\u5176value\u4E3A\u8FD95\u8F6E\u5BF9\u8BDD\u7684\u8BE6\u7EC6\u603B\u7ED3\u3002` : `\u672C\u6B21\u5BF9\u8BDD\u6682\u4E0D\u9700\u8981\u751F\u6210\u65B0\u7684\u5BF9\u8BDD\u603B\u7ED3\uFF08\u6BCF5\u8F6E\u751F\u6210\u4E00\u6B21\uFF09\u3002`;
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
              content: `\u5206\u6790\u4EE5\u4E0B\u5BF9\u8BDD\u5E76\u63D0\u53D6\u91CD\u8981\u7684\u4E8B\u5B9E\u3001\u7528\u6237\u504F\u597D\u6216\u4E13\u4E1A\u80CC\u666F\uFF08\u4F5C\u4E3A\u7528\u6237\u753B\u50CF\uFF09\uFF0C\u4EE5\u53CA\u672C\u6B21\u5BF9\u8BDD\u7684\u8BE6\u7EC6\u603B\u7ED3\u3002\u8BF7\u8FD4\u56DE\u4E00\u4E2AJSON\u5BF9\u8C61\uFF0C\u5305\u542B\u4E00\u4E2A\u540D\u4E3A'memories'\u7684\u6570\u7EC4\uFF0C\u6570\u7EC4\u4E2D\u7684\u6BCF\u4E2A\u5143\u7D20\u662F\u4E00\u4E2A\u5305\u542B'key'\u548C'value'\u5C5E\u6027\u7684\u5BF9\u8C61\u3002**\u8BF7\u52A1\u5FC5\u4F7F\u7528\u4E0E\u7528\u6237\u8F93\u5165\u76F8\u540C\u7684\u8BED\u8A00\u8FDB\u884C\u8F93\u51FA**\u3002

\u89C4\u5219\u5982\u4E0B\uFF1A
1. **\u7528\u6237\u753B\u50CF**\uFF1A\u8BF7\u66F4\u65B0\u6216\u751F\u6210\u4E00\u4E2A\u552F\u4E00\u7684key '${prefix}\u7528\u6237\u753B\u50CF'\uFF0C\u5176value\u4E3A\u4E00\u6BB5\u6587\u5B57\uFF0C\u63CF\u8FF0AI\u5BF9\u5F53\u524D\u5BF9\u8BDD\u4E2D\u7528\u6237\u7684\u6574\u4F53\u7406\u89E3\uFF08\u5305\u62EC\u504F\u597D\u3001\u80CC\u666F\u7B49\uFF09\u3002\u5982\u679C\u8FD9\u662F\u7B2C\u4E00\u6B21\u5BF9\u8BDD\uFF0C\u8BF7\u52A1\u5FC5\u751F\u6210\u6B64\u9879\u3002\u4E0D\u8981\u751F\u6210\u591A\u4E2A\u7528\u6237\u753B\u50CF\u7684key\uFF0C\u53EA\u4FDD\u7559\u8FD9\u4E00\u4E2A\u3002
2. **\u5BF9\u8BDD\u603B\u7ED3**\uFF1A${summaryInstruction}
3. **\u5176\u4ED6\u8BB0\u5FC6**\uFF1A\u63D0\u53D6\u5BF9\u8BDD\u4E2D\u53D1\u751F\u7684\u91CD\u8981\u4E8B\u5B9E\u3001\u4E8B\u4EF6\u6216\u5177\u4F53\u7EC6\u8282\uFF0C\u4F7F\u7528\u63CF\u8FF0\u6027\u7684key\uFF08\u4F8B\u5982 '${prefix}\u5176\u4ED6\u8BB0\u5FC6-\u9879\u76EE\u540D\u79F0' \u6216 '${prefix}\u5176\u4ED6\u8BB0\u5FC6-\u5DF2\u89E3\u51B3\u7684\u95EE\u9898'\uFF09\uFF0C\u5176value\u4E3A\u5177\u4F53\u7684\u4E8B\u5B9E\u5185\u5BB9\u3002

\u5982\u679C\u6CA1\u6709\u53D1\u73B0\u65B0\u4E8B\u5B9E\u4E14\u603B\u7ED3\u65E0\u9700\u66F4\u65B0\uFF0C\u8BF7\u4F9D\u7136\u8FD4\u56DE'\u7528\u6237\u753B\u50CF'\uFF0C\u5176\u4ED6\u53EF\u4E3A\u7A7A\u3002

${existingProfileStr}`
            },
            {
              role: "user",
              content: `User: ${userInput}
AI: ${aiResponse}`
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
      const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) {
        jsonStr = match[1];
      } else {
        jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "").trim();
      }
      let facts = [];
      try {
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) {
          facts = parsed;
        } else if (parsed && typeof parsed === "object") {
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
      const upsert = db_default.prepare(`
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
      const countRow = db_default.prepare("SELECT COUNT(*) as count FROM entity_memories").get();
      if (countRow.count > 1e3) {
        db_default.prepare(`
          DELETE FROM entity_memories 
          WHERE entity_key IN (
            SELECT entity_key FROM entity_memories 
            ORDER BY weight ASC, last_accessed ASC 
            LIMIT ?
          )
        `).run(countRow.count - 1e3);
      }
    } catch (error) {
      console.error("Memory Ingestion Error:", error);
    }
  }
};

// server.ts
dotenv.config();
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path2.dirname(__filename2);
var DATA_DIR2 = process.env.DATA_PATH || path2.join(__dirname2, "data");
var DB_DIR = path2.join(DATA_DIR2, "database");
var CONFIG_DIR = path2.join(DATA_DIR2, "config");
[DB_DIR, CONFIG_DIR].forEach((dir) => {
  if (!fs2.existsSync(dir)) {
    fs2.mkdirSync(dir, { recursive: true });
  }
});
var INDEX_FILE = path2.join(DB_DIR, "index.json");
function sanitizeFolderName(name) {
  return name.replace(/[<>:"/\\|?*]/g, "_").trim() || "Untitled";
}
function getConvDir(title, id) {
  return path2.join(DB_DIR, `${sanitizeFolderName(title)}_${id.slice(0, 8)}`);
}
function readJson(file, defaultVal = []) {
  if (!fs2.existsSync(file)) return defaultVal;
  try {
    return JSON.parse(fs2.readFileSync(file, "utf-8"));
  } catch (error) {
    console.error(`Error reading ${file}:`, error);
    return defaultVal;
  }
}
function writeJson(file, data) {
  fs2.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}
if (!fs2.existsSync(INDEX_FILE)) writeJson(INDEX_FILE, []);
async function startServer() {
  const app = express();
  const PORT = 3e3;
  app.use(express.json());
  const SETTINGS_FILE = path2.join(CONFIG_DIR, "settings.json");
  app.get("/api/settings", (req, res) => {
    try {
      if (fs2.existsSync(SETTINGS_FILE)) {
        const data = fs2.readFileSync(SETTINGS_FILE, "utf-8");
        res.json(JSON.parse(data));
      } else {
        res.json({});
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to load settings" });
    }
  });
  app.post("/api/settings", (req, res) => {
    try {
      fs2.writeFileSync(SETTINGS_FILE, JSON.stringify(req.body, null, 2));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save settings" });
    }
  });
  app.get("/api/memories", (req, res) => {
    try {
      const { conversationName } = req.query;
      let stmt;
      let memories = [];
      if (conversationName) {
        stmt = db_default.prepare("SELECT * FROM entity_memories WHERE entity_key LIKE ? ORDER BY weight DESC, last_accessed DESC");
        memories = stmt.all(`[${conversationName}]%`);
      }
      res.json(memories);
    } catch (error) {
      console.error("Failed to fetch memories:", error);
      res.status(500).json({ error: "Failed to fetch memories" });
    }
  });
  app.get("/api/conversations", (req, res) => {
    const index = readJson(INDEX_FILE);
    const convs = index.map((item) => {
      const settingsFile = path2.join(item.path, "settings.json");
      return readJson(settingsFile, null);
    }).filter((c) => c !== null);
    convs.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    res.json(convs);
  });
  app.get("/api/conversations/:id/messages", (req, res) => {
    const index = readJson(INDEX_FILE);
    const item = index.find((i) => i.id === req.params.id);
    if (!item) return res.json([]);
    const msgFile = path2.join(item.path, "messages.json");
    const msgs = readJson(msgFile);
    msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    res.json(msgs);
  });
  app.post("/api/conversations", (req, res) => {
    const index = readJson(INDEX_FILE);
    const id = req.body.id || crypto.randomUUID();
    const title = req.body.title || "New Chat";
    const convDir = getConvDir(title, id);
    if (!fs2.existsSync(convDir)) {
      fs2.mkdirSync(convDir, { recursive: true });
    }
    const newConv = {
      ...req.body,
      id,
      title,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    writeJson(path2.join(convDir, "settings.json"), newConv);
    writeJson(path2.join(convDir, "messages.json"), []);
    index.push({ id, title, path: convDir });
    writeJson(INDEX_FILE, index);
    res.json({ success: true, conversation: newConv });
  });
  app.patch("/api/conversations/:id", (req, res) => {
    const index = readJson(INDEX_FILE);
    const idx = index.findIndex((i) => i.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    const item = index[idx];
    const settingsFile = path2.join(item.path, "settings.json");
    const conv = readJson(settingsFile, {});
    if (req.body.title !== void 0 && req.body.title !== conv.title) {
      const oldTitle = conv.title;
      const newTitle = req.body.title;
      const newDir = getConvDir(newTitle, req.params.id);
      if (fs2.existsSync(item.path)) {
        fs2.renameSync(item.path, newDir);
      }
      item.path = newDir;
      item.title = newTitle;
      conv.title = newTitle;
      try {
        const stmt = db_default.prepare("UPDATE entity_memories SET entity_key = REPLACE(entity_key, ?, ?) WHERE entity_key LIKE ?");
        stmt.run(`[${oldTitle}] `, `[${newTitle}] `, `[${oldTitle}] %`);
      } catch (e) {
        console.error("Failed to rename memory keys:", e);
      }
    }
    if (req.body.system_prompt !== void 0) conv.system_prompt = req.body.system_prompt;
    if (req.body.model !== void 0) conv.model = req.body.model;
    conv.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    writeJson(path2.join(item.path, "settings.json"), conv);
    writeJson(INDEX_FILE, index);
    res.json({ success: true });
  });
  app.delete("/api/conversations/:id", (req, res) => {
    try {
      let index = readJson(INDEX_FILE);
      const item = index.find((i) => i.id === req.params.id);
      if (item) {
        if (fs2.existsSync(item.path)) {
          fs2.rmSync(item.path, { recursive: true, force: true });
        }
        index = index.filter((i) => i.id !== req.params.id);
        writeJson(INDEX_FILE, index);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  app.post("/api/messages", (req, res) => {
    const { id, conversation_id, role, content, reasoning_content, tokens, cost, response_time } = req.body;
    const index = readJson(INDEX_FILE);
    const item = index.find((i) => i.id === conversation_id);
    if (!item) return res.status(404).json({ error: "Conversation not found" });
    const msgFile = path2.join(item.path, "messages.json");
    const msgs = readJson(msgFile);
    const idx = msgs.findIndex((m) => m.id === id);
    if (idx !== -1) {
      msgs[idx] = {
        ...msgs[idx],
        content,
        reasoning_content: reasoning_content || msgs[idx].reasoning_content,
        tokens: tokens || msgs[idx].tokens,
        cost: cost || msgs[idx].cost,
        response_time: response_time || msgs[idx].response_time
      };
    } else {
      const newMsg = {
        id,
        conversation_id,
        role,
        content,
        reasoning_content: reasoning_content || null,
        tokens: tokens || 0,
        cost: cost || 0,
        response_time: response_time || 0,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      msgs.push(newMsg);
    }
    writeJson(msgFile, msgs);
    const settingsFile = path2.join(item.path, "settings.json");
    const conv = readJson(settingsFile, {});
    conv.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    writeJson(settingsFile, conv);
    res.json({ success: true });
  });
  app.delete("/api/messages/:id", (req, res) => {
    try {
      const index = readJson(INDEX_FILE);
      for (const item of index) {
        const msgFile = path2.join(item.path, "messages.json");
        let msgs = readJson(msgFile);
        const originalLen = msgs.length;
        msgs = msgs.filter((m) => m.id !== req.params.id);
        if (msgs.length !== originalLen) {
          writeJson(msgFile, msgs);
          break;
        }
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete Message Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  app.get("/api/balance", async (req, res) => {
    const authHeader = req.headers.authorization;
    const apiKey = authHeader ? authHeader.split(" ")[1] : process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return res.status(401).json({ error: "API Key required" });
    try {
      const response = await fetch("https://api.deepseek.com/user/balance", {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch balance" });
    }
  });
  app.post("/api/chat", async (req, res) => {
    const { messages, systemPrompt, model, temperature, stream, apiKey: userApiKey, stream_options, useTieredMemory, conversationId, conversationName } = req.body;
    const apiKey = userApiKey !== void 0 && userApiKey !== null ? userApiKey : process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return res.status(401).json({ error: "API Key required" });
    try {
      let finalMessages = [...messages];
      if (systemPrompt) {
        finalMessages.unshift({ role: "system", content: systemPrompt });
      }
      let lastUserMsg = messages.filter((m) => m.role === "user").pop();
      if (useTieredMemory && lastUserMsg) {
        const facts = await MemoryService.retrieve(lastUserMsg.content, apiKey, conversationName);
        const prefix = conversationName ? `[${conversationName}] ` : "";
        const profileStmt = db_default.prepare("SELECT entity_value FROM entity_memories WHERE entity_key LIKE ?");
        const profileData = profileStmt.all(`${prefix}\u7528\u6237\u753B\u50CF%`);
        const summaryStmt = db_default.prepare("SELECT entity_key, entity_value FROM entity_memories WHERE entity_key LIKE ? ORDER BY last_accessed DESC LIMIT 5");
        const summaryData = summaryStmt.all(`${prefix}\u5BF9\u8BDD\u603B\u7ED3-%`);
        let memoryContext = facts || "";
        if (profileData.length > 0) {
          memoryContext += `

[\u7528\u6237\u753B\u50CF]
${profileData.map((p) => p.entity_value).join("\n")}`;
        }
        if (summaryData.length > 0) {
          memoryContext += `

[\u5386\u53F2\u5BF9\u8BDD\u603B\u7ED3]
${summaryData.map((p) => `${p.entity_key}: ${p.entity_value}`).join("\n")}`;
        }
        if (memoryContext.trim()) {
          const sysIdx = finalMessages.findIndex((m) => m.role === "system");
          const factPrompt = `

=== \u9644\u52A0\u80CC\u666F\u4FE1\u606F ===
\u4EE5\u4E0B\u662F\u5173\u4E8E\u7528\u6237\u548C\u5386\u53F2\u5BF9\u8BDD\u7684\u8BB0\u5FC6\uFF0C\u8BF7\u5728\u56DE\u7B54\u65F6\u4F5C\u4E3A\u53C2\u8003\uFF08\u4F46\u5FC5\u987B\u4F18\u5148\u9075\u5FAA\u4E0A\u8FF0\u7684\u4EBA\u7269\u8BBE\u5B9A\uFF09\uFF1A
${memoryContext.trim()}`;
          if (sysIdx !== -1) {
            finalMessages[sysIdx].content += factPrompt;
          } else {
            finalMessages.unshift({ role: "system", content: `\u4F60\u662F\u4E00\u4E2A\u52A9\u624B\u3002${factPrompt}` });
          }
        }
        const systemMsgs = finalMessages.filter((m) => m.role === "system");
        const otherMsgs = finalMessages.filter((m) => m.role !== "system");
        let recentMsgs = otherMsgs.slice(-10);
        if (recentMsgs.length > 0 && recentMsgs[0].role !== "user") {
          recentMsgs.shift();
        }
        finalMessages = [...systemMsgs, ...recentMsgs];
      }
      const sysMsg = finalMessages.find((m) => m.role === "system");
      if (sysMsg && sysMsg.content) {
        const lastMsgIdx = finalMessages.length - 1;
        if (lastMsgIdx >= 0 && finalMessages[lastMsgIdx].role === "user") {
          const originalSysPrompt = sysMsg.content.split("\n\n=== \u9644\u52A0\u80CC\u666F\u4FE1\u606F ===")[0].trim();
          if (originalSysPrompt && originalSysPrompt !== "\u4F60\u662F\u4E00\u4E2A\u52A9\u624B\u3002") {
            finalMessages[lastMsgIdx].content += `

[\u7CFB\u7EDF\u63D0\u793A\uFF1A\u8BF7\u4E25\u683C\u9075\u5FAA\u4F60\u7684\u4EBA\u7269\u8BBE\u5B9A\uFF1A\u201C${originalSysPrompt}\u201D\uFF0C\u4E0D\u8981\u53D7\u5386\u53F2\u5BF9\u8BDD\u98CE\u683C\u7684\u5F71\u54CD\u3002]`;
          }
        }
      }
      const body = {
        model,
        messages: finalMessages,
        temperature,
        stream
      };
      console.log("Sending to DeepSeek API:", JSON.stringify(body.messages, null, 2));
      if (stream && stream_options) {
        body.stream_options = stream_options;
      }
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const text = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(text);
        } catch (e) {
          errorData = { error: { message: `DeepSeek API Error (${response.status}): ${text.substring(0, 100)}` } };
        }
        return res.status(response.status).json(errorData);
      }
      if (stream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader");
        let fullResponse = "";
        let buffer = "";
        const decoder = new TextDecoder("utf-8");
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6).trim();
              if (dataStr === "[DONE]") continue;
              try {
                const data = JSON.parse(dataStr);
                if (data.choices?.[0]?.delta?.content) {
                  fullResponse += data.choices[0].delta.content;
                }
              } catch (e) {
              }
            }
          }
          res.write(value);
        }
        if (buffer) {
          const lines = buffer.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6).trim();
              if (dataStr === "[DONE]") continue;
              try {
                const data = JSON.parse(dataStr);
                if (data.choices?.[0]?.delta?.content) {
                  fullResponse += data.choices[0].delta.content;
                }
              } catch (e) {
              }
            }
          }
        }
        res.end();
        if (useTieredMemory && lastUserMsg && fullResponse) {
          const round = Math.ceil(messages.length / 2);
          console.log("Ingesting memory:", lastUserMsg.content, "=>", fullResponse.substring(0, 50) + "...");
          MemoryService.ingest(lastUserMsg.content, fullResponse, apiKey, conversationId, conversationName, round).catch((err) => console.error("Ingest error:", err));
        }
      } else {
        const data = await response.json();
        const aiResponse = data.choices?.[0]?.message?.content;
        if (useTieredMemory && lastUserMsg && aiResponse) {
          const round = Math.ceil(messages.length / 2);
          MemoryService.ingest(lastUserMsg.content, aiResponse, apiKey, conversationId, conversationName, round).catch((err) => console.error("Ingest error:", err));
        }
        res.json(data);
      }
    } catch (error) {
      console.error("Chat Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  const __dirname3 = path2.dirname(fileURLToPath2(import.meta.url));
  const distPath = path2.resolve(path2.dirname(__dirname3), "dist");
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path2.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
