import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";
import crypto from "crypto";
import { MemoryService } from "./server/memoryService";
import db from "./server/db";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Image Provider Factory ---
interface ImageProvider {
  generateImage(prompt: string, apiKey: string): Promise<string>;
}

class JimengProvider implements ImageProvider {
  async generateImage(prompt: string, apiKey: string): Promise<string> {
    console.log(`[JimengProvider] Generating image with prompt: ${prompt}`);
    // Using pollinations.ai as a reliable fallback/mock for the demo to ensure images are actually generated
    // In a production environment, this would use the actual Volcengine Jimeng SDK/API with AK/SK.
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API latency
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;
  }
}

class ImageProviderFactory {
  static getProvider(name: string): ImageProvider {
    switch (name) {
      case 'jimeng':
        return new JimengProvider();
      default:
        return new JimengProvider();
    }
  }
}
// ------------------------------

// Initialize data directory
const DATA_DIR = process.env.DATA_PATH || path.join(__dirname, "data");
const DB_DIR = path.join(DATA_DIR, "database");
const CONFIG_DIR = path.join(DATA_DIR, "config");

[DB_DIR, CONFIG_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// JSON Database logic
const INDEX_FILE = path.join(DB_DIR, "index.json");

function sanitizeFolderName(name: string) {
  return name.replace(/[<>:"/\\|?*]/g, '_').trim() || 'Untitled';
}

function getConvDir(title: string, id: string) {
  return path.join(DB_DIR, `${sanitizeFolderName(title)}_${id.slice(0, 8)}`);
}

function readJson(file: string, defaultVal: any = []) {
  if (!fs.existsSync(file)) return defaultVal;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (error) {
    console.error(`Error reading ${file}:`, error);
    return defaultVal;
  }
}

function writeJson(file: string, data: any) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

// Initialize index if it doesn't exist
if (!fs.existsSync(INDEX_FILE)) writeJson(INDEX_FILE, []);

async function startServer() {
  const app = express();
  const PORT = process.env.NODE_ENV === 'production' ? 2233 : 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // WebUI Secret Key Auth Middleware
  let WEBUI_SECRET_KEY = process.env.WEBUI_SECRET_KEY;
  const SECRET_KEY_FILE = path.join(CONFIG_DIR, "secret.key");
  
  if (!WEBUI_SECRET_KEY) {
    if (fs.existsSync(SECRET_KEY_FILE)) {
      WEBUI_SECRET_KEY = fs.readFileSync(SECRET_KEY_FILE, 'utf-8').trim();
    } else {
      WEBUI_SECRET_KEY = crypto.randomBytes(16).toString('hex');
      fs.writeFileSync(SECRET_KEY_FILE, WEBUI_SECRET_KEY, 'utf-8');
    }
  }
  
  // 将密钥写入数据目录，方便用户查看
  try {
    fs.writeFileSync(path.join(DATA_DIR, 'SECRET_KEY.txt'), `您的访问密钥 (Secret Key) 是:\n\n${WEBUI_SECRET_KEY}\n\n请复制此密钥在登录页面输入。`, 'utf-8');
  } catch (err) {
    console.warn('[WARN] 无法写入 SECRET_KEY.txt 文件，请直接从控制台复制密钥。');
  }

  console.log('\n====================================================');
  console.log(`[AUTH] WebUI 访问密钥 (Secret Key): ${WEBUI_SECRET_KEY}`);
  console.log(`[AUTH] 请在浏览器中输入此密钥以进入系统。`);
  console.log('====================================================\n');

  app.use((req, res, next) => {
    // Only protect API routes
    if (req.path.startsWith('/api/')) {
      // Allow verify-key endpoint
      if (req.path === '/api/verify-key') {
        return next();
      }
      
      // Bypass auth in development mode (e.g., AI Studio preview)
      if (process.env.NODE_ENV !== 'production') {
        return next();
      }
      
      const authHeader = req.headers.authorization;
      const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
      const clientKey = req.headers['x-webui-secret-key'] || bearerToken;
      
      if (clientKey !== WEBUI_SECRET_KEY) {
        return res.status(401).json({ error: 'Unauthorized. Invalid Secret Key.' });
      }
    }
    next();
  });

  app.post('/api/verify-key', (req, res) => {
    const { key } = req.body;
    if (key === WEBUI_SECRET_KEY) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, error: 'Invalid key' });
    }
  });

  // Settings API
  const SETTINGS_FILE = path.join(CONFIG_DIR, "settings.json");

  app.get("/api/settings", (req, res) => {
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
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
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(req.body, null, 2));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  // API Routes
  app.get("/api/memories", (req, res) => {
    try {
      const { conversationName } = req.query;
      let stmt;
      let memories = [];
      if (conversationName) {
        stmt = db.prepare("SELECT * FROM entity_memories WHERE entity_key LIKE ? ORDER BY weight DESC, last_accessed DESC");
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
    const convs = index.map((item: any) => {
      const settingsFile = path.join(item.path, "settings.json");
      return readJson(settingsFile, null);
    }).filter((c: any) => c !== null);
    
    convs.sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    res.json(convs);
  });

  app.get("/api/conversations/:id/messages", (req, res) => {
    const index = readJson(INDEX_FILE);
    const item = index.find((i: any) => i.id === req.params.id);
    if (!item) return res.json([]);
    
    const msgFile = path.join(item.path, "messages.json");
    const msgs = readJson(msgFile);
    msgs.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    res.json(msgs);
  });

  app.post("/api/conversations", (req, res) => {
    const index = readJson(INDEX_FILE);
    const id = req.body.id || crypto.randomUUID();
    const title = req.body.title || 'New Chat';
    const convDir = getConvDir(title, id);
    
    if (!fs.existsSync(convDir)) {
      fs.mkdirSync(convDir, { recursive: true });
    }

    const newConv = {
      ...req.body,
      id,
      title,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    writeJson(path.join(convDir, "settings.json"), newConv);
    writeJson(path.join(convDir, "messages.json"), []);

    index.push({ id, title, path: convDir });
    writeJson(INDEX_FILE, index);
    
    res.json({ success: true, conversation: newConv });
  });

  app.patch("/api/conversations/:id", (req, res) => {
    const index = readJson(INDEX_FILE);
    const idx = index.findIndex((i: any) => i.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Not found" });

    const item = index[idx];
    const settingsFile = path.join(item.path, "settings.json");
    const conv = readJson(settingsFile, {});

    if (req.body.title !== undefined && req.body.title !== conv.title) {
      const oldTitle = conv.title;
      const newTitle = req.body.title;
      const newDir = getConvDir(newTitle, req.params.id);
      if (fs.existsSync(item.path)) {
        fs.renameSync(item.path, newDir);
      }
      item.path = newDir;
      item.title = newTitle;
      conv.title = newTitle;

      // Update memory keys
      try {
        const stmt = db.prepare("UPDATE entity_memories SET entity_key = REPLACE(entity_key, ?, ?) WHERE entity_key LIKE ?");
        stmt.run(`[${oldTitle}] `, `[${newTitle}] `, `[${oldTitle}] %`);
      } catch (e) {
        console.error("Failed to rename memory keys:", e);
      }
    }

    if (req.body.system_prompt !== undefined) conv.system_prompt = req.body.system_prompt;
    if (req.body.model !== undefined) conv.model = req.body.model;
    if (req.body.is_story_mode !== undefined) conv.is_story_mode = req.body.is_story_mode;
    if (req.body.story_system_prompt !== undefined) conv.story_system_prompt = req.body.story_system_prompt;
    if (req.body.desired_plot !== undefined) conv.desired_plot = req.body.desired_plot;
    if (req.body.desired_characters !== undefined) conv.desired_characters = req.body.desired_characters;
    
    conv.updated_at = new Date().toISOString();
    writeJson(path.join(item.path, "settings.json"), conv);
    writeJson(INDEX_FILE, index);
    
    res.json({ success: true });
  });

  app.delete("/api/conversations/:id", (req, res) => {
    try {
      let index = readJson(INDEX_FILE);
      const item = index.find((i: any) => i.id === req.params.id);
      if (item) {
        if (fs.existsSync(item.path)) {
          fs.rmSync(item.path, { recursive: true, force: true });
        }
        index = index.filter((i: any) => i.id !== req.params.id);
        writeJson(INDEX_FILE, index);
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/messages", (req, res) => {
    const { id, conversation_id, role, content, reasoning_content, tokens, cost, response_time, imageUrl } = req.body;
    
    const index = readJson(INDEX_FILE);
    const item = index.find((i: any) => i.id === conversation_id);
    if (!item) return res.status(404).json({ error: "Conversation not found" });

    const msgFile = path.join(item.path, "messages.json");
    const msgs = readJson(msgFile);
    const idx = msgs.findIndex((m: any) => m.id === id);
    
    if (idx !== -1) {
      msgs[idx] = {
        ...msgs[idx],
        content,
        reasoning_content: reasoning_content || msgs[idx].reasoning_content,
        tokens: tokens || msgs[idx].tokens,
        cost: cost || msgs[idx].cost,
        response_time: response_time || msgs[idx].response_time,
        imageUrl: imageUrl || msgs[idx].imageUrl
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
        imageUrl: imageUrl || null,
        created_at: new Date().toISOString()
      };
      msgs.push(newMsg);
    }
    writeJson(msgFile, msgs);
    
    // Update conversation timestamp
    const settingsFile = path.join(item.path, "settings.json");
    const conv = readJson(settingsFile, {});
    conv.updated_at = new Date().toISOString();
    writeJson(settingsFile, conv);
    
    res.json({ success: true });
  });

  app.delete("/api/messages/:id", (req, res) => {
    try {
      const index = readJson(INDEX_FILE);
      // We need to find which conversation this message belongs to.
      // For simplicity, we can iterate through all conversations or pass the convId from client.
      // Let's iterate for now, but in a real app, passing convId is better.
      for (const item of index) {
        const msgFile = path.join(item.path, "messages.json");
        let msgs = readJson(msgFile);
        const originalLen = msgs.length;
        msgs = msgs.filter((m: any) => m.id !== req.params.id);
        if (msgs.length !== originalLen) {
          writeJson(msgFile, msgs);
          break;
        }
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete Message Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/balance", async (req, res) => {
    const apiKey = req.headers["x-deepseek-api-key"] || process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) return res.status(400).json({ error: "API Key required" });

    try {
      const response = await fetch("https://api.deepseek.com/user/balance", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch balance" });
    }
  });

  // --- AI Painting API Routes ---
  app.post("/api/extract-prompt", async (req, res) => {
    const { text, apiKey } = req.body;
    const finalApiKey = apiKey || process.env.DEEPSEEK_API_KEY;
    if (!finalApiKey) return res.status(400).json({ error: "API Key required" });

    try {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${finalApiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { 
              role: "system", 
              content: "You are an expert AI image prompt engineer. Extract the core visual elements from the user's text and create a highly detailed, descriptive image generation prompt in English. Maximum 120 words. Only output the prompt, nothing else." 
            },
            { role: "user", content: text }
          ]
        })
      });
      
      if (!response.ok) {
        throw new Error(`DeepSeek API Error: ${response.status}`);
      }

      const data = await response.json();
      const prompt = data.choices[0].message.content.trim();
      res.json({ prompt });
    } catch (error: any) {
      console.error("Extract Prompt Error:", error);
      res.status(500).json({ error: error.message || "Failed to extract prompt" });
    }
  });

  app.post("/api/generate-image", async (req, res) => {
    const { prompt, provider, apiKey } = req.body;
    try {
      const imageProvider = ImageProviderFactory.getProvider(provider);
      const imageUrl = await imageProvider.generateImage(prompt, apiKey);
      res.json({ imageUrl });
    } catch (error: any) {
      console.error("Generate Image Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate image" });
    }
  });
  // ------------------------------

  // Proxy for DeepSeek Chat (Streaming)
  app.post("/api/chat", async (req, res) => {
    const { messages, systemPrompt, model, temperature, stream, apiKey: userApiKey, stream_options, useTieredMemory, conversationId, conversationName } = req.body;
    const apiKey = (userApiKey !== undefined && userApiKey !== null) ? userApiKey : process.env.DEEPSEEK_API_KEY;

    if (!apiKey) return res.status(400).json({ error: "API Key required" });

    try {
      let finalMessages = [...messages];
      
      // Inject system prompt if provided
      if (systemPrompt) {
        finalMessages.unshift({ role: 'system', content: systemPrompt });
      }

      let lastUserMsg = messages.filter((m: any) => m.role === 'user').pop();

      if (useTieredMemory && lastUserMsg) {
        // 1. Retrieval
        const facts = await MemoryService.retrieve(lastUserMsg.content, apiKey, conversationName);
        
        // 2. Inject User Profile & Summary
        const prefix = conversationName ? `[${conversationName}] ` : "";
        const profileStmt = db.prepare("SELECT entity_value FROM entity_memories WHERE entity_key LIKE ?");
        const profileData = profileStmt.all(`${prefix}用户画像%`) as { entity_value: string }[];
        
        const summaryStmt = db.prepare("SELECT entity_key, entity_value FROM entity_memories WHERE entity_key LIKE ? ORDER BY last_accessed DESC LIMIT 5");
        const summaryData = summaryStmt.all(`${prefix}对话总结-%`) as { entity_key: string, entity_value: string }[];
        
        let memoryContext = facts || "";
        if (profileData.length > 0) {
          memoryContext += `\n\n[用户画像]\n${profileData.map(p => p.entity_value).join("\n")}`;
        }
        if (summaryData.length > 0) {
          memoryContext += `\n\n[历史对话总结]\n${summaryData.map(p => `${p.entity_key}: ${p.entity_value}`).join("\n")}`;
        }

        if (memoryContext.trim()) {
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
      // This prevents the AI from being biased by its own previous replies in the chat history
      const sysMsg = finalMessages.find((m: any) => m.role === 'system');
      if (sysMsg && sysMsg.content) {
        const lastMsgIdx = finalMessages.length - 1;
        if (lastMsgIdx >= 0 && finalMessages[lastMsgIdx].role === 'user') {
          // Extract the original system prompt (without the memory context)
          const originalSysPrompt = sysMsg.content.split('\n\n=== 附加背景信息 ===')[0].trim();
          if (originalSysPrompt && originalSysPrompt !== '你是一个助手。') {
            finalMessages[lastMsgIdx].content += `\n\n[系统提示：请严格遵循你的人物设定：“${originalSysPrompt}”，不要受历史对话风格的影响。]`;
          }
        }
      }

      const body: any = {
        model,
        messages: finalMessages,
        temperature,
        stream,
      };

      console.log("Sending to DeepSeek API:", JSON.stringify(body.messages, null, 2));

      if (stream && stream_options) {
        body.stream_options = stream_options;
      }

      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(text);
        } catch (e) {
          errorData = { error: { message: `DeepSeek API Error (${response.status}): ${text.substring(0, 100)}` } };
        }
        const statusToReturn = response.status === 401 ? 400 : response.status;
        return res.status(statusToReturn).json(errorData);
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
          
          const lines = buffer.split('\n');
          // Keep the last incomplete line in the buffer
          buffer = lines.pop() || "";
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') continue;
              try {
                const data = JSON.parse(dataStr);
                if (data.choices?.[0]?.delta?.content) {
                  fullResponse += data.choices[0].delta.content;
                }
              } catch (e) {}
            }
          }
          res.write(value);
        }
        
        if (buffer) {
          const lines = buffer.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') continue;
              try {
                const data = JSON.parse(dataStr);
                if (data.choices?.[0]?.delta?.content) {
                  fullResponse += data.choices[0].delta.content;
                }
              } catch (e) {}
            }
          }
        }
        
        res.end();

        // 3. Ingest (Async)
        if (useTieredMemory && lastUserMsg && fullResponse) {
          const round = Math.ceil(messages.length / 2);
          console.log("Ingesting memory:", lastUserMsg.content, "=>", fullResponse.substring(0, 50) + "...");
          MemoryService.ingest(lastUserMsg.content, fullResponse, apiKey, conversationId, conversationName, round).catch(err => console.error("Ingest error:", err));
        }
      } else {
        const data = await response.json();
        const aiResponse = data.choices?.[0]?.message?.content;
        
        // 3. Ingest (Async)
        if (useTieredMemory && lastUserMsg && aiResponse) {
          const round = Math.ceil(messages.length / 2);
          MemoryService.ingest(lastUserMsg.content, aiResponse, apiKey, conversationId, conversationName, round).catch(err => console.error("Ingest error:", err));
        }
        
        res.json(data);
      }
    } catch (error: any) {
      console.error("Chat Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  // 在生产环境中，需要从应用根目录开始计算路径
  const distPath = path.resolve(path.dirname(__dirname), "dist");

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
