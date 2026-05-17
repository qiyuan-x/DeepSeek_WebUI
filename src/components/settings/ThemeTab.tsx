import React, { useState } from 'react';
import { ChevronDown, X, HelpCircle, User, Brain } from 'lucide-react';
import { cn } from '../../types';
import { useSettingStore } from '../../store/settingStore';
import { useStoryStore } from '../../store/storyStore';
import { AnimatePresence, motion } from 'framer-motion';

interface ThemeTabProps {
  tempSettings: any;
  setTempSettings: React.Dispatch<React.SetStateAction<any>>;
  handleSaveSettings: (updates: any) => Promise<void>;
  setCropData: React.Dispatch<React.SetStateAction<{ src: string; target: 'user' | 'ai' } | null>>;
}

export const ThemeTab: React.FC<ThemeTabProps> = ({ 
  tempSettings, 
  setTempSettings, 
  handleSaveSettings,
  setCropData
}) => {
  const { theme } = useSettingStore(s => s.uiConfig);
  const { isStoryMode } = useStoryStore();
  const [expandedThemeSection, setExpandedThemeSection] = useState<string | null>('ui');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const readers = files.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      });
      
      Promise.all(readers).then(results => {
        setTempSettings((prev: any) => {
          const newBgImages = [...(prev.bgImages || []), ...results];
          const newSettings = { ...prev, bgImages: newBgImages, bgImage: prev.bgImage || newBgImages[0] };
          handleSaveSettings({ bgImages: newBgImages, bgImage: prev.bgImage || newBgImages[0] });
          return newSettings;
        });
      });
    }
  };

  return (
    <div className="space-y-8 pb-8">
      {/* ---------- Group 1: UI Switches & Modes ---------- */}
      <div className="space-y-4">
        <button onClick={() => setExpandedThemeSection(expandedThemeSection === 'ui' ? null : 'ui')} className="w-full flex justify-between items-center py-3 px-4 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors">
          <span className="text-sm font-bold uppercase tracking-widest text-[#6B7280] dark:text-gray-400">界面与交互设置</span>
          <ChevronDown className={cn("transition-transform text-gray-400", expandedThemeSection === 'ui' ? "rotate-180" : "")} size={20} />
        </button>
        {expandedThemeSection === 'ui' && (
          <div className="space-y-6 pt-2 px-2">
        
        <section className="space-y-2">
          <label className="text-xs font-bold text-[#6B7280] dark:text-gray-400">1. 主题模式</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={async () => {
                const update = { theme: 'light', globalTheme: 'light' };
                if (isStoryMode) delete (update as any).theme; // Don't change local theme if story mode
                setTempSettings((prev: any) => ({ ...prev, theme: 'light', globalTheme: 'light' }));
                await handleSaveSettings(update);
              }}
              className={cn(
                "py-2.5 px-4 text-center rounded-xl border transition-all flex items-center justify-center gap-2",
                tempSettings.theme === 'light' 
                  ? "border-[#1A1A1A] bg-[#F9FAFB] ring-1 ring-[#1A1A1A] text-[#1A1A1A]" 
                  : "border-white/10 hover:border-white/30 text-gray-400"
              )}
            >
              <span className="text-sm font-bold">浅色模式</span>
            </button>
            <button
              onClick={async () => {
                const update = { theme: 'dark', globalTheme: 'dark' };
                if (isStoryMode) delete (update as any).theme; // Don't change local theme if story mode
                setTempSettings((prev: any) => ({ ...prev, theme: 'dark', globalTheme: 'dark' }));
                await handleSaveSettings(update);
              }}
              className={cn(
                "py-2.5 px-4 text-center rounded-xl border transition-all flex items-center justify-center gap-2",
                tempSettings.theme === 'dark' 
                  ? "border-white bg-white/10 text-white" 
                  : "border-[#E5E7EB] hover:border-[#1A1A1A] text-[#6B7280] dark:text-gray-400"
              )}
            >
              <span className="text-sm font-bold">深色模式</span>
            </button>
          </div>
        </section>

        <section className="space-y-2">
          <label className="text-xs font-bold text-[#6B7280] dark:text-gray-400">2. 对话风格 (Layout)</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={async () => {
                setTempSettings((prev: any) => ({ ...prev, chatLayout: 'default' }));
                await handleSaveSettings({ chatLayout: 'default' });
              }}
              className={cn(
                "py-2.5 px-4 text-center rounded-xl border transition-all flex items-center justify-center gap-2",
                tempSettings.chatLayout === 'default' 
                  ? (theme === 'dark' ? "border-white bg-white/10 text-white" : "border-[#1A1A1A] bg-[#F9FAFB] ring-1 ring-[#1A1A1A] text-[#1A1A1A]")
                  : (theme === 'dark' ? "border-white/10 hover:border-white/30 text-gray-400" : "border-[#E5E7EB] hover:border-[#1A1A1A] text-[#6B7280] dark:text-gray-400")
              )}
            >
              <span className="text-sm font-bold">默认风格</span>
            </button>
            <button
              onClick={async () => {
                setTempSettings((prev: any) => ({ ...prev, chatLayout: 'qq' }));
                await handleSaveSettings({ chatLayout: 'qq' });
              }}
              className={cn(
                "py-2.5 px-4 text-center rounded-xl border transition-all flex items-center justify-center gap-2",
                tempSettings.chatLayout === 'qq' || tempSettings.chatLayout === 'wechat'
                  ? (theme === 'dark' ? "border-white bg-white/10 text-white" : "border-[#1A1A1A] bg-[#F9FAFB] ring-1 ring-[#1A1A1A] text-[#1A1A1A]")
                  : (theme === 'dark' ? "border-white/10 hover:border-white/30 text-gray-400" : "border-[#E5E7EB] hover:border-[#1A1A1A] text-[#6B7280] dark:text-gray-400")
              )}
            >
              <span className="text-sm font-bold">微信/QQ风格</span>
            </button>
          </div>
        </section>

        <section className="space-y-2">
          <label className="text-xs font-bold text-[#6B7280] dark:text-gray-400">3. 发送快捷键</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={async () => {
                setTempSettings((prev: any) => ({ ...prev, sendBehavior: 'enter' }));
                await handleSaveSettings({ sendBehavior: 'enter' });
              }}
              className={cn(
                "py-2 px-4 text-center rounded-xl border transition-all flex flex-col items-center justify-center gap-0.5",
                tempSettings.sendBehavior === 'enter' 
                  ? (theme === 'dark' ? "border-white bg-white/10 text-white" : "border-[#1A1A1A] bg-[#F9FAFB] ring-1 ring-[#1A1A1A] text-[#1A1A1A]")
                  : (theme === 'dark' ? "border-white/10 hover:border-white/30 text-gray-400" : "border-[#E5E7EB] hover:border-[#1A1A1A] text-[#6B7280] dark:text-gray-400")
              )}
            >
              <span className="text-sm font-bold">Enter 发送</span>
              <span className="text-[10px] opacity-70">Ctrl+Enter 换行</span>
            </button>
            <button
              onClick={async () => {
                setTempSettings((prev: any) => ({ ...prev, sendBehavior: 'ctrl_enter' }));
                await handleSaveSettings({ sendBehavior: 'ctrl_enter' });
              }}
              className={cn(
                "py-2 px-4 text-center rounded-xl border transition-all flex flex-col items-center justify-center gap-0.5",
                tempSettings.sendBehavior === 'ctrl_enter'
                  ? (theme === 'dark' ? "border-white bg-white/10 text-white" : "border-[#1A1A1A] bg-[#F9FAFB] ring-1 ring-[#1A1A1A] text-[#1A1A1A]")
                  : (theme === 'dark' ? "border-white/10 hover:border-white/30 text-gray-400" : "border-[#E5E7EB] hover:border-[#1A1A1A] text-[#6B7280] dark:text-gray-400")
              )}
            >
              <span className="text-sm font-bold">Ctrl+Enter 发送</span>
              <span className="text-[10px] opacity-70">Enter 换行</span>
            </button>
          </div>
        </section>

        <section className="space-y-3 pt-2">
           <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={tempSettings.showMessageMeta ?? true}
                onChange={async e => {
                   const newVal = e.target.checked;
                   setTempSettings((prev: any) => ({ ...prev, showMessageMeta: newVal }));
                   await handleSaveSettings({ showMessageMeta: newVal });
                }}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium">在气泡下方显示响应消耗分析 (Tokens & 耗时)</span>
           </label>
        </section>
          </div>
        )}
      </div>

      {/* ---------- Group 2: Uploads & Assets ---------- */}
      <div className="space-y-4 pt-2">
        <button onClick={() => setExpandedThemeSection(expandedThemeSection === 'assets' ? null : 'assets')} className="w-full flex justify-between items-center py-3 px-4 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors">
          <span className="text-sm font-bold uppercase tracking-widest text-[#6B7280] dark:text-gray-400">个性化资源管理</span>
          <ChevronDown className={cn("transition-transform text-gray-400", expandedThemeSection === 'assets' ? "rotate-180" : "")} size={20} />
        </button>
        {expandedThemeSection === 'assets' && (
          <div className="space-y-6 pt-2 px-2">
        
        <section className="space-y-3">
          <label className="text-xs font-bold text-[#6B7280] dark:text-gray-400">1. 聊天背景轮播</label>
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(tempSettings.bgImages || []).map((img: string, index: number) => (
                <div key={index} className="relative h-24 rounded-2xl border transition-all overflow-hidden group">
                   <img src={img} className="absolute inset-0 w-full h-full object-cover" />
                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        onClick={async () => {
                          let newBgImages = [...(tempSettings.bgImages || [])];
                          newBgImages.splice(index, 1);
                          const newBgImage = newBgImages.length > 0 ? newBgImages[0] : null;
                          setTempSettings((prev: any) => ({ ...prev, bgImages: newBgImages, bgImage: newBgImage }));
                          await handleSaveSettings({ bgImages: newBgImages, bgImage: newBgImage });
                        }}
                        className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 scale-75 group-hover:scale-100 transition-transform"
                      >
                        <X size={14} />
                      </button>
                   </div>
                </div>
              ))}
              
              <div className={cn(
                "relative h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors overflow-hidden group",
                theme === 'dark' ? "border-white/10 hover:border-white/30" : "border-[#E5E7EB] hover:border-[#1A1A1A]"
              )}>
                <HelpCircle size={20} className={cn("transition-colors", theme === 'dark' ? "text-gray-400 group-hover:text-white" : "text-[#9CA3AF] group-hover:text-[#1A1A1A]")} />
                <span className="text-[10px] font-bold text-[#9CA3AF] uppercase">添加图片</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple
                  onChange={handleImageUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>
            
            {tempSettings.bgImages && tempSettings.bgImages.length > 1 && (
              <div className="mt-4 flex items-center gap-3">
                <label className="text-xs text-gray-500 whitespace-nowrap">图片轮播间隔 (秒)</label>
                <input 
                  type="number"
                  min="10"
                  value={tempSettings.bgImageInterval || 300}
                  onChange={async (e) => {
                    const val = parseInt(e.target.value) || 300;
                    setTempSettings((prev: any) => ({ ...prev, bgImageInterval: val }));
                    await handleSaveSettings({ bgImageInterval: val });
                  }}
                  className={cn("w-20 px-2 py-1 text-xs border rounded", theme === 'dark' ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200")}
                />
              </div>
            )}
            
            <p className="text-[10px] text-[#9CA3AF] mt-2">支持 JPG, PNG, WEBP。可一次选择多张实现自动轮播。</p>
          </div>
        </section>

        <section className="space-y-3">
          <label className="text-xs font-bold text-[#6B7280] dark:text-gray-400">2. 个性化头像 (仅微信/QQ风格显示)</label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-3">
              <div className={cn(
                "relative h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors overflow-hidden",
                theme === 'dark' ? "border-white/10 hover:border-white/20" : "border-[#E5E7EB] hover:border-[#1A1A1A]"
              )}>
                {tempSettings.userAvatar ? (
                  <>
                    <img src={tempSettings.userAvatar} className="absolute inset-0 w-full h-full object-cover" />
                    <button 
                      onClick={async () => {
                        setTempSettings((prev: any) => ({ ...prev, userAvatar: null }));
                        await handleSaveSettings({ userAvatar: null });
                      }}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 z-10"
                    >
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  <>
                    <User size={20} className="text-[#9CA3AF]" />
                    <span className="text-[10px] font-bold text-[#9CA3AF] uppercase">上传用户头像</span>
                  </>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setCropData({ src: reader.result as string, target: 'user' });
                      };
                      reader.readAsDataURL(file);
                    }
                    e.target.value = '';
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className={cn(
                "relative h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors overflow-hidden",
                theme === 'dark' ? "border-white/10 hover:border-white/20" : "border-[#E5E7EB] hover:border-[#1A1A1A]"
              )}>
                {tempSettings.aiAvatar ? (
                  <>
                    <img src={tempSettings.aiAvatar} className="absolute inset-0 w-full h-full object-cover" />
                    <button 
                      onClick={async () => {
                        setTempSettings((prev: any) => ({ ...prev, aiAvatar: null }));
                        await handleSaveSettings({ aiAvatar: null });
                      }}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 z-10"
                    >
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  <>
                    <Brain size={20} className="text-[#9CA3AF]" />
                    <span className="text-[10px] font-bold text-[#9CA3AF] uppercase">上传AI头像</span>
                  </>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setCropData({ src: reader.result as string, target: 'ai' });
                      };
                      reader.readAsDataURL(file);
                    }
                    e.target.value = '';
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </section>
        
        <section className="space-y-3">
          <label className="text-xs font-bold text-[#6B7280] dark:text-gray-400">3. 个性化名称</label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-[10px] text-[#9CA3AF] uppercase">用户昵称</label>
              <input
                type="text"
                placeholder="例如: 派大星"
                value={tempSettings.userName || ''}
                onChange={(e) => {
                  setTempSettings((prev: any) => ({ ...prev, userName: e.target.value }));
                  handleSaveSettings({ userName: e.target.value });
                }}
                className={cn(
                  "w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:ring-1 focus:ring-black",
                  theme === 'dark' ? "bg-white/5 border-white/10 text-white focus:ring-white/20" : "bg-white border-gray-200"
                )}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-[#9CA3AF] uppercase">AI 助手名称</label>
              <input
                type="text"
                placeholder="例如: 海绵宝宝"
                value={tempSettings.aiName || ''}
                onChange={(e) => {
                  setTempSettings((prev: any) => ({ ...prev, aiName: e.target.value }));
                  handleSaveSettings({ aiName: e.target.value });
                }}
                className={cn(
                  "w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:ring-1 focus:ring-black",
                  theme === 'dark' ? "bg-white/5 border-white/10 text-white focus:ring-white/20" : "bg-white border-gray-200"
                )}
              />
            </div>
          </div>
        </section>
        </div>
      )}
      </div>
    </div>
  );
};
