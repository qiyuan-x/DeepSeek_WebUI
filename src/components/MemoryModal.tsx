import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Brain, X, Info, User, NotebookText, Database, Sparkles } from 'lucide-react';
import { cn } from '../types';
import { useSettingStore } from '../store/settingStore';
import { useUIStore } from '../store/uiStore';

interface MemoryModalProps {
  memories: any[];
  totalMemoryTokens?: number;
  totalMemoryCost?: number;
  totalMessages?: number;
}

export const MemoryModal: React.FC<MemoryModalProps> = ({ memories, totalMemoryTokens = 0, totalMemoryCost = 0, totalMessages = 0 }) => {
  const { theme } = useSettingStore(s => s.uiConfig);
  const { memoryMode, useTieredMemory } = useSettingStore(s => s.memoryConfig);
  const { setMemoryOpen, memoryTab, setMemoryTab, setSettingsOpen, setActiveSettingsTab } = useUIStore();

  const isSimple = memoryMode === 'simple' || (memoryMode === 'off' && !useTieredMemory);

  const profileMemories = memories.filter(m => m.entity_key && (m.entity_key.includes('用户画像') || m.entity_key.includes('profile') || m.original_type === 'profile'));
  const summaryMemories = memories.filter(m => m.entity_key && (m.entity_key.includes('对话总结') || m.entity_key.includes('summary') || m.original_type === 'summary'));
  const otherMemories = memories.filter(m => m.entity_key && !m.entity_key.includes('用户画像') && !m.entity_key.includes('对话总结') && !m.entity_key.includes('summary') && !m.entity_key.includes('profile') && m.original_type !== 'profile' && m.original_type !== 'summary');

  if (isSimple) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          className={cn(
            "w-full max-w-2xl min-h-[500px] h-[65vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden",
            theme === 'dark' ? "bg-[#18181B] text-white" : "bg-white text-[#18181B]"
          )}
        >
          <div className={cn("w-full flex justify-between items-center p-6 border-b shrink-0", theme === 'dark' ? "border-white/10" : "border-gray-200")}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 shrink-0">
                <Sparkles size={24} />
              </div>
              <div className="flex flex-col text-left">
                <h2 className="text-xl font-bold">LLM 总结记忆</h2>
                <p className={cn("text-xs", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>
                  轻量级对话理解与连续性支持
                </p>
              </div>
            </div>
            <button 
              onClick={() => setMemoryOpen(false)}
              className={cn("p-2 rounded-full transition-colors", theme === 'dark' ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-600")}
            >
              <X size={20} />
            </button>
          </div>
          
          <div className={cn("flex flex-col flex-1 p-6 relative overflow-hidden", theme === 'dark' ? "bg-black/20" : "bg-gray-50/50")}>
            <div className={cn(
              "w-full h-full rounded-2xl p-6 text-left border relative overflow-hidden flex flex-col",
              theme === 'dark' ? "bg-[#27272A] border-white/5 shadow-inner" : "bg-white border-gray-200 shadow-sm"
            )}>
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-2xl"></div>
              <div className={cn("flex items-center justify-between mb-4 border-b pb-3", theme === 'dark' ? "border-white/5" : "border-gray-100")}>
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <NotebookText size={16} className="text-blue-500" />
                    当前对话总结
                  </h3>
                  <div className="flex items-center gap-3 text-[11px] font-mono">
                    <span className={theme === 'dark' ? "text-gray-400" : "text-gray-500"}>
                      Tokens: {totalMemoryTokens || 0}
                    </span>
                    <span className={theme === 'dark' ? "text-gray-400" : "text-gray-500"}>
                      消耗: ￥{(totalMemoryCost || 0).toFixed(4)}
                    </span>
                  </div>
                </div>
                {totalMessages > 0 && (
                  <span className={cn("text-xs font-mono px-2 py-1 rounded-md", theme === 'dark' ? "bg-white/10 text-gray-300" : "bg-gray-100 text-gray-600")}>
                    对话 {Math.ceil(totalMessages / 2)} 轮
                  </span>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {memories.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-3">
                    <Brain size={48} className="text-gray-400" />
                    <p className={cn("text-sm italic", theme === 'dark' ? "text-gray-500" : "text-gray-500")}>
                      随着对话轮次增加，将自动生成并更新总结内容...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {memories.map((m, i) => (
                      <p key={i} className={cn("text-[15px] leading-relaxed", theme === 'dark' ? "text-gray-300" : "text-gray-700")}>
                        {m.content || m.entity_value || m.summary}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-center mt-4">
              <button 
                onClick={() => {
                  setMemoryOpen(false);
                  setSettingsOpen(true);
                  setActiveSettingsTab('advanced');
                  window.dispatchEvent(new CustomEvent('open-powermem-settings'));
                }}
                className={cn("text-xs underline font-medium transition-colors", theme === 'dark' ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700")}
              >
                想要更强大的长期记忆？一键开启 PowerMem 向量搜索
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // PowerMem Mode UI
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/40 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className={cn(
          "w-full h-full sm:h-[85vh] max-w-6xl rounded-3xl shadow-2xl flex flex-col overflow-hidden",
          theme === 'dark' ? "bg-[#121212] border border-white/5" : "bg-gray-50 border border-gray-200"
        )}
      >
        <div className={cn(
          "px-6 py-5 flex justify-between items-center sm:border-b",
          theme === 'dark' ? "border-white/5" : "border-gray-200"
        )}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              <Database size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <h2 className={cn("text-lg font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>
                PowerMem 向量记忆库
              </h2>
              <div className="flex items-center gap-3 text-xs mt-0.5 font-mono">
                <span className={theme === 'dark' ? "text-purple-400" : "text-purple-600"}>已提取 {memories.length} 块核心记忆</span>
                <span className={theme === 'dark' ? "text-gray-500" : "text-gray-400"}>Tokens: {totalMemoryTokens}</span>
                <span className={theme === 'dark' ? "text-gray-500" : "text-gray-400"}>成本: ￥{totalMemoryCost.toFixed(4)}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setMemoryOpen(false)}
            className={cn("p-2 rounded-full transition-colors", theme === 'dark' ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-200 text-gray-600")}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-5xl mx-auto h-full">
            {/* Left Column: Profile & Summary */}
            <div className="md:col-span-5 flex flex-col gap-6">
              
              <div className={cn(
                "rounded-2xl p-6 border shadow-sm flex flex-col max-h-[50%]",
                theme === 'dark' ? "bg-[#1A1A1A] border-white/5" : "bg-white border-[#E5E7EB]"
              )}>
                <h3 className={cn("font-bold text-sm tracking-widest uppercase mb-4 flex items-center gap-2", theme === 'dark' ? "text-purple-400" : "text-purple-600")}>
                  <User size={18} />
                  用户画像分析
                </h3>
                {profileMemories.length === 0 ? (
                  <p className={cn("text-sm opacity-60 italic", theme === 'dark' ? "text-white" : "text-black")}>尚未收集到足够的用户偏好数据。</p>
                ) : (
                  <div className={cn("space-y-4 text-sm leading-relaxed overflow-y-auto custom-scrollbar", theme === 'dark' ? "text-gray-300" : "text-gray-700")}>
                    {profileMemories.map((m, i) => (
                      <div key={i} className="mb-2">{m.content || m.entity_value}</div>
                    ))}
                  </div>
                )}
              </div>

              <div className={cn(
                "rounded-2xl p-6 border shadow-sm flex-1 flex flex-col min-h-[250px]",
                theme === 'dark' ? "bg-[#1A1A1A] border-white/5" : "bg-white border-[#E5E7EB]"
              )}>
                <h3 className={cn("font-bold text-sm tracking-widest uppercase mb-4 flex items-center gap-2", theme === 'dark' ? "text-blue-400" : "text-blue-600")}>
                  <NotebookText size={18} />
                  全局对话总结
                </h3>
                {summaryMemories.length === 0 ? (
                  <p className={cn("text-sm opacity-60 italic", theme === 'dark' ? "text-white" : "text-black")}>尚未生成全局对话摘要。</p>
                ) : (
                  <div className={cn("space-y-4 text-sm leading-relaxed overflow-y-auto custom-scrollbar", theme === 'dark' ? "text-gray-300" : "text-gray-700")}>
                    {summaryMemories.map((m, i) => (
                      <div key={i} className="mb-2">{m.content || m.entity_value}</div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Right Column: Key Facts Data stream */}
            <div className={cn(
              "md:col-span-7 rounded-2xl border flex flex-col shadow-sm max-h-full",
              theme === 'dark' ? "bg-[#18181B] border-white/5" : "bg-white border-[#E5E7EB]"
            )}>
              <div className={cn("p-6 border-b", theme === 'dark' ? "border-white/5" : "border-gray-100")}>
                <h3 className={cn("font-bold text-sm tracking-widest uppercase flex items-center gap-2", theme === 'dark' ? "text-emerald-400" : "text-emerald-600")}>
                  <Brain size={18} />
                  事实摘要数据流 (Facts)
                </h3>
                <p className={cn("text-xs mt-1 font-mono", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>
                  长程向量化离散记忆网络
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {otherMemories.length === 0 ? (
                  <p className={cn("text-sm opacity-60 italic text-center py-10", theme === 'dark' ? "text-white" : "text-black")}>
                    对话中尚未提取出离散的重点事件或事实记忆...
                  </p>
                ) : (
                  otherMemories.map((m, i) => (
                    <div key={i} className={cn(
                      "p-4 rounded-xl text-sm border-l-2",
                      theme === 'dark' ? "bg-white/5 border-emerald-500 text-gray-300" : "bg-emerald-50 border-emerald-500 text-gray-800"
                    )}>
                       {m.content || m.entity_value}
                       {m.last_accessed && (
                         <div className={cn("text-[10px] mt-2 font-mono uppercase", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>
                           Updated at {new Date(m.last_accessed.includes('T') ? m.last_accessed : m.last_accessed.replace(' ', 'T') + 'Z').toLocaleString()}
                         </div>
                       )}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </motion.div>
    </div>
  );
};
