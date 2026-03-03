import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
const CONV_FILE = path.join(DB_DIR, "conversations.json");
const MSG_FILE = path.join(DB_DIR, "messages.json");

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

// Initialize files if they don't exist
if (!fs.existsSync(CONV_FILE)) writeJson(CONV_FILE, []);
if (!fs.existsSync(MSG_FILE)) writeJson(MSG_FILE, []);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
  app.get("/api/conversations", (req, res) => {
    const convs = readJson(CONV_FILE);
    convs.sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    res.json(convs);
  });

  app.get("/api/conversations/:id/messages", (req, res) => {
    const msgs = readJson(MSG_FILE);
    const filtered = msgs.filter((m: any) => m.conversation_id === req.params.id);
    filtered.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    res.json(filtered);
  });

  app.post("/api/conversations", (req, res) => {
    const convs = readJson(CONV_FILE);
    const newConv = {
      ...req.body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    convs.push(newConv);
    writeJson(CONV_FILE, convs);
    res.json({ success: true });
  });

  app.patch("/api/conversations/:id", (req, res) => {
    const convs = readJson(CONV_FILE);
    const idx = convs.findIndex((c: any) => c.id === req.params.id);
    if (idx !== -1) {
      if (req.body.title !== undefined) convs[idx].title = req.body.title;
      if (req.body.system_prompt !== undefined) convs[idx].system_prompt = req.body.system_prompt;
      if (req.body.model !== undefined) convs[idx].model = req.body.model;
      if (req.body.memory !== undefined) convs[idx].memory = req.body.memory;
      if (req.body.summarized_count !== undefined) convs[idx].summarized_count = req.body.summarized_count;
      convs[idx].updated_at = new Date().toISOString();
      writeJson(CONV_FILE, convs);
    }
    res.json({ success: true });
  });

  app.delete("/api/conversations/:id", (req, res) => {
    try {
      let convs = readJson(CONV_FILE);
      convs = convs.filter((c: any) => c.id !== req.params.id);
      writeJson(CONV_FILE, convs);

      let msgs = readJson(MSG_FILE);
      msgs = msgs.filter((m: any) => m.conversation_id !== req.params.id);
      writeJson(MSG_FILE, msgs);

      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/messages", (req, res) => {
    const { id, conversation_id, role, content, reasoning_content, tokens, cost } = req.body;
    
    const msgs = readJson(MSG_FILE);
    const newMsg = {
      id,
      conversation_id,
      role,
      content,
      reasoning_content: reasoning_content || null,
      tokens: tokens || 0,
      cost: cost || 0,
      created_at: new Date().toISOString()
    };
    msgs.push(newMsg);
    writeJson(MSG_FILE, msgs);
    
    // Update conversation timestamp
    const convs = readJson(CONV_FILE);
    const idx = convs.findIndex((c: any) => c.id === conversation_id);
    if (idx !== -1) {
      convs[idx].updated_at = new Date().toISOString();
      writeJson(CONV_FILE, convs);
    }
    
    res.json({ success: true });
  });

  app.get("/api/balance", async (req, res) => {
    const authHeader = req.headers.authorization;
    const apiKey = authHeader ? authHeader.split(" ")[1] : process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) return res.status(401).json({ error: "API Key required" });

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

  // Proxy for DeepSeek Chat (Streaming)
  app.post("/api/chat", async (req, res) => {
    const { messages, model, temperature, stream, apiKey: userApiKey, stream_options } = req.body;
    const apiKey = (userApiKey !== undefined && userApiKey !== null) ? userApiKey : process.env.DEEPSEEK_API_KEY;

    if (!apiKey) return res.status(401).json({ error: "API Key required" });

    try {
      const body: any = {
        model,
        messages,
        temperature,
        stream,
      };

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
        const errorData = await response.json();
        return res.status(response.status).json(errorData);
      }

      if (stream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader");

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      } else {
        const data = await response.json();
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
