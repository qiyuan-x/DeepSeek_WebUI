import React from 'react';
import { cn } from '../../types';
import { useSettingStore } from '../../store/settingStore';

export const HelpTab: React.FC = () => {
  const { theme } = useSettingStore(s => s.uiConfig);

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <h3 className="text-sm font-bold">常见问题</h3>
        <div className="space-y-4 text-sm">
          <div className={cn(
            "p-4 rounded-xl",
            theme === 'dark' ? "bg-white/5" : "bg-[#F9FAFB]"
          )}>
            <p className="font-bold mb-1">如何获取 API Key？</p>
            <p className={theme === 'dark' ? "text-gray-400" : "text-gray-600"}>
              请访问 DeepSeek 开放平台 (platform.deepseek.com) 注册并获取 API Key。
            </p>
          </div>
          <div className={cn(
            "p-4 rounded-xl",
            theme === 'dark' ? "bg-white/5" : "bg-[#F9FAFB]"
          )}>
            <p className="font-bold mb-1">数据存储在哪里？</p>
            <p className={theme === 'dark' ? "text-gray-400" : "text-gray-600"}>
              所有聊天记录和设置都安全地存储在您的本地浏览器和服务器中。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
