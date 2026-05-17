import React, { useRef, useEffect, useState } from 'react';
import { ArrowUp, StopCircle, Brain, Globe, Settings2, Sparkles, DoorOpen, SlidersHorizontal, AudioLines } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../types';
import { useSettingStore } from '../store/settingStore';
import { useStoryStore } from '../store/storyStore';
import { useChatStore } from '../store/chatStore';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  handleSendMessage: () => void;
  handleStop: () => void;
  isThinkingMode?: boolean;
  toggleThinkingMode?: () => void;
  isEditingSystemPrompt?: boolean;
  setIsEditingSystemPrompt?: (val: boolean) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  isLoading,
  handleSendMessage,
  handleStop,
  isThinkingMode,
  toggleThinkingMode,
  isEditingSystemPrompt,
  setIsEditingSystemPrompt
}) => {
  const { provider } = useSettingStore(s => s.llmConfig);
  const { theme, sendBehavior } = useSettingStore(s => s.uiConfig);
  const { isStoryMode, setIsTransitioning, setIsExitingStoryMode } = useStoryStore();
  const { isIngestingMemory } = useChatStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showTools, setShowTools] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setShowTools(false);
      }
    };

    if (showTools) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTools]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [input]);

  return (
    <div className={cn(
      "w-full px-4 pb-4 pt-1 transition-colors duration-300",
      theme === 'dark' ? "bg-transparent" : "bg-transparent"
    )}>
      <div className="max-w-3xl mx-auto">
        <div className={cn(
          "relative flex flex-col rounded-2xl sm:rounded-[32px] border transition-all",
          theme === 'dark' ? "bg-[#2F2F2F] border-transparent shadow-[0_0_15px_rgba(0,0,0,0.1)]" : "bg-white border-[#E5E7EB] shadow-sm hover:border-[#D1D5DB] focus-within:border-[#D1D5DB] focus-within:shadow-md"
        )}>
          {/* Text Area */}
            <textarea 
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onFocus={() => setShowTools(false)}
              onKeyDown={e => {
              if (sendBehavior === 'ctrl_enter') {
                // Send on Ctrl+Enter (or Cmd+Enter)
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  if (input.trim() && !isLoading) {
                    handleSendMessage();
                  }
                }
                // Regular Enter inserts newline natively, no need to handle
              } else {
                // Send on Enter (no modifiers)
                if (e.key === 'Enter') {
                  if (e.ctrlKey || e.metaKey || e.shiftKey) {
                    // Wrap line
                    if (e.ctrlKey || e.metaKey) {
                      e.preventDefault();
                      const target = e.target as HTMLTextAreaElement;
                      const start = target.selectionStart;
                      const end = target.selectionEnd;
                      const newValue = input.substring(0, start) + '\n' + input.substring(end);
                      // React sets value async, we will set cursor async
                      // We must use a ref or target because setInput is async. Actually easier to just trigger change
                      setInput(newValue);
                      setTimeout(() => {
                        target.setSelectionRange(start + 1, start + 1);
                      }, 0);
                    }
                  } else {
                    e.preventDefault();
                    if (input.trim() && !isLoading) {
                      handleSendMessage();
                    }
                  }
                }
              }
            }}
            placeholder="给 DeepSeek 发送消息"
            className={cn(
              "w-full border-none px-4 pt-4 pb-2 sm:px-6 sm:pt-5 sm:pb-3 pr-14 sm:pr-6 text-[14px] sm:text-[15px] leading-relaxed outline-none resize-none min-h-[48px] sm:min-h-[56px] max-h-40 bg-transparent flex items-center transition-colors",
              theme === 'dark' ? "text-white placeholder:text-gray-500" : "text-[#1A1A1A] placeholder:text-[#A1A1AA] font-medium"
            )}
            rows={1}
          />
           {/* Bottom Toolbar */}
          <div className="flex items-center justify-between px-3 pb-3 pt-1">
            {/* Left Tools */}
            <div className="flex items-center gap-1.5 relative">
              <div className="relative" ref={toolsMenuRef}>
                <button 
                  onClick={() => setShowTools(!showTools)}
                  className={cn(
                    "w-9 h-9 flex items-center justify-center rounded-full transition-colors",
                    showTools 
                      ? (theme === 'dark' ? "text-white bg-white/10" : "text-[#1A1A1A] bg-black/5")
                      : (theme === 'dark' ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-[#8E8E93] hover:text-[#1A1A1A] hover:bg-black/5")
                  )}
                  title="更多功能"
                >
                  <SlidersHorizontal size={20} strokeWidth={1.5} />
                </button>
                
                <AnimatePresence>
                  {showTools && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className={cn(
                        "absolute left-0 bottom-full mb-2 w-36 flex flex-col p-1.5 rounded-xl border shadow-lg overflow-hidden shrink-0 z-50",
                        theme === 'dark' ? "bg-[#2F2F2F] border-[#404040]" : "bg-white border-[#E5E7EB]"
                      )}
                    >
                      <button
                        className={cn(
                          "w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors cursor-not-allowed opacity-60",
                          theme === 'dark' ? "text-gray-300 hover:bg-white/5" : "text-[#4B5563] hover:bg-gray-100"
                        )}
                      >
                        <Globe size={16} />
                        <span>智能搜索</span>
                      </button>

                      <button
                        onClick={() => {
                          isStoryMode ? setIsExitingStoryMode(true) : setIsTransitioning(true);
                          setShowTools(false);
                        }}
                        className={cn(
                          "w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors",
                          isStoryMode
                            ? (theme === 'dark' ? "bg-white/10 text-white" : "bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700")
                            : (theme === 'dark' ? "text-gray-300 hover:bg-white/5" : "text-[#4B5563] hover:bg-gray-100")
                        )}
                      >
                        {isStoryMode ? <DoorOpen size={16} /> : <Sparkles size={16} />}
                        <span>{isStoryMode ? '退出故事' : '故事模式'}</span>
                      </button>

                      {setIsEditingSystemPrompt && (
                        <button
                          onClick={() => {
                            setIsEditingSystemPrompt(true);
                            setShowTools(false);
                          }}
                          className={cn(
                            "w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors",
                            theme === 'dark' ? "text-gray-300 hover:bg-white/5" : "text-[#4B5563] hover:bg-gray-100"
                          )}
                        >
                          <Settings2 size={16} />
                          <span>系统设定</span>
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Right Tools - Send Button & Toggles */}
            <div className="flex items-center gap-2">
              {toggleThinkingMode && (
                <button
                  onClick={toggleThinkingMode}
                  className={cn(
                    "whitespace-nowrap px-3 py-1.5 rounded-full border text-[13px] font-medium transition-colors hover:cursor-pointer flex items-center gap-1.5 shadow-sm",
                    isThinkingMode 
                      ? (theme === 'dark' 
                          ? "bg-[#3B4CA8]/20 border-[#3B4CA8] text-[#7B8AF0]" 
                          : "bg-[#EEF2FC] border-[#A2B1FA] text-[#4D6BFE]") 
                      : (theme === 'dark' 
                          ? "bg-transparent border-gray-600/50 text-gray-400 hover:text-gray-200" 
                          : "bg-white border-[#E5E7EB] text-[#6B7280] hover:text-[#1A1A1A]")
                  )}
                  title="开/关 深度思考模式"
                >
                  <Brain size={14} />
                  <span>深度思考</span>
                </button>
              )}

              {isLoading ? (
                <button 
                  onClick={handleStop}
                  className={cn(
                    "w-[34px] h-[34px] sm:w-[38px] sm:h-[38px] flex items-center justify-center rounded-full transition-colors opacity-90 shrink-0 shadow-sm",
                    "bg-red-500 text-white hover:bg-red-600"
                  )}
                >
                  <StopCircle size={18} />
                </button>
              ) : (
                <button 
                  onClick={() => {
                    if (input.trim()) handleSendMessage();
                  }}
                  disabled={!input.trim()}
                  className={cn(
                    "w-[34px] h-[34px] sm:w-[38px] sm:h-[38px] flex items-center justify-center rounded-full transition-all shrink-0 shadow-sm disabled:cursor-not-allowed",
                    input.trim() 
                      ? (theme === 'dark' ? "bg-[#EEF2FC] text-[#1A1A1A] hover:bg-white" : "bg-[#EEF2FC] text-[#1A1A1A] hover:bg-[#E5EAFA]")
                      : (theme === 'dark' ? "bg-white/10 text-white/40" : "bg-[#F3F4F6] text-[#A1A1AA]")
                  )}
                >
                  <ArrowUp size={20} strokeWidth={input.trim() ? 2.5 : 2} className={input.trim() ? "" : "opacity-60"} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className={cn(
        "text-[10px] text-center mt-3 font-medium transition-colors h-4 flex items-center justify-center overflow-hidden",
        theme === 'dark' ? "text-gray-500" : "text-[#9CA3AF]"
      )}>
        <AnimatePresence mode="wait">
          {isIngestingMemory ? (
            <motion.div
              key="memory"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px]",
                theme === 'dark' ? "text-purple-400 bg-purple-500/10" : "text-purple-600 bg-purple-50"
              )}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
              </span>
              正常整理记忆..
            </motion.div>
          ) : (
            <motion.div
              key="disclaimer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 0.5, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              内容由 AI 生成，请自行分辨内容合理性。
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
