const fs = require('fs');
let text = fs.readFileSync('src/components/SettingsModal.tsx', 'utf8');

const strProvider = `{editingProvider === 'deepseek' && (
                            <section className="space-y-1">
                               <div className="flex items-center justify-between">
                                 <label className="text-xs font-bold text-[#6B7280] dark:text-gray-400">后台任务思考模式 (Background Reasoning)</label>
                               </div>`;
                               
const replaceProvider = `<section className="space-y-1">
                               <div className="flex items-center justify-between">
                                 <label className="text-xs font-bold text-[#6B7280] dark:text-gray-400">后台任务思考模式 (Background Reasoning)</label>
                               </div>`;

// First replace the Background Reasoning toggle to be unconditional
let updated = text.replace(strProvider, replaceProvider);

// The closing `)}` wait, there is a `)}` after the section for the deepseek check. We need to remove that `)}`.
const strProviderEnd = `<p className="mt-1 text-[11px] text-gray-400">在生成记忆总结、提取绘画提示词时开启大模型的思考过程，部分 API 可能会增加 Token 费用。</p>
                               </div>
                            </section>
                            )}`;

const replaceProviderEnd = `<p className="mt-1 text-[11px] text-gray-400">在生成记忆总结、提取绘画提示词时开启大模型的思考过程，部分 API 可能会增加 Token 费用。</p>
                               </div>
                            </section>`;

updated = updated.replace(strProviderEnd, replaceProviderEnd);

const selectStyle = `style={{ backgroundImage: \`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")\`, backgroundPosition: \`right 0.75rem center\`, backgroundSize: \`1em\` }}`;

const paintingProviderSelect = `<select
                        value={tempSettings.paintingProvider}
                        onChange={e => setTempSettings(prev => ({ ...prev, paintingProvider: e.target.value }))}
                        className={cn(
                             "w-full px-3 py-2 text-sm rounded-xl border outline-none transition-colors",
                             theme === 'dark' ? "bg-white/5 border-white/10 text-white focus:border-white/30" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-gray-400 focus:bg-white"
                          )}
                      >`;

const paintingProviderSelectNew = `<select
                        value={tempSettings.paintingProvider}
                        onChange={e => setTempSettings(prev => ({ ...prev, paintingProvider: e.target.value }))}
                        className={cn(
                             "w-full px-3 py-2 text-sm rounded-xl border outline-none transition-colors appearance-none bg-no-repeat truncate pr-8",
                             theme === 'dark' ? "bg-white/5 border-white/10 text-white focus:border-white/30" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-gray-400 focus:bg-white"
                          )}
                        ${selectStyle}
                      >`;

const paintingModelSelect = `<select
                          value={tempSettings.paintingModel || 'cogview-3-plus'}
                          onChange={e => setTempSettings(prev => ({ ...prev, paintingModel: e.target.value }))}
                          className={cn(
                             "w-full px-3 py-2 text-sm rounded-xl border outline-none transition-colors",
                             theme === 'dark' ? "bg-white/5 border-white/10 text-white focus:border-white/30" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-gray-400 focus:bg-white"
                          )}
                        >`;

const paintingModelSelectNew = `<select
                          value={tempSettings.paintingModel || 'cogview-3-plus'}
                          onChange={e => setTempSettings(prev => ({ ...prev, paintingModel: e.target.value }))}
                          className={cn(
                             "w-full px-3 py-2 text-sm rounded-xl border outline-none transition-colors appearance-none bg-no-repeat truncate pr-8 text-ellipsis",
                             theme === 'dark' ? "bg-white/5 border-white/10 text-white focus:border-white/30" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-gray-400 focus:bg-white"
                          )}
                          ${selectStyle}
                        >`;

updated = updated.replace(paintingProviderSelect, paintingProviderSelectNew);
updated = updated.replace(paintingModelSelect, paintingModelSelectNew);

fs.writeFileSync('src/components/SettingsModal.tsx', updated);
console.log("Done");
