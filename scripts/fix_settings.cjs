const fs = require('fs');
let content = fs.readFileSync('src/components/SettingsModal.tsx', 'utf8');

const target1 = `<section className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <label className="text-xs font-bold text-[#6B7280] dark:text-gray-400">思考强度 (Reasoning Effort)</label>
                                </div>
                                <div className="pt-2">`;
                                
const target2 = `                             <section className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <label className="text-xs font-bold text-[#6B7280] dark:text-gray-400">后台任务思考模式 (Background Reasoning)</label>
                                </div>
                                <div className="pt-2">`;

content = content.replace(target1, `{editingProvider === 'deepseek' && (\n                             ` + target1.trimStart());
content = content.replace(/(<p className="mt-1 text-\[11px\] text-gray-400">设置思考模式开启时，模型的思考强度。默认 high，复杂需求可选 max（仅部分 API 格式支持）。<\/p>\s*<\/div>\s*<\/section>)/, "$1\n                             )}");

content = content.replace(target2, `{editingProvider === 'deepseek' && (\n                             ` + target2.trimStart());
content = content.replace(/(<p className="mt-1 text-\[11px\] text-gray-400">在生成记忆总结、提取绘画提示词时开启大模型的思考过程。开启后生成的质量更好但也更耗时且贵（需模型本身支持思考模式）。<\/p>\s*<\/div>\s*<\/section>)/, "$1\n                             )}");

const targetSelect = `                      <select
                        value={tempSettings.paintingProvider}
                        onChange={e => setTempSettings(prev => ({ ...prev, paintingProvider: e.target.value }))}
                        className={cn(
                          "w-full border-none rounded-xl px-4 py-3 text-sm outline-none transition-colors appearance-none",
                          theme === 'dark' ? "bg-white/5 text-white focus:ring-1 focus:ring-white/20" : "bg-[#F3F4F6] text-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]"
                        )}
                      >`;

const replacementSelect = `                      <select
                        value={tempSettings.paintingProvider}
                        onChange={e => setTempSettings(prev => ({ ...prev, paintingProvider: e.target.value }))}
                        className={cn(
                             "w-full px-3 py-2 text-sm rounded-xl border outline-none transition-colors",
                             theme === 'dark' ? "bg-white/5 border-white/10 text-white focus:border-white/30" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-gray-400 focus:bg-white"
                          )}
                      >`;

content = content.replace(targetSelect, replacementSelect);

fs.writeFileSync('src/components/SettingsModal.tsx', content);
