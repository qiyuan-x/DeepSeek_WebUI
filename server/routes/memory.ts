import express from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import db from "../db.js";
import { INDEX_FILE, readJson, writeJson, getConvDir } from "../config.js";

const router = express.Router();

router.get("/memories", (req, res) => {
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

router.delete("/memories/conversation", (req, res) => {
  try {
    const { conversationName } = req.body;
    if (!conversationName) return res.status(400).json({ error: "Conversation name is required" });
    
    db.prepare("DELETE FROM entity_memories WHERE entity_key LIKE ?").run(`[${conversationName}]%`);
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to clear conversation memories:", error);
    res.status(500).json({ error: "Failed to clear conversation memories" });
  }
});

// Conversation Management Routes (moved here as they are tightly coupled with memory/history)
router.get("/conversations", (req, res) => {
  const index = readJson(INDEX_FILE);
  const convs = index.map((item: any) => {
    const settingsFile = path.join(item.path, "settings.json");
    return readJson(settingsFile, null);
  }).filter((c: any) => c !== null);
  
  convs.sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  res.json(convs);
});

router.get("/conversations/:id/messages", (req, res) => {
  const isDiscussion = req.params.id.endsWith('_discussion');
  const convId = isDiscussion ? req.params.id.replace('_discussion', '') : req.params.id;

  const index = readJson(INDEX_FILE);
  const item = index.find((i: any) => i.id === convId);
  if (!item) return res.json([]);
  
  const msgFile = path.join(item.path, isDiscussion ? "discussion_messages.json" : "messages.json");
  const msgs = readJson(msgFile);
  msgs.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  res.json(msgs);
});

router.post("/conversations", (req, res) => {
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  writeJson(path.join(convDir, "settings.json"), newConv);
  writeJson(path.join(convDir, "messages.json"), []);
  writeJson(path.join(convDir, "discussion_messages.json"), []);

  index.push({ id, path: convDir });
  writeJson(INDEX_FILE, index);

  res.json(newConv);
});

router.patch("/conversations/:id", (req, res) => {
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

router.delete("/conversations/:id", (req, res) => {
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

router.post("/messages", (req, res) => {
  const { id, conversation_id, role, content, reasoning_content, tokens, cost, response_time, imageUrl, memory_cost, memory_tokens } = req.body;
  
  const isDiscussion = conversation_id && conversation_id.endsWith('_discussion');
  const convId = isDiscussion ? conversation_id.replace('_discussion', '') : conversation_id;

  const index = readJson(INDEX_FILE);
  const item = index.find((i: any) => i.id === convId);
  if (!item) return res.status(404).json({ error: "Conversation not found" });

  const msgFile = path.join(item.path, isDiscussion ? "discussion_messages.json" : "messages.json");
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
      imageUrl: imageUrl || msgs[idx].imageUrl,
      memory_cost: memory_cost || msgs[idx].memory_cost,
      memory_tokens: memory_tokens || msgs[idx].memory_tokens
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
      memory_cost: memory_cost || 0,
      memory_tokens: memory_tokens || 0,
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

router.delete("/conversations/:id/discussion", (req, res) => {
  try {
    const index = readJson(INDEX_FILE);
    const item = index.find((i: any) => i.id === req.params.id);
    if (item) {
      const discussionMsgFile = path.join(item.path, "discussion_messages.json");
      if (fs.existsSync(discussionMsgFile)) {
        writeJson(discussionMsgFile, []);
      }
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("Delete Discussion Error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.delete("/messages/:id", (req, res) => {
  try {
    const index = readJson(INDEX_FILE);
    let found = false;
    for (const item of index) {
      const msgFile = path.join(item.path, "messages.json");
      if (fs.existsSync(msgFile)) {
        let msgs = readJson(msgFile);
        const originalLen = msgs.length;
        msgs = msgs.filter((m: any) => m.id !== req.params.id);
        if (msgs.length !== originalLen) {
          writeJson(msgFile, msgs);
          found = true;
          break;
        }
      }

      const discussionMsgFile = path.join(item.path, "discussion_messages.json");
      if (fs.existsSync(discussionMsgFile)) {
        let discussionMsgs = readJson(discussionMsgFile);
        const originalDiscussionLen = discussionMsgs.length;
        discussionMsgs = discussionMsgs.filter((m: any) => m.id !== req.params.id);
        if (discussionMsgs.length !== originalDiscussionLen) {
          writeJson(discussionMsgFile, discussionMsgs);
          found = true;
          break;
        }
      }
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("Delete Message Error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
