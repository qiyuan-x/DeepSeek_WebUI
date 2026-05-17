import express from "express";
import crypto from "crypto";
import db from "../db.js";
import { powerMem } from "../powermem.js";
import { MemoryService } from "../memoryService.js";
import { LLMProviderFactory } from "../providers/llm/LLMProviderFactory.js";
import { apiKeyMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.get("/memories", async (req, res) => {
  try {
    const { conversationName, conversationId } = req.query;
    
    // First attempt to read from powerMem (the new memory system)
    let pmMemories: any[] = [];
    if (conversationId && typeof conversationId === 'string') {
      try {
        await powerMem.init(true);
        pmMemories = await powerMem.getAllMemories(conversationId);
      } catch (e) {
        console.error("Failed to read from powerMem:", e);
      }
    }

    if (pmMemories && pmMemories.length > 0) {
      // Map powerMem format to UI format
      const mapped = pmMemories.map(m => ({
        id: m.id,
        entity_key: m.metadata?.type === 'summary' ? '对话总结' : m.metadata?.type === 'profile' ? '用户画像' : m.metadata?.type || 'fact',
        content: m.content,
        last_accessed: m.updated_at || m.created_at,
        weight: typeof m.metadata?.weight === 'number' ? m.metadata.weight : 0,
        original_type: m.metadata?.type
      }));
      // Sort desc by generated date
      mapped.sort((a, b) => {
        if (!a.last_accessed) return 1;
        if (!b.last_accessed) return -1;
        return new Date(b.last_accessed).getTime() - new Date(a.last_accessed).getTime();
      });
      return res.json(mapped);
    }

    // Fallback to SQLite (old system)
    let stmt;
    let memories = [];
    if (conversationId) {
      stmt = db.prepare("SELECT * FROM entity_memories WHERE entity_key LIKE ? ORDER BY weight DESC, last_accessed DESC");
      memories = stmt.all(`[${conversationId}]%`);
    } else if (conversationName) {
      stmt = db.prepare("SELECT * FROM entity_memories WHERE entity_key LIKE ? ORDER BY weight DESC, last_accessed DESC");
      memories = stmt.all(`[${conversationName}]%`);
    }
    res.json(memories);
  } catch (error) {
    console.error("Failed to fetch memories:", error);
    res.status(500).json({ error: "Failed to fetch memories" });
  }
});

router.delete("/memories/entity", (req, res) => {
  try {
    const { key } = req.body;
    if (!key) return res.status(400).json({ error: "Key is required" });
    
    db.prepare("DELETE FROM entity_memories WHERE entity_key = ?").run(key);
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete memory entity:", error);
    res.status(500).json({ error: "Failed to delete memory entity" });
  }
});

router.delete("/memories/conversation", async (req, res) => {
  try {
    const { conversationName, conversationId } = req.body;
    if (!conversationName && !conversationId) return res.status(400).json({ error: "Conversation info is required" });
    
    if (conversationId) {
      try {
        await powerMem.init(true);
        const mems = await powerMem.getAllMemories(conversationId);
        // Not implemented in powermem wrapper yet, skip clearing powermem individually for now unless we add delete capabilities.
      } catch (e) {
        console.error("Failed to delete from powermem", e);
      }
    }
    
    if (conversationName) {
      db.prepare("DELETE FROM entity_memories WHERE entity_key LIKE ?").run(`[${conversationName}]%`);
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to clear conversation memories:", error);
    res.status(500).json({ error: "Failed to clear conversation memories" });
  }
});

router.post("/memories/ingest", apiKeyMiddleware, async (req, res) => {
  try {
    const { 
      effectiveMemoryMode, memorySummarizeFrequency, provider, baseUrl,
      selectedModel, conversationId, conversationName 
    } = req.body;
    const apiKey = res.locals.apiKey;

    // Fetch the latest messages from DB instead of receiving them from client.
    // This avoids large or complex payloads triggering Cloud Run WAF 403 Forbidden
    const stmt = db.prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC");
    const dbMessages = stmt.all(conversationId) as any[];

    if (dbMessages.length === 0) {
      return res.json({ success: true, usage: null });
    }

    const messages = dbMessages.map(m => ({
      role: m.role,
      content: m.content
    }));

    const lastUserMsg = messages.filter(m => m.role === 'user').pop() || { content: '' };
    const fullResponse = messages.filter(m => m.role === 'assistant').pop()?.content || '';

    const llmProvider = LLMProviderFactory.getProvider(provider || 'deepseek', baseUrl);
    const round = messages.filter((m: any) => m.role === 'user').length;
    
    let recentHistoryStr = "";
    const recentMsgs = messages.slice(-11, -1);
    for (const msg of recentMsgs) {
      if (msg.role === 'user') {
        recentHistoryStr += `User: ${msg.content}\n`;
      } else if (msg.role === 'assistant') {
        recentHistoryStr += `AI: ${msg.content}\n`;
      }
    }

    const freq = memorySummarizeFrequency || 1;
    let usage = null;

    if (effectiveMemoryMode === 'powermem') {
      usage = await MemoryService.ingest(lastUserMsg.content, fullResponse, llmProvider, apiKey, selectedModel, conversationId, conversationName, round, recentHistoryStr, false, freq);
    } else {
      usage = await MemoryService.ingestSimple(lastUserMsg.content, fullResponse, llmProvider, apiKey, selectedModel, conversationId, conversationName, round, recentHistoryStr, false);
    }

    res.json({ success: true, usage });
  } catch (error: any) {
    console.error("Memory Ingestion Error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
