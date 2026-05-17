import { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { useSettingStore } from '../store/settingStore';
import { useUIStore } from '../store/uiStore';
import { getDefaultModel } from '../components/SettingsModal';
import { PromptTemplate } from '../types';

export interface FlatSettings {
  provider: string;
  apiKeys: Record<string, string>;
  apiKey: string;
  models: Record<string, string>;
  model: string;
  baseUrls: Record<string, string>;
  baseUrl: string;
  providerNotes?: Record<string, string>;
  temperature: number;
  theme: 'light' | 'dark';
  globalTheme: 'light' | 'dark';
  bgImage: string | null;
  bgImages: string[];
  bgImageInterval: number;
  promptTemplates: PromptTemplate[];
  storyTemplates: PromptTemplate[];
  useTieredMemory: boolean;
  memoryMode: 'off' | 'simple' | 'powermem';
  memorySummarizeFrequency: number;
  recentHistoryRounds: number;
  powermemConfig: any;
  isPaintingEnabled: boolean;
  paintingProvider: string;
  paintingModel: string;
  paintingApiKey: string;
  quickGenerate: boolean;
  chatLayout: 'default' | 'wechat' | 'qq';
  sendBehavior: 'enter' | 'ctrl_enter';
  userAvatar: string | null;
  aiAvatar: string | null;
  userName: string | null;
  aiName: string | null;
  showMessageMeta: boolean;
}

export const useSettingsForm = () => {
  const { isSettingsOpen, setSettingsOpen } = useUIStore();
  const { setSettings, saveSettings } = useSettingStore();

  const [balance, setBalance] = useState<any>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const initialOpenRef = useRef(true);

  const [tempSettings, setTempSettings] = useState<Partial<FlatSettings>>({
    provider: 'deepseek',
    apiKeys: {} as Record<string, string>,
    apiKey: '',
    models: {} as Record<string, string>,
    model: 'deepseek-v4-flash',
    baseUrls: {} as Record<string, string>,
    baseUrl: '',
    temperature: 0.7,
    theme: 'light' as 'light' | 'dark',
    bgImage: null as string | null,
    promptTemplates: [] as PromptTemplate[],
    storyTemplates: [] as PromptTemplate[],
    useTieredMemory: true,
    powermemConfig: {
      useGlobalLLM: true,
      embeddingProvider: 'openai',
      embeddingApiKey: '',
      embeddingModel: 'text-embedding-3-small',
      llmProvider: 'openai',
      llmApiKey: '',
      llmModel: 'gpt-4o-mini'
    },
    isPaintingEnabled: false,
    paintingProvider: 'zhipuai',
    paintingModel: 'cogview-3-plus',
    paintingApiKey: '',
    quickGenerate: false
  });

  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingEmbedding, setIsTestingEmbedding] = useState(false);
  const [embeddingConnectionStatus, setEmbeddingConnectionStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingPainting, setIsTestingPainting] = useState(false);
  const [paintingConnectionStatus, setPaintingConnectionStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [editingAdvancedFeature, setEditingAdvancedFeature] = useState<'powermem' | 'painting' | null>(null);
  const [fetchedModels, setFetchedModels] = useState<Record<string, string[]>>({});
  const [fetchedEmbeddingModels, setFetchedEmbeddingModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [cropData, setCropData] = useState<{ src: string; target: 'user' | 'ai' } | null>(null);

  useEffect(() => {
    if (isSettingsOpen) {
      initialOpenRef.current = true;
      setSaveStatus('idle');
      const storeState = useSettingStore.getState();
      const llm = storeState.llmConfig;
      const ui = storeState.uiConfig;
      const mem = storeState.memoryConfig;
      const paint = storeState.paintingConfig;
      const sys = storeState.systemConfig;

      const initialState = {
        provider: llm.provider || 'deepseek',
        apiKeys: llm.apiKeys || {},
        apiKey: llm.apiKey || '',
        models: llm.models || {},
        model: llm.model || 'deepseek-v4-flash',
        baseUrls: llm.baseUrls || {},
        baseUrl: llm.baseUrl || '',
        providerNotes: llm.providerNotes || {},
        temperature: llm.temperature,
        theme: ui.globalTheme,
        globalTheme: ui.globalTheme,
        bgImage: ui.bgImage,
        bgImages: ui.bgImages || [],
        bgImageInterval: ui.bgImageInterval || 300,
        promptTemplates: sys.promptTemplates,
        storyTemplates: sys.storyTemplates,
        useTieredMemory: mem.useTieredMemory,
        memoryMode: mem.memoryMode,
        memorySummarizeFrequency: mem.memorySummarizeFrequency,
        recentHistoryRounds: mem.recentHistoryRounds,
        powermemConfig: mem.powermemConfig,
        isPaintingEnabled: paint.isPaintingEnabled,
        paintingProvider: paint.paintingProvider,
        paintingModel: paint.paintingModel,
        paintingApiKey: paint.paintingApiKey,
        quickGenerate: sys.quickGenerate,
        chatLayout: ui.chatLayout,
        sendBehavior: ui.sendBehavior,
        showMessageMeta: ui.showMessageMeta,
        userAvatar: ui.userAvatar,
        aiAvatar: ui.aiAvatar,
        userName: ui.userName,
        aiName: ui.aiName
      };
      setTempSettings(initialState);
      
      const currentProvider = llm.provider || 'deepseek';
      if (currentProvider === 'openai' || currentProvider === 'custom' || currentProvider === 'zhipuai') {
        const k = llm.apiKeys?.[currentProvider] || llm.apiKey || '';
        const bUrl = llm.baseUrls?.[currentProvider] || llm.baseUrl || '';
        if (k || currentProvider === 'custom') {
          fetchModelsForProvider(currentProvider, k, bUrl);
        }
      }
    }
  }, [isSettingsOpen]);

  useEffect(() => {
    if (!initialOpenRef.current && isSettingsOpen) {
       setSaveStatus('saving');
       const tId = setTimeout(() => {
          handleSaveSettings({}, true);
          setSaveStatus('saved');
          setTimeout(() => { setSaveStatus('idle'); }, 2000);
       }, 500);
       return () => clearTimeout(tId);
    }
    initialOpenRef.current = false;
  }, [tempSettings]);

  const fetchModelsForProvider = async (providerName: string, apiKeyToUse: string, baseUrlToUse: string) => {
    if (fetchedModels[providerName] && fetchedModels[providerName].length > 0) return;
    setIsFetchingModels(true);
    try {
      const result = await api.fetchModels(providerName, apiKeyToUse, baseUrlToUse);
      if (result && result.models) {
        setFetchedModels(prev => ({ ...prev, [providerName]: result.models }));
      }
    } catch (err) {
      console.error("Failed to fetch models", err);
    } finally {
      setIsFetchingModels(false);
    }
  };

  const fetchBalanceForEditingProvider = async () => {
    const providerToCheck = editingProvider || tempSettings.provider || 'deepseek';
    if (providerToCheck !== 'deepseek') return;
    try {
      setBalance(null);
      setBalanceError(null);
      
      const apiKeysObj = tempSettings.apiKeys || {};
      const apiKeyToTest = editingProvider ? apiKeysObj[editingProvider] || '' : tempSettings.apiKey || '';
      if (!apiKeyToTest) {
        setBalanceError('请先输入 API Key');
        return;
      }
      
      const res = await api.getBalance(apiKeyToTest);
      if (res && res.error) {
        setBalanceError(res.error);
      } else {
        setBalance(res);
      }
    } catch (e: any) {
      setBalanceError(e.message || "请求失败");
    }
  };

  const handleSaveSettings = async (updates?: any, isAutoSave?: boolean) => {
    // ...
    // ...
    const isEvent = updates && typeof updates.stopPropagation === 'function';
    const actualUpdates = isEvent || updates === undefined ? {} : updates;

    const finalSettings = {
      provider: tempSettings.provider,
      apiKeys: tempSettings.apiKeys,
      apiKey: tempSettings.apiKey,
      models: tempSettings.models,
      model: tempSettings.model,
      providerNotes: tempSettings.providerNotes,
      temperature: tempSettings.temperature,
      theme: tempSettings.theme,
      globalTheme: tempSettings.globalTheme,
      bgImage: tempSettings.bgImage,
      bgImages: tempSettings.bgImages,
      bgImageInterval: tempSettings.bgImageInterval,
      useTieredMemory: tempSettings.useTieredMemory,
      memoryMode: tempSettings.memoryMode,
      memorySummarizeFrequency: tempSettings.memorySummarizeFrequency,
      recentHistoryRounds: tempSettings.recentHistoryRounds,
      powermemConfig: tempSettings.powermemConfig,
      isPaintingEnabled: tempSettings.isPaintingEnabled,
      paintingProvider: tempSettings.paintingProvider,
      paintingModel: tempSettings.paintingModel,
      paintingApiKey: tempSettings.paintingApiKey,
      quickGenerate: tempSettings.quickGenerate,
      chatLayout: tempSettings.chatLayout,
      sendBehavior: tempSettings.sendBehavior,
      showMessageMeta: tempSettings.showMessageMeta,
      ...actualUpdates
    };

    setSettings(finalSettings);
    
    saveSettings({
      ...finalSettings,
      baseUrls: tempSettings.baseUrls,
      baseUrl: tempSettings.baseUrl,
      promptTemplates: tempSettings.promptTemplates,
      storyTemplates: tempSettings.storyTemplates,
      userAvatar: tempSettings.userAvatar,
      aiAvatar: tempSettings.aiAvatar,
      userName: tempSettings.userName,
      aiName: tempSettings.aiName,
      ...actualUpdates
    }).catch(console.error);
    
    // Only close if it's explicitly saved (by button click or closing)
    if (!isAutoSave && (!updates || isEvent)) {
      setSettingsOpen(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus(null);
    try {
      const providerToTest = editingProvider || tempSettings.provider!;
      const apiKeyToTest = editingProvider ? tempSettings.apiKeys?.[editingProvider] || '' : tempSettings.apiKey!;
      const modelToTest = editingProvider ? tempSettings.models?.[editingProvider] || getDefaultModel(editingProvider) : tempSettings.model!;
      const baseUrlToTest = editingProvider ? (tempSettings.baseUrls?.[editingProvider] || '') : tempSettings.baseUrl;

      const result = await api.testConnection(
        providerToTest,
        apiKeyToTest,
        modelToTest,
        baseUrlToTest
      );
      if (result && !result.error) {
        setConnectionStatus({ success: true, message: "连接成功响应正常" });
        if (providerToTest === 'openai' || providerToTest === 'custom' || providerToTest === 'zhipuai') {
           fetchModelsForProvider(providerToTest, apiKeyToTest, baseUrlToTest);
        }
      } else {
        setConnectionStatus({ success: false, message: result?.error || "连接失败" });
      }
    } catch (err: any) {
      setConnectionStatus({ success: false, message: err?.message || "连通性测试异常" });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleTestEmbeddingConnection = async (provider: string, apiKey: string, model: string) => {
    setIsTestingEmbedding(true);
    setEmbeddingConnectionStatus(null);
    try {
      setSettings(tempSettings); // Force state persist just in case
      const result = await api.testEmbeddingConnection(provider, apiKey, model);
      if (result && !result.error) {
        setEmbeddingConnectionStatus({ success: true, message: "向量引擎连接成功！" });
        try {
           setIsFetchingModels(true);
           const res = await api.fetchModels(provider, apiKey);
           if (res.models && res.models.length > 0) {
             setFetchedEmbeddingModels(res.models);
           }
        } catch (e) {
           console.log("Could not fetch embedding models", e);
        } finally {
           setIsFetchingModels(false);
        }
      } else {
        setEmbeddingConnectionStatus({ success: false, message: result?.error || "连接失败" });
      }
    } catch (err: any) {
      setEmbeddingConnectionStatus({ success: false, message: err?.message || "连通性测试异常" });
    } finally {
      setIsTestingEmbedding(false);
    }
  };

  return {
    balance, setBalance, balanceError, setBalanceError, saveStatus, saveMessage,
    tempSettings, setTempSettings,
    isTestingConnection, setIsTestingConnection, connectionStatus, setConnectionStatus,
    isTestingEmbedding, setIsTestingEmbedding, embeddingConnectionStatus, setEmbeddingConnectionStatus,
    isTestingPainting, setIsTestingPainting, paintingConnectionStatus, setPaintingConnectionStatus,
    editingProvider, setEditingProvider, editingAdvancedFeature, setEditingAdvancedFeature,
    fetchedModels, fetchedEmbeddingModels, setFetchedEmbeddingModels, isFetchingModels, isModelDropdownOpen, setIsModelDropdownOpen,
    cropData, setCropData, fetchBalanceForEditingProvider, handleSaveSettings, handleTestConnection, handleTestEmbeddingConnection
  };
};
