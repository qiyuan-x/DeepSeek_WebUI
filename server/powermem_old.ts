import { Memory } from 'powermem';
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from './config.js';

export class PowerMem {
  private memory: Memory | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  public async reinit() {
    this.memory = null;
    this.isInitialized = false;
    this.initPromise = null;
    // Reload dotenv
    const envPath = path.join(DATA_DIR, ".env");
    if (fs.existsSync(envPath)) {
      const dotenv = await import('dotenv');
      dotenv.config({ path: envPath, override: true });
    }
    await this.init();
  }

  public async init(bypassEnvCheck: boolean = false) {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const envPath = path.join(DATA_DIR, ".env");
      if (!bypassEnvCheck && !fs.existsSync(envPath)) {
        console.log("[PowerMem] .env not found. Memory will be disabled.");
        this.isInitialized = true;
        return;
      }

      // Check for embedding provider in .env
      const provider = process.env.EMBEDDING_PROVIDER || 'openai';
      const originalProvider = process.env.EMBEDDING_PROVIDER;
      const originalBaseUrl = process.env.OPENAI_BASE_URL;
      const originalApiKey = process.env.OPENAI_API_KEY;

      if (provider === 'local') {
        const port = process.env.NODE_ENV === 'production' ? 2233 : 3000;
        process.env.OPENAI_BASE_URL = `http://127.0.0.1:${port}/api`;
        process.env.EMBEDDING_PROVIDER = 'openai';
        // Provide a dummy key if not set
        if (!process.env.OPENAI_API_KEY) {
          process.env.OPENAI_API_KEY = "sk-local-dummy-key";
        }
      } else if (!process.env.OPENAI_API_KEY && process.env.EMBEDDING_PROVIDER === 'openai') {
        console.log("[PowerMem] OPENAI_API_KEY not set and provider is not local. PowerMem disabled to prevent crash.");
        this.isInitialized = true;
        return;
      }

      try {
        this.memory = await Memory.create();
        console.log(`[PowerMem] Connected and initialized successfully with ${provider} embeddings.`);
      } catch (e) {
        console.error("[PowerMem] Failed to init:", e);
      } finally {
        if (provider === 'local') {
           // Restore original to avoid polluting other LLM clients
           if (originalProvider) process.env.EMBEDDING_PROVIDER = originalProvider;
           else delete process.env.EMBEDDING_PROVIDER;
           
           if (originalBaseUrl) process.env.OPENAI_BASE_URL = originalBaseUrl;
           else delete process.env.OPENAI_BASE_URL;
           
           if (!originalApiKey) delete process.env.OPENAI_API_KEY;
        }
        this.isInitialized = true;
      }
    })();
    
    return this.initPromise;
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

  public async getAllMemories(conversationId: string) {
    if (!this.memory) return [];
    try {
      const results = await this.memory.getAll({
        runId: conversationId,
        limit: 1000
      });
      // Sort by updated_at or created_at descending if possible
      return results.memories;
    } catch (e) {
      console.error("[PowerMem] getAllMemories error:", e);
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
