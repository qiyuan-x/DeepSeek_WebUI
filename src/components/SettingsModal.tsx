import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, X, Send, Layout, User, BookOpen, Wallet, Coins, StopCircle, HelpCircle, RefreshCw, Plus, Trash2, Brain, ChevronDown, Check, AlertCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cn, PromptTemplate } from '../types';
import { api } from '../services/api';
import { useSettingStore } from '../store/settingStore';
import { useUIStore } from '../store/uiStore';
import { useStoryStore } from '../store/storyStore';
import { AvatarCropperModal } from './AvatarCropperModal';
import { ApiTab } from './settings/ApiTab';
import { HelpTab } from './settings/HelpTab';
import { ThemeTab } from './settings/ThemeTab';
import { TemplatesTab } from './settings/TemplatesTab';
import { AdvancedTab } from './settings/AdvancedTab';
import { useSettingsForm } from '../hooks/useSettingsForm';

export const PROVIDERS_LIST = [
  { 
    id: 'zhipuai', name: '智谱 AI (ZhipuAI)', type: 'openai', typeLabel: 'OpenAI接口', 
    docsUrl: 'https://open.bigmodel.cn/',
    description: '智谱AI配置说明：\n1. 访问 https://open.bigmodel.cn/ 获取API密钥\n2. 填入配置中，当前默认模型glm-4\n3. 平台兼容OpenAI接口规范'
  },
  { 
    id: 'openai', name: 'OpenAI', type: 'openai', typeLabel: 'OpenAI接口',
    docsUrl: 'https://platform.openai.com/',
    description: 'OpenAI配置说明：\n1. 访问 https://platform.openai.com/ 获取API密钥\n2. 填入配置中，当前默认模型gpt-4o\n3. 如果网络受限，可自行配置代理的Base URL'
  },
  { 
    id: 'deepseek', name: 'DeepSeek', type: 'openai', typeLabel: 'OpenAI接口',
    docsUrl: 'https://platform.deepseek.com/',
    description: 'DeepSeek配置说明：\n1. 访问 https://platform.deepseek.com/\n2. 注册并获取API密钥\n3. 填入配置文件中，当前默认使用deepseek-v4-flash模型'
  },
  { 
    id: 'gemini', name: 'Google Gemini', type: 'gemini', typeLabel: 'Gemini接口',
    docsUrl: 'https://aistudio.google.com/',
    description: 'Gemini配置说明：\n1. 访问 https://aistudio.google.com/ 获取API密钥\n2. 默认使用gemini-1.5-pro\n3. 温度等参数遵循Gemini规范'
  },
  { 
    id: 'dashscope', name: '通义千问 (DashScope)', type: 'openai', typeLabel: 'OpenAI兼容接口',
    docsUrl: 'https://dashscope.console.aliyun.com/',
    description: '通义千问配置说明：\n1. 访问 https://dashscope.console.aliyun.com/ 获取API密钥\n2. 默认使用qwen-plus\n3. 平台已兼容OpenAI接口规范，可直接请求'
  },
  { 
    id: 'local', name: '本地模型 (Ollama/LM Studio)', type: 'openai', typeLabel: 'OpenAI兼容接口',
    docsUrl: 'https://ollama.com/',
    description: '本地模型说明：\n1. 本地需运行Ollama或LM Studio等提供OpenAI兼容接口的软件\n2. 默认Base URL为 http://127.0.0.1:11434/v1\n3. 配置好本地使用的模型名即可免费调用'
  },
  { 
    id: 'custom', name: '兼容 OpenAI 格式 (Custom)', type: 'custom', typeLabel: 'OpenAI兼容接口',
    docsUrl: '',
    description: '自定义OpenAI配置说明：\n1. 填入支持OpenAI格式的自定义接口Base URL（如OneAPI, Ollama等）\n2. 填入对应的模型名称和API Key\n3. 支持接入各种私有化部署或代理接口'
  },
] as const;

export const getDefaultModel = (provider: string) => {
  switch (provider) {
    case 'deepseek': return 'deepseek-v4-flash';
    case 'openai': return 'gpt-4o';
    case 'dashscope': return 'qwen-plus';
    case 'local': return 'llama3';
    case 'zhipuai': return 'glm-4';
    case 'gemini': return 'gemini-1.5-pro';
    default: return '';
  }
};

