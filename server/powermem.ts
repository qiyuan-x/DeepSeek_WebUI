import { Memory } from "powermem";
import path from "path";
import { DATA_DIR, SETTINGS_FILE } from "./config.js";
import fs from "fs";

let memoryInstance: any = null;
let isInitializing = false;

export const powerMem = {
  isReady: () => memoryInstance !== null,
  
  init: async (force = false) => {
    if (memoryInstance && !force) return memoryInstance;
    if (isInitializing) return memoryInstance;
    
    isInitializing = true;
    try {
      if (memoryInstance) {
        memoryInstance.close?.();
      }
      
      const dbPath = path.join(DATA_DIR, "powermem.sqlite");
      
      const configPath = SETTINGS_FILE;
      let powermemConfig: any = { embeddingProvider: 'openai', embeddingModel: 'text-embedding-3-small' };
      if (fs.existsSync(configPath)) {
        try {
          const settings = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          if (settings.powermemConfig) {
             powermemConfig = settings.powermemConfig;
          }
        } catch(e) {}
      }

      let actualProvider = powermemConfig.embeddingProvider || 'openai';
      let actualConfig: any = {
          model: powermemConfig.embeddingModel || 'text-embedding-3-small',
          apiKey: powermemConfig.embeddingApiKey || process.env.OPENAI_API_KEY || ''
      };

      if (actualProvider === 'local') {
          actualProvider = 'openai'; // powermem doesn't know 'local', disguise as openai
          actualConfig.apiKey = 'dummy-key';
          const port = process.env.NODE_ENV === 'production' ? 2233 : 3000;
          actualConfig.baseURL = `http://127.0.0.1:${port}/api`;
          // Sometimes openai client uses "baseUrl" or "baseURL". Try both just in case:
          actualConfig.baseUrl = `http://127.0.0.1:${port}/api`;
      } else if (actualProvider === 'dashscope') {
          actualProvider = 'openai';
          actualConfig.baseURL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
          actualConfig.baseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
      } else if (actualProvider === 'zhipuai') {
          actualProvider = 'openai';
          actualConfig.baseURL = 'https://open.bigmodel.cn/api/paas/v4';
          actualConfig.baseUrl = 'https://open.bigmodel.cn/api/paas/v4';
      }

      memoryInstance = await Memory.create({
        dbPath,
        config: {
            embedder: {
                provider: actualProvider,
                config: actualConfig
            }
        }
      });
      return memoryInstance;
    } catch(e) {
      console.error("Failed to init powermem:", e);
      memoryInstance = null;
      return null;
    } finally {
      isInitializing = false;
    }
  },
  
  reinit: async () => {
    return powerMem.init(true);
  },
  
  search: async (query: string, conversationId: string, limit: number) => {
    if (!memoryInstance) return [];
    try {
      const res = await memoryInstance.search(query, { filters: { conversationId }, limit });
      return res.results || [];
    } catch(e) {
      console.error("Powermem search error:", e);
      return [];
    }
  },
  
  getProfileAndSummary: async (conversationId: string) => {
    if (!memoryInstance) return [];
    try {
       const res = await memoryInstance.getAll({ filters: { conversationId } });
       const memories = res.memories || [];
       return memories.filter((m: any) => m.metadata?.type === 'profile' || m.metadata?.type === 'summary');
    } catch(e) {
      return [];
    }
  },
  
  updateMemory: async (id: string, content: string) => {
    if (!memoryInstance) return;
    try {
      await memoryInstance.update(id, content);
    } catch(e) {}
  },
  
  addMemory: async (content: string, conversationId: string, type: string) => {
    if (!memoryInstance) return;
    try {
      await memoryInstance.add(content, { metadata: { conversationId, type } });
    } catch(e) {}
  },
  
  getAllMemories: async (conversationId?: string) => {
    if (!memoryInstance) return [];
    try {
      const res = await memoryInstance.getAll(conversationId ? { filters: { conversationId } } : undefined);
      return res.memories || [];
    } catch(e) {
      return [];
    }
  }
};

