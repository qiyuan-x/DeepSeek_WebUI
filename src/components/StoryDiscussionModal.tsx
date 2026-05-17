import React, { useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X, Send } from 'lucide-react';
import { cn, Message } from '../types';
import { useSettingStore } from '../store/settingStore';
import { useUIStore } from '../store/uiStore';

interface StoryDiscussionModalProps {
  nextPlotGuidance: string;
  setNextPlotGuidance: (val: string) => void;
  discussionMessages: Message[];
  discussionInput: string;
  setDiscussionInput: (val: string) => void;
  handleSendDiscussionMessage: () => void;
  isDiscussionLoading: boolean;
}

export const StoryDiscussionModal: React.FC<StoryDiscussionModalProps> = ({
  nextPlotGuidance,
  setNextPlotGuidance,
  discussionMessages,
  discussionInput,
  setDiscussionInput,
  handleSendDiscussionMessage,
  isDiscussionLoading
}) => {
  const { theme, userName, aiName } = useSettingStore(s => s.uiConfig);
  const { setStoryDiscussionOpen } = useUIStore();
  const discussionChatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (discussionChatContainerRef.current) {
      discussionChatContainerRef.current.scrollTop = discussionChatContainerRef.current.scrollHeight;
    }
  }, [discussionMessages]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
          "w-full max-w-4xl h-[85vh] rounded-2xl shadow-xl overflow-hidden border flex flex-col",
          theme === 'dark' ? "bg-[#1a1a1a] border-white/10" : "bg-white border-gray-200"
        )}
      >
        <div className={cn(
          "p-5 border-b flex justify-between items-center shrink-0",
          theme === 'dark' ? "border-white/10" : "border-gray-100"
        )}>
          <h3 className={cn("text-lg font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>
            接下来的故事讨论
          </h3>
          <button 
            onClick={() => setStoryDiscussionOpen(false)}
            className={cn(
              "p-1.5 rounded-full transition-colors",
              theme === 'dark' ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-500"
            )}
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left: Plot Guidance Input */}
          <div className={cn(
            "flex-1 p-5 border-b md:border-b-0 md:border-r flex flex-col gap-2",
            theme === 'dark' ? "border-white/10" : "border-gray-100"
          )}>
            <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">接下来的剧情走向</label>
            <textarea
              value={nextPlotGuidance}
              onChange={e => setNextPlotGuidance(e.target.value)}
              placeholder="在这里输入你希望接下来的剧情如何发展，或者通过右侧与AI讨论后填入..."
              className={cn(
                "flex-1 rounded-xl p-4 text-sm outline-none resize-none border transition-colors",
                theme === 'dark' 
                  ? "bg-white/5 border-white/10 text-white focus:border-indigo-500" 
                  : "bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500"
              )}
            />
          </div>

          {/* Right: Discussion Chat */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 p-5 flex flex-col gap-2 overflow-hidden">
              <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">与AI讨论剧情</label>
              <div 
                ref={discussionChatContainerRef}
                className={cn(
                  "flex-1 min-h-[200px] rounded-xl border p-4 overflow-y-auto flex flex-col gap-4",
                  theme === 'dark' ? "bg-black/20 border-white/10" : "bg-gray-50 border-gray-200"
                )}
              >
                {discussionMessages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
                    发送消息开始讨论接下来的剧情...
                  </div>
                ) : (
                  discussionMessages.map((msg, idx) => (
                    <div key={idx} className={cn(
                      "flex flex-col max-w-[85%]",
                      msg.role === 'user' ? "self-end items-end" : "self-start items-start"
                    )}>
                      <div className={cn(
                        "px-4 py-2 rounded-2xl text-sm prose prose-sm max-w-none relative group",
                        msg.role === 'user' 
                          ? "bg-indigo-600 text-white" 
                          : theme === 'dark' ? "bg-white/10 text-white" : "bg-white border border-gray-200 text-gray-900"
                      )}>
                        <Markdown remarkPlugins={[remarkGfm]}>{msg.content}</Markdown>
                      </div>
                      {/* Meta Info */}
                      {(msg.tokens > 0 || msg.cost > 0) && (
                        <div className="flex items-center gap-3 px-1 mt-1 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-tighter">
                          {(msg.model || aiName) && msg.role !== 'user' && (
                            <span className="bg-[#9CA3AF]/10 text-[#9CA3AF] px-1.5 py-0.5 rounded">
                              {aiName || msg.model}
                            </span>
                          )}
                          {msg.role === 'user' && userName && (
                            <span className="bg-[#9CA3AF]/10 text-[#9CA3AF] px-1.5 py-0.5 rounded">
                              {userName}
                            </span>
                          )}
                          {msg.tokens > 0 ? (
                            <span 
                              title={`${msg.role === 'user' ? '输入' : '输出'} Tokens: ${msg.tokens}\n消耗: ￥${(msg.cost || 0).toFixed(4)}`}
                              className="cursor-help border-b border-dashed border-[#9CA3AF]/50"
                            >
                              {msg.tokens} Tokens
                            </span>
                          ) : null}
                          {(msg.cost || 0) > 0 || (msg.memory_cost || 0) > 0 ? <span>￥{((msg.cost || 0) + (msg.memory_cost || 0)).toFixed(4)}</span> : null}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Discussion Input & Actions */}
            <div className={cn(
              "p-4 border-t shrink-0 flex flex-col gap-3",
              theme === 'dark' ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50"
            )}>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={discussionInput}
                  onChange={e => setDiscussionInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendDiscussionMessage();
                    }
                  }}
                  placeholder="向AI寻求灵感..."
                  className={cn(
                    "flex-1 rounded-xl px-4 py-2 text-sm outline-none transition-colors border",
                    theme === 'dark' ? "bg-white/5 border-white/10 text-white focus:ring-1 focus:ring-white/20" : "bg-white border-gray-200 text-gray-900 focus:ring-1 focus:ring-gray-900"
                  )}
                />
                <button
                  onClick={handleSendDiscussionMessage}
                  disabled={!discussionInput.trim() || isDiscussionLoading}
                  className={cn(
                    "p-2 rounded-xl transition-colors disabled:opacity-50",
                    theme === 'dark' ? "bg-white text-black hover:bg-gray-200" : "bg-gray-900 text-white hover:bg-gray-800"
                  )}
                >
                  <Send size={18} />
                </button>
              </div>
              
              <div className="flex justify-end pt-2 gap-3">
                <button
                  onClick={() => {
                    const lastAssistantMsg = [...discussionMessages].reverse().find(m => m.role === 'assistant');
                    if (lastAssistantMsg && lastAssistantMsg.content) {
                      const match = lastAssistantMsg.content.match(/<plot_summary>([\s\S]*?)<\/plot_summary>/);
                      if (match && match[1]) {
                        setNextPlotGuidance(match[1].trim());
                      } else {
                        setNextPlotGuidance(lastAssistantMsg.content);
                      }
                    }
                  }}
                  className={cn(
                    "px-6 py-2 rounded-xl text-sm font-bold transition-colors border",
                    theme === 'dark' ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-gray-100 border-gray-200 text-gray-900 hover:bg-gray-200"
                  )}
                >
                  填入最新剧情
                </button>
                <button
                  onClick={() => setStoryDiscussionOpen(false)}
                  className={cn(
                    "px-6 py-2 rounded-xl text-sm font-bold transition-colors",
                    theme === 'dark' ? "bg-indigo-500 text-white hover:bg-indigo-600" : "bg-indigo-600 text-white hover:bg-indigo-700"
                  )}
                >
                  完成设定
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
