import React from 'react';
import { Menu, Brain, Coins } from 'lucide-react';
import { cn } from '../types';
import { useSettingStore } from '../store/settingStore';
import { useUIStore } from '../store/uiStore';
import { useStoryStore } from '../store/storyStore';

interface HeaderProps {
  currentConvId: string | null;
  totalTokens: number;
  totalCost: number;
  totalMemoryCost: number;
  handleOpenMemory: () => void;
  toggleThinkingMode: () => void;
  isThinkingMode: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentConvId,
  totalTokens,
  totalCost,
  totalMemoryCost,
  handleOpenMemory,
  toggleThinkingMode,
  isThinkingMode
}) => {
  const { theme, apiKey, provider } = useSettingStore();
  const { setSidebarOpen } = useUIStore();
  const { isStoryMode, setIsTransitioning, setIsExitingStoryMode } = useStoryStore();

  return (
    <header className={cn(
      "h-14 sm:h-16 border-b flex items-center justify-between px-2 sm:px-4 shrink-0 transition-colors duration-300",
      theme === 'dark' ? "bg-[#111111]/80 border-white/10 backdrop-blur-md" : "bg-white/80 border-[#E5E7EB] backdrop-blur-md"
    )}>
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <button 
          onClick={() => setSidebarOpen(prev => !prev)}
          className={cn(
            "p-1.5 sm:p-2 rounded-lg transition-colors",
            theme === 'dark' ? "hover:bg-white/10 text-white" : "hover:bg-gray-100 text-[#1A1A1A]"
          )}
        >
          <Menu size={20} className="sm:w-6 sm:h-6" />
        </button>

        {/* Thinking Toggle (Red Box Area) */}
        {provider === 'deepseek' && (
          <button
            onClick={toggleThinkingMode}
            className={cn(
              "flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 rounded-full transition-all border text-[10px] sm:text-[11px] font-bold uppercase tracking-wider sm:ml-2 shrink-0",
              isThinkingMode 
                ? "bg-purple-50 border-purple-200 text-purple-700 shadow-sm" 
                : "bg-gray-50 border-gray-200 text-gray-600"
            )}
          >
            <Brain size={12} className={cn("sm:w-3.5 sm:h-3.5", isThinkingMode ? "text-purple-600" : "text-gray-400")} />
            <span className="hidden sm:inline">{isThinkingMode ? "深度思考" : "快速回答"}</span>
            <span className="sm:hidden">{isThinkingMode ? "深度" : "快速"}</span>
            <div className={cn(
              "w-6 sm:w-7 h-3 sm:h-3.5 rounded-full relative transition-colors ml-0.5 sm:ml-1",
              isThinkingMode ? "bg-purple-400" : "bg-gray-300"
            )}>
              <div className={cn(
                "absolute top-[1px] sm:top-0.5 w-2.5 h-2.5 bg-white rounded-full shadow-sm transition-all",
                isThinkingMode ? "left-3 sm:left-4" : "left-[1px] sm:left-0.5"
              )} />
            </div>
          </button>
        )}

        {/* Story Mode Button */}
        {!isStoryMode && (
          <button
            onClick={() => {
              setIsTransitioning(true);
            }}
            className={cn(
              "flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 rounded-full transition-all border text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ml-1 sm:ml-2 shadow-sm hover:shadow-md shrink-0",
              "bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-transparent hover:from-indigo-600 hover:to-purple-700"
            )}
          >
            <span className="text-xs sm:text-sm">🌌</span>
            <span className="hidden sm:inline">进入故事模式</span>
            <span className="sm:hidden">故事</span>
          </button>
        )}
        {isStoryMode && (
          <button
            onClick={() => {
              setIsExitingStoryMode(true);
            }}
            className={cn(
              "flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 rounded-full transition-all border text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ml-1 sm:ml-2 shadow-sm shrink-0",
              "bg-white/10 border-white/20 text-white hover:bg-white/20"
            )}
          >
            <span className="text-xs sm:text-sm">🚪</span>
            <span className="hidden sm:inline">退出故事模式</span>
            <span className="sm:hidden">退出</span>
          </button>
        )}
      </div>

      {/* Token & Cost Display */}
      <div className="flex-1 flex justify-center shrink-0 mx-1 sm:mx-2 overflow-hidden">
        {currentConvId && (
          <div className={cn(
            "flex items-center gap-1.5 sm:gap-3 lg:gap-4 px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 border rounded-2xl shadow-sm transition-colors",
            theme === 'dark' ? "bg-[#1A1A1A] border-white/10" : "bg-[#F9FAFB] border-[#E5E7EB]"
          )}>
            <div className="hidden sm:flex items-center gap-1.5">
              <Coins size={14} className={theme === 'dark' ? "text-gray-400" : "text-[#6B7280]"} />
              <span className={cn(
                "text-[10px] lg:text-[11px] font-bold uppercase tracking-wider hidden lg:inline",
                theme === 'dark' ? "text-gray-400" : "text-[#6B7280]"
              )}>Tokens:</span>
              <span className={cn(
                "text-[10px] lg:text-[11px] font-mono font-bold",
                theme === 'dark' ? "text-white" : "text-[#1A1A1A]"
              )}>{totalTokens}</span>
            </div>
            <div className={cn("hidden sm:block w-px h-3", theme === 'dark' ? "bg-white/10" : "bg-[#E5E7EB]")} />
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className={cn(
                "text-[9px] sm:text-[10px] lg:text-[11px] font-bold uppercase tracking-wider",
                theme === 'dark' ? "text-gray-400" : "text-[#6B7280]"
              )}>金额:</span>
              <span className="text-[9px] sm:text-[10px] lg:text-[11px] font-mono font-bold text-emerald-600">￥{(totalCost + totalMemoryCost).toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <button
          onClick={handleOpenMemory}
          className={cn(
            "p-1.5 sm:p-2 rounded-lg transition-colors flex items-center gap-1 sm:gap-2",
            theme === 'dark' ? "text-gray-400 hover:text-purple-400 hover:bg-purple-500/10" : "text-gray-500 hover:text-purple-600 hover:bg-purple-50"
          )}
          title="查看全局记忆"
        >
          <Brain size={16} className="sm:w-[18px] sm:h-[18px]" />
          <span className="text-[10px] sm:text-xs font-medium hidden sm:inline">记忆库</span>
        </button>
        <div className={cn(
          "hidden sm:flex items-center gap-2 px-3 py-1 rounded-full transition-colors",
          apiKey ? (theme === 'dark' ? "bg-emerald-500/10" : "bg-emerald-50") : (theme === 'dark' ? "bg-red-500/10" : "bg-red-50")
        )}>
          <div className={cn(
            "w-2 h-2 rounded-full",
            apiKey ? "bg-emerald-500 animate-pulse" : "bg-red-500"
          )} />
          <span className={cn(
            "text-xs font-medium",
            apiKey ? (theme === 'dark' ? "text-emerald-400" : "text-emerald-700") : (theme === 'dark' ? "text-red-400" : "text-red-700")
          )}>
            {apiKey ? "API 已连接" : "API 未连接"}
          </span>
        </div>
      </div>
    </header>
  );
};
