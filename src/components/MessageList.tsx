import React from 'react';
import { cn, Message } from '../types';
import { useSettingStore } from '../store/settingStore';
import { useStoryStore } from '../store/storyStore';
import { ChatMessageWechat } from './chat/ChatMessageWechat';
import { ChatMessageDefault } from './chat/ChatMessageDefault';

interface MessageListProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
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
  setMessages,
  chatContainerRef,
  handleScroll,
  messagesEndRef,
  setStoryDiscussionOpen,
  setTargetMessageId,
  setExtractedPrompt,
  setPromptDialogOpen,
  api
}) => {
  const { apiKey } = useSettingStore(s => s.llmConfig);
  const { theme, chatLayout, userAvatar, aiAvatar, userName, aiName, showMessageMeta } = useSettingStore(s => s.uiConfig);
  const { isPaintingEnabled } = useSettingStore(s => s.paintingConfig);
  const { isStoryMode } = useStoryStore();

  const handleExtractPrompt = React.useCallback(async (msg: Message, forceRegenerate = false) => {
    setTargetMessageId(msg.id);
    
    // Try to reuse existing extracted prompt unless forced to regenerate
    if (!forceRegenerate && msg.extractedPrompt) {
      setExtractedPrompt(msg.extractedPrompt);
      setPromptDialogOpen(true);
      return;
    }

    const text = msg.content;
    const messageId = msg.id;

    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isExtractingPrompt: true } : m));
    try {
      if (!apiKey && !process.env.DEEPSEEK_API_KEY) {
        setExtractedPrompt(text.substring(0, 500));
        setPromptDialogOpen(true);
      } else {
        const { prompt, usage } = await api.extractPrompt(text, apiKey);
        setExtractedPrompt(prompt);
        setPromptDialogOpen(true);
        
        let addCost = 0, addTokens = 0;
        if (usage) {
          addCost = ((usage.prompt_tokens || 0) / 1000) * 0.001 + ((usage.completion_tokens || 0) / 1000) * 0.002;
          addTokens = usage.total_tokens || 0;
        }

        setMessages(prev => prev.map(m => m.id === messageId ? { 
          ...m, 
          extractedPrompt: prompt,
          cost: (m.cost || 0) + addCost,
          tokens: (m.tokens || 0) + addTokens,
          painting_cost: (m.painting_cost || 0) + addCost,
          painting_tokens: (m.painting_tokens || 0) + addTokens
        } : m));
      }
    } catch (error) {
      console.error("Failed to extract prompt:", error);
      setExtractedPrompt(text.substring(0, 500));
      setPromptDialogOpen(true);
    } finally {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isExtractingPrompt: false } : m));
    }
  }, [setTargetMessageId, setExtractedPrompt, setPromptDialogOpen, setMessages, apiKey, api]);

  return (
    <div 
      ref={chatContainerRef}
      onScroll={handleScroll}
      className={cn(
        "flex-1 overflow-y-auto",
        chatLayout === 'wechat' ? "bg-[#f3f3f3] dark:bg-[#111111]" : ""
      )}
    >
      <div className={cn(
        "mx-auto py-6 px-4 space-y-8",
        chatLayout === 'default' ? "max-w-3xl" : "w-full max-w-4xl"
      )}>
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

        {messages.map((msg, index) => {
          // Parse think tags if reasoning_content is missing
          let content = msg.content;
          let reasoning = msg.reasoning_content || '';
          
          if (!reasoning && content.includes('<think>')) {
            const thinkEnd = content.indexOf('</think>');
            if (thinkEnd !== -1) {
              const thinkStart = content.indexOf('<think>');
              reasoning = content.substring(thinkStart + 7, thinkEnd).trim();
              content = content.substring(0, thinkStart) + content.substring(thinkEnd + 8).trim();
            } else {
              const thinkStart = content.indexOf('<think>');
              reasoning = content.substring(thinkStart + 7).trim();
              content = content.substring(0, thinkStart).trim();
            }
          }

          const props = {
            msg, index, isLastMessage: index === messages.length - 1, theme, isPaintingEnabled,
            userAvatar, aiAvatar, userName, aiName, showMessageMeta, isStoryMode,
            content, reasoning, handleExtractPrompt, setStoryDiscussionOpen
          };

          if (chatLayout === 'wechat' || chatLayout === 'qq') {
            return <ChatMessageWechat key={msg.id} {...props} />;
          }

          return <ChatMessageDefault key={msg.id} {...props} />;
        })}
      <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
