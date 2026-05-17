import React from 'react';
import { Menu, Brain, Coins, Image as ImageIcon } from 'lucide-react';
import { cn } from '../types';
import { useSettingStore } from '../store/settingStore';
import { useUIStore } from '../store/uiStore';
import { useStoryStore } from '../store/storyStore';
import { useChatStore } from '../store/chatStore';

interface HeaderProps {
  currentConvId: string | null;
  totalTokens: number;
  totalCost: number;
  totalMemoryCost: number;
  handleOpenMemory: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentConvId,
  totalTokens,
  totalCost,
  totalMemoryCost,
  handleOpenMemory
}) => {
  const { apiKey, provider } = useSettingStore(s => s.llmConfig);
  const { theme } = useSettingStore(s => s.uiConfig);
  const { memoryMode } = useSettingStore(s => s.memoryConfig);
  const { isPaintingEnabled } = useSettingStore(s => s.paintingConfig);
  const { setSidebarOpen, setImageGalleryOpen } = useUIStore();
  const { isIngestingMemory } = useChatStore();

  return (
    <header className={cn(
      "h-14 sm:h-16 border-b flex items-center justify-between px-3 sm:px-5 shrink-0 transition-colors duration-300 relative z-20",
      theme === 'dark' ? "bg-[#111111]/80 border-white/10 backdrop-blur-md" : "bg-white/80 border-[#E5E7EB] backdrop-blur-md"
    )}>
      <div className="flex items-center gap-2 shrink-0">
        <button 
          onClick={() => setSidebarOpen(prev => !prev)}
          className={cn(
            "p-2 rounded-lg transition-colors flex items-center justify-center",
            theme === 'dark' ? "hover:bg-white/10 text-white" : "hover:bg-gray-100 text-[#1A1A1A]"
          )}
        >
          <Menu size={20} className="sm:w-6 sm:h-6" />
        </button>
      </div>

      {/* Token & Cost Display */}
      <div className="flex-1 flex justify-center items-center shrink-0 mx-2 overflow-hidden">
        {currentConvId && (
          <div className={cn(
            "inline-flex items-center h-8 sm:h-9 gap-1.5 sm:gap-3 lg:gap-4 px-3 sm:px-4 lg:px-5 border rounded-full shadow-sm transition-colors",
            theme === 'dark' ? "bg-[#1A1A1A] border-white/10" : "bg-[#F9FAFB] border-[#E5E7EB]"
          )}>
            <div className="hidden sm:flex items-center gap-1.5">
              <Coins size={14} className={cn(theme === 'dark' ? "text-gray-400" : "text-[#6B7280]")} />
              <span className={cn(
                "text-[10px] lg:text-[11px] font-bold uppercase tracking-wider hidden lg:inline",
                theme === 'dark' ? "text-gray-400" : "text-[#6B7280]"
              )}>Tokens:</span>
              <span className={cn(
                "text-[10px] lg:text-[11px] font-mono font-bold",
                theme === 'dark' ? "text-white" : "text-[#1A1A1A]"
              )}>{totalTokens}</span>
            </div>
            <div className={cn("hidden sm:block w-px h-3.5", theme === 'dark' ? "bg-white/10" : "bg-[#E5E7EB]")} />
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className={cn(
                "text-[10px] lg:text-[11px] font-bold uppercase tracking-wider",
                theme === 'dark' ? "text-gray-400" : "text-[#6B7280]"
              )}>金额:</span>
              <span className="text-[10px] lg:text-[11px] font-mono font-bold text-emerald-600">￥{totalCost.toFixed(4)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {isPaintingEnabled && (
          <button
            onClick={() => setImageGalleryOpen(true)}
            className={cn(
              "p-2 rounded-lg transition-colors flex items-center justify-center gap-1.5",
              theme === 'dark' ? "text-gray-400 hover:text-blue-400 hover:bg-blue-500/10" : "text-gray-500 hover:text-blue-600 hover:bg-blue-50"
            )}
            title="查看当前对话图库"
          >
            <ImageIcon size={20} className="sm:w-6 sm:h-6" />
            <span className="text-xs font-medium hidden sm:inline">图库</span>
          </button>
        )}
        {memoryMode !== 'off' && (
          <button
            onClick={handleOpenMemory}
            className={cn(
              "p-2 rounded-lg transition-colors flex items-center justify-center gap-1.5",
              isIngestingMemory 
                ? (theme === 'dark' ? "text-purple-400 bg-purple-500/10" : "text-purple-600 bg-purple-50")
                : (theme === 'dark' ? "text-gray-400 hover:text-purple-400 hover:bg-purple-500/10" : "text-gray-500 hover:text-purple-600 hover:bg-purple-50")
            )}
            title={isIngestingMemory ? "正在整理记忆中..." : "查看全局记忆"}
          >
            {isIngestingMemory ? (
              <span className="relative flex h-5 w-5 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <Brain size={16} className="relative text-purple-500" />
              </span>
            ) : (
              <Brain size={20} className="sm:w-6 sm:h-6" />
            )}
            <span className="text-xs font-medium hidden sm:inline">{isIngestingMemory ? '整理中' : '记忆库'}</span>
          </button>
        )}
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
