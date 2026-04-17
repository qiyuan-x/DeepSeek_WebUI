import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, X, Send, Layout, User, BookOpen, Wallet, Coins, StopCircle, HelpCircle, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cn, PromptTemplate } from '../types';
import { api } from '../services/api';
import { useSettingStore } from '../store/settingStore';
import { useUIStore } from '../store/uiStore';
import { useStoryStore } from '../store/storyStore';

const PROVIDERS_LIST = [
  { id: 'zhipuai', name: '智谱 AI (ZhipuAI)', type: 'openai' },
  { id: 'openai', name: 'OpenAI', type: 'openai' },
  { id: 'deepseek', name: 'DeepSeek', type: 'openai' },
  { id: 'gemini', name: 'Google Gemini', type: 'gemini' },
  { id: 'anthropic', name: 'Anthropic (Claude)', type: 'anthropic' },
  { id: 'custom', name: '兼容 OpenAI 格式 (Custom)', type: 'custom' },
] as const;

const getDefaultModel = (provider: string) => {
  switch (provider) {
    case 'deepseek': return 'deepseek-chat';
    case 'openai': return 'gpt-4o';
    case 'anthropic': return 'claude-3-5-sonnet-20240620';
    case 'zhipuai': return 'glm-4';
    case 'gemini': return 'gemini-1.5-pro';
    default: return '';
  }
};

