import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, PromptTemplate } from '../types';
import { useSettingStore } from '../store/settingStore';

interface SystemPromptBarProps {
  systemPrompt: string;
  isEditingSystemPrompt: boolean;
  setIsEditingSystemPrompt: (val: boolean) => void;
  draftSystemPrompt: string;
  setDraftSystemPrompt: (val: string) => void;
  handleUpdateSystemPrompt: (val: string) => void;
}

export const SystemPromptBar: React.FC<SystemPromptBarProps> = ({
  systemPrompt,
  isEditingSystemPrompt,
  setIsEditingSystemPrompt,
  draftSystemPrompt,
  setDraftSystemPrompt,
  handleUpdateSystemPrompt
}) => {
  const { theme, promptTemplates } = useSettingStore();

  return (
    <div className={cn(
      "px-4 py-2 border-b transition-colors duration-300",
      theme === 'dark' ? "bg-[#111111]/50 border-white/10" : "bg-[#F9FAFB] border-[#E5E7EB]"
    )}>
      <div className="max-w-3xl mx-auto flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className={cn(
              "text-xs font-bold uppercase shrink-0",
              theme === 'dark' ? "text-gray-500" : "text-[#6B7280]"
            )}>AI设定:</span>
            {!isEditingSystemPrompt && (
              <span className={cn(
                "text-xs truncate flex-1",
                theme === 'dark' ? "text-gray-300" : "text-[#4B5563]"
              )}>
                {systemPrompt || '未设定'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 shrink-0 ml-2">
            <button 
              onClick={() => {
                if (!isEditingSystemPrompt) {
                  setDraftSystemPrompt(systemPrompt || "");
                }
                setIsEditingSystemPrompt(!isEditingSystemPrompt);
              }}
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider hover:underline",
                theme === 'dark' ? "text-white" : "text-[#1A1A1A]"
              )}
            >
              {isEditingSystemPrompt ? '收起' : '修改'}
            </button>
          </div>
        </div>
        
        <AnimatePresence>
          {isEditingSystemPrompt && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-y-auto overflow-x-hidden max-h-[50vh] flex flex-col gap-3 pb-1"
            >
              {promptTemplates.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {promptTemplates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => setDraftSystemPrompt(template.content)}
                      className={cn(
                        "px-2 py-1 rounded-md text-[10px] font-bold transition-all border",
                        theme === 'dark' 
                          ? "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/30" 
                          : "bg-white border-[#E5E7EB] text-[#6B7280] hover:text-[#1A1A1A] hover:border-[#1A1A1A]"
                      )}
                    >
                      {template.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex flex-col gap-2">
                <textarea 
                  value={draftSystemPrompt}
                  onChange={e => setDraftSystemPrompt(e.target.value)}
                  placeholder="设定AI的回复规则。这是AI遵循的最底层的规则..."
                  className={cn(
                    "w-full rounded-lg px-3 py-3 text-sm outline-none min-h-[100px] resize-none transition-colors border",
                    theme === 'dark' ? "bg-white/5 border-white/10 text-white focus:ring-1 focus:ring-white/20" : "bg-white border-[#E5E7EB] text-[#4B5563] focus:ring-1 focus:ring-[#1A1A1A]"
                  )}
                />
                <div className="flex justify-end mt-2">
                  <button 
                    onClick={() => {
                      handleUpdateSystemPrompt(draftSystemPrompt);
                      setIsEditingSystemPrompt(false);
                    }}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-bold transition-colors",
                      theme === 'dark' ? "bg-white text-black hover:bg-gray-200" : "bg-[#1A1A1A] text-white hover:bg-[#333]"
                    )}
                  >
                    确认
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
