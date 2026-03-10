import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.DATA_PATH || path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "database", "memory.db");

if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

const db = new Database(DB_PATH);

// Initialize tables
db.exec(`
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
