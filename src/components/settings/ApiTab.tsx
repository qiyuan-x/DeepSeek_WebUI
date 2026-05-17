import React from 'react';
import { RefreshCw, Send, Wallet, Coins, StopCircle, HelpCircle, X } from 'lucide-react';
import { cn } from '../../types';
import { useSettingStore } from '../../store/settingStore';
import { PROVIDERS_LIST, getDefaultModel } from '../SettingsModal';

interface ApiTabProps {
  tempSettings: any;
  setTempSettings: React.Dispatch<React.SetStateAction<any>>;
  editingProvider: string | null;
  setEditingProvider: React.Dispatch<React.SetStateAction<string | null>>;
  handleTestConnection: () => Promise<void>;
  isTestingConnection: boolean;
  connectionStatus: { success: boolean; message: string } | null;
  fetchBalanceForEditingProvider: () => Promise<void>;
  balance: any;
  balanceError: string | null;
  fetchedModels: Record<string, string[]>;
  isFetchingModels: boolean;
  isModelDropdownOpen: boolean;
  setIsModelDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ApiTab: React.FC<ApiTabProps> = ({
  tempSettings,
  setTempSettings,
  editingProvider,
  setEditingProvider,
  handleTestConnection,
  isTestingConnection,
  connectionStatus,
  fetchBalanceForEditingProvider,
  balance,
  balanceError,
  fetchedModels,
  isFetchingModels,
  isModelDropdownOpen,
  setIsModelDropdownOpen,
}) => {
  const { theme } = useSettingStore(s => s.uiConfig);

  return (
    <>
      {!editingProvider && (
              <div className="flex flex-col h-full space-y-4">
                 <div className="grid grid-cols-[1fr_auto] md:grid-cols-[auto_1fr_1fr_auto_auto] gap-4 px-4 py-3 text-xs font-bold text-[#6B7280] dark:text-gray-400 border-b dark:border-white/10 uppercase tracking-widest bg-gray-50/50 dark:bg-white/5 rounded-t-xl shrink-0">
                  <div className="w-8 hidden md:block"></div>
                  <div>模型服务商</div>
                  <div className="hidden md:block">接口类型</div>
                  <div className="text-center hidden md:block">是否启用</div>
                  <div className="text-right w-16">操作</div>
                </div>
                <div className="overflow-y-auto flex-1 pb-4 space-y-1">
                  {PROVIDERS_LIST.map(p => (
                    <div key={p.id} className={cn("grid grid-cols-[1fr_auto] md:grid-cols-[auto_1fr_1fr_auto_auto] gap-4 px-4 py-4 rounded-xl items-center text-sm transition-colors border", theme === 'dark' ? "border-transparent hover:bg-white/5" : "border-transparent hover:bg-gray-50", tempSettings.provider === p.id && (theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white shadow-sm'))}>
                      <div className="w-8 hidden md:flex items-center justify-center">
                        <div className={cn("w-2 h-2 rounded-full", tempSettings.provider === p.id ? "bg-emerald-500" : "bg-transparent")}></div>
                      </div>
                      <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-0">
                        <div className="font-bold flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full md:hidden", tempSettings.provider === p.id ? "bg-emerald-500" : "bg-transparent")}></div>
                            {p.name}
                        </div>
                        <div className="text-gray-500 font-mono text-[10px] md:hidden">{p.type}</div>
                      </div>
                      <div className="text-gray-500 font-mono text-xs hidden md:block">{p.type}</div>
                      <div className="hidden md:flex justify-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={tempSettings.provider === p.id}
                            onChange={() => {
                              const defaultModel = getDefaultModel(p.id);
                              setTempSettings((prev: any) => ({ 
                                ...prev, 
                                provider: p.id,
                                apiKey: prev.apiKeys?.[p.id] || '',
                                model: prev.models?.[p.id] || defaultModel,
                                baseUrl: prev.baseUrls?.[p.id] || ''
                              }));
                            }}
                          />
                          <div className={cn(
                            "w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all",
                            tempSettings.provider === p.id 
                              ? "bg-blue-600 after:border-white" 
                              : "bg-gray-200 dark:bg-white/10"
                          )}></div>
                        </label>
                      </div>
                      <div className="text-right flex items-center justify-end w-16">
                        <button 
                          onClick={() => {
                             setEditingProvider(p.id);
                          }}
                          className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 rounded-lg transition-colors"
                        >
                          修改
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {editingProvider && (
               <div className="space-y-6 flex flex-col h-full pb-8">
                  <div className="flex items-center gap-3 shrink-0 border-b pb-4 dark:border-white/10">
                     <button onClick={() => setEditingProvider(null)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors hidden sm:block">
                        <X size={18} />
                     </button>
                     <h3 className="font-bold text-lg flex-1">配置模型 - {PROVIDERS_LIST.find(p => p.id === editingProvider)?.name}</h3>
                     <button onClick={() => setEditingProvider(null)} className="sm:hidden px-3 py-1 rounded bg-gray-100 dark:bg-white/10 transition-colors">
                        <span className="text-sm font-bold">返回</span>
                     </button>
                  </div>
                  
                  <div className="space-y-6 flex-1 overflow-y-auto pr-2 pb-4 hide-scrollbar">
                      {/* Section 1: Provider Info */}
                      <div className="space-y-4">
                        <h4 className="font-bold border-b pb-2 dark:border-white/10 text-sm flex justify-between items-center">
                           <span>模型信息</span>
                           <div className="flex items-center gap-2 text-xs font-normal">
                             <span className="text-gray-500">是否启用</span>
                             <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  className="sr-only peer"
                                  checked={tempSettings.provider === editingProvider}
                                  onChange={() => {
                                    const p = editingProvider;
                                    const defaultModel = getDefaultModel(p);
                                    setTempSettings((prev: any) => ({ 
                                      ...prev, 
                                      provider: p,
                                      apiKey: prev.apiKeys?.[p] || '',
                                      model: prev.models?.[p] || defaultModel,
                                      baseUrl: prev.baseUrls?.[p] || ''
                                    }));
                                  }}
                                />
                                <div className={cn(
                                  "w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all",
                                  tempSettings.provider === editingProvider 
                                    ? "bg-blue-600 after:border-white" 
                                    : "bg-gray-200 dark:bg-white/10"
                                )}></div>
                              </label>
                           </div>
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <section className="space-y-1">
                              <label className="text-xs font-bold text-[#6B7280] dark:text-gray-400">模型配置名称</label>
                              <input 
                                type="text"
                                disabled
                                value={PROVIDERS_LIST.find(p => p.id === editingProvider)?.name || ''}
                                className={cn("w-full border rounded-lg px-3 py-2 text-sm outline-none opacity-70", theme === 'dark' ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200")}
                              />
                           </section>
                           <section className="space-y-1">
                              <label className="text-xs font-bold text-[#6B7280] dark:text-gray-400">接口格式</label>
                              <input 
                                type="text"
                                disabled
                                value={PROVIDERS_LIST.find(p => p.id === editingProvider)?.typeLabel || ''}
                                className={cn("w-full border rounded-lg px-3 py-2 text-sm outline-none opacity-70", theme === 'dark' ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200")}
                              />
                           </section>
                        </div>
                        
                        <section className="space-y-1">
                           <label className="text-xs font-bold text-[#6B7280] dark:text-gray-400">备注</label>
                           <textarea 
                             rows={4}
                             value={tempSettings.providerNotes?.[editingProvider] ?? (PROVIDERS_LIST.find(p => p.id === editingProvider)?.description || '')}
                             onChange={e => {
                               const val = e.target.value;
                               setTempSettings((prev: any) => ({
                                 ...prev,
                                 providerNotes: { ...prev.providerNotes, [editingProvider]: val }
                               }));
                             }}
                             className={cn("w-full border rounded-lg px-3 py-2 text-sm outline-none resize-none transition-colors", theme === 'dark' ? "bg-white/5 border-white/10 text-white focus:border-white/30" : "bg-white border-gray-200 focus:border-gray-400")}
                           />
                        </section>
                      </div>

                      {/* Section 2: Invocation Info */}
                      <div className="space-y-4 pt-4 mt-4 border-t dark:border-white/10">
                        <h4 className="font-bold border-b pb-2 dark:border-white/10 text-sm">调用信息</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <section className="space-y-1">
                              <label className="text-xs font-bold text-[#6B7280] dark:text-gray-400">基础URL</label>
                              <input 
                                type="url"
                                value={editingProvider === tempSettings.provider ? tempSettings.baseUrl : (tempSettings.baseUrls?.[editingProvider] || '')}
                                onChange={e => {
                                  const val = e.target.value;
                                  setTempSettings((prev: any) => {
                                    const next = { ...prev, baseUrls: { ...prev.baseUrls, [editingProvider]: val } };
                                    if (prev.provider === editingProvider) next.baseUrl = val;
                                    return next;
                                  });
                                }}
                                placeholder={
                                  editingProvider === 'zhipuai' ? '默认为 https://open.bigmodel.cn/api/paas/v4/chat/completions' :
                                  editingProvider === 'openai' ? '默认为 https://api.openai.com/v1/chat/completions' :
                                  editingProvider === 'deepseek' ? '默认为 https://api.deepseek.com/chat/completions' :
                                  editingProvider === 'dashscope' ? '默认为 https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions' :
                                  editingProvider === 'local' ? '默认为 http://127.0.0.1:11434/v1/chat/completions' :
                                  editingProvider === 'gemini' ? '默认为 https://generativelanguage.googleapis.com/v1beta' :
                                  '请输入兼容接口地址 (Base URL)'
                                }
                                className={cn("w-full border rounded-lg px-3 py-2 text-sm outline-none transition-colors", theme === 'dark' ? "bg-white/5 border-white/10 text-white focus:border-white/30" : "bg-white border-gray-200 focus:border-gray-400")}
                              />
                           </section>
                           <section className="space-y-1">
                              <div className="flex justify-between items-end">
                                <label className="text-xs font-bold text-[#6B7280] dark:text-gray-400">
                                  模型名称 <span className="text-red-500">*</span>
                                  <span className="font-normal opacity-70 ml-1 tracking-tight">(连通性测试后如支持可返回下拉列表)</span>
                                </label>
                                {isFetchingModels && <RefreshCw size={12} className="animate-spin text-blue-500" />}
                              </div>
                              <div className="relative">
                                <input 
                                  type="text"
                                  value={editingProvider === tempSettings.provider ? tempSettings.model : (tempSettings.models?.[editingProvider] || getDefaultModel(editingProvider))}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setTempSettings((prev: any) => {
                                      const next = { ...prev, models: { ...prev.models, [editingProvider]: val } };
                                      if (prev.provider === editingProvider) next.model = val;
                                      return next;
                                    });
                                  }}
                                  onFocus={() => setIsModelDropdownOpen(true)}
                                  onBlur={() => setTimeout(() => setIsModelDropdownOpen(false), 200)}
                                  placeholder={editingProvider === 'deepseek' ? 'deepseek-v4-flash' : '输入或选择模型名'}
                                  className={cn("w-full border rounded-lg px-3 py-2 text-sm outline-none transition-colors pr-8", theme === 'dark' ? "bg-white/5 border-white/10 text-white focus:border-white/30" : "bg-white border-gray-200 focus:border-gray-400")}
                                />
                                {(fetchedModels[editingProvider] || editingProvider === 'deepseek') && (
                                   <div 
                                      className="absolute right-1 top-1 bottom-1 w-6 flex items-center justify-center cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                      onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                                   >
                                     <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("transition-transform duration-200", isModelDropdownOpen ? "rotate-180" : "")}>
                                       <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                     </svg>
                                   </div>
                                )}
                                
                                {isModelDropdownOpen && (fetchedModels[editingProvider] || (editingProvider === 'deepseek' ? ['deepseek-v4-flash', 'deepseek-v4-pro'] : [])) && (
                                   <div className={cn("absolute left-0 right-0 top-full mt-1 border rounded-lg shadow-xl overflow-hidden z-50 max-h-48 overflow-y-auto", theme === 'dark' ? "bg-[#25262B] border-white/10" : "bg-white border-gray-200")}>
                                     {(fetchedModels[editingProvider] || (editingProvider === 'deepseek' ? ['deepseek-v4-flash', 'deepseek-v4-pro'] : [])).map(m => (
                                        <div 
                                          key={m} 
                                          onMouseDown={(e) => {
                                            e.preventDefault(); 
                                            setTempSettings((prev: any) => {
                                              const next = { ...prev, models: { ...prev.models, [editingProvider]: m } };
                                              if (prev.provider === editingProvider) next.model = m;
                                              return next;
                                            });
                                            setIsModelDropdownOpen(false);
                                          }}
                                          className={cn("px-3 py-2 text-sm cursor-pointer truncate transition-colors", theme === 'dark' ? "hover:bg-white/10 text-white" : "hover:bg-gray-100 text-gray-900")}
                                          title={m}
                                        >
                                          {m}
                                        </div>
                                     ))}
                                   </div>
                                )}
                              </div>
                           </section>

                           <section className="space-y-1">
                              <div className="flex justify-between items-end">
                                 <label className="text-xs font-bold text-[#6B7280] dark:text-gray-400">API密钥 <span className="text-red-500">*</span></label>
                                 <div className="flex items-center gap-3">
                                   {editingProvider === 'deepseek' && (
                                      <button onClick={fetchBalanceForEditingProvider} className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline">
                                        <Wallet size={12}/> 查询余额
                                      </button>
                                   )}
                                 </div>
                              </div>
                              <input 
                                type="password"
                                value={editingProvider === tempSettings.provider ? tempSettings.apiKey : (tempSettings.apiKeys?.[editingProvider] || '')}
                                onChange={e => {
                                  const val = e.target.value;
                                  setTempSettings((prev: any) => {
                                    const next = { ...prev, apiKeys: { ...prev.apiKeys, [editingProvider]: val } };
                                    if (prev.provider === editingProvider) next.apiKey = val;
                                    return next;
                                  });
                                }}
                                placeholder="sk-..."
                                className={cn("w-full border rounded-lg px-3 py-2 text-sm outline-none transition-colors", theme === 'dark' ? "bg-white/5 border-white/10 text-white focus:border-white/30" : "bg-white border-gray-200 focus:border-gray-400")}
                              />
                              {editingProvider === 'deepseek' && balance && (
                                 <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1 bg-emerald-50 p-1.5 rounded border border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20">
                                    <Coins size={12} /> 剩余: {balance.balance_infos?.[0]?.total_balance || balance.balance || '获取为空'} {balance.balance_infos?.[0]?.currency || 'CNY'}
                                 </div>
                              )}
                              {editingProvider === 'deepseek' && balanceError && (
                                 <div className="text-xs text-red-600 mt-1">{balanceError}</div>
                              )}
                            </section>
                         </div>
                       </div>

                       {/* Connection Test & Global Save */}
                       <section className="pt-4 mt-6 border-t border-gray-200 dark:border-white/10 flex justify-end gap-3 flex-wrap items-center">
                         {connectionStatus && (
                           <div className={cn(
                            "text-xs font-medium flex items-center gap-2 px-3 py-2.5 rounded-lg flex-1 min-w-[200px]",
                            connectionStatus.success 
                              ? "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10" 
                              : "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10"
                          )}>
                            {connectionStatus.success ? <HelpCircle size={14} /> : <StopCircle size={14} />}
                            {connectionStatus.success ? (
                              <span>{connectionStatus.message} <span className="opacity-70 font-normal">({fetchedModels[editingProvider!]?.length ? `返回拉取 ${fetchedModels[editingProvider!]?.length} 个该提供商可用模型` : '不支持抓取列表'})</span></span>
                            ) : (
                              connectionStatus.message
                            )}
                          </div>
                        )}
                        <button
                          onClick={handleTestConnection}
                          disabled={isTestingConnection || !(editingProvider === tempSettings.provider ? tempSettings.apiKey : tempSettings.apiKeys?.[editingProvider])}
                          className={cn(
                            "px-5 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap text-sm ml-auto",
                            isTestingConnection || !(editingProvider === tempSettings.provider ? tempSettings.apiKey : tempSettings.apiKeys?.[editingProvider])
                              ? "opacity-50 cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-white/5 dark:text-gray-500"
                              : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                          )}
                        >
                          {isTestingConnection ? (
                            <>
                              <RefreshCw size={14} className="animate-spin" />
                              <span>测试中...</span>
                            </>
                          ) : (
                            <>
                              <Send size={14} />
                              <span>连通性测试</span>
                            </>
                          )}
                        </button>
                      </section>
                      <div className="space-y-4 pt-4 mt-4 border-t dark:border-white/10">
                        <h4 className="font-bold border-b pb-2 dark:border-white/10 text-sm">其他配置</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <section className="space-y-1">
                               <div className="flex items-center justify-between">
                                 <label className="text-xs font-bold text-[#6B7280] dark:text-gray-400">温度 (Temperature)</label>
                                 <span className={cn("font-mono text-xs font-bold px-2 py-0.5 rounded", theme === 'dark' ? "bg-[#333] text-gray-200" : "bg-gray-100 text-gray-800")}>
                                   {tempSettings.temperature?.toFixed(1)}
                                 </span>
                               </div>
                               <div className="flex items-center gap-3 pt-2">
                                 <span className="text-xs font-medium text-gray-400">0.0</span>
                                 <input 
                                   type="range"
                                   min="0" max="2" step="0.1"
                                   value={tempSettings.temperature}
                                   onChange={e => setTempSettings((prev: any) => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                                   className={cn(
                                     "flex-1 h-1.5 rounded-full appearance-none cursor-pointer outline-none transition-all",
                                     "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 hover:[&::-webkit-slider-thumb]:bg-blue-600 hover:[&::-webkit-slider-thumb]:scale-110 [&::-webkit-slider-thumb]:transition-transform",
                                     theme === 'dark' ? "bg-white/10" : "bg-gray-200"
                                   )}
                                 />
                                 <span className="text-xs font-medium text-gray-400">2.0</span>
                               </div>
                            </section>
                            
                            {editingProvider === 'deepseek' && (
                            <section className="space-y-1">
                               <div className="flex items-center justify-between">
                                 <label className="text-xs font-bold text-[#6B7280] dark:text-gray-400">思考强度 (Reasoning Effort)</label>
                               </div>
                               <div className="pt-2">
                                  <select 
                                     value={tempSettings.reasoningEffort} 
                                     onChange={e => setTempSettings((prev: any) => ({ ...prev, reasoningEffort: e.target.value as 'high' | 'max' }))}
                                     className={cn("w-full border rounded-lg px-3 py-2 text-sm outline-none transition-colors appearance-none bg-no-repeat", theme === 'dark' ? "bg-white/5 border-white/10 text-white focus:border-white/30" : "bg-white border-gray-200 focus:border-gray-400")}
                                     style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: `right 0.5rem center`, backgroundSize: `1em` }}
                                   >
                                     <option value="high" className={theme === 'dark' ? "bg-[#25262B]" : "bg-white"}>high (高)</option>
                                     <option value="max" className={theme === 'dark' ? "bg-[#25262B]" : "bg-white"}>max (最高)</option>
                                  </select>
                                  <p className="mt-1 text-[11px] text-gray-400">设置思考模式开启时，模型的思考强度。默认 high，复杂需求可选 max（仅部分 API 格式支持）。</p>
                               </div>
                            </section>
                            )}
                            
                          </div>
                        </div>
                  </div>
               </div>
            )}
    </>
  );
};
