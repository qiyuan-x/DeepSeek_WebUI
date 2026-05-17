import fs from 'fs';
import path from 'path';
import db from '../db.js';
import { DATA_DIR, INDEX_FILE, getConvDir, readJson } from '../config.js';

export class MigrationService {
  static runMigration() {
    // Check if migration is already done by verifying if we have 'migration_done' flag
    const flagFile = path.join(DATA_DIR, '.migration_done');
    if (fs.existsSync(flagFile)) {
      return;
    }

    console.log("Starting JSON to SQLite migration...");

    try {
      db.exec('BEGIN TRANSACTION');

      if (fs.existsSync(INDEX_FILE)) {
        const index = readJson(INDEX_FILE);
        const insertConv = db.prepare(`
          INSERT OR REPLACE INTO conversations 
          (id, title, system_prompt, model, is_story_mode, is_thinking_mode, story_system_prompt, desired_plot, desired_characters, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertMsg = db.prepare(`
          INSERT OR REPLACE INTO messages 
          (id, conversation_id, role, content, reasoning_content, tokens, cost, response_time, imageUrl, memory_cost, memory_tokens, painting_cost, status, model, is_discussion, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const item of index) {
          if (!fs.existsSync(item.path)) continue;

          // Migrate Conversation (Settings)
          const settingsFile = path.join(item.path, "settings.json");
          const conv = readJson(settingsFile, null);
          if (conv) {
            insertConv.run(
              conv.id || item.id,
              conv.title || 'Untitled',
              conv.system_prompt || null,
              conv.model || null,
              conv.is_story_mode ? 1 : 0,
              conv.is_thinking_mode ? 1 : 0,
              conv.story_system_prompt || null,
              conv.desired_plot || null,
              conv.desired_characters || null,
              conv.created_at || new Date().toISOString(),
              conv.updated_at || new Date().toISOString()
            );
          }

          // Migrate Normal Messages
          const msgFile = path.join(item.path, "messages.json");
          const msgs = readJson(msgFile, []);
          for (const msg of msgs) {
            insertMsg.run(
              msg.id,
              msg.conversation_id || item.id,
              msg.role || 'user',
              msg.content || '',
              msg.reasoning_content || null,
              msg.tokens || 0,
              msg.cost || 0,
              msg.response_time || 0,
              msg.imageUrl || null,
              msg.memory_cost || 0,
              msg.memory_tokens || 0,
              msg.painting_cost || 0,
              msg.status || null,
              msg.model || null,
              0, // not discussion
              msg.created_at || new Date().toISOString()
            );
          }

          // Migrate Discussion Messages
          const discFile = path.join(item.path, "discussion_messages.json");
          const discMsgs = readJson(discFile, []);
          for (const msg of discMsgs) {
             insertMsg.run(
              msg.id,
              (msg.conversation_id && !msg.conversation_id.endsWith('_discussion')) ? msg.conversation_id : item.id,
              msg.role || 'user',
              msg.content || '',
              msg.reasoning_content || null,
              msg.tokens || 0,
              msg.cost || 0,
              msg.response_time || 0,
              msg.imageUrl || null,
              msg.memory_cost || 0,
              msg.memory_tokens || 0,
              msg.painting_cost || 0,
              msg.status || null,
              msg.model || null,
              1, // is discussion
              msg.created_at || new Date().toISOString()
            );
          }
        }
      }

      db.exec('COMMIT');
      fs.writeFileSync(flagFile, 'done');
      console.log("Migration completed successfully.");
    } catch (err) {
      db.exec('ROLLBACK');
      console.error("Migration failed:", err);
    }
  }
}
