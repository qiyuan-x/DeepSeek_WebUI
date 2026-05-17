import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Brain, ChevronRight } from 'lucide-react';
import { cn } from '../../types';

interface ReasoningBlockProps {
  content: string;
  isComplete: boolean;
  theme: string;
}

export const ReasoningBlock: React.FC<ReasoningBlockProps> = ({ content, isComplete, theme }) => {
  const [isOpen, setIsOpen] = useState(!isComplete); // Auto-open while thinking

  // Auto-close when it finishes thinking
  useEffect(() => {
    if (isComplete && content.length > 0) {
      setIsOpen(false);
    }
  }, [isComplete, content]);

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 text-xs font-bold transition-colors w-fit px-3 py-1.5 rounded-lg border",
          theme === 'dark' 
            ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10" 
            : "bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6]"
        )}
      >
        <Brain size={14} className={cn(!isComplete && "animate-pulse text-blue-500")} />
        {isComplete ? "已深度思考" : "深度思考中..."}
        <ChevronRight size={14} className={cn("transition-transform duration-200", isOpen && "rotate-90")} />
      </button>
      
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: "auto", opacity: 1, marginTop: 8 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            className="overflow-hidden"
          >
            <div className={cn(
              "pl-4 border-l-2 text-sm leading-relaxed prose prose-sm max-w-none break-words",
              theme === 'dark' ? "border-white/10 text-gray-400 prose-invert" : "border-[#E5E7EB] text-[#6B7280]"
            )}>
              <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
