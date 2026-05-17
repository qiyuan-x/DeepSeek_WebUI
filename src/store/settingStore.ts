import { create } from 'zustand';
import { PromptTemplate } from '../types';
import { api } from '../services/api';

interface PowerMemConfig {
  useGlobalLLM?: boolean;
  embeddingProvider: string;
  embeddingApiKey: string;
  embeddingModel: string;
  llmProvider: string;
  llmApiKey: string;
  llmModel: string;
}

export interface LlmConfig {
  provider: string;
  apiKeys: Record<string, string>;
  apiKey: string;
  models: Record<string, string>;
  model: string;
  baseUrls: Record<string, string>;
  baseUrl: string;
  providerNotes?: Record<string, string>;
  temperature: number;
  isThinkingMode: boolean;
  reasoningEffort: 'high' | 'max';
}

export interface UiConfig {
  theme: 'light' | 'dark';
  globalTheme: 'light' | 'dark';
  bgImage: string | null;
  bgImages: string[];
  bgImageInterval: number;
  chatLayout: 'default' | 'wechat' | 'qq';
  sendBehavior: 'enter' | 'ctrl_enter';
  userAvatar: string | null;
  aiAvatar: string | null;
  userName: string | null;
  aiName: string | null;
  showMessageMeta: boolean;
}

export interface MemoryConfig {
  useTieredMemory: boolean;
  memoryMode: 'off' | 'simple' | 'powermem';
  memorySummarizeFrequency: number;
  recentHistoryRounds: number;
  powermemConfig: PowerMemConfig;
}

export interface PaintingConfig {
  isPaintingEnabled: boolean;
  paintingProvider: string;
  paintingModel: string;
  paintingApiKey: string;
}

export interface SystemConfig {
  promptTemplates: PromptTemplate[];
  storyTemplates: PromptTemplate[];
  quickGenerate: boolean;
}

interface SettingsState {
  // Nested Configurations
  llmConfig: LlmConfig;
  uiConfig: UiConfig;
  memoryConfig: MemoryConfig;
  paintingConfig: PaintingConfig;
  systemConfig: SystemConfig;

  setSettings: (settings: Partial<LlmConfig & UiConfig & MemoryConfig & PaintingConfig & SystemConfig>) => void;
  loadSettings: () => Promise<void>;
  saveSettings: (settings: Partial<LlmConfig & UiConfig & MemoryConfig & PaintingConfig & SystemConfig>) => Promise<void>;
}

