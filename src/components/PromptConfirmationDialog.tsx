import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn, Message } from '../types';
import { useSettingStore } from '../store/settingStore';
import { useUIStore } from '../store/uiStore';

interface PromptConfirmationDialogProps {
  extractedPrompt: string;
  setExtractedPrompt: (val: string) => void;
  targetMessageId: string | null;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  executeImageGeneration: (messageId: string, prompt: string) => void;
}

export const PromptConfirmationDialog: React.FC<PromptConfirmationDialogProps> = ({
  extractedPrompt,
  setExtractedPrompt,
  targetMessageId,
  setMessages,
  executeImageGeneration
}) => {
  const { theme } = useSettingStore();
  const { setPromptDialogOpen } = useUIStore();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
          "w-full max-w-lg rounded-2xl shadow-xl overflow-hidden border flex flex-col",
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
          <p className={cn("text-sm", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>
            AI 已提取场景描述，您可以修改或直接生成图片：
          </p>
          <textarea
            value={extractedPrompt}
            onChange={e => setExtractedPrompt(e.target.value)}
            className={cn(
              "w-full h-32 rounded-xl p-3 text-sm outline-none resize-none border transition-colors",
              theme === 'dark' 
                ? "bg-white/5 border-white/10 text-white focus:border-indigo-500" 
                : "bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500"
            )}
          />
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
