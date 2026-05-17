import express from "express";
import { apiKeyMiddleware } from "../middleware/auth.js";
import { ChatService } from "../services/ChatService.js";
import { MemoryOrchestrator } from "../services/MemoryOrchestrator.js";
import { LLMProviderFactory } from "../providers/llm/LLMProviderFactory.js";

const router = express.Router();

router.post("/test-embedding", apiKeyMiddleware, async (req, res) => {
  const { provider, model } = req.body;
  const apiKey = res.locals.apiKey;

  try {
    let url = "";
    let data: any = {};
    let headers: any = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    };

    if (provider === 'openai') {
      url = "https://api.openai.com/v1/embeddings";
      data = { input: "hello", model: model || "text-embedding-3-small" };
    } else if (provider === 'zhipuai') {
      url = "https://open.bigmodel.cn/api/paas/v4/embeddings";
      data = { input: "hello", model: model || "embedding-2" };
    } else if (provider === 'dashscope') {
      url = "https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding";
      headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      };
      data = { input: { texts: ["hello"] }, model: model || "text-embedding-v1" };
    } else {
      return res.status(400).json({ error: "Unsupported embedding provider for testing." });
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(data)
    });

    if (response.ok) {
      res.json({ success: true, message: "Connection successful!" });
    } else {
      const errorData = await response.text();
      res.status(500).json({ error: `Connection failed: ${response.status} ${errorData}` });
    }
  } catch (error: any) {
    console.error("Test Embedding Error:", error);
    res.status(500).json({ error: error.message || "Failed to connect to the embedding provider." });
  }
});

router.post("/test-connection", apiKeyMiddleware, async (req, res) => {
  const { provider, model, baseUrl } = req.body;
  const apiKey = res.locals.apiKey;

  try {
    const llmProvider = LLMProviderFactory.getProvider(provider || 'deepseek', baseUrl);
    const messages = [{ role: 'user' as const, content: 'Say strictly "ok" and nothing else.' }];
    const options = { model: model || 'deepseek-v4-flash', temperature: 0, max_tokens: 150, isThinkingMode: false };
    
    // Test the provider
    const { content } = await llmProvider.chat(messages, options, apiKey);
    
    if (content && content.trim().length > 0) {
      res.json({ success: true, message: "Connection successful!" });
    } else {
      res.status(500).json({ error: "Received empty response from the provider." });
    }
  } catch (error: any) {
    console.error("Test Connection Error:", error);
    res.status(500).json({ error: error.message || "Failed to connect to the provider." });
  }
});

router.get("/models", apiKeyMiddleware, async (req, res) => {
  const { provider, baseUrl } = req.query;
  const apiKey = res.locals.apiKey;
  if (!provider || typeof provider !== 'string') return res.status(400).json({ error: "Provider required" });

  try {
    let url = "";
    if (['openai', 'custom', 'deepseek', 'zhipuai', 'dashscope', 'local'].includes(provider)) {
      const defaultBaseUrl = provider === 'deepseek' ? 'https://api.deepseek.com/v1' 
        : provider === 'zhipuai' ? 'https://open.bigmodel.cn/api/paas/v4'
        : provider === 'dashscope' ? 'https://dashscope.aliyuncs.com/compatible-mode/v1'
        : provider === 'local' ? 'http://127.0.0.1:11434/v1'
        : 'https://api.openai.com/v1';
      url = typeof baseUrl === 'string' && baseUrl.trim().length > 0 ? `${baseUrl.replace(/\/chat\/completions$/, '')}/models` : `${defaultBaseUrl}/models`;
    } else {
      return res.status(400).json({ error: "Model listing not supported natively here for this provider." });
    }

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    
    if (!response.ok) {
       throw new Error(`Failed to fetch models: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (data && data.data && Array.isArray(data.data)) {
       let modelIds = data.data.map((m: any) => m.id).filter(Boolean);
       if (provider === 'zhipuai' && !modelIds.includes('glm-4-flash')) {
         modelIds.unshift('glm-4-flash');
       }
       return res.json({ models: modelIds });
    }
    
    return res.json({ models: [] });
  } catch (error: any) {
    console.error("Fetch Models Error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch models." });
  }
});

router.post("/chat", apiKeyMiddleware, async (req, res) => {
  const { messages, systemPrompt, model, temperature, stream, provider, baseUrl, stream_options, useTieredMemory, memoryMode, memorySummarizeFrequency, skipMemoryIngest, conversationId, conversationName, isThinkingMode, reasoningEffort, totalUserRounds } = req.body;
  const apiKey = res.locals.apiKey;

  try {
    const { finalMessages, selectedModel, llmProvider, effectiveMemoryMode, lastUserMsg, memoryUsage } = 
      await ChatService.generateContextAndResponse(
        messages, systemPrompt, model, temperature, provider, baseUrl, isThinkingMode, reasoningEffort,
        conversationId, conversationName, memoryMode, useTieredMemory, apiKey
      );

    const options = {
      model: selectedModel,
      temperature,
      stream,
      max_tokens: 8192,
      stream_options: stream_options || { include_usage: true },
      isThinkingMode,
      reasoningEffort
    };

    console.log(`Sending to ${selectedModel} API:`, JSON.stringify(finalMessages, null, 2));

    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      let fullResponse = "";
      
      const keepAliveInterval = setInterval(() => {
        res.write(':\n\n');
      }, 15000);

      try {
        await llmProvider.streamChat(
          finalMessages,
          options,
          apiKey,
          (chunk, reasoningChunk) => {
            fullResponse += chunk;
            const delta: any = {};
            if (chunk) delta.content = chunk;
            if (reasoningChunk) delta.reasoning_content = reasoningChunk;
            res.write(`data: ${JSON.stringify({ choices: [{ delta }] })}\n\n`);
          },
          (usage) => {
            res.write(`data: ${JSON.stringify({ usage })}\n\n`);
          }
        );
        
        clearInterval(keepAliveInterval);

        // Memory Ingestion will be triggered by frontend calling /api/memories/ingest
        
        if (memoryUsage) {
          res.write(`data: ${JSON.stringify({ memory_usage: memoryUsage })}\n\n`);
        }
        res.write('data: [DONE]\n\n');
        res.end();

      } catch (error: any) {
        clearInterval(keepAliveInterval);
        console.error("Stream Error:", error);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      }
    } else {
      try {
        const { content, usage } = await llmProvider.chat(finalMessages, options, apiKey);
        const data: any = { choices: [{ message: { content } }], usage };
        
        // Memory Ingestion will be triggered by frontend calling /api/memories/ingest

        if (memoryUsage) {
          data.memory_usage = memoryUsage;
        }
        res.json(data);
      } catch (error: any) {
        console.error("Chat Error:", error);
        res.status(500).json({ error: error.message });
      }
    }
  } catch (error: any) {
    console.error("Chat Route Error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