export const SettingsModal: React.FC = () => {
  const { isSettingsOpen, activeSettingsTab, setActiveSettingsTab } = useUIStore();
  const { theme } = useSettingStore(s => s.uiConfig);
  const { setSettings, saveSettings } = useSettingStore();

  const {
    balance, balanceError, saveStatus, saveMessage,
    tempSettings, setTempSettings,
    isTestingConnection, connectionStatus,
    isTestingEmbedding, setIsTestingEmbedding, embeddingConnectionStatus, setEmbeddingConnectionStatus,
    isTestingPainting, paintingConnectionStatus, setPaintingConnectionStatus, setIsTestingPainting,
    editingProvider, setEditingProvider, editingAdvancedFeature, setEditingAdvancedFeature,
    fetchedModels, fetchedEmbeddingModels, setFetchedEmbeddingModels, isFetchingModels, isModelDropdownOpen, setIsModelDropdownOpen,
    cropData, setCropData, fetchBalanceForEditingProvider, handleSaveSettings, handleTestConnection, handleTestEmbeddingConnection
  } = useSettingsForm();

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
          <button onClick={handleSaveSettings} className={cn(
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
                { id: 'advanced', label: '高级功能', icon: Settings },
                { id: 'help', label: '帮助中心', icon: HelpCircle },
              ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveSettingsTab(tab.id as any);
                  setEditingProvider(null);
                  setEditingAdvancedFeature(null);
                }}
                className={cn(
                  "flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap",
                  activeSettingsTab === tab.id
                    ? (theme === 'dark' ? "bg-white text-black" : "bg-[#1A1A1A] text-white")
                    : (theme === 'dark' ? "text-gray-400 hover:bg-white/5 hover:text-white" : "text-[#6B7280] dark:text-gray-400 hover:bg-[#F3F4F6] hover:text-[#1A1A1A]")
                )}
              >
                <tab.icon size={16} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {activeSettingsTab === 'api' && (
              <ApiTab
                tempSettings={tempSettings}
                setTempSettings={setTempSettings}
                editingProvider={editingProvider}
                setEditingProvider={setEditingProvider}
                handleTestConnection={handleTestConnection}
                isTestingConnection={isTestingConnection}
                connectionStatus={connectionStatus}
                fetchBalanceForEditingProvider={fetchBalanceForEditingProvider}
                balance={balance}
                balanceError={balanceError}
                fetchedModels={fetchedModels}
                isFetchingModels={isFetchingModels}
                isModelDropdownOpen={isModelDropdownOpen}
                setIsModelDropdownOpen={setIsModelDropdownOpen}
              />
            )}










            {activeSettingsTab === 'advanced' && (
              <AdvancedTab
                tempSettings={tempSettings}
                setTempSettings={setTempSettings}
                editingAdvancedFeature={editingAdvancedFeature}
                setEditingAdvancedFeature={setEditingAdvancedFeature}
                paintingConnectionStatus={paintingConnectionStatus}
                setPaintingConnectionStatus={setPaintingConnectionStatus}
                isTestingPainting={isTestingPainting}
                setIsTestingPainting={setIsTestingPainting}
                embeddingConnectionStatus={embeddingConnectionStatus}
                setEmbeddingConnectionStatus={setEmbeddingConnectionStatus}
                fetchedEmbeddingModels={fetchedEmbeddingModels}
                setFetchedEmbeddingModels={setFetchedEmbeddingModels}
                isTestingEmbedding={isTestingEmbedding}
                setIsTestingEmbedding={setIsTestingEmbedding}
                handleTestEmbeddingConnection={handleTestEmbeddingConnection}
              />
            )}

            {activeSettingsTab === 'theme' && (
              <ThemeTab
                tempSettings={tempSettings}
                setTempSettings={setTempSettings}
                handleSaveSettings={handleSaveSettings}
                setCropData={setCropData}
              />
            )}

            {activeSettingsTab === 'templates' && (
              <TemplatesTab
                tempSettings={tempSettings}
                setTempSettings={setTempSettings}
                handleSaveSettings={handleSaveSettings}
              />
            )}

            {activeSettingsTab === 'help' && (
              <HelpTab />
            )}
          </div>
        </div>

        {cropData && (
          <AvatarCropperModal
            imageSrc={cropData.src}
            onCropComplete={async (croppedImage) => {
              if (cropData.target === 'user') {
                setTempSettings(prev => ({ ...prev, userAvatar: croppedImage }));
                setSettings({ userAvatar: croppedImage });
                await saveSettings({ userAvatar: croppedImage });
              } else {
                setTempSettings(prev => ({ ...prev, aiAvatar: croppedImage }));
                setSettings({ aiAvatar: croppedImage });
                await saveSettings({ aiAvatar: croppedImage });
              }
              setCropData(null);
            }}
            onCancel={() => setCropData(null)}
          />
        )}

        <div className={cn(
          "p-4 sm:p-6 border-t flex items-center justify-between gap-3 shrink-0",
          theme === 'dark' ? "border-white/10" : "border-[#F3F4F6]"
        )}>
          <div className="text-xs flex items-center gap-2">
            <AnimatePresence mode="wait">
              {saveStatus === 'saving' && (
                 <motion.div key="saving" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex items-center text-blue-500 gap-1.5 font-bold">
                    <RefreshCw size={14} className="animate-spin" />
                    保存中...
                 </motion.div>
              )}
              {saveStatus === 'saved' && (
                 <motion.div key="saved" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex items-center text-emerald-600 dark:text-emerald-500 gap-1.5 font-bold">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle-2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
                    {saveMessage || '保存成功'}
                 </motion.div>
              )}
              {saveStatus === 'idle' && (
                 <motion.div key="idle" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className={cn("flex items-center gap-1.5", theme === 'dark' ? "text-gray-400" : "text-gray-500 font-medium")}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle-2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
                    修改会自动保存，可直接关闭
                 </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button 
            onClick={handleSaveSettings}
            className={cn(
              "px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg",
              theme === 'dark' ? "bg-white text-black hover:bg-gray-200" : "bg-[#1A1A1A] text-white hover:bg-[#333]"
            )}
          >
            关闭界面
          </button>
        </div>
      </motion.div>
    </div>
  );
};
