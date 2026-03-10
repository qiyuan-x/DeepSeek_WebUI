import Database from 'better-sqlite3';
const db = new Database(':memory:');
db.exec("CREATE TABLE entity_memories (entity_key TEXT, entity_value TEXT, last_accessed TEXT, weight INTEGER)");
db.prepare("INSERT INTO entity_memories VALUES (?, ?, CURRENT_TIMESTAMP, 1)").run("[2026-03-07 10:24:21] 用户画像-职业", "程序员");
db.prepare("INSERT INTO entity_memories VALUES (?, ?, CURRENT_TIMESTAMP, 1)").run("[2026-03-07 10:24:21] 对话总结-最新", "讨论了编程");
db.prepare("INSERT INTO entity_memories VALUES (?, ?, CURRENT_TIMESTAMP, 1)").run("[Other] 用户画像-职业", "设计师");

const stmt = db.prepare("SELECT * FROM entity_memories WHERE entity_key LIKE ?");
const rows = stmt.all(`[2026-03-07 10:24:21]%`);
console.log(rows);
