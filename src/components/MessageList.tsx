import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format } from 'date-fns';
import { Edit2, ExternalLink, MessageSquare, Coins } from 'lucide-react';
import { cn, Message } from '../types';
import { useSettingStore } from '../store/settingStore';
import { useStoryStore } from '../store/storyStore';

interface MessageListProps {
  messages: Message[];
  chatContainerRef: React.RefObject<HTMLDivElement>;
  handleScroll: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  setStoryDiscussionOpen: (open: boolean) => void;
  setTargetMessageId: (id: string) => void;
  setExtractedPrompt: (prompt: string) => void;
  setPromptDialogOpen: (open: boolean) => void;
  api: any; // Pass api to extract prompt
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  chatContainerRef,
  handleScroll,
  messagesEndRef,
  setStoryDiscussionOpen,
  setTargetMessageId,
  setExtractedPrompt,
  setPromptDialogOpen,
  api
}) => {
  const { theme, apiKey, isPaintingEnabled } = useSettingStore();
  const { isStoryMode } = useStoryStore();

  const handleExtractPrompt = async (messageId: string, text: string) => {
    setTargetMessageId(messageId);
    try {
      if (!apiKey && !process.env.DEEPSEEK_API_KEY) {
        setExtractedPrompt(text.substring(0, 500));
        setPromptDialogOpen(true);
      } else {
        const { prompt } = await api.extractPrompt(text, apiKey);
        setExtractedPrompt(prompt);
        setPromptDialogOpen(true);
      }
    } catch (error) {
      console.error("Failed to extract prompt:", error);
      setExtractedPrompt(text.substring(0, 500));
      setPromptDialogOpen(true);
    }
  };

  return (
    <div 
      ref={chatContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto"
    >
      <div className="max-w-3xl mx-auto py-6 px-4 space-y-8">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
            <div className={cn(
              "p-2 rounded-full shadow-md",
              theme === 'dark' ? "bg-white/5" : "bg-white"
            )}>
              <img src="/logo.png" alt="Logo" className="w-16 h-16 rounded-full object-cover" />
            </div>
            <h2 className="text-xl font-bold">今天我能帮您什么？</h2>
            <p className={cn(
              "text-sm max-w-md",
              theme === 'dark' ? "text-gray-400" : "text-[#6B7280]"
            )}>
              开始与 DeepSeek 对话，探索无限可能。
            </p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={msg.id} className="flex flex-col gap-2 items-start">
            <div className="flex items-center gap-2 px-1">
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded",
                msg.role === 'user' ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
              )}>
                {msg.role === 'user' ? 'user' : 'model'}
              </span>
              <span className="text-[10px] text-[#9CA3AF] font-medium">
                {msg.created_at ? format(msg.created_at.includes('T') ? new Date(msg.created_at) : new Date(msg.created_at.replace(' ', 'T') + 'Z'), 'HH:mm') : ''}
              </span>
            </div>
            
            <div className={cn(
              "w-full rounded-2xl p-4 sm:p-5 shadow-sm transition-colors",
              msg.role === 'user' 
                ? (theme === 'dark' ? "bg-white/5 border border-white/10" : "bg-white border border-[#E5E7EB]")
                : (theme === 'dark' ? "bg-[#1A1A1A] border border-white/10" : "bg-[#F9FAFB] border border-[#E5E7EB]")
            )}>
              {msg.reasoning_content && (
                <div className="mb-4">
                  <details className="group">
                    <summary className="flex items-center gap-2 cursor-pointer list-none text-xs font-bold text-[#6B7280] hover:text-[#4B5563] transition-colors">
                      <span className="group-open:rotate-90 transition-transform">▶</span>
                      思考过程
                    </summary>
                    <div className={cn(
                      "mt-2 pl-4 border-l-2 text-sm leading-relaxed",
                      theme === 'dark' ? "border-white/10 text-gray-400" : "border-[#E5E7EB] text-[#6B7280]"
                    )}>
                      <Markdown remarkPlugins={[remarkGfm]}>{msg.reasoning_content}</Markdown>
                    </div>
                  </details>
                </div>
              )}
              
              <div className={cn(
                "prose prose-sm max-w-none break-words leading-relaxed",
                theme === 'dark' ? "prose-invert" : ""
              )}>
                <Markdown remarkPlugins={[remarkGfm]}>{msg.content}</Markdown>
              </div>

              {msg.role === 'assistant' && isPaintingEnabled && (
                <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-4">
                  {!msg.isGeneratingImage && !msg.imageUrl && (
                    <button
                      onClick={() => handleExtractPrompt(msg.id, msg.content)}
                      className={cn(
                        "flex items-center gap-2 self-start px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border",
                        theme === 'dark' 
                          ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white" 
                          : "bg-[#F9FAFB] border-[#E5E7EB] text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#1A1A1A]"
                      )}
                    >
                      <Edit2 size={14} />
                      🖌️ 描绘此场景/人物
                    </button>
                  )}
                  
                  {msg.isGeneratingImage && (
                    <div className="flex flex-col gap-2 items-center justify-center p-6 border-2 border-dashed rounded-xl border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-white/5">
                      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 animate-pulse">
                        AI 正在作画中，请稍候...
                      </span>
                    </div>
                  )}

                  {msg.imageUrl && (
                    <div className="relative group rounded-xl overflow-hidden border border-white/10 shadow-sm">
                      <img 
                        src={msg.imageUrl} 
                        alt="Generated by AI" 
                        className="w-full h-auto object-cover max-h-[512px]"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <a 
                          href={msg.imageUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm transition-colors"
                          title="在新标签页打开"
                        >
                          <ExternalLink size={20} />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Story Discussion Button */}
              {msg.role === 'assistant' && isStoryMode && index === messages.length - 1 && (
                <div className="mt-4 border-t border-white/10 pt-3 flex justify-end">
                  <button
                    onClick={() => {
                      setStoryDiscussionOpen(true);
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border",
                      theme === 'dark' 
                        ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/30 hover:text-indigo-200" 
                        : "bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700"
                    )}
                  >
                    <MessageSquare size={14} />
                    接下来的故事讨论
                  </button>
                </div>
              )}
            </div>
            
            {/* Meta Info */}
            {(msg.tokens > 0 || msg.cost > 0 || msg.response_time > 0) && (
              <div className="flex items-center gap-3 px-1 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-tighter">
                {msg.tokens > 0 ? (
                  <span 
                    title={`${msg.role === 'user' ? '输入' : '输出'} Tokens: ${msg.tokens}\n消耗: ￥${(msg.cost || 0).toFixed(4)}`}
                    className="cursor-help border-b border-dashed border-[#9CA3AF]/50"
                  >
                    {msg.tokens} Tokens
                  </span>
                ) : null}
                {(msg.cost || 0) > 0 || (msg.memory_cost || 0) > 0 ? <span>￥{((msg.cost || 0) + (msg.memory_cost || 0)).toFixed(4)}</span> : null}
                {msg.response_time > 0 ? <span>{msg.response_time.toFixed(1)}s</span> : null}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
