import { Memory } from 'powermem';
import fs from 'fs';
import path from 'path';

export class PowerMem {
  private memory: Memory | null = null;
  private isInitialized = false;

  public async init() {
    if (this.isInitialized) return;
    
    const envPath = path.resolve(process.cwd(), ".env");
    if (!fs.existsSync(envPath)) {
      console.log("[PowerMem] .env not found. Memory will be disabled.");
      this.isInitialized = true;
      return;
    }

    try {
      this.memory = await Memory.create();
      console.log("[PowerMem] Connected and initialized successfully.");
    } catch (e) {
      console.error("[PowerMem] Failed to init:", e);
    } finally {
      this.isInitialized = true;
    }
  }

  public isReady() {
    return this.memory !== null;
  }

  public async search(query: string, conversationId: string, limit: number = 5) {
    if (!this.memory) return [];
    try {
      const results = await this.memory.search(query, { 
        runId: conversationId,
        limit
      });
      return results.results;
    } catch (e) {
      console.error("[PowerMem] search error:", e);
      return [];
    }
  }

  public async getProfileAndSummary(conversationId: string) {
    if (!this.memory) return [];
    try {
      const results = await this.memory.getAll({
        runId: conversationId,
        limit: 100
      });
      return results.memories.filter((r: any) => r.metadata?.type === 'profile' || r.metadata?.type === 'summary');
    } catch (e) {
      console.error("[PowerMem] getProfileAndSummary error:", e);
      return [];
    }
  }

  public async addMemory(content: string, conversationId: string, type: string = 'fact') {
    if (!this.memory) return;
    try {
      await this.memory.add({
        content,
        runId: conversationId,
        metadata: { type }
      });
    } catch (e) {
      console.error("[PowerMem] addMemory error:", e);
    }
  }

  public async updateMemory(id: string, content: string) {
    if (!this.memory) return;
    try {
      await this.memory.update(id, { content });
    } catch (e) {
      console.error("[PowerMem] updateMemory error:", e);
    }
  }

  public async reloadConfig() {
    if (this.memory) {
      await this.memory.close();
      this.memory = null;
    }
    this.isInitialized = false;
    await this.init();
  }
}

export const powerMem = new PowerMem();
