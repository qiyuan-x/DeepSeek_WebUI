import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

export class PowerMem {
  private pool: mysql.Pool | null = null;
  private configPath: string;

  constructor(configPath: string) {
    this.configPath = configPath;
    this.initPool();
  }

  private initPool() {
    if (fs.existsSync(this.configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        if (config.host && config.user) {
          this.pool = mysql.createPool({
            host: config.host,
            user: config.user,
            password: config.password,
            database: config.database,
            port: config.port || 2881,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
          });
          this.initTables();
        }
      } catch (e) {
        console.error("Failed to init PowerMem pool:", e);
      }
    }
  }

  private async initTables() {
    if (!this.pool) return;
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS conversation_memory (
          id VARCHAR(255) PRIMARY KEY,
          memory TEXT,
          user_profile TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
    } catch (e) {
      console.error("Failed to init PowerMem tables:", e);
    }
  }

  public async getMemory(convId: string) {
    if (!this.pool) return null;
    try {
      const [rows]: any = await this.pool.query(
        'SELECT memory, user_profile FROM conversation_memory WHERE id = ?',
        [convId]
      );
      if (rows.length > 0) {
        return rows[0];
      }
    } catch (e) {
      console.error("PowerMem getMemory error:", e);
    }
    return null;
  }

  public async saveMemory(convId: string, memory: string, userProfile: string) {
    if (!this.pool) return false;
    try {
      await this.pool.query(
        `INSERT INTO conversation_memory (id, memory, user_profile) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE memory = ?, user_profile = ?`,
        [convId, memory, userProfile, memory, userProfile]
      );
      return true;
    } catch (e) {
      console.error("PowerMem saveMemory error:", e);
      return false;
    }
  }

  public async deleteMemory(convId: string) {
    if (!this.pool) return false;
    try {
      await this.pool.query('DELETE FROM conversation_memory WHERE id = ?', [convId]);
      return true;
    } catch (e) {
      console.error("PowerMem deleteMemory error:", e);
      return false;
    }
  }

  public reloadConfig() {
    if (this.pool) {
      this.pool.end();
      this.pool = null;
    }
    this.initPool();
  }
}