export const useSettingStore = create<SettingsState>((set, get) => ({
  llmConfig: {
    provider: 'deepseek',
    apiKeys: {},
    apiKey: '',
    models: {},
    model: 'deepseek-v4-flash',
    baseUrls: {},
    baseUrl: '',
    temperature: 0.7,
    isThinkingMode: false,
    reasoningEffort: 'high',
  },
  uiConfig: {
    theme: 'light',
    globalTheme: 'light',
    bgImage: null,
    bgImages: [],
    bgImageInterval: 300,
    chatLayout: 'default',
    sendBehavior: 'enter',
    userAvatar: null,
    aiAvatar: null,
    userName: null,
    aiName: null,
    showMessageMeta: true,
  },
  memoryConfig: {
    useTieredMemory: true,
    memoryMode: 'simple',
    memorySummarizeFrequency: 1,
    recentHistoryRounds: 5,
    powermemConfig: {
      useGlobalLLM: true,
      embeddingProvider: 'openai',
      embeddingApiKey: '',
      embeddingModel: 'text-embedding-3-small',
      llmProvider: 'openai',
      llmApiKey: '',
      llmModel: 'gpt-4o-mini'
    }
  },
  paintingConfig: {
    isPaintingEnabled: false,
    paintingProvider: 'zhipuai',
    paintingModel: 'cogview-3-plus',
    paintingApiKey: '',
  },
  systemConfig: {
    promptTemplates: [],
    storyTemplates: [],
    quickGenerate: false,
  },

  setSettings: (settings) => set((state) => {
    // Determine which nested config should be updated
    const newState = { ...state };

    const updateConfig = <T extends keyof SettingsState>(configKey: T, keys: string[]) => {
      let updated = false;
      const newSubConfig = { ...state[configKey] } as any;
      keys.forEach(k => {
        if ((settings as any)[k] !== undefined) {
          newSubConfig[k] = (settings as any)[k];
          updated = true;
        }
      });
      if (updated) {
        newState[configKey] = newSubConfig;
      }
    };

    updateConfig('llmConfig', ['provider', 'apiKeys', 'apiKey', 'models', 'model', 'baseUrls', 'baseUrl', 'providerNotes', 'temperature', 'isThinkingMode', 'reasoningEffort']);
    updateConfig('uiConfig', ['theme', 'globalTheme', 'bgImage', 'bgImages', 'bgImageInterval', 'chatLayout', 'sendBehavior', 'userAvatar', 'aiAvatar', 'userName', 'aiName', 'showMessageMeta']);
    updateConfig('memoryConfig', ['useTieredMemory', 'memoryMode', 'memorySummarizeFrequency', 'recentHistoryRounds', 'powermemConfig']);
    updateConfig('paintingConfig', ['isPaintingEnabled', 'paintingProvider', 'paintingModel', 'paintingApiKey']);
    updateConfig('systemConfig', ['promptTemplates', 'storyTemplates', 'quickGenerate']);

    // llm sync logic
    const llm = newState.llmConfig;
    if (settings.provider || settings.apiKeys) {
      llm.apiKey = llm.apiKeys[llm.provider] || '';
    }
    if (settings.apiKey !== undefined) {
      llm.apiKeys = { ...llm.apiKeys, [llm.provider]: settings.apiKey };
    }
    if (settings.provider || settings.models) {
      llm.model = llm.models[llm.provider] || (llm.provider === 'deepseek' ? 'deepseek-v4-flash' : llm.provider === 'openai' ? 'gpt-4o' : llm.provider === 'dashscope' ? 'qwen-plus' : llm.provider === 'local' ? 'llama3' : llm.provider === 'custom' ? '' : 'gemini-1.5-pro');
    }
    if (settings.model !== undefined) {
      llm.models = { ...llm.models, [llm.provider]: settings.model };
    }
    if (settings.provider || settings.baseUrls) {
      llm.baseUrl = llm.baseUrls[llm.provider] || '';
    }
    if (settings.baseUrl !== undefined) {
      llm.baseUrls = { ...llm.baseUrls, [llm.provider]: settings.baseUrl };
    }

    return newState;
  }),

  loadSettings: async () => {
    try {
      const settings = await api.getSettings();
      if (settings && !settings.error) {
        const provider = settings.provider || 'deepseek';
        const apiKeys = settings.apiKeys || { deepseek: settings.apiKey || '' };
        const models = settings.models || { deepseek: settings.model || 'deepseek-v4-flash' };
        const baseUrls = settings.baseUrls || { deepseek: settings.baseUrl || '' };
        set({
          llmConfig: {
            provider,
            apiKeys,
            apiKey: apiKeys[provider] || '',
            models,
            model: models[provider] || (provider === 'deepseek' ? 'deepseek-v4-flash' : provider === 'openai' ? 'gpt-4o' : provider === 'dashscope' ? 'qwen-plus' : provider === 'local' ? 'llama3' : provider === 'custom' ? '' : 'gemini-1.5-pro'),
            baseUrls,
            baseUrl: baseUrls[provider] || '',
            providerNotes: settings.providerNotes || {},
            temperature: settings.temperature ?? 0.7,
            isThinkingMode: settings.isThinkingMode ?? false,
            reasoningEffort: settings.reasoningEffort || 'high',
          },
          uiConfig: {
            theme: settings.theme || 'light',
            globalTheme: settings.theme || 'light', // or globalTheme? keep fallback
            bgImage: settings.bgImage || null,
            bgImages: settings.bgImages || [],
            bgImageInterval: settings.bgImageInterval || 300,
            chatLayout: settings.chatLayout || 'default',
            sendBehavior: settings.sendBehavior || 'enter',
            userAvatar: settings.userAvatar || null,
            aiAvatar: settings.aiAvatar || null,
            userName: settings.userName || null,
            aiName: settings.aiName || null,
            showMessageMeta: settings.showMessageMeta ?? true
          },
          systemConfig: {
            promptTemplates: settings.promptTemplates || [],
            storyTemplates: settings.storyTemplates || [],
            quickGenerate: settings.quickGenerate ?? false,
          },
          memoryConfig: {
            useTieredMemory: settings.useTieredMemory ?? true,
            memoryMode: settings.memoryMode || 'simple',
            memorySummarizeFrequency: settings.memorySummarizeFrequency || 1,
            recentHistoryRounds: settings.recentHistoryRounds || 5,
            powermemConfig: settings.powermemConfig || {
              useGlobalLLM: true,
              embeddingProvider: 'openai',
              embeddingApiKey: '',
              embeddingModel: 'text-embedding-3-small',
              llmProvider: 'openai',
              llmApiKey: '',
              llmModel: 'gpt-4o-mini'
            },
          },
          paintingConfig: {
            isPaintingEnabled: settings.isPaintingEnabled ?? false,
            paintingProvider: settings.paintingProvider || 'zhipuai',
            paintingModel: settings.paintingModel || 'cogview-3-plus',
            paintingApiKey: settings.paintingApiKey || '',
          }
        });
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  },

  saveSettings: async (newSettings) => {
    // saveSettings accepts the old flattened style settings from components since refactoring components fully for saveSettings takes too much time.
    // Actually, saveSettings just defers to setSettings, then saves EVERYTHING to API in flat form.
    get().setSettings(newSettings);
    const store = get();
    
    try {
      await api.saveSettings({
        ...store.llmConfig,
        ...store.uiConfig,
        ...store.memoryConfig,
        ...store.paintingConfig,
        ...store.systemConfig
      } as any);
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  }
}));
