import express from "express";
import fs from "fs";
import path from "path";
import { SETTINGS_FILE } from "../config.js";

const router = express.Router();

router.get("/settings", (req, res) => {
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

router.post("/settings", (req, res) => {
  try {
    const settings = req.body;
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));

    // Update .env file if powermemConfig is present
    if (settings.powermemConfig) {
      const envPath = path.resolve(process.cwd(), ".env");
      let envContent = "";
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, "utf-8");
      }

      const updateEnv = (key: string, value: string) => {
        const regex = new RegExp(`^${key}=.*$`, "m");
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, `${key}=${value}`);
        } else {
          envContent += `\n${key}=${value}`;
        }
      };

      const pmc = settings.powermemConfig;
      
      const llmProvider = pmc.useGlobalLLM ? settings.provider : pmc.llmProvider;
      const llmApiKey = pmc.useGlobalLLM ? settings.apiKey : pmc.llmApiKey;
      const llmModel = pmc.useGlobalLLM ? settings.model : pmc.llmModel;

      if (pmc.embeddingProvider) updateEnv("EMBEDDING_PROVIDER", pmc.embeddingProvider);
      if (pmc.embeddingApiKey) updateEnv("EMBEDDING_API_KEY", pmc.embeddingApiKey);
      if (pmc.embeddingModel) updateEnv("EMBEDDING_MODEL", pmc.embeddingModel);
      if (llmProvider) updateEnv("LLM_PROVIDER", llmProvider);
      if (llmApiKey) updateEnv("LLM_API_KEY", llmApiKey);
      if (llmModel) updateEnv("LLM_MODEL", llmModel);

      fs.writeFileSync(envPath, envContent.trim() + "\n");
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to save settings" });
  }
});

router.get("/balance", async (req, res) => {
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

export default router;
