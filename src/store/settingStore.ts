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

interface SettingsState {
  provider: string;
  apiKeys: Record<string, string>;
  apiKey: string; // Keep for backward compatibility or current provider's key
  models: Record<string, string>;
  model: string; // Keep for backward compatibility or current provider's model
  baseUrls: Record<string, string>;
  baseUrl: string;
  temperature: number;
  theme: 'light' | 'dark';
  globalTheme: 'light' | 'dark';
  bgImage: string | null;
  promptTemplates: PromptTemplate[];
  storyTemplates: PromptTemplate[];
  useTieredMemory: boolean;
  powermemConfig: PowerMemConfig;
  isPaintingEnabled: boolean;
  paintingProvider: string;
  paintingApiKey: string;
  quickGenerate: boolean;

  setSettings: (settings: Partial<SettingsState>) => void;
  loadSettings: () => Promise<void>;
  saveSettings: (settings: Partial<SettingsState>) => Promise<void>;
}

export const useSettingStore = create<SettingsState>((set, get) => ({
  provider: 'deepseek',
  apiKeys: {},
  apiKey: '',
  models: {},
  model: 'deepseek-chat',
  baseUrls: {},
  baseUrl: '',
  temperature: 0.7,
  theme: 'light',
  globalTheme: 'light',
  bgImage: null,
  promptTemplates: [],
  storyTemplates: [],
  useTieredMemory: true,
  powermemConfig: {
    useGlobalLLM: false,
    embeddingProvider: 'openai',
    embeddingApiKey: '',
    embeddingModel: 'text-embedding-3-small',
    llmProvider: 'openai',
    llmApiKey: '',
    llmModel: 'gpt-4o-mini'
  },
  isPaintingEnabled: false,
  paintingProvider: 'jimeng',
  paintingApiKey: '',
  quickGenerate: false,

  setSettings: (settings) => set((state) => {
    const newState = { ...state, ...settings };
    // Sync apiKey with current provider's key if provider or apiKeys changed
    if (settings.provider || settings.apiKeys) {
      newState.apiKey = newState.apiKeys[newState.provider] || '';
    }
    // If apiKey is explicitly set, update the apiKeys map for current provider
    if (settings.apiKey !== undefined) {
      newState.apiKeys = { ...newState.apiKeys, [newState.provider]: settings.apiKey };
    }
    // Sync model with current provider's model if provider or models changed
    if (settings.provider || settings.models) {
      newState.model = newState.models[newState.provider] || (newState.provider === 'deepseek' ? 'deepseek-chat' : newState.provider === 'openai' ? 'gpt-4o' : newState.provider === 'anthropic' ? 'claude-3-5-sonnet-20240620' : newState.provider === 'custom' ? '' : 'gemini-1.5-pro');
    }
    // If model is explicitly set, update the models map for current provider
    if (settings.model !== undefined) {
      newState.models = { ...newState.models, [newState.provider]: settings.model };
    }
    // Sync baseUrl with current provider's baseUrl if provider or baseUrls changed
    if (settings.provider || settings.baseUrls) {
      newState.baseUrl = newState.baseUrls[newState.provider] || '';
    }
    // If baseUrl is explicitly set, update the baseUrls map for current provider
    if (settings.baseUrl !== undefined) {
      newState.baseUrls = { ...newState.baseUrls, [newState.provider]: settings.baseUrl };
    }
    return newState;
  }),

  loadSettings: async () => {
    try {
      const settings = await api.getSettings();
      if (settings && !settings.error) {
        const provider = settings.provider || 'deepseek';
        const apiKeys = settings.apiKeys || { deepseek: settings.apiKey || '' };
        const models = settings.models || { deepseek: settings.model || 'deepseek-chat' };
        const baseUrls = settings.baseUrls || { deepseek: settings.baseUrl || '' };
        set({
          provider,
          apiKeys,
          apiKey: apiKeys[provider] || '',
          models,
          model: models[provider] || (provider === 'deepseek' ? 'deepseek-chat' : provider === 'openai' ? 'gpt-4o' : provider === 'anthropic' ? 'claude-3-5-sonnet-20240620' : provider === 'custom' ? '' : 'gemini-1.5-pro'),
          baseUrls,
          baseUrl: baseUrls[provider] || '',
          temperature: settings.temperature ?? 0.7,
          theme: settings.theme || 'light',
          globalTheme: settings.theme || 'light',
          bgImage: settings.bgImage || null,
          promptTemplates: settings.promptTemplates || [],
          storyTemplates: settings.storyTemplates || [],
          useTieredMemory: settings.useTieredMemory ?? true,
          powermemConfig: settings.powermemConfig || {
            embeddingProvider: 'openai',
            embeddingApiKey: '',
            embeddingModel: 'text-embedding-3-small',
            llmProvider: 'openai',
            llmApiKey: '',
            llmModel: 'gpt-4o-mini'
          },
          isPaintingEnabled: settings.isPaintingEnabled ?? false,
          paintingProvider: settings.paintingProvider || 'jimeng',
          paintingApiKey: settings.paintingApiKey || '',
          quickGenerate: settings.quickGenerate ?? false,
        });
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  },

  saveSettings: async (newSettings) => {
    const currentState = get();
    let updatedSettings = { ...currentState, ...newSettings };
    
    // Sync logic before saving
    if (newSettings.provider || newSettings.apiKeys) {
      updatedSettings.apiKey = updatedSettings.apiKeys[updatedSettings.provider] || '';
    }
    if (newSettings.apiKey !== undefined) {
      updatedSettings.apiKeys = { ...updatedSettings.apiKeys, [updatedSettings.provider]: newSettings.apiKey };
    }
    if (newSettings.provider || newSettings.models) {
      updatedSettings.model = updatedSettings.models[updatedSettings.provider] || (updatedSettings.provider === 'deepseek' ? 'deepseek-chat' : updatedSettings.provider === 'openai' ? 'gpt-4o' : updatedSettings.provider === 'anthropic' ? 'claude-3-5-sonnet-20240620' : updatedSettings.provider === 'custom' ? '' : 'gemini-1.5-pro');
    }
    if (newSettings.model !== undefined) {
      updatedSettings.models = { ...updatedSettings.models, [updatedSettings.provider]: newSettings.model };
    }
    if (newSettings.provider || newSettings.baseUrls) {
      updatedSettings.baseUrl = updatedSettings.baseUrls[updatedSettings.provider] || '';
    }
    if (newSettings.baseUrl !== undefined) {
      updatedSettings.baseUrls = { ...updatedSettings.baseUrls, [updatedSettings.provider]: newSettings.baseUrl };
    }

    set(updatedSettings);
    
    try {
      await api.saveSettings({
        provider: updatedSettings.provider,
        apiKeys: updatedSettings.apiKeys,
        apiKey: updatedSettings.apiKey, // Keep for backward compatibility
        models: updatedSettings.models,
        model: updatedSettings.model,
        baseUrls: updatedSettings.baseUrls,
        baseUrl: updatedSettings.baseUrl,
        temperature: updatedSettings.temperature,
        theme: updatedSettings.globalTheme, // Save global theme
        bgImage: updatedSettings.bgImage,
        promptTemplates: updatedSettings.promptTemplates,
        storyTemplates: updatedSettings.storyTemplates,
        useTieredMemory: updatedSettings.useTieredMemory,
        powermemConfig: updatedSettings.powermemConfig,
        isPaintingEnabled: updatedSettings.isPaintingEnabled,
        paintingProvider: updatedSettings.paintingProvider,
        paintingApiKey: updatedSettings.paintingApiKey,
        quickGenerate: updatedSettings.quickGenerate
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  }
}));
