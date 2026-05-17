import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '../types';
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
  const { theme } = useSettingStore(s => s.uiConfig);
  const { promptTemplates } = useSettingStore(s => s.systemConfig);
  const { setSettings, saveSettings } = useSettingStore();
  const [isExpanded, setIsExpanded] = useState(false);

  React.useEffect(() => {
    if (isEditingSystemPrompt) {
      setIsExpanded(false);
    }
  }, [isEditingSystemPrompt]);

  const handleSaveAsTemplate = async () => {
    if (!draftSystemPrompt.trim()) return;
    
    // Generate a quick summary for name or just a default
    const name = draftSystemPrompt.substring(0, 10) + '...';
    
    const newTemplate = { id: uuidv4(), name: `新模板 (${name})`, content: draftSystemPrompt };
    const newTemplates = [newTemplate, ...promptTemplates];
    
    setSettings({ promptTemplates: newTemplates });
    await saveSettings({ promptTemplates: newTemplates });
    
    // Optional: add a small UI hint here if needed, but it feels intuitive enough
  };

  if (!isEditingSystemPrompt) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className={cn(
          "w-full max-w-2xl rounded-2xl shadow-xl flex flex-col overflow-hidden max-h-[85vh]",
          theme === 'dark' ? "bg-[#1A1A1A] border border-white/10" : "bg-white border border-gray-200"
        )}
      >
        <div className={cn(
          "flex items-center justify-between px-6 py-4 border-b shrink-0",
          theme === 'dark' ? "border-white/10" : "border-gray-100"
        )}>
          <h2 className={cn(
            "text-lg font-bold",
            theme === 'dark' ? "text-white" : "text-gray-900"
          )}>系统设定 / System Prompt</h2>
          <button 
            onClick={() => setIsEditingSystemPrompt(false)}
            className={cn(
              "p-2 rounded-full transition-colors",
              theme === 'dark' ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-500"
            )}
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="overflow-y-auto p-6 flex flex-col gap-6">
          <div className="flex items-start gap-2 relative">
            <span className={cn(
              "text-xs font-medium px-2 py-1 flex-shrink-0 rounded mt-0.5",
              theme === 'dark' ? "bg-white/10 text-gray-300" : "bg-gray-100 text-gray-600"
            )}>当前设定</span>
            <div className="flex-1 min-w-0 pr-8">
              <span className={cn(
                "text-sm opacity-80 whitespace-pre-wrap break-words inline-block w-full",
                !isExpanded ? "line-clamp-2" : "",
                theme === 'dark' ? "text-gray-400" : "text-gray-500"
              )}>
                {systemPrompt || '未设定 (默认遵循通用助手规则)'}
              </span>
            </div>
            {systemPrompt && systemPrompt.length > 50 && (
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                  "absolute right-0 top-0.5 p-1 rounded-full transition-colors",
                  theme === 'dark' ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-500"
                )}
                title={isExpanded ? "收起" : "展开查阅完整设定"}
              >
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <label className={cn(
              "text-sm font-bold",
              theme === 'dark' ? "text-white" : "text-gray-800"
            )}>修改设定文本</label>
            <textarea 
              value={draftSystemPrompt}
              onChange={e => setDraftSystemPrompt(e.target.value)}
              placeholder="设定AI的回复规则。这是AI遵循的最底层的规则..."
              className={cn(
                "w-full rounded-xl px-4 py-3 text-sm outline-none min-h-[160px] resize-none transition-colors border",
                theme === 'dark' ? "bg-black/50 border-white/10 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50" : "bg-gray-50 border-gray-200 text-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
              )}
            />
            {promptTemplates.length > 0 && (
              <div className="mt-2">
                <p className={cn(
                  "text-xs font-medium mb-2",
                  theme === 'dark' ? "text-gray-400" : "text-gray-500"
                )}>快速应用模板：</p>
                <div className="flex flex-wrap gap-2">
                  {promptTemplates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => setDraftSystemPrompt(template.content)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                        theme === 'dark' 
                          ? "bg-white/5 border-white/10 text-gray-300 hover:text-white hover:border-white/30" 
                          : "bg-white border-gray-200 text-gray-600 hover:text-gray-900 shadow-sm hover:border-gray-300"
                      )}
                    >
                      {template.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={cn(
          "px-6 py-4 border-t flex justify-end gap-3 shrink-0 items-center",
          theme === 'dark' ? "border-white/10 bg-black/20" : "border-gray-100 bg-gray-50/50"
        )}>
          <button
            onClick={handleSaveAsTemplate}
            disabled={!draftSystemPrompt.trim()}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 mr-auto border",
              !draftSystemPrompt.trim() 
                ? "opacity-50 cursor-not-allowed border-transparent" 
                : (theme === 'dark' ? "border-white/10 text-emerald-400 hover:bg-emerald-500/10" : "border-gray-200 text-emerald-600 hover:bg-emerald-50"),
              "mr-auto"
            )}
            title="将当前草稿保存为模板"
          >
            <Save size={16} />
            <span className="hidden sm:inline">快捷保存为模板</span>
            <span className="sm:hidden">存为模板</span>
          </button>

          <button 
            onClick={() => setIsEditingSystemPrompt(false)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
              theme === 'dark' ? "border-white/10 text-gray-300 hover:bg-white/5" : "border-gray-200 text-gray-600 hover:bg-gray-100"
            )}
          >
            取消
          </button>
          <button 
            onClick={() => {
              handleUpdateSystemPrompt(draftSystemPrompt);
              setDraftSystemPrompt("");
              setIsEditingSystemPrompt(false);
            }}
            className="px-6 py-2 rounded-lg text-sm font-medium transition-colors bg-[#4D6BFE] text-white hover:bg-[#3D55CC] shadow-md shadow-blue-500/20"
          >
            确认应用
          </button>
        </div>
      </motion.div>
    </div>
  );
};