export const SettingsModal: React.FC = () => {
  const { isSettingsOpen, setSettingsOpen, activeSettingsTab, setActiveSettingsTab } = useUIStore();
  const { isStoryMode } = useStoryStore();
  const { 
    apiKey, temperature, theme, globalTheme, bgImage, promptTemplates, storyTemplates, 
    useTieredMemory, isPaintingEnabled, paintingProvider, paintingApiKey, quickGenerate,
    setSettings, saveSettings
  } = useSettingStore();

  const [balance, setBalance] = useState<any>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const [tempSettings, setTempSettings] = useState<Partial<ReturnType<typeof useSettingStore.getState>>>({
    provider: 'deepseek',
    apiKeys: {} as Record<string, string>,
    apiKey: '',
    models: {} as Record<string, string>,
    model: 'deepseek-chat',
    baseUrls: {} as Record<string, string>,
    baseUrl: '',
    temperature: 0.7,
    theme: 'light' as 'light' | 'dark',
    bgImage: null as string | null,
    promptTemplates: [] as PromptTemplate[],
    storyTemplates: [] as PromptTemplate[],
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
    quickGenerate: false
  });

  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);

  useEffect(() => {
    if (isSettingsOpen) {
      const storeState = useSettingStore.getState();
      setTempSettings({
        provider: storeState.provider || 'deepseek',
        apiKeys: storeState.apiKeys || {},
        apiKey: storeState.apiKey || '',
        models: storeState.models || {},
        model: storeState.model || 'deepseek-chat',
        baseUrls: storeState.baseUrls || {},
        baseUrl: storeState.baseUrl || '',
        temperature: storeState.temperature,
        theme: storeState.globalTheme,
        bgImage: storeState.bgImage,
        promptTemplates: storeState.promptTemplates,
        storyTemplates: storeState.storyTemplates,
        useTieredMemory: storeState.useTieredMemory,
        powermemConfig: storeState.powermemConfig || {
          useGlobalLLM: false,
          embeddingProvider: 'openai',
          embeddingApiKey: '',
          embeddingModel: 'text-embedding-3-small',
          llmProvider: 'openai',
          llmApiKey: '',
          llmModel: 'gpt-4o-mini'
        },
        isPaintingEnabled: storeState.isPaintingEnabled,
        paintingProvider: storeState.paintingProvider,
        paintingApiKey: storeState.paintingApiKey,
        quickGenerate: storeState.quickGenerate
      });
      setBalance(null);
      setBalanceError(null);
    }
  }, [isSettingsOpen]);

  const fetchBalance = async () => {
    if (!tempSettings.apiKey) {
      setBalanceError('请先输入 API Key');
      return;
    }
    try {
      const data = await api.getBalance(tempSettings.apiKey);
      setBalance(data);
      setBalanceError(null);
    } catch (e: any) {
      setBalanceError(e.message || '查询失败');
      setBalance(null);
    }
  };

  const fetchBalanceForEditingProvider = async () => {
    if (editingProvider !== 'deepseek') return;
    try {
      const apiKeyToTest = editingProvider === tempSettings.provider ? tempSettings.apiKey : (tempSettings.apiKeys?.[editingProvider] || '');
      if (!apiKeyToTest) {
        setBalanceError('请先输入 API Key');
        return;
      }
      setBalanceError(null);
      const res = await api.getBalance(apiKeyToTest);
      setBalance(res);
    } catch (err: any) {
      setBalanceError(err.message || '查询失败');
      setBalance(null);
    }
  };

  const handleSaveSettings = async () => {
    setSettings({
      provider: tempSettings.provider,
      apiKeys: tempSettings.apiKeys,
      apiKey: tempSettings.apiKey,
      models: tempSettings.models,
      model: tempSettings.model,
      temperature: tempSettings.temperature,
      useTieredMemory: tempSettings.useTieredMemory,
      powermemConfig: tempSettings.powermemConfig,
      isPaintingEnabled: tempSettings.isPaintingEnabled,
      paintingProvider: tempSettings.paintingProvider,
      paintingApiKey: tempSettings.paintingApiKey,
      quickGenerate: tempSettings.quickGenerate
    });
    
    saveSettings({
      provider: tempSettings.provider,
      apiKeys: tempSettings.apiKeys,
      apiKey: tempSettings.apiKey,
      models: tempSettings.models,
      model: tempSettings.model,
      baseUrls: tempSettings.baseUrls,
      baseUrl: tempSettings.baseUrl,
      temperature: tempSettings.temperature,
      theme: tempSettings.theme,
      bgImage: tempSettings.bgImage,
      promptTemplates: tempSettings.promptTemplates,
      storyTemplates: tempSettings.storyTemplates,
      useTieredMemory: tempSettings.useTieredMemory,
      powermemConfig: tempSettings.powermemConfig,
      isPaintingEnabled: tempSettings.isPaintingEnabled,
      paintingProvider: tempSettings.paintingProvider,
      paintingApiKey: tempSettings.paintingApiKey,
      quickGenerate: tempSettings.quickGenerate
    }).catch(console.error);
    
    setSettingsOpen(false);
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
      } else {
        setConnectionStatus({ success: false, message: result?.error || "连接失败" });
      }
    } catch (err: any) {
      setConnectionStatus({ success: false, message: err?.message || "连通性测试异常" });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result as string;
        setTempSettings(prev => ({ ...prev, bgImage: result }));
        setSettings({ bgImage: result });
        await saveSettings({ bgImage: result });
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isSettingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-black/20 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className={cn(
          "w-full h-full sm:h-auto sm:max-h-[90vh] max-w-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-colors duration-300",
          theme === 'dark' ? "bg-[#1A1A1A] text-white" : "bg-white text-[#1A1A1A]"
        )}
      >
        <div className={cn(
          "p-4 sm:p-6 border-b flex items-center justify-between shrink-0",
          theme === 'dark' ? "border-white/10" : "border-[#F3F4F6]"
        )}>
          <div className="flex items-center gap-3">
            <Settings className={theme === 'dark' ? "text-white" : "text-[#1A1A1A]"} />
            <h2 className="text-lg font-bold">设置与配置</h2>
          </div>
          <button onClick={() => setSettingsOpen(false)} className={cn(
            "p-2 rounded-full transition-colors",
            theme === 'dark' ? "hover:bg-white/5" : "hover:bg-[#F3F4F6]"
          )}>
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Settings Top Tabs */}
          <div className={cn(
            "w-full border-b flex flex-row p-2 gap-2 overflow-x-auto shrink-0 hide-scrollbar",
            theme === 'dark' ? "border-white/10 bg-white/5" : "border-[#F3F4F6] bg-[#F9FAFB]"
          )}>
              {[
                { id: 'api', label: 'API/模型配置', icon: Send },
                { id: 'theme', label: '主题 & 界面', icon: Layout },
                { id: 'templates', label: '模板设置', icon: User },
                { id: 'advanced', label: '高级设置', icon: Settings },
                { id: 'help', label: '帮助中心', icon: HelpCircle },
              ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSettingsTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                  activeSettingsTab === tab.id
                    ? (theme === 'dark' ? "bg-white text-black" : "bg-[#1A1A1A] text-white")
                    : (theme === 'dark' ? "text-gray-400 hover:bg-white/5 hover:text-white" : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#1A1A1A]")
                )}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {activeSettingsTab === 'api' && !editingProvider && (
              <div className="flex flex-col h-full space-y-4">
                <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 px-4 py-3 text-xs font-bold text-[#6B7280] border-b dark:border-white/10 uppercase tracking-widest bg-gray-50/50 dark:bg-white/5 rounded-t-xl shrink-0">
                  <div className="w-8"></div>
                  <div>模型名称</div>
                  <div>接口类型</div>
                  <div className="text-center">是否启用</div>
                  <div className="text-right w-16">操作</div>
                </div>
                <div className="overflow-y-auto flex-1 pb-4 space-y-1">
                  {PROVIDERS_LIST.map(p => (
                    <div key={p.id} className={cn("grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 px-4 py-4 rounded-xl items-center text-sm transition-colors border", theme === 'dark' ? "border-transparent hover:bg-white/5" : "border-transparent hover:bg-gray-50", tempSettings.provider === p.id && (theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white shadow-sm'))}>
                      <div className="w-8 flex items-center justify-center">
                        <div className={cn("w-2 h-2 rounded-full", tempSettings.provider === p.id ? "bg-emerald-500" : "bg-transparent")}></div>
                      </div>
                      <div className="font-bold">{p.name}</div>
                      <div className="text-gray-500 font-mono text-xs">{p.type}</div>
                      <div className="flex justify-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={tempSettings.provider === p.id}
                            onChange={() => {
                              const defaultModel = getDefaultModel(p.id);
                              setTempSettings(prev => ({ 
                                ...prev, 
                                provider: p.id,
                                apiKey: prev.apiKeys?.[p.id] || '',
                                model: prev.models?.[p.id] || defaultModel,
                                baseUrl: prev.baseUrls?.[p.id] || ''
                              }));
                            }}
                          />
                          <div className={cn(
                            "w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all",
                            tempSettings.provider === p.id 
                              ? "bg-blue-600 after:border-white" 
                              : "bg-gray-200 dark:bg-white/10"
                          )}></div>
                        </label>
                      </div>
                      <div className="text-right flex items-center justify-end w-16">
                        <button 
                          onClick={() => {
                             setIsTestingConnection(false);
                             setConnectionStatus(null);
                             setEditingProvider(p.id);
                          }}
                          className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 rounded-lg transition-colors"
                        >
                          修改
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {activeSettingsTab === 'api' && editingProvider && (
               <div className="space-y-6 flex flex-col h-full pb-8">
                  <div className="flex items-center gap-3 shrink-0 border-b pb-4 dark:border-white/10">
                     <button onClick={() => setEditingProvider(null)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors hidden sm:block">
                        <X size={18} />
                     </button>
                     <h3 className="font-bold text-lg flex-1">配置模型 - {PROVIDERS_LIST.find(p => p.id === editingProvider)?.name}</h3>
                     <button onClick={() => setEditingProvider(null)} className="sm:hidden px-3 py-1 rounded bg-gray-100 dark:bg-white/10 transition-colors">
                        <span className="text-sm font-bold">返回</span>
                     </button>
                  </div>
                  
                  <div className="space-y-6 flex-1 pr-2">
                      <section className="space-y-3">
                         <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">Base URL</label>
                         <input 
                           type="url"
                           value={editingProvider === tempSettings.provider ? tempSettings.baseUrl : (tempSettings.baseUrls?.[editingProvider] || '')}
                           onChange={e => {
                             const val = e.target.value;
                             setTempSettings(prev => {
                               const next = { ...prev, baseUrls: { ...prev.baseUrls, [editingProvider]: val } };
                               if (prev.provider === editingProvider) next.baseUrl = val;
                               return next;
                             });
                           }}
                           placeholder={editingProvider === 'zhipuai' ? '默认为 https://open.bigmodel.cn/api/paas/v4/chat/completions' : '如果不填写，将使用默认官方地址'}
                           className={cn("w-full border-none rounded-xl px-4 py-2.5 text-sm outline-none transition-colors", theme === 'dark' ? "bg-white/5 focus:ring-1 focus:ring-white/20" : "bg-[#F3F4F6] focus:ring-1 focus:ring-[#1A1A1A]")}
                         />
                      </section>
                      <section className="space-y-3">
                         <div className="flex justify-between items-end">
                            <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">API Key <span className="text-red-500">*</span></label>
                            {editingProvider === 'deepseek' && (
                               <button onClick={fetchBalanceForEditingProvider} className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline">
                                 <Wallet size={14}/> 查询余额
                               </button>
                            )}
                         </div>
                         <input 
                           type="password"
                           value={editingProvider === tempSettings.provider ? tempSettings.apiKey : (tempSettings.apiKeys?.[editingProvider] || '')}
                           onChange={e => {
                             const val = e.target.value;
                             setTempSettings(prev => {
                               const next = { ...prev, apiKeys: { ...prev.apiKeys, [editingProvider]: val } };
                               if (prev.provider === editingProvider) next.apiKey = val;
                               return next;
                             });
                           }}
                           placeholder="sk-..."
                           className={cn("w-full border-none rounded-xl px-4 py-2.5 text-sm outline-none transition-colors", theme === 'dark' ? "bg-white/5 focus:ring-1 focus:ring-white/20" : "bg-[#F3F4F6] focus:ring-1 focus:ring-[#1A1A1A]")}
                         />
                         {editingProvider === 'deepseek' && balance && (
                            <div className="text-xs text-emerald-600 mt-2 flex items-center gap-2 bg-emerald-50 p-2 rounded border border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20">
                               <Coins size={14} /> 剩余余额: {balance.balance}
                            </div>
                         )}
                         {editingProvider === 'deepseek' && balanceError && (
                            <div className="text-xs text-red-600 mt-2">{balanceError}</div>
                         )}
                      </section>
                      <section className="space-y-3">
                         <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">模型名称 (Model) <span className="text-red-500">*</span></label>
                         <input 
                           type="text"
                           value={editingProvider === tempSettings.provider ? tempSettings.model : (tempSettings.models?.[editingProvider] || getDefaultModel(editingProvider))}
                           onChange={e => {
                             const val = e.target.value;
                             setTempSettings(prev => {
                               const next = { ...prev, models: { ...prev.models, [editingProvider]: val } };
                               if (prev.provider === editingProvider) next.model = val;
                               return next;
                             });
                           }}
                           placeholder="例如: gpt-4o, deepseek-chat, glm-4..."
                           className={cn("w-full border-none rounded-xl px-4 py-2.5 text-sm outline-none transition-colors", theme === 'dark' ? "bg-white/5 focus:ring-1 focus:ring-white/20" : "bg-[#F3F4F6] focus:ring-1 focus:ring-[#1A1A1A]")}
                         />
                      </section>
                      
                      <section className="space-y-4 pt-6 mt-6 border-t dark:border-white/10">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">Temperature (温度)</label>
                          <span className="font-mono text-sm font-bold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded">
                            {tempSettings.temperature?.toFixed(1)}
                          </span>
                        </div>
                        <input 
                          type="range"
                          min="0" max="2" step="0.1"
                          value={tempSettings.temperature}
                          onChange={e => setTempSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                          className="w-full accent-blue-600"
                        />
                        <div className={cn("text-xs flex gap-4 p-4 mt-2 rounded-xl border opacity-80", theme === 'dark' ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200")}>
                           <ul className="space-y-2 flex-1">
                             <li><strong>0.0</strong> - 代码/数学 (确定性)</li>
                             <li><strong>0.7</strong> - 通用对话 (平衡)</li>
                           </ul>
                           <ul className="space-y-2 flex-1">
                             <li><strong>1.1</strong> - 翻译/写作</li>
                             <li><strong>1.5</strong> - 创意头脑风暴 (发散)</li>
                           </ul>
                        </div>
                      </section>
                      
                      <section className="pt-6 mt-6 border-t border-gray-200 dark:border-white/10 flex justify-end gap-3 flex-wrap items-center">
                        {connectionStatus && (
                          <div className={cn(
                            "text-xs font-medium flex items-center gap-2 px-3 py-2.5 rounded-lg flex-1 min-w-[200px]",
                            connectionStatus.success 
                              ? "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10" 
                              : "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10"
                          )}>
                            {connectionStatus.success ? <HelpCircle size={14} /> : <StopCircle size={14} />}
                            {connectionStatus.message}
                          </div>
                        )}
                        <button
                          onClick={handleTestConnection}
                          disabled={isTestingConnection || !(editingProvider === tempSettings.provider ? tempSettings.apiKey : tempSettings.apiKeys?.[editingProvider])}
                          className={cn(
                            "px-5 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap text-sm ml-auto",
                            isTestingConnection || !(editingProvider === tempSettings.provider ? tempSettings.apiKey : tempSettings.apiKeys?.[editingProvider])
                              ? "opacity-50 cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-white/5 dark:text-gray-500"
                              : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                          )}
                        >
                          {isTestingConnection ? (
                            <>
                              <RefreshCw size={14} className="animate-spin" />
                              <span>测试中...</span>
                            </>
                          ) : (
                            <>
                              <Send size={14} />
                              <span>连通性测试</span>
                            </>
                          )}
                        </button>
                      </section>
                  </div>
               </div>
            )}
            {/* @ts-ignore */}
            {activeSettingsTab === 'api_old' && (
              <div className="space-y-8">
                {/* LLM Provider */}
                <section className="space-y-3">
                  <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">AI 模型提供商 (Provider)</label>
                  <div className="flex gap-2">
                  <select
                    value={tempSettings.provider || 'deepseek'}
                    onChange={e => {
                      const newProvider = e.target.value;
                      const defaultModel = newProvider === 'deepseek' ? 'deepseek-chat' : newProvider === 'openai' ? 'gpt-4o' : newProvider === 'anthropic' ? 'claude-3-5-sonnet-20240620' : newProvider === 'zhipuai' ? 'glm-4' : newProvider === 'custom' ? '' : 'gemini-1.5-pro';
                      setTempSettings(prev => ({ 
                        ...prev, 
                        provider: newProvider,
                        apiKey: prev.apiKeys?.[newProvider] || '',
                        model: prev.models?.[newProvider] || defaultModel,
                        baseUrl: prev.baseUrls?.[newProvider] || ''
                      }));
                    }}
                    className={cn(
                      "flex-1 border-none rounded-xl px-4 py-2.5 text-sm outline-none transition-colors appearance-none",
                      theme === 'dark' ? "bg-white/5 text-white focus:ring-1 focus:ring-white/20" : "bg-[#F3F4F6] text-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]"
                    )}
                  >
                    <option value="deepseek">DeepSeek</option>
                    <option value="openai">OpenAI</option>
                    <option value="zhipuai">智谱 AI (ZhipuAI)</option>
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="custom">兼容 OpenAI 格式 (Custom)</option>
                  </select>
                  <button
                    onClick={handleTestConnection}
                    disabled={isTestingConnection || !tempSettings.apiKey}
                    className={cn(
                      "px-4 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap text-sm",
                      isTestingConnection || !tempSettings.apiKey
                        ? "opacity-50 cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-white/5 dark:text-gray-500"
                        : (theme === 'dark' ? "bg-white text-black hover:bg-gray-200" : "bg-[#1A1A1A] text-white hover:bg-[#333]")
                    )}
                  >
                    {isTestingConnection ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>测试中</span>
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>连通性测试</span>
                      </>
                    )}
                  </button>
                </div>
                {connectionStatus && (
                  <div className={cn(
                    "text-xs font-medium flex items-center gap-2 px-3 py-1.5 rounded-lg mt-2 w-fit",
                    connectionStatus.success 
                      ? "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10" 
                      : "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10"
                  )}>
                    {connectionStatus.success ? <HelpCircle size={14} /> : <StopCircle size={14} />}
                    {connectionStatus.message}
                  </div>
                )}
                </section>

                {tempSettings.provider === 'deepseek' && (
                  <div className="space-y-8">
                    {/* DeepSeek API Key */}
                    <section className="space-y-3">
                      <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">DeepSeek API Key</label>
                      <div className="flex gap-2">
                        <input 
                          type="password"
                          value={tempSettings.apiKey}
                          onChange={e => {
                            const newKey = e.target.value;
                            setTempSettings(prev => ({ 
                              ...prev, 
                              apiKey: newKey,
                              apiKeys: { ...prev.apiKeys, deepseek: newKey }
                            }));
                          }}
                          placeholder="sk-..."
                          className={cn(
                            "flex-1 border-none rounded-xl px-4 py-2.5 text-sm outline-none transition-colors",
                            theme === 'dark' ? "bg-white/5 text-white focus:ring-1 focus:ring-white/20" : "bg-[#F3F4F6] text-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]"
                          )}
                        />
                        <button 
                          onClick={fetchBalance}
                          className={cn(
                            "px-4 py-2 rounded-xl transition-colors text-sm font-bold flex items-center gap-2",
                            theme === 'dark' ? "bg-white/5 text-white hover:bg-white/10" : "bg-[#F3F4F6] text-[#1A1A1A] hover:bg-[#E5E7EB]"
                          )}
                        >
                          <Wallet size={16} />
                          查询余额
                        </button>
                      </div>
                      {balance && (
                        <div className={cn(
                          "p-3 rounded-xl border flex items-center justify-between",
                          theme === 'dark' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-100 text-emerald-700"
                        )}>
                          <div className="flex items-center gap-2">
                            <Coins size={16} />
                            <span className="text-xs font-bold">可用余额:</span>
                          </div>
                          <span className="text-sm font-bold">
                            {balance.balance_infos?.[0]?.total_balance} {balance.balance_infos?.[0]?.currency}
                          </span>
                        </div>
                      )}
                      {balanceError && (
                        <div className={cn(
                          "p-3 rounded-xl border flex items-center justify-between",
                          theme === 'dark' ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-100 text-red-700"
                        )}>
                          <div className="flex items-center gap-2">
                            <StopCircle size={16} />
                            <span className="text-xs font-bold">错误:</span>
                          </div>
                          <span className="text-sm font-bold">
                            {balanceError}
                          </span>
                        </div>
                      )}
                    </section>

                    <section className="space-y-3">
                      <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">Base URL (可选, 自定义代理接口)</label>
                      <input 
                        type="url"
                        value={tempSettings.baseUrl}
                        onChange={e => {
                          const newUrl = e.target.value;
                          setTempSettings(prev => ({ 
                            ...prev, 
                            baseUrl: newUrl,
                            baseUrls: { ...prev.baseUrls, deepseek: newUrl }
                          }));
                        }}
                        placeholder="如果不填写，将使用默认官方地址"
                        className={cn(
                          "w-full border-none rounded-xl px-4 py-2.5 text-sm outline-none transition-colors",
                          theme === 'dark' ? "bg-white/5 text-white focus:ring-1 focus:ring-white/20" : "bg-[#F3F4F6] text-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]"
                        )}
                      />
                    </section>

                    {/* Temperature */}
                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">Temperature (温度)</label>
                        <span className="text-xs font-bold">{tempSettings.temperature}</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="1.5"
                        step="0.1"
                        value={tempSettings.temperature}
                        onChange={e => setTempSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                        className={cn(
                          "w-full accent-[#1A1A1A]",
                          theme === 'dark' && "accent-white"
                        )}
                      />
                      <div className={cn(
                        "p-4 rounded-2xl space-y-3",
                        theme === 'dark' ? "bg-white/5" : "bg-[#F9FAFB]"
                      )}>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-[#6B7280] uppercase">
                          <HelpCircle size={12} />
                          建议参考值
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-[11px]">
                          <div className="flex flex-col gap-1">
                            <span className={theme === 'dark' ? "text-white" : "text-[#1A1A1A]"}>代码/数学: <span className="font-mono font-bold">0.0</span></span>
                            <span className="text-[#9CA3AF]">追求极致的确定性</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className={theme === 'dark' ? "text-white" : "text-[#1A1A1A]"}>创意写作: <span className="font-mono font-bold">1.5</span></span>
                            <span className="text-[#9CA3AF]">追求发散与想象力</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className={theme === 'dark' ? "text-white" : "text-[#1A1A1A]"}>通用对话: <span className="font-mono font-bold">0.7</span></span>
                            <span className="text-[#9CA3AF]">平衡准确与自然</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className={theme === 'dark' ? "text-white" : "text-[#1A1A1A]"}>翻译: <span className="font-mono font-bold">1.1</span></span>
                            <span className="text-[#9CA3AF]">兼顾直译与意译</span>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                )}

                {tempSettings.provider === 'openai' && (
                  <div className="space-y-8">
                    {/* OpenAI API Key */}
                    <section className="space-y-3">
                      <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">OpenAI API Key</label>
                      <input 
                        type="password"
                        value={tempSettings.apiKey}
                        onChange={e => {
                          const newKey = e.target.value;
                          setTempSettings(prev => ({ 
                            ...prev, 
                            apiKey: newKey,
                            apiKeys: { ...prev.apiKeys, openai: newKey }
                          }));
                        }}
                        placeholder="sk-..."
                        className={cn(
                          "w-full border-none rounded-xl px-4 py-2.5 text-sm outline-none transition-colors",
                          theme === 'dark' ? "bg-white/5 text-white focus:ring-1 focus:ring-white/20" : "bg-[#F3F4F6] text-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]"
                        )}
                      />
                    </section>
                    {/* OpenAI Model */}
                    <section className="space-y-3">
                      <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">模型 (Model)</label>
                      <input 
                        type="text"
                        value={tempSettings.model}
                        onChange={e => {
                          const newModel = e.target.value;
                          setTempSettings(prev => ({ 
                            ...prev, 
                            model: newModel,
                            models: { ...prev.models, openai: newModel }
                          }));
                        }}
                        placeholder="例如: gpt-4o, gpt-4o-mini"
                        className={cn(
                          "w-full border-none rounded-xl px-4 py-2.5 text-sm outline-none transition-colors",
                          theme === 'dark' ? "bg-white/5 text-white focus:ring-1 focus:ring-white/20" : "bg-[#F3F4F6] text-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]"
                        )}
                      />
                    </section>
                    {/* OpenAI Base URL */}
                    <section className="space-y-3">
                      <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">Base URL (可选, 自定义代理接口)</label>
                      <input 
                        type="url"
                        value={tempSettings.baseUrl}
                        onChange={e => {
                          const newUrl = e.target.value;
                          setTempSettings(prev => ({ 
                            ...prev, 
                            baseUrl: newUrl,
                            baseUrls: { ...prev.baseUrls, openai: newUrl }
                          }));
                        }}
                        placeholder="https://api.openai.com/v1/chat/completions"
                        className={cn(
                          "w-full border-none rounded-xl px-4 py-2.5 text-sm outline-none transition-colors",
                          theme === 'dark' ? "bg-white/5 text-white focus:ring-1 focus:ring-white/20" : "bg-[#F3F4F6] text-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]"
                        )}
                      />
                    </section>
                  </div>
                )}

                {tempSettings.provider === 'anthropic' && (
                  <div className="space-y-8">
                    {/* Anthropic API Key */}
                    <section className="space-y-3">
                      <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">Anthropic API Key</label>
                      <input 
                        type="password"
                        value={tempSettings.apiKey}
                        onChange={e => {
                          const newKey = e.target.value;
                          setTempSettings(prev => ({ 
                            ...prev, 
                            apiKey: newKey,
                            apiKeys: { ...prev.apiKeys, anthropic: newKey }
                          }));
                        }}
                        placeholder="sk-ant-..."
                        className={cn(
                          "w-full border-none rounded-xl px-4 py-2.5 text-sm outline-none transition-colors",
                          theme === 'dark' ? "bg-white/5 text-white focus:ring-1 focus:ring-white/20" : "bg-[#F3F4F6] text-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]"
                        )}
                      />
                    </section>
                    {/* Anthropic Model */}
                    <section className="space-y-3">
                      <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">模型 (Model)</label>
                      <input 
                        type="text"
                        value={tempSettings.model}
                        onChange={e => {
                          const newModel = e.target.value;
                          setTempSettings(prev => ({ 
                            ...prev, 
                            model: newModel,
                            models: { ...prev.models, anthropic: newModel }
                          }));
                        }}
                        placeholder="例如: claude-3-5-sonnet-20240620"
                        className={cn(
                          "w-full border-none rounded-xl px-4 py-2.5 text-sm outline-none transition-colors",
                          theme === 'dark' ? "bg-white/5 text-white focus:ring-1 focus:ring-white/20" : "bg-[#F3F4F6] text-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]"
                        )}
                      />
                    </section>
                  </div>
                )}

                {tempSettings.provider === 'gemini' && (
                  <div className="space-y-8">
                    {/* Gemini API Key */}
                    <section className="space-y-3">
                      <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">Gemini API Key</label>
                      <input 
                        type="password"
                        value={tempSettings.apiKey}
                        onChange={e => {
                          const newKey = e.target.value;
                          setTempSettings(prev => ({ 
                            ...prev, 
                            apiKey: newKey,
                            apiKeys: { ...prev.apiKeys, gemini: newKey }
                          }));
                        }}
                        placeholder="AIza..."
                        className={cn(
                          "w-full border-none rounded-xl px-4 py-2.5 text-sm outline-none transition-colors",
                          theme === 'dark' ? "bg-white/5 text-white focus:ring-1 focus:ring-white/20" : "bg-[#F3F4F6] text-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]"
                        )}
                      />
                    </section>
                    {/* Gemini Model */}
                    <section className="space-y-3">
                      <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">模型 (Model)</label>
                      <input 
                        type="text"
                        value={tempSettings.model}
                        onChange={e => {
                          const newModel = e.target.value;
                          setTempSettings(prev => ({ 
                            ...prev, 
                            model: newModel,
                            models: { ...prev.models, gemini: newModel }
                          }));
                        }}
                        placeholder="例如: gemini-1.5-pro"
                        className={cn(
                          "w-full border-none rounded-xl px-4 py-2.5 text-sm outline-none transition-colors",
                          theme === 'dark' ? "bg-white/5 text-white focus:ring-1 focus:ring-white/20" : "bg-[#F3F4F6] text-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]"
                        )}
                      />
                    </section>
                  </div>
                )}
                {tempSettings.provider === 'zhipuai' && (
                  <div className="space-y-8">
                    {/* ZhipuAI API Key */}
                    <section className="space-y-3">
                      <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">Zhipu API Key</label>
                      <input 
                        type="password"
                        value={tempSettings.apiKey}
                        onChange={e => {
                          const newKey = e.target.value;
                          setTempSettings(prev => ({ 
                            ...prev, 
                            apiKey: newKey,
                            apiKeys: { ...prev.apiKeys, zhipuai: newKey }
                          }));
                        }}
                        placeholder="ZhipuAI API Key..."
                        className={cn(
                          "w-full border-none rounded-xl px-4 py-2.5 text-sm outline-none transition-colors",
                          theme === 'dark' ? "bg-white/5 text-white focus:ring-1 focus:ring-white/20" : "bg-[#F3F4F6] text-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]"
                        )}
                      />
                    </section>
                    {/* ZhipuAI Model */}
                    <section className="space-y-3">
                      <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">模型名称 (Model)</label>
                      <input 
                        type="text"
                        value={tempSettings.model}
                        onChange={e => {
                          const newModel = e.target.value;
                          setTempSettings(prev => ({ 
                            ...prev, 
                            model: newModel,
                            models: { ...prev.models, zhipuai: newModel }
                          }));
                        }}
                        placeholder="例如: glm-4"
                        className={cn(
                          "w-full border-none rounded-xl px-4 py-2.5 text-sm outline-none transition-colors",
                          theme === 'dark' ? "bg-white/5 text-white focus:ring-1 focus:ring-white/20" : "bg-[#F3F4F6] text-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]"
                        )}
                      />
                    </section>
                    {/* ZhipuAI Base URL */}
                    <section className="space-y-3">
                      <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">Base URL (可选)</label>
                      <input 
                        type="url"
                        value={tempSettings.baseUrl}
                        onChange={e => {
                          const newUrl = e.target.value;
                          setTempSettings(prev => ({ 
                            ...prev, 
                            baseUrl: newUrl,
                            baseUrls: { ...prev.baseUrls, zhipuai: newUrl }
                          }));
                        }}
                        placeholder="默认为 https://open.bigmodel.cn/api/paas/v4/chat/completions"
                        className={cn(
                          "w-full border-none rounded-xl px-4 py-2.5 text-sm outline-none transition-colors",
                          theme === 'dark' ? "bg-white/5 text-white focus:ring-1 focus:ring-white/20" : "bg-[#F3F4F6] text-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]"
                        )}
                      />
                    </section>
                  </div>
                )}
                {/* Custom API Provider */}
                {tempSettings.provider === 'custom' && (
                  <div className="space-y-8">
                    {/* Custom API Key */}
                    <section className="space-y-3">
                      <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">API Key (必填)</label>
                      <input 
                        type="password"
                        value={tempSettings.apiKey}
                        onChange={e => {
                          const newKey = e.target.value;
                          setTempSettings(prev => ({ 
                            ...prev, 
                            apiKey: newKey,
                            apiKeys: { ...prev.apiKeys, custom: newKey }
                          }));
                        }}
                        placeholder="sk-..."
                        className={cn(
                          "w-full border-none rounded-xl px-4 py-2.5 text-sm outline-none transition-colors",
                          theme === 'dark' ? "bg-white/5 text-white focus:ring-1 focus:ring-white/20" : "bg-[#F3F4F6] text-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]"
                        )}
                      />
                    </section>
                    {/* Custom Model */}
                    <section className="space-y-3">
                      <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">模型名称 (Model - 必填)</label>
                      <input 
                        type="text"
                        value={tempSettings.model}
                        onChange={e => {
                          const newModel = e.target.value;
                          setTempSettings(prev => ({ 
                            ...prev, 
                            model: newModel,
                            models: { ...prev.models, custom: newModel }
                          }));
                        }}
                        placeholder="例如: llama-3.1-405b-instruct"
                        className={cn(
                          "w-full border-none rounded-xl px-4 py-2.5 text-sm outline-none transition-colors",
                          theme === 'dark' ? "bg-white/5 text-white focus:ring-1 focus:ring-white/20" : "bg-[#F3F4F6] text-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]"
                        )}
                      />
                    </section>
                    {/* Custom Base URL */}
                    <section className="space-y-3">
                      <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">Base URL (必填)</label>
                      <input 
                        type="url"
                        value={tempSettings.baseUrl}
                        onChange={e => {
                          const newUrl = e.target.value;
                          setTempSettings(prev => ({ 
                            ...prev, 
                            baseUrl: newUrl,
                            baseUrls: { ...prev.baseUrls, custom: newUrl }
                          }));
                        }}
                        placeholder="例如: https://api.together.xyz/v1/chat/completions"
                        className={cn(
                          "w-full border-none rounded-xl px-4 py-2.5 text-sm outline-none transition-colors",
                          theme === 'dark' ? "bg-white/5 text-white focus:ring-1 focus:ring-white/20" : "bg-[#F3F4F6] text-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]"
                        )}
                      />
                    </section>
                  </div>
                )}

              </div>
            )}

            {activeSettingsTab === 'advanced' && (
              <div className="space-y-12">
                {/* Memory Settings */}
                <div className="space-y-8">
                  <h3 className={cn("text-lg font-bold pb-2 border-b", theme === 'dark' ? "border-white/10" : "border-[#E5E7EB]")}>🧠 记忆模块 (PowerMem)</h3>
                  <section className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">开启长效记忆</label>
                        <span className="text-xs text-gray-500">启用后即可拥有超越上下文长度的对话表现。</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={tempSettings.useTieredMemory}
                          onChange={e => setTempSettings(prev => ({ ...prev, useTieredMemory: e.target.checked }))}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1A1A1A] dark:peer-checked:bg-white"></div>
                      </label>
                    </div>
                  </section>

                  {tempSettings.useTieredMemory && (
                    <div className="space-y-6 pt-2 pl-4 border-l-2 border-[#E5E7EB] dark:border-white/10">
                      {/* LLM Section */}
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold opacity-80 flex items-center gap-2">记忆处理 (LLM)</h3>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <span className="text-xs font-medium text-gray-500">复用对话 LLM 配置</span>
                          <div className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={tempSettings.powermemConfig.useGlobalLLM ?? false}
                              onChange={e => setTempSettings(prev => ({
                                ...prev,
                                powermemConfig: {
                                  ...prev.powermemConfig,
                                  useGlobalLLM: e.target.checked
                                }
                              }))}
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                          </div>
                        </label>
                      </div>

                      {!(tempSettings.powermemConfig.useGlobalLLM ?? false) && (
                        <div className="space-y-6 pb-4">
                          <section className="space-y-3">
                            <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">提供商</label>
                            <select
                              value={tempSettings.powermemConfig.llmProvider}
                              onChange={e => setTempSettings(prev => ({ ...prev, powermemConfig: { ...prev.powermemConfig, llmProvider: e.target.value } }))}
                              className={cn(
                                "w-full border-none rounded-xl px-4 py-2.5 text-sm outline-none transition-colors appearance-none",
                                theme === 'dark' ? "bg-white/5 text-white focus:ring-1 focus:ring-white/20" : "bg-[#F3F4F6] text-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]"
                              )}
                            >
                              <option value="openai">OpenAI</option>
                              <option value="zhipuai">ZhipuAI</option>
                              <option value="dashscope">DashScope</option>
                              <option value="deepseek">DeepSeek</option>
                              <option value="anthropic">Anthropic (Claude)</option>
                              <option value="gemini">Google Gemini</option>
                            </select>
                          </section>

                          <section className="space-y-3">
                            <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">API Key</label>
                            <input 
                              type="password"
                              value={tempSettings.powermemConfig.llmApiKey}
                              onChange={e => setTempSettings(prev => ({ ...prev, powermemConfig: { ...prev.powermemConfig, llmApiKey: e.target.value } }))}
                              placeholder="sk-..."
                              className={cn(
                                "w-full border-none rounded-xl px-4 py-2.5 text-sm outline-none transition-colors",
                                theme === 'dark' ? "bg-white/5 text-white focus:ring-1 focus:ring-white/20" : "bg-[#F3F4F6] text-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]"
                              )}
                            />
                          </section>

                          <section className="space-y-3">
                            <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">模型名称</label>
                            <input 
                              type="text"
                              value={tempSettings.powermemConfig.llmModel}
                              onChange={e => setTempSettings(prev => ({ ...prev, powermemConfig: { ...prev.powermemConfig, llmModel: e.target.value } }))}
                              placeholder="例如: default"
                              className={cn(
                                "w-full border-none rounded-xl px-4 py-2.5 text-sm outline-none transition-colors",
                                theme === 'dark' ? "bg-white/5 text-white focus:ring-1 focus:ring-white/20" : "bg-[#F3F4F6] text-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]"
                              )}
                            />
                          </section>
                        </div>
                      )}

                      <div className="h-px bg-gray-200 dark:bg-white/10"></div>

                      {/* Embedding Section */}
                      <div>
                        <h3 className="text-sm font-bold opacity-80 flex items-center gap-2 mb-6">向量化引擎 (Embedding)</h3>
                        
                        <section className="space-y-3">
                          <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">提供商</label>
                          <select
                            value={tempSettings.powermemConfig.embeddingProvider}
                            onChange={e => setTempSettings(prev => ({ ...prev, powermemConfig: { ...prev.powermemConfig, embeddingProvider: e.target.value } }))}
                            className={cn(
                              "w-full border-none rounded-xl px-4 py-2.5 text-sm outline-none transition-colors appearance-none",
                              theme === 'dark' ? "bg-white/5 text-white focus:ring-1 focus:ring-white/20" : "bg-[#F3F4F6] text-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]"
                            )}
                          >
                            <option value="openai">OpenAI</option>
                            <option value="zhipuai">ZhipuAI</option>
                            <option value="dashscope">DashScope</option>
                          </select>
                        </section>
                      </div>
                      
                      <section className="space-y-3">
                        <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">API Key</label>
                        <input 
                          type="password"
                          value={tempSettings.powermemConfig.embeddingApiKey}
                          onChange={e => setTempSettings(prev => ({ ...prev, powermemConfig: { ...prev.powermemConfig, embeddingApiKey: e.target.value } }))}
                          placeholder="sk-..."
                          className={cn(
                            "w-full border-none rounded-xl px-4 py-2.5 text-sm outline-none transition-colors",
                            theme === 'dark' ? "bg-white/5 text-white focus:ring-1 focus:ring-white/20" : "bg-[#F3F4F6] text-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]"
                          )}
                        />
                      </section>

                      <section className="space-y-3 pb-4">
                        <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">模型名称</label>
                        <input 
                          type="text"
                          value={tempSettings.powermemConfig.embeddingModel}
                          onChange={e => setTempSettings(prev => ({ ...prev, powermemConfig: { ...prev.powermemConfig, embeddingModel: e.target.value } }))}
                          placeholder="例如: text-embedding-3-small"
                          className={cn(
                            "w-full border-none rounded-xl px-4 py-2.5 text-sm outline-none transition-colors",
                            theme === 'dark' ? "bg-white/5 text-white focus:ring-1 focus:ring-white/20" : "bg-[#F3F4F6] text-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]"
                          )}
                        />
                      </section>
                      
                      <div className={cn("p-4 rounded-xl text-xs leading-relaxed space-y-2 mt-4", theme === 'dark' ? "bg-white/5 border border-white/10" : "bg-gray-50 border border-gray-200 text-[#1A1A1A]")}>
                        <p><strong>💡 记忆存储说明：</strong></p>
                        <ul className="list-disc pl-5 space-y-1 opacity-80">
                          <li><strong>LLM模型</strong>：用于在后台分析历史对话，提取核心记忆并生成动态摘要。如果开启了跨模型复用开关，将自动使用上方「对话LLM模型配置」里选中的全局引擎配置。</li>
                          <li><strong>Embedding模型</strong>：必须配置。它负责将您长周期的高光记忆转化为向量数据用于日后低延迟的高精度召回检索。</li>
                          <li><strong>本地数据库</strong>：长效记忆将被安全储存在本地 indexedDB 中。</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                {/* AI Painting Settings */}
                <div className="space-y-8">
                  <h3 className={cn("text-lg font-bold pb-2 border-b", theme === 'dark' ? "border-white/10" : "border-[#E5E7EB]")}>🎨 AI 绘画功能</h3>
                  <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold flex items-center gap-2">
                      <span className="text-lg">🎨</span> AI 绘画总开关
                    </label>
                    <button
                      onClick={() => setTempSettings(prev => ({ ...prev, isPaintingEnabled: !prev.isPaintingEnabled }))}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors relative",
                        tempSettings.isPaintingEnabled ? "bg-emerald-500" : (theme === 'dark' ? "bg-white/20" : "bg-gray-300")
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm",
                        tempSettings.isPaintingEnabled ? "left-6.5" : "left-0.5"
                      )} />
                    </button>
                  </div>
                  <p className={cn("text-xs", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>
                    开启后，AI 消息气泡底部将显示“描绘此景/此人”按钮，可将文字转化为精美图像。
                  </p>
                </section>

                {tempSettings.isPaintingEnabled && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <section className="space-y-3">
                      <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">服务商选择</label>
                      <select
                        value={tempSettings.paintingProvider}
                        onChange={e => setTempSettings(prev => ({ ...prev, paintingProvider: e.target.value }))}
                        className={cn(
                          "w-full border-none rounded-xl px-4 py-3 text-sm outline-none transition-colors appearance-none",
                          theme === 'dark' ? "bg-white/5 text-white focus:ring-1 focus:ring-white/20" : "bg-[#F3F4F6] text-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]"
                        )}
                      >
                        <option value="jimeng">火山引擎 - 即梦 (Jimeng)</option>
                        {/* Future providers can be added here */}
                      </select>
                    </section>

                    <section className="space-y-3">
                      <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">API Key</label>
                      <input 
                        type="password"
                        value={tempSettings.paintingApiKey}
                        onChange={e => setTempSettings(prev => ({ ...prev, paintingApiKey: e.target.value }))}
                        placeholder="输入对应服务商的 API Key..."
                        className={cn(
                          "w-full border-none rounded-xl px-4 py-3 text-sm outline-none transition-colors",
                          theme === 'dark' ? "bg-white/5 text-white focus:ring-1 focus:ring-white/20" : "bg-[#F3F4F6] text-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]"
                        )}
                      />
                    </section>

                    <section className="space-y-3 pt-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tempSettings.quickGenerate}
                          onChange={e => setTempSettings(prev => ({ ...prev, quickGenerate: e.target.checked }))}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium">开启一键直出（跳过提示词确认直接生成）</span>
                      </label>
                    </section>
                  </motion.div>
                )}
                </div>
              </div>
            )}

            {activeSettingsTab === 'theme' && (
              <div className="space-y-8">
                <section className="space-y-3">
                  <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">主题模式</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={async () => {
                        if (!isStoryMode) setSettings({ theme: 'light' });
                        setSettings({ globalTheme: 'light' });
                        setTempSettings(prev => ({ ...prev, theme: 'light' }));
                        await saveSettings({ theme: 'light' });
                      }}
                      className={cn(
                        "p-4 text-center rounded-2xl border transition-all flex flex-col items-center gap-2",
                        tempSettings.theme === 'light' 
                          ? "border-[#1A1A1A] bg-[#F9FAFB] ring-1 ring-[#1A1A1A]" 
                          : "border-white/10 hover:border-white/30 text-gray-400"
                      )}
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <RefreshCw size={20} className="text-gray-600" />
                      </div>
                      <div className="text-sm font-bold">浅色模式</div>
                    </button>
                    <button
                      onClick={async () => {
                        if (!isStoryMode) setSettings({ theme: 'dark' });
                        setSettings({ globalTheme: 'dark' });
                        setTempSettings(prev => ({ ...prev, theme: 'dark' }));
                        await saveSettings({ theme: 'dark' });
                      }}
                      className={cn(
                        "p-4 text-center rounded-2xl border transition-all flex flex-col items-center gap-2",
                        tempSettings.theme === 'dark' 
                          ? "border-white bg-white/10" 
                          : "border-[#E5E7EB] hover:border-[#1A1A1A] text-[#6B7280]"
                      )}
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
                        <RefreshCw size={20} className="text-gray-400" />
                      </div>
                      <div className="text-sm font-bold">深色模式</div>
                    </button>
                  </div>
                </section>

                <section className="space-y-3">
                  <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">背景图片</label>
                  <div className="space-y-3">
                    <div className={cn(
                      "relative h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors overflow-hidden",
                      theme === 'dark' ? "border-white/10 hover:border-white/20" : "border-[#E5E7EB] hover:border-[#1A1A1A]"
                    )}>
                      {tempSettings.bgImage ? (
                        <>
                          <img src={tempSettings.bgImage} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                          <button 
                            onClick={async () => {
                              setTempSettings(prev => ({ ...prev, bgImage: null }));
                              setSettings({ bgImage: null });
                              await saveSettings({ bgImage: null });
                            }}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 z-10"
                          >
                            <X size={12} />
                          </button>
                          <span className="relative z-10 text-[10px] font-bold uppercase bg-black/50 text-white px-2 py-1 rounded">已上传</span>
                        </>
                      ) : (
                        <>
                          <HelpCircle size={20} className="text-[#9CA3AF]" />
                          <span className="text-[10px] font-bold text-[#9CA3AF] uppercase">上传背景图</span>
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                    <p className="text-[10px] text-[#9CA3AF] text-center">支持 JPG, PNG, WEBP</p>
                  </div>
                </section>
              </div>
            )}

            {activeSettingsTab === 'templates' && (
              <div className="space-y-8">
                {/* AI Setting Templates */}
                <section className="space-y-6">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">AI设定模板</label>
                    <button
                      onClick={async () => {
                        const newTemplate = { id: uuidv4(), name: '新AI设定', content: '' };
                        const newTemplates = [newTemplate, ...tempSettings.promptTemplates];
                        setTempSettings(prev => ({ ...prev, promptTemplates: newTemplates }));
                        setSettings({ promptTemplates: newTemplates });
                        await saveSettings({ promptTemplates: newTemplates });
                      }}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors",
                        theme === 'dark' ? "bg-white text-black hover:bg-gray-200" : "bg-[#1A1A1A] text-white hover:bg-[#333]"
                      )}
                    >
                      <Plus size={14} />
                      新建模板
                    </button>
                  </div>

                  <div className="space-y-4">
                    {tempSettings.promptTemplates.length === 0 ? (
                      <div className={cn(
                        "p-8 text-center rounded-2xl border-2 border-dashed",
                        theme === 'dark' ? "border-white/5 text-gray-500" : "border-[#F3F4F6] text-[#9CA3AF]"
                      )}>
                        <User size={32} className="mx-auto mb-2 opacity-20" />
                        <p className="text-xs font-medium">暂无AI设定模板，点击上方按钮新建</p>
                      </div>
                    ) : (
                      tempSettings.promptTemplates.map(template => (
                        <div
                          key={template.id}
                          className={cn(
                            "p-4 rounded-2xl border transition-all space-y-3",
                            theme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-[#E5E7EB]"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              value={template.name}
                              onChange={async (e) => {
                                const newTemplates = tempSettings.promptTemplates.map(t => t.id === template.id ? { ...t, name: e.target.value } : t);
                                setTempSettings(prev => ({ ...prev, promptTemplates: newTemplates }));
                                setSettings({ promptTemplates: newTemplates });
                                await saveSettings({ promptTemplates: newTemplates });
                              }}
                              placeholder="模板名称"
                              className={cn(
                                "flex-1 bg-transparent border-none outline-none text-sm font-bold",
                                theme === 'dark' ? "text-white" : "text-[#1A1A1A]"
                              )}
                            />
                            <button
                              onClick={async () => {
                                const newTemplates = tempSettings.promptTemplates.filter(t => t.id !== template.id);
                                setTempSettings(prev => ({ ...prev, promptTemplates: newTemplates }));
                                setSettings({ promptTemplates: newTemplates });
                                await saveSettings({ promptTemplates: newTemplates });
                              }}
                              className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <textarea
                            value={template.content}
                            onChange={async (e) => {
                              const newTemplates = tempSettings.promptTemplates.map(t => t.id === template.id ? { ...t, content: e.target.value } : t);
                              setTempSettings(prev => ({ ...prev, promptTemplates: newTemplates }));
                              setSettings({ promptTemplates: newTemplates });
                              await saveSettings({ promptTemplates: newTemplates });
                            }}
                            placeholder="输入AI设定内容..."
                            className={cn(
                              "w-full bg-transparent border-none outline-none text-sm resize-none min-h-[80px]",
                              theme === 'dark' ? "text-gray-300" : "text-gray-600"
                            )}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </section>

                {/* Story Templates */}
                <section className="space-y-6 pt-6 border-t border-dashed border-gray-200 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">故事设定模板</label>
                    <button
                      onClick={async () => {
                        const newTemplate = { id: uuidv4(), name: '新故事设定', content: '' };
                        const newTemplates = [newTemplate, ...tempSettings.storyTemplates];
                        setTempSettings(prev => ({ ...prev, storyTemplates: newTemplates }));
                        setSettings({ storyTemplates: newTemplates });
                        await saveSettings({ storyTemplates: newTemplates });
                      }}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors",
                        theme === 'dark' ? "bg-white text-black hover:bg-gray-200" : "bg-[#1A1A1A] text-white hover:bg-[#333]"
                      )}
                    >
                      <Plus size={14} />
                      新建模板
                    </button>
                  </div>

                  <div className="space-y-4">
                    {tempSettings.storyTemplates.length === 0 ? (
                      <div className={cn(
                        "p-8 text-center rounded-2xl border-2 border-dashed",
                        theme === 'dark' ? "border-white/5 text-gray-500" : "border-[#F3F4F6] text-[#9CA3AF]"
                      )}>
                        <BookOpen size={32} className="mx-auto mb-2 opacity-20" />
                        <p className="text-xs font-medium">暂无故事设定模板，点击上方按钮新建</p>
                      </div>
                    ) : (
                      tempSettings.storyTemplates.map(template => (
                        <div
                          key={template.id}
                          className={cn(
                            "p-4 rounded-2xl border transition-all space-y-3",
                            theme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-[#E5E7EB]"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              value={template.name}
                              onChange={async (e) => {
                                const newTemplates = tempSettings.storyTemplates.map(t => t.id === template.id ? { ...t, name: e.target.value } : t);
                                setTempSettings(prev => ({ ...prev, storyTemplates: newTemplates }));
                                setSettings({ storyTemplates: newTemplates });
                                await saveSettings({ storyTemplates: newTemplates });
                              }}
                              placeholder="模板名称"
                              className={cn(
                                "flex-1 bg-transparent border-none outline-none text-sm font-bold",
                                theme === 'dark' ? "text-white" : "text-[#1A1A1A]"
                              )}
                            />
                            <button
                              onClick={async () => {
                                const newTemplates = tempSettings.storyTemplates.filter(t => t.id !== template.id);
                                setTempSettings(prev => ({ ...prev, storyTemplates: newTemplates }));
                                setSettings({ storyTemplates: newTemplates });
                                await saveSettings({ storyTemplates: newTemplates });
                              }}
                              className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <textarea
                            value={template.content}
                            onChange={async (e) => {
                              const newTemplates = tempSettings.storyTemplates.map(t => t.id === template.id ? { ...t, content: e.target.value } : t);
                              setTempSettings(prev => ({ ...prev, storyTemplates: newTemplates }));
                              setSettings({ storyTemplates: newTemplates });
                              await saveSettings({ storyTemplates: newTemplates });
                            }}
                            placeholder="输入故事设定内容..."
                            className={cn(
                              "w-full bg-transparent border-none outline-none text-sm resize-none min-h-[80px]",
                              theme === 'dark' ? "text-gray-300" : "text-gray-600"
                            )}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            )}

            {activeSettingsTab === 'help' && (
              <div className="space-y-6">
                <section className="space-y-4">
                  <h3 className="text-sm font-bold">常见问题</h3>
                  <div className="space-y-4 text-sm">
                    <div className={cn(
                      "p-4 rounded-xl",
                      theme === 'dark' ? "bg-white/5" : "bg-[#F9FAFB]"
                    )}>
                      <p className="font-bold mb-1">如何获取 API Key？</p>
                      <p className={theme === 'dark' ? "text-gray-400" : "text-gray-600"}>
                        请访问 DeepSeek 开放平台 (platform.deepseek.com) 注册并获取 API Key。
                      </p>
                    </div>
                    <div className={cn(
                      "p-4 rounded-xl",
                      theme === 'dark' ? "bg-white/5" : "bg-[#F9FAFB]"
                    )}>
                      <p className="font-bold mb-1">数据存储在哪里？</p>
                      <p className={theme === 'dark' ? "text-gray-400" : "text-gray-600"}>
                        所有聊天记录和设置都安全地存储在您的本地浏览器和服务器中。
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>

        <div className={cn(
          "p-4 sm:p-6 border-t flex items-center justify-end gap-3 shrink-0",
          theme === 'dark' ? "border-white/10" : "border-[#F3F4F6]"
        )}>
          <button 
            onClick={() => setSettingsOpen(false)}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-colors",
              theme === 'dark' ? "bg-white/5 text-white hover:bg-white/10" : "bg-[#F3F4F6] text-[#1A1A1A] hover:bg-[#E5E7EB]"
            )}
          >
            取消
          </button>
          <button 
            onClick={handleSaveSettings}
            className={cn(
              "px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg",
              theme === 'dark' ? "bg-white text-black hover:bg-gray-200" : "bg-[#1A1A1A] text-white hover:bg-[#333]"
            )}
          >
            保存并关闭
          </button>
        </div>
      </motion.div>
    </div>
  );
};
