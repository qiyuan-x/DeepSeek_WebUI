import React, { useRef } from 'react';
import { Plus, Trash2, User, BookOpen, Download, Upload } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '../../types';
import { useSettingStore } from '../../store/settingStore';

interface TemplatesTabProps {
  tempSettings: any;
  setTempSettings: React.Dispatch<React.SetStateAction<any>>;
  handleSaveSettings: (updates: any) => Promise<void>;
}

export const TemplatesTab: React.FC<TemplatesTabProps> = ({ 
  tempSettings, 
  setTempSettings, 
  handleSaveSettings 
}) => {
  const { theme } = useSettingStore(s => s.uiConfig);
  const fileInputRefAI = useRef<HTMLInputElement>(null);
  const fileInputRefStory = useRef<HTMLInputElement>(null);

  const handleExport = (templates: any[], type: 'ai' | 'story') => {
    let markdown = `# ${type === 'ai' ? 'AI设定模板' : '故事提纲模板'} 导出\n\n`;
    (templates || []).forEach(t => {
      markdown += `## 模板名称: ${t.name}\n\n`;
      markdown += `${t.content}\n\n`;
      markdown += `---\n\n`;
    });
    
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-templates.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>, type: 'ai' | 'story') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        let data: any[] = [];
        
        if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
          const blocks = text.split('\n---');
          data = blocks.filter(b => b.trim()).map(block => {
            // First clean up any top level header if present
            let cleanedBlock = block.replace(/^# .+导出\n+/, '');
            const nameMatch = cleanedBlock.match(/## 模板名称:\s*(.+)/);
            const name = nameMatch ? nameMatch[1].trim() : '未命名模板';
            const content = cleanedBlock.replace(/## 模板名称:.+\n+/, '').trim();
            return { id: uuidv4(), name, content };
          }).filter(b => b.content);
        } else {
          data = JSON.parse(text);
          data = data.map((d: any) => ({ ...d, id: uuidv4() }));
        }

        if (Array.isArray(data) && data.length > 0) {
          const key = type === 'ai' ? 'promptTemplates' : 'storyTemplates';
          const newTemplates = [...data, ...(tempSettings[key] || [])];
          setTempSettings((prev: any) => ({ ...prev, [key]: newTemplates }));
          await handleSaveSettings({ [key]: newTemplates });
        }
      } catch (err) {
        console.error(err);
        alert('导入失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-8">
      {/* AI Setting Templates */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-[#6B7280] dark:text-gray-400 uppercase tracking-widest">AI设定模板</label>
          <div className="flex items-center gap-2">
            <input type="file" accept=".json,.md,.txt" ref={fileInputRefAI} className="hidden" onChange={(e) => handleImport(e, 'ai')} />
            <button
              onClick={() => fileInputRefAI.current?.click()}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors",
                theme === 'dark' ? "bg-white/10 text-white hover:bg-white/20" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              <Upload size={14} /> 导入
            </button>
            <button
              onClick={() => handleExport(tempSettings.promptTemplates, 'ai')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors",
                theme === 'dark' ? "bg-white/10 text-white hover:bg-white/20" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              <Download size={14} /> 导出
            </button>
            <button
              onClick={async () => {
                const newTemplate = { id: uuidv4(), name: '新AI设定', content: '' };
                const newTemplates = [newTemplate, ...(tempSettings.promptTemplates || [])];
                setTempSettings((prev: any) => ({ ...prev, promptTemplates: newTemplates }));
                await handleSaveSettings({ promptTemplates: newTemplates });
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors",
                theme === 'dark' ? "bg-white text-black hover:bg-gray-200" : "bg-[#1A1A1A] text-white hover:bg-[#333]"
              )}
            >
              <Plus size={14} />
              新建模板
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {(!tempSettings.promptTemplates || tempSettings.promptTemplates.length === 0) ? (
            <div className={cn(
              "p-8 text-center rounded-2xl border-2 border-dashed",
              theme === 'dark' ? "border-white/5 text-gray-500" : "border-[#F3F4F6] text-[#9CA3AF]"
            )}>
              <User size={32} className="mx-auto mb-2 opacity-20" />
              <p className="text-xs font-medium">暂无AI设定模板，点击上方按钮新建</p>
            </div>
          ) : (
            tempSettings.promptTemplates.map((template: any) => (
              <div
                key={template.id}
                className={cn(
                  "p-4 rounded-2xl border transition-all space-y-3",
                  theme === 'dark' ? "bg-white/5 border-white/10 text-white" : "bg-white border-[#E5E7EB]"
                )}
              >
                <div className="flex items-center gap-3">
                  <input
                    value={template.name}
                    onChange={async (e) => {
                      const newTemplates = tempSettings.promptTemplates.map((t: any) => t.id === template.id ? { ...t, name: e.target.value } : t);
                      setTempSettings((prev: any) => ({ ...prev, promptTemplates: newTemplates }));
                      handleSaveSettings({ promptTemplates: newTemplates }); // don't await on every keystroke
                    }}
                    placeholder="模板名称"
                    className={cn(
                      "flex-1 bg-transparent border-none outline-none text-sm font-bold",
                      theme === 'dark' ? "text-white" : "text-[#1A1A1A]"
                    )}
                  />
                  <button
                    onClick={async () => {
                      const newTemplates = tempSettings.promptTemplates.filter((t: any) => t.id !== template.id);
                      setTempSettings((prev: any) => ({ ...prev, promptTemplates: newTemplates }));
                      await handleSaveSettings({ promptTemplates: newTemplates });
                    }}
                    className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <textarea
                  value={template.content}
                  onChange={async (e) => {
                    const newTemplates = tempSettings.promptTemplates.map((t: any) => t.id === template.id ? { ...t, content: e.target.value } : t);
                    setTempSettings((prev: any) => ({ ...prev, promptTemplates: newTemplates }));
                    handleSaveSettings({ promptTemplates: newTemplates }); // don't await on every keystroke
                  }}
                  placeholder="输入AI设定内容..."
                  className={cn(
                    "w-full bg-transparent border-none outline-none text-sm resize-none min-h-[80px]",
                    theme === 'dark' ? "text-gray-300" : "text-gray-600"
                  )}
                />
              </div>
            ))
          )}
        </div>
      </section>

      {/* Story Templates */}
      <section className="space-y-6 pt-6 border-t border-dashed border-gray-200 dark:border-white/10">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-[#6B7280] dark:text-gray-400 uppercase tracking-widest">故事设定模板</label>
          <div className="flex items-center gap-2">
            <input type="file" accept=".json,.md,.txt" ref={fileInputRefStory} className="hidden" onChange={(e) => handleImport(e, 'story')} />
            <button
              onClick={() => fileInputRefStory.current?.click()}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors",
                theme === 'dark' ? "bg-white/10 text-white hover:bg-white/20" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              <Upload size={14} /> 导入
            </button>
            <button
              onClick={() => handleExport(tempSettings.storyTemplates, 'story')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors",
                theme === 'dark' ? "bg-white/10 text-white hover:bg-white/20" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              <Download size={14} /> 导出
            </button>
            <button
              onClick={async () => {
                const newTemplate = { id: uuidv4(), name: '新故事设定', content: '' };
                const newTemplates = [newTemplate, ...(tempSettings.storyTemplates || [])];
                setTempSettings((prev: any) => ({ ...prev, storyTemplates: newTemplates }));
                await handleSaveSettings({ storyTemplates: newTemplates });
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors",
                theme === 'dark' ? "bg-white text-black hover:bg-gray-200" : "bg-[#1A1A1A] text-white hover:bg-[#333]"
              )}
            >
              <Plus size={14} />
              新建模板
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {(!tempSettings.storyTemplates || tempSettings.storyTemplates.length === 0) ? (
            <div className={cn(
              "p-8 text-center rounded-2xl border-2 border-dashed",
              theme === 'dark' ? "border-white/5 text-gray-500" : "border-[#F3F4F6] text-[#9CA3AF]"
            )}>
              <BookOpen size={32} className="mx-auto mb-2 opacity-20" />
              <p className="text-xs font-medium">暂无故事设定模板，点击上方按钮新建</p>
            </div>
          ) : (
            tempSettings.storyTemplates.map((template: any) => (
              <div
                key={template.id}
                className={cn(
                  "p-4 rounded-2xl border transition-all space-y-3",
                  theme === 'dark' ? "bg-white/5 border-white/10 text-white" : "bg-white border-[#E5E7EB]"
                )}
              >
                <div className="flex items-center gap-3">
                  <input
                    value={template.name}
                    onChange={async (e) => {
                      const newTemplates = tempSettings.storyTemplates.map((t: any) => t.id === template.id ? { ...t, name: e.target.value } : t);
                      setTempSettings((prev: any) => ({ ...prev, storyTemplates: newTemplates }));
                      handleSaveSettings({ storyTemplates: newTemplates }); // don't await on every keystroke
                    }}
                    placeholder="模板名称"
                    className={cn(
                      "flex-1 bg-transparent border-none outline-none text-sm font-bold",
                      theme === 'dark' ? "text-white" : "text-[#1A1A1A]"
                    )}
                  />
                  <button
                    onClick={async () => {
                      const newTemplates = tempSettings.storyTemplates.filter((t: any) => t.id !== template.id);
                      setTempSettings((prev: any) => ({ ...prev, storyTemplates: newTemplates }));
                      await handleSaveSettings({ storyTemplates: newTemplates });
                    }}
                    className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <textarea
                  value={template.content}
                  onChange={async (e) => {
                    const newTemplates = tempSettings.storyTemplates.map((t: any) => t.id === template.id ? { ...t, content: e.target.value } : t);
                    setTempSettings((prev: any) => ({ ...prev, storyTemplates: newTemplates }));
                    handleSaveSettings({ storyTemplates: newTemplates }); // don't await on every keystroke
                  }}
                  placeholder="输入故事设定内容..."
                  className={cn(
                    "w-full bg-transparent border-none outline-none text-sm resize-none min-h-[80px]",
                    theme === 'dark' ? "text-gray-300" : "text-gray-600"
                  )}
                />
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
