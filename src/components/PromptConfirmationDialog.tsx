import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Languages, Loader2, RefreshCw, ArrowUpCircle } from 'lucide-react';
import { cn, Message } from '../types';
import { useSettingStore } from '../store/settingStore';
import { useUIStore } from '../store/uiStore';
import { api } from '../services/api';

interface PromptConfirmationDialogProps {
  extractedPrompt: string;
  setExtractedPrompt: (val: string) => void;
  targetMessageId: string | null;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  executeImageGeneration: (messageId: string, prompt: string) => void;
}

export const PromptConfirmationDialog: React.FC<PromptConfirmationDialogProps> = ({
  extractedPrompt,
  setExtractedPrompt,
  targetMessageId,
  messages,
  setMessages,
  executeImageGeneration
}) => {
  const { apiKey } = useSettingStore(s => s.llmConfig);
  const { theme } = useSettingStore(s => s.uiConfig);
  const { setPromptDialogOpen } = useUIStore();
  const [translatedText, setTranslatedText] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [preference, setPreference] = useState('');
  
  const targetMessage = messages.find(m => m.id === targetMessageId);

  useEffect(() => {
    if (targetMessage?.translatedPrompt && !translatedText) {
      setTranslatedText(targetMessage.translatedPrompt);
    }
  }, [targetMessage, translatedText]);

  const handleUpdateCost = (usage: any) => {
    if (!usage || !targetMessageId) return;
    const addCost = ((usage.prompt_tokens || 0) / 1000) * 0.001 + ((usage.completion_tokens || 0) / 1000) * 0.002;
    const addTokens = usage.total_tokens || 0;
    setMessages(prev => prev.map(m => m.id === targetMessageId ? {
      ...m,
      cost: (m.cost || 0) + addCost,
      tokens: (m.tokens || 0) + addTokens,
      painting_cost: (m.painting_cost || 0) + addCost,
      painting_tokens: (m.painting_tokens || 0) + addTokens
    } : m));
  };

  const handleRegenerate = async () => {
    if (!targetMessage || isRegenerating) return;
    setIsRegenerating(true);
    try {
      const { prompt, usage } = await api.extractPrompt(targetMessage.content, apiKey, preference);
      setExtractedPrompt(prompt);
      handleUpdateCost(usage);
      let finalPrompt = prompt;
      let finalTranslated = translatedText;
      
      if (translatedText) {
        setIsTranslating(true);
        try {
          const { prompt: transPrompt, usage: transUsage } = await api.translatePrompt(prompt, apiKey);
          setTranslatedText(transPrompt);
          handleUpdateCost(transUsage);
          finalTranslated = transPrompt;
        } catch (err) {
          console.error(err);
        } finally {
          setIsTranslating(false);
        }
      }

      setMessages(prev => prev.map(m => m.id === targetMessageId ? { ...m, extractedPrompt: finalPrompt, translatedPrompt: finalTranslated } : m));
    } catch (error) {
      console.error(error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleTranslate = async () => {
    if (!extractedPrompt || isTranslating) return;
    setIsTranslating(true);
    try {
      const { prompt, usage } = await api.translatePrompt(extractedPrompt, apiKey);
      setTranslatedText(prompt);
      handleUpdateCost(usage);
      setMessages(prev => prev.map(m => m.id === targetMessageId ? { ...m, translatedPrompt: prompt } : m));
    } catch (error) {
      console.error(error);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleReverseTranslate = async () => {
    if (!translatedText || isTranslating) return;
    setIsTranslating(true);
    try {
      const { prompt, usage } = await api.reverseTranslatePrompt(translatedText, apiKey);
      setExtractedPrompt(prompt);
      handleUpdateCost(usage);
      setMessages(prev => prev.map(m => m.id === targetMessageId ? { ...m, translatedPrompt: translatedText, extractedPrompt: prompt } : m));
    } catch (error) {
      console.error(error);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
          "w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden border flex flex-col",
          theme === 'dark' ? "bg-[#1a1a1a] border-white/10" : "bg-white border-gray-200"
        )}
      >
        <div className={cn(
          "p-5 border-b flex justify-between items-center",
          theme === 'dark' ? "border-white/10" : "border-gray-100"
        )}>
          <h3 className={cn("text-lg font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>
            确认绘画提示词
          </h3>
          <button 
            onClick={() => {
              setPromptDialogOpen(false);
              if (targetMessageId) {
                setMessages(prev => prev.map(m => m.id === targetMessageId ? { ...m, isGeneratingImage: false } : m));
              }
            }}
            className={cn(
              "p-1.5 rounded-full transition-colors",
              theme === 'dark' ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-500"
            )}
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className={cn("text-sm", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>
              AI 已提取场景描述，您可以修改或直接生成图片：
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                  theme === 'dark' 
                    ? "bg-white/10 hover:bg-white/20 text-white border border-white/10" 
                    : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
                )}
              >
                {isRegenerating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                重随
              </button>
              <button
                onClick={handleTranslate}
                disabled={isTranslating}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                  theme === 'dark' 
                    ? "bg-white/10 hover:bg-white/20 text-white" 
                    : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700"
                )}
              >
                {isTranslating && !isRegenerating ? <Loader2 size={14} className="animate-spin" /> : <Languages size={14} />}
                一键翻译
              </button>
            </div>
          </div>
          
          <input
            type="text"
            value={preference}
            onChange={e => setPreference(e.target.value)}
            placeholder="可选：输入重随偏好，例如“主要生成场景”或“突出人物”"
            className={cn(
              "w-full rounded-xl p-3 mb-2 text-sm outline-none border transition-colors",
              theme === 'dark' 
                ? "bg-white/5 border-white/10 text-white focus:border-indigo-500" 
                : "bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500"
            )}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleRegenerate();
              }
            }}
          />
          
          <textarea
            value={extractedPrompt}
            onChange={e => {
              setExtractedPrompt(e.target.value);
              setMessages(prev => prev.map(m => m.id === targetMessageId ? { ...m, extractedPrompt: e.target.value } : m));
            }}
            placeholder="Image prompt in English..."
            className={cn(
              "w-full h-32 rounded-xl p-3 text-sm outline-none resize-none border transition-colors",
              theme === 'dark' 
                ? "bg-white/5 border-white/10 text-white focus:border-indigo-500" 
                : "bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500"
            )}
          />

          {translatedText && (
            <div className={cn(
              "p-3 rounded-xl text-sm border flex flex-col gap-2",
              theme === 'dark' ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"
            )}>
              <div className="flex items-center justify-between">
                <span className={cn("font-bold text-xs", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>中文翻译：</span>
                <button
                  onClick={handleReverseTranslate}
                  disabled={isTranslating}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors",
                    theme === 'dark' 
                      ? "bg-white/10 hover:bg-white/20 text-white" 
                      : "bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 shadow-sm"
                  )}
                >
                  <ArrowUpCircle size={12} />
                  反翻译为英文指令
                </button>
              </div>
              <textarea
                value={translatedText}
                onChange={e => {
                  setTranslatedText(e.target.value);
                  setMessages(prev => prev.map(m => m.id === targetMessageId ? { ...m, translatedPrompt: e.target.value } : m));
                }}
                className={cn(
                  "w-full min-h-[80px] bg-transparent outline-none resize-none px-1",
                  theme === 'dark' ? "text-gray-300" : "text-gray-700"
                )}
              />
            </div>
          )}
        </div>

        <div className={cn(
          "p-5 border-t flex justify-end gap-3",
          theme === 'dark' ? "border-white/10" : "border-gray-100"
        )}>
          <button 
            onClick={() => {
              setPromptDialogOpen(false);
              if (targetMessageId) {
                setMessages(prev => prev.map(m => m.id === targetMessageId ? { ...m, isGeneratingImage: false } : m));
              }
            }}
            className={cn(
              "px-5 py-2 rounded-lg text-sm font-medium transition-colors",
              theme === 'dark' ? "bg-white/10 text-white hover:bg-white/20" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            取消
          </button>
          <button 
            onClick={() => {
              setPromptDialogOpen(false);
              if (targetMessageId) {
                executeImageGeneration(targetMessageId, extractedPrompt);
              }
            }}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            生成图片
          </button>
        </div>
      </motion.div>
    </div>
  );
};
