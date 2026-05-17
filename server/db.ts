import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { DB_DIR } from './config.js';

const DB_PATH = path.join(DB_DIR, "memory.db");

if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

const db = new Database(DB_PATH);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    title TEXT,
    system_prompt TEXT,
    model TEXT,
    is_story_mode BOOLEAN DEFAULT 0,
    is_thinking_mode BOOLEAN DEFAULT 0,
    story_system_prompt TEXT,
    desired_plot TEXT,
    desired_characters TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT,
    role TEXT,
    content TEXT,
    reasoning_content TEXT,
    tokens INTEGER DEFAULT 0,
    cost REAL DEFAULT 0,
    response_time REAL DEFAULT 0,
    imageUrl TEXT,
    memory_cost REAL DEFAULT 0,
    memory_tokens INTEGER DEFAULT 0,
    painting_cost REAL DEFAULT 0,
    status TEXT,
    model TEXT,
    is_discussion BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS chat_history (
    id TEXT PRIMARY KEY,
    conversation_id TEXT,
    role TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS entity_memories (
    entity_key TEXT PRIMARY KEY,
    entity_value TEXT,
    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
    weight INTEGER DEFAULT 1
  );
`);

export default db;
