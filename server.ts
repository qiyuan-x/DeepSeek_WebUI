import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";
import crypto from "crypto";
import { DATA_DIR, CONFIG_DIR, SECRET_KEY_FILE } from "./server/config.js";
import settingsRouter from "./server/routes/settings.js";
import memoryRouter from "./server/routes/memory.js";
import conversationsRouter from "./server/routes/conversations.js";
import imageRouter from "./server/routes/image.js";
import chatRouter from "./server/routes/chat.js";
import embeddingsRouter from "./server/routes/embeddings.js";
import { MigrationService } from "./server/services/MigrationService.js";
import { powerMem } from "./server/powermem.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const { DATA_DIR, CONFIG_DIR, SECRET_KEY_FILE } = await import("./server/config.js");
  dotenv.config({ path: path.join(DATA_DIR, '.env') });

  // Run migration on startup
  MigrationService.runMigration();
  
  // Pre-initialize memory early to avoid lag on first message
  powerMem.init(true).catch(console.error);

  const app = express();
  const PORT = process.env.NODE_ENV === 'production' ? 2233 : 3000;

  app.use(express.json({ limit: '500mb' }));
  app.use(express.urlencoded({ limit: '500mb', extended: true }));

  // WebUI Secret Key Auth Middleware
  let WEBUI_SECRET_KEY = process.env.WEBUI_SECRET_KEY;
  
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

    // Settings API is handled by settingsRouter
    app.use("/api", settingsRouter);
  app.use("/api", memoryRouter);
  app.use("/api", conversationsRouter);
  app.use("/api", imageRouter);
  app.use("/api", chatRouter);
  app.use("/api", embeddingsRouter);

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
