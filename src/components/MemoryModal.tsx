import React from 'react';
import { motion } from 'motion/react';
import { Brain, X } from 'lucide-react';
import { cn } from '../types';
import { useSettingStore } from '../store/settingStore';
import { useUIStore } from '../store/uiStore';

interface MemoryModalProps {
  memories: any[];
}

export const MemoryModal: React.FC<MemoryModalProps> = ({ memories }) => {
  const { theme } = useSettingStore();
  const { setMemoryOpen, memoryTab, setMemoryTab } = useUIStore();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-black/20 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className={cn(
          "w-full h-full sm:h-auto sm:max-h-[80vh] max-w-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col",
          theme === 'dark' ? "bg-[#1A1A1A] border border-white/10" : "bg-white border border-[#E5E7EB]"
        )}
      >
        <div className={cn(
          "p-4 border-b flex justify-between items-center shrink-0",
          theme === 'dark' ? "border-white/10" : "border-[#E5E7EB]"
        )}>
          <h3 className={cn(
            "text-lg font-semibold flex items-center gap-2",
            theme === 'dark' ? "text-white" : "text-[#1A1A1A]"
          )}>
            <Brain className="text-purple-500" size={20} />
            记忆
          </h3>
          <div className="flex items-center gap-2">
            <div className={cn(
              "text-xs px-2 py-1 rounded-full",
              theme === 'dark' ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500"
            )}>
              共 {memories.length} 条记录
            </div>
            <button 
              onClick={() => setMemoryOpen(false)}
              className={cn(
                "p-1.5 rounded-full transition-colors",
                theme === 'dark' ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-500"
              )}
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <div className={cn(
          "border-b flex",
          theme === 'dark' ? "border-white/10" : "border-[#E5E7EB]"
        )}>
          <button
            onClick={() => setMemoryTab('profile')}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors border-b-2",
              memoryTab === 'profile' 
                ? (theme === 'dark' ? "border-purple-500 text-purple-400" : "border-purple-600 text-purple-600")
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            用户画像
          </button>
          <button
            onClick={() => setMemoryTab('summary')}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors border-b-2",
              memoryTab === 'summary' 
                ? (theme === 'dark' ? "border-purple-500 text-purple-400" : "border-purple-600 text-purple-600")
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            对话总结
          </button>
          <button
            onClick={() => setMemoryTab('other')}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors border-b-2",
              memoryTab === 'other' 
                ? (theme === 'dark' ? "border-purple-500 text-purple-400" : "border-purple-600 text-purple-600")
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            其他记忆
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {(() => {
            const displayedMemories = memories.filter(m => {
              if (memoryTab === 'profile') return m.entity_key.includes('用户画像');
              if (memoryTab === 'summary') return m.entity_key.includes('对话总结');
              return !m.entity_key.includes('用户画像') && !m.entity_key.includes('对话总结');
            });

            if (displayedMemories.length === 0) {
              return (
                <div className={cn(
                  "text-center py-12",
                  theme === 'dark' ? "text-gray-500" : "text-gray-400"
                )}>
                  暂无{memoryTab === 'profile' ? '用户画像' : memoryTab === 'summary' ? '对话总结' : '其他记忆'}数据~
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {displayedMemories.map((m, i) => (
                  <div key={i} className={cn(
                    "p-4 rounded-xl border flex flex-col gap-2",
                    theme === 'dark' ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-100"
                  )}>
                    <div className="flex justify-between items-start">
                      <span className={cn(
                        "font-semibold",
                        theme === 'dark' ? "text-white" : "text-gray-900"
                      )}>{m.entity_key}</span>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        theme === 'dark' ? "bg-purple-500/20 text-purple-300" : "bg-purple-100 text-purple-700"
                      )}>权重: {m.weight}</span>
                    </div>
                    <p className={cn(
                      "text-sm leading-relaxed",
                      theme === 'dark' ? "text-gray-300" : "text-gray-700"
                    )}>{m.entity_value}</p>
                    <div className={cn(
                      "text-xs mt-1",
                      theme === 'dark' ? "text-gray-500" : "text-gray-400"
                    )}>最后访问: {new Date(m.last_accessed.includes('T') ? m.last_accessed : m.last_accessed.replace(' ', 'T') + 'Z').toLocaleString()}</div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </motion.div>
    </div>
  );
};
