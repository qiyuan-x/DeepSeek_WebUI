import express from "express";
import crypto from "crypto";
import db from "../db.js";
import { powerMem } from "../powermem.js";

const router = express.Router();

router.get("/conversations", (req, res) => {
  try {
    const convs = db.prepare("SELECT * FROM conversations ORDER BY updated_at DESC").all();
    res.json(convs);
  } catch (error) {
    console.error("Failed to fetch conversations:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

router.get("/conversations/:id/messages", (req, res) => {
  try {
    const isDiscussion = req.params.id.endsWith('_discussion');
    const convId = isDiscussion ? req.params.id.replace('_discussion', '') : req.params.id;

    const msgs = db.prepare(`
      SELECT * FROM messages 
      WHERE conversation_id = ? AND is_discussion = ? 
      ORDER BY created_at ASC
    `).all(convId, isDiscussion ? 1 : 0);

    res.json(msgs);
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.post("/conversations", (req, res) => {
  try {
    const id = req.body.id || crypto.randomUUID();
    const title = req.body.title || 'New Chat';

    const insertConv = db.prepare(`
      INSERT INTO conversations 
      (id, title, system_prompt, model, is_story_mode, is_thinking_mode, story_system_prompt, desired_plot, desired_characters, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    insertConv.run(
      id,
      title,
      req.body.system_prompt || null,
      req.body.model || null,
      req.body.is_story_mode ? 1 : 0,
      req.body.is_thinking_mode ? 1 : 0,
      req.body.story_system_prompt || null,
      req.body.desired_plot || null,
      req.body.desired_characters || null,
      req.body.created_at || now,
      now
    );

    const conv = db.prepare("SELECT * FROM conversations WHERE id = ?").get(id);
    res.json(conv);
  } catch (error) {
    console.error("Failed to create conversation:", error);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

router.patch("/conversations/:id", (req, res) => {
  try {
    const convId = req.params.id;
    const oldConv = db.prepare("SELECT title FROM conversations WHERE id = ?").get(convId) as any;
    if (!oldConv) return res.status(404).json({ error: "Not found" });

    if (req.body.title !== undefined && req.body.title !== oldConv.title) {
       const oldTitle = oldConv.title;
       const newTitle = req.body.title;
       try {
         const stmt = db.prepare("UPDATE entity_memories SET entity_key = REPLACE(entity_key, ?, ?) WHERE entity_key LIKE ?");
         stmt.run(`[${oldTitle}] `, `[${newTitle}] `, `[${oldTitle}] %`);
       } catch (e) {
         console.error("Failed to rename memory keys:", e);
       }
    }

    const updates = [];
    const values = [];

    const updateFields = [
      'title', 'system_prompt', 'model', 'is_story_mode', 'is_thinking_mode', 
      'story_system_prompt', 'desired_plot', 'desired_characters'
    ];

    for (const field of updateFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(field === 'is_story_mode' || field === 'is_thinking_mode' ? (req.body[field] ? 1 : 0) : req.body[field]);
      }
    }

    if (updates.length > 0) {
      updates.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(convId);
      db.prepare(`UPDATE conversations SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }
  
    res.json({ success: true });
  } catch (error) {
     console.error("Failed to update conversation:", error);
     res.status(500).json({ error: "Failed to update conversation" });
  }
});

router.delete("/conversations/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM conversations WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Delete Error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/messages", (req, res) => {
  try {
    const { id, conversation_id, role, content, reasoning_content, tokens, cost, response_time, imageUrl, memory_cost, memory_tokens, painting_cost, status, model } = req.body;
    
    const isDiscussion = conversation_id && conversation_id.endsWith('_discussion');
    const convId = isDiscussion ? conversation_id.replace('_discussion', '') : conversation_id;

    const existingMsg = db.prepare("SELECT * FROM messages WHERE id = ?").get(id);

    if (existingMsg) {
       const updates = [];
       const values = [];
       const obj = { content, reasoning_content, tokens, cost, response_time, imageUrl, memory_cost, memory_tokens, painting_cost, status, model };
       
       for (const [k, v] of Object.entries(obj)) {
         if (v !== undefined) {
            updates.push(`${k} = ?`);
            values.push(v);
         }
       }

       if (updates.length > 0) {
         values.push(id);
         db.prepare(`UPDATE messages SET ${updates.join(', ')} WHERE id = ?`).run(...values);
       }
    } else {
       db.prepare(`
        INSERT INTO messages 
        (id, conversation_id, role, content, reasoning_content, tokens, cost, response_time, imageUrl, memory_cost, memory_tokens, painting_cost, status, model, is_discussion, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       `).run(
         id, convId, role || 'user', content || '', reasoning_content || null, 
         tokens || 0, cost || 0, response_time || 0, imageUrl || null, 
         memory_cost || 0, memory_tokens || 0, painting_cost || 0, 
         status || null, model || null, isDiscussion ? 1 : 0, 
         req.body.created_at || new Date().toISOString()
       );
    }
    
    // Update conversation timestamp
    db.prepare("UPDATE conversations SET updated_at = ? WHERE id = ?").run(new Date().toISOString(), convId);
    
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to save message:", error);
    res.status(500).json({ error: "Failed to save message" });
  }
});

router.delete("/conversations/:id/discussion", (req, res) => {
  try {
    db.prepare("DELETE FROM messages WHERE conversation_id = ? AND is_discussion = 1").run(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Delete Discussion Error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.delete("/messages/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM messages WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Delete Message Error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
