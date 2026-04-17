import express from "express";
import { MemoryService } from "../memoryService.js";
import { LLMProviderFactory } from "../providers/llm/LLMProviderFactory.js";

const router = express.Router();

router.post("/test-connection", async (req, res) => {
  const { provider, apiKey, model, baseUrl } = req.body;
  if (!apiKey) return res.status(400).json({ error: "API Key required" });

  try {
    const llmProvider = LLMProviderFactory.getProvider(provider || 'deepseek', baseUrl);
    const messages = [{ role: 'user' as const, content: 'Say strictly "ok" and nothing else.' }];
    const options = { model: model || 'deepseek-chat', temperature: 0, max_tokens: 10 };
    
    // Test the provider
    const content = await llmProvider.chat(messages, options, apiKey);
    
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

router.post("/chat", async (req, res) => {
  const { messages, systemPrompt, model, temperature, stream, apiKey: userApiKey, provider, stream_options, useTieredMemory, skipMemoryIngest, conversationId, conversationName } = req.body;
  const apiKey = (userApiKey !== undefined && userApiKey !== null) ? userApiKey : process.env.DEEPSEEK_API_KEY;

  if (!apiKey) return res.status(400).json({ error: "API Key required" });

  try {
    let finalMessages = [...messages];
    
    // Inject system prompt if provided
    if (systemPrompt) {
      finalMessages.unshift({ role: 'system', content: systemPrompt });
    }

    let lastUserMsg = messages.filter((m: any) => m.role === 'user').pop();

    let memoryUsage: any = null;

    const llmProvider = LLMProviderFactory.getProvider(provider || 'deepseek');
    const selectedModel = model || (provider === 'deepseek' ? 'deepseek-chat' : provider === 'openai' ? 'gpt-4o' : provider === 'anthropic' ? 'claude-3-5-sonnet-20240620' : 'gemini-1.5-pro');

    if (useTieredMemory && lastUserMsg && conversationId) {
      // 1. Retrieval
      const { context: memoryContext, usage: retrieveUsage } = await MemoryService.retrieve(lastUserMsg.content, llmProvider, apiKey, selectedModel, conversationId);
      if (retrieveUsage) {
        memoryUsage = { retrieve: retrieveUsage };
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

    const options = {
      model: selectedModel,
      temperature,
      stream,
      max_tokens: 8192,
      stream_options: stream_options || { include_usage: true }
    };

    console.log(`Sending to ${selectedModel} API:`, JSON.stringify(finalMessages, null, 2));

    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      let fullResponse = "";
      
      try {
        await llmProvider.streamChat(
          finalMessages,
          options,
          apiKey,
          (chunk) => {
            fullResponse += chunk;
            res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`);
          },
          (usage) => {
            res.write(`data: ${JSON.stringify({ usage })}\n\n`);
          }
        );
        
        // 3. Ingest (Async)
        if (useTieredMemory && !skipMemoryIngest && lastUserMsg && fullResponse) {
          const round = Math.ceil(messages.length / 2);
          console.log("Ingesting memory:", lastUserMsg.content, "=>", fullResponse.substring(0, 50) + "...");
          
          // Fire and forget to avoid blocking the stream
          MemoryService.ingest(lastUserMsg.content, fullResponse, llmProvider, apiKey, selectedModel, conversationId, conversationName, round)
            .catch(err => console.error("Ingest error:", err));
            
          if (memoryUsage) {
            res.write(`data: ${JSON.stringify({ memory_usage: memoryUsage })}\n\n`);
          }
        } else if (useTieredMemory && skipMemoryIngest && memoryUsage) {
          // If we skipped ingest but still have retrieve usage, send it
          res.write(`data: ${JSON.stringify({ memory_usage: memoryUsage })}\n\n`);
        }

        res.write('data: [DONE]\n\n');
        res.end();

      } catch (error: any) {
        console.error("Stream Error:", error);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      }
    } else {
      try {
        const content = await llmProvider.chat(finalMessages, options, apiKey);
        const data: any = { choices: [{ message: { content } }] };
        
        // Async Memory Ingestion
        if (useTieredMemory && !skipMemoryIngest && lastUserMsg) {
          const round = Math.ceil(messages.length / 2);
          MemoryService.ingest(lastUserMsg.content, content, llmProvider, apiKey, selectedModel, conversationId, conversationName, round)
            .then(ingestUsage => {
              if (ingestUsage) {
                memoryUsage = memoryUsage || {};
                memoryUsage.ingest = ingestUsage;
              }
            })
            .catch(e => console.error("Async ingest failed:", e));
        }

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
