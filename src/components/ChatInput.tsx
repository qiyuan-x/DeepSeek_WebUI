import React from 'react';
import { Send, StopCircle } from 'lucide-react';
import { cn } from '../types';
import { useSettingStore } from '../store/settingStore';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  handleSendMessage: () => void;
  handleStop: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  isLoading,
  handleSendMessage,
  handleStop
}) => {
  const { theme } = useSettingStore();

  return (
    <div className={cn(
      "p-4 border-t transition-colors duration-300",
      theme === 'dark' ? "bg-[#111111]/50 border-white/10" : "bg-white border-[#E5E7EB]"
    )}>
      <div className="max-w-3xl mx-auto flex items-center gap-3">
        <div className="flex-1 relative">
          <textarea 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="给 DeepSeek 发送消息..."
            className={cn(
              "w-full border-none rounded-2xl px-4 py-[14px] pr-4 text-sm leading-relaxed outline-none resize-none min-h-[52px] max-h-40 flex items-center transition-colors",
              theme === 'dark' ? "bg-white/5 text-white placeholder:text-gray-500 focus:ring-1 focus:ring-white/20" : "bg-[#F3F4F6] text-[#1A1A1A] placeholder:text-gray-400 focus:ring-1 focus:ring-[#1A1A1A]"
            )}
            rows={1}
          />
        </div>
        <div className="flex shrink-0">
          {isLoading ? (
            <button 
              onClick={(e) => {
                e.preventDefault();
                handleStop();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleStop();
              }}
              className="p-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors flex items-center justify-center"
            >
              <StopCircle size={20} />
            </button>
          ) : (
            <button 
              onClick={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                if (!input.trim()) return;
                handleSendMessage();
              }}
              disabled={!input.trim()}
              className={cn(
                "p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center",
                theme === 'dark' ? "bg-white text-black hover:bg-gray-200" : "bg-[#1A1A1A] text-white hover:bg-[#333]"
              )}
            >
              <Send size={20} />
            </button>
          )}
        </div>
      </div>
      <p className={cn(
        "text-[10px] text-center mt-2 font-medium transition-colors flex items-center justify-center gap-2",
        theme === 'dark' ? "text-gray-500" : "text-[#9CA3AF]"
      )}>
        <span className="opacity-50">v1.0.2</span>
      </p>
    </div>
  );
};
