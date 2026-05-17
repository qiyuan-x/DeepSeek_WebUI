import React from 'react';
import { format } from 'date-fns';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Edit2, ExternalLink, MessageSquare } from 'lucide-react';
import { cn } from '../../types';
import { ChatMessageProps } from './types';
import { ReasoningBlock } from './ReasoningBlock';

export const ChatMessageWechat: React.FC<ChatMessageProps> = React.memo(({
  msg, index, isLastMessage, theme, isPaintingEnabled, userAvatar, aiAvatar, userName, aiName,
  showMessageMeta, isStoryMode, content, reasoning, handleExtractPrompt, setStoryDiscussionOpen
}) => {
  const isUser = msg.role === 'user';

  return (
    <div className={cn("flex flex-col w-full mb-6", isUser ? "items-end" : "items-start")}>
      <div className={cn("flex w-full sm:max-w-[90%] md:max-w-[85%] lg:max-w-[80%]", isUser ? "flex-row-reverse" : "flex-row")}>
        {/* Avatar */}
        <div className="flex-shrink-0 mx-2">
          {isUser ? (
            userAvatar ? (
              <img src={userAvatar} alt="User Avatar" className="w-10 h-10 rounded-full object-cover shadow-sm border border-white" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-400 text-white flex items-center justify-center font-bold text-lg shadow-sm border border-white">
                U
              </div>
            )
          ) : (
            aiAvatar ? (
              <img src={aiAvatar} alt="AI Avatar" className="w-10 h-10 rounded-full object-cover shadow-sm border border-gray-100" />
            ) : (
              <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded-full bg-white object-cover shadow-sm border border-gray-100" />
            )
          )}
        </div>
        
        {/* Bubble */}
        <div className={cn("flex flex-col min-w-0 max-w-[calc(100%-3rem)] sm:max-w-full", isUser ? "items-end" : "items-start")}>
          <div className="text-[12px] text-gray-500 mb-1 mx-2">
            {msg.created_at ? format(msg.created_at.includes('T') ? new Date(msg.created_at) : new Date(msg.created_at.replace(' ', 'T') + 'Z'), 'HH:mm') : ''}
          </div>
          
          <div className={cn(
            "p-3 rounded-2xl relative break-words text-[15px] leading-relaxed",
            theme === 'dark' ? "text-gray-200" : "text-gray-900",
            isUser 
              ? (theme === 'dark' ? "bg-blue-600 text-white rounded-tr-sm" : "bg-[#0099FF] text-white rounded-tr-sm") 
              : (theme === 'dark' ? "bg-[#252528] rounded-tl-sm border border-gray-800" : "bg-white rounded-tl-sm shadow-sm border border-gray-100")
          )}>
            {reasoning && !isUser && (
              <ReasoningBlock 
                content={reasoning} 
                isComplete={content.length > 0 || msg.status !== 'generating'} 
                theme={theme} 
              />
            )}
            
            <div className={cn(
              "prose prose-sm max-w-none break-words leading-relaxed",
              theme === 'dark' ? "prose-invert text-white" : ""
            )}>
              <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
            </div>

            {msg.role === 'assistant' && isPaintingEnabled && msg.status !== 'generating' && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-4">
                {!msg.isGeneratingImage && !msg.imageUrl && !msg.isExtractingPrompt && (
                  <button
                    onClick={() => handleExtractPrompt(msg)}
                    className={cn(
                      "flex items-center gap-2 self-end px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border",
                      theme === 'dark' 
                        ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white" 
                        : "bg-[#F9FAFB] border-[#E5E7EB] text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#1A1A1A]"
                    )}
                  >
                    <Edit2 size={14} />
                    🖌️ 描绘此场景/人物
                  </button>
                )}
                
                {msg.isExtractingPrompt && (
                  <div className="flex items-center gap-3 text-sm text-[#8b5cf6] animate-pulse bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl">
                     <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                     正在提取场景提示词...
                  </div>
                )}

                {msg.isGeneratingImage && (
                  <div className="flex items-center gap-3 text-sm text-[#3b82f6] animate-pulse bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl">
                     <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                     正在生成图像...
                  </div>
                )}
                
                {msg.imageUrl && (
                   <div className="relative group overflow-hidden rounded-xl bg-gray-100 dark:bg-[#1A1A1A]">
                     <img src={msg.imageUrl} alt="Generated UI" loading="lazy" decoding="async" className="w-full max-h-[512px] h-auto object-contain bg-black/5 cursor-zoom-in hover:opacity-90 transition-opacity" onClick={() => window.open(msg.imageUrl, '_blank')} referrerPolicy="no-referrer" />
                     <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex">
                       <a 
                         href={msg.imageUrl} 
                         download={`generated_image_${msg.id}.png`}
                         target="_blank" 
                         rel="noopener noreferrer" 
                         className="p-2 bg-black/60 text-white rounded-lg hover:bg-black/80 transition-colors shadow-sm backdrop-blur-sm"
                         title="下载图片"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                       </a>
                     </div>
                   </div>
                )}
              </div>
            )}

            {/* Story Discussion Button */}
            {msg.role === 'assistant' && isStoryMode && isLastMessage && (
              <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-end">
                <button
                  onClick={() => setStoryDiscussionOpen(true)}
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

            {msg.status === 'error' && (
              <div className="text-xs text-red-500 mt-2 font-bold">[网络连接中断，生成失败]</div>
            )}
            {msg.status === 'cancelled' && (
              <div className={cn(
                "text-xs mt-2 font-bold",
                theme === 'dark' ? "text-gray-300" : "text-gray-700"
              )}>[用户中断输出]</div>
            )}
          </div>
        </div>
      </div>

      {/* Meta Info for WeChat/QQ Theme */}
      {showMessageMeta && !!((msg.tokens || 0) > 0 || (msg.memory_tokens || 0) > 0 || (msg.painting_tokens || 0) > 0 || (msg.cost && msg.cost > 0) || (msg.response_time && msg.response_time > 0)) && (
        <div className={cn(
          "flex flex-wrap items-center gap-1.5 sm:gap-3 text-[8px] sm:text-[10px] font-bold text-[#9CA3AF] uppercase tracking-tighter mt-1",
          isUser ? "flex-row-reverse mr-[52px]" : "flex-row ml-[52px]"
        )}>
          {(msg.model || aiName) && !isUser && (
            <span className="bg-[#9CA3AF]/10 text-[#9CA3AF] px-1.5 py-0.5 rounded">
              {aiName || msg.model}
            </span>
          )}
          {isUser && userName && (
            <span className="bg-[#9CA3AF]/10 text-[#9CA3AF] px-1.5 py-0.5 rounded">
              {userName}
            </span>
          )}
          {((msg.tokens || 0) + (msg.memory_tokens || 0) + (msg.painting_tokens || 0)) > 0 ? (
            <span 
              title={(() => {
                let titleAttr = `${msg.role === 'user' ? '输入' : '输出'} Tokens: ${msg.tokens || 0}`;
                if ((msg.memory_tokens || 0) > 0) titleAttr += `\n记忆处理 Tokens: ${msg.memory_tokens}`;
                if ((msg.painting_tokens || 0) > 0) titleAttr += `\n绘画处理 Tokens: ${msg.painting_tokens}`;
                titleAttr += `\n消耗: ￥${((msg.cost || 0) + (msg.memory_cost || 0) + (msg.painting_cost || 0)).toFixed(4)}`;
                return titleAttr;
              })()}
              className="cursor-help border-b border-dashed border-[#9CA3AF]/50"
            >
              {(msg.tokens || 0) + (msg.memory_tokens || 0) + (msg.painting_tokens || 0)} Tokens
            </span>
          ) : null}
          {(msg.cost || 0) > 0 || (msg.memory_cost || 0) > 0 || (msg.painting_cost || 0) > 0 ? (
            <span 
              title={(() => {
                let titleAttr = `AI回答: ￥${((msg.cost || 0) - (msg.painting_cost || 0)).toFixed(4)}`;
                if ((msg.memory_cost || 0) > 0) titleAttr += `\n记忆处理: ￥${(msg.memory_cost || 0).toFixed(4)}`;
                if ((msg.painting_cost || 0) > 0) titleAttr += `\n绘画组件: ￥${(msg.painting_cost || 0).toFixed(4)}`;
                return titleAttr;
              })()}
              className={((msg.painting_cost || 0) > 0 || (msg.memory_cost || 0) > 0) ? "cursor-help border-b border-dashed border-[#9CA3AF]/50" : ""}
            >
              ￥{((msg.cost || 0) - (msg.painting_cost || 0) + (msg.memory_cost || 0)).toFixed(4)} 
              {(msg.painting_cost || 0) > 0 && <span className="opacity-70 font-normal ml-0.5 hover:opacity-100">+ ￥{(msg.painting_cost || 0).toFixed(4)}(绘画)</span>}
            </span>
          ) : null}
          {msg.response_time && msg.response_time > 0 ? <span>{msg.response_time.toFixed(1)}s</span> : null}
        </div>
      )}
    </div>
  );
});
