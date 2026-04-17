import React from 'react';

interface AuthScreenProps {
  setIsAuthRequired: (val: boolean) => void;
  api: any;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ setIsAuthRequired, api }) => {
  return (
    <div className="flex h-[100dvh] w-full items-center justify-center bg-[#0A0A0A] text-white font-sans">
      <div className="w-full max-w-md p-8 bg-[#111111] rounded-2xl border border-white/10 shadow-2xl mx-4">
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="Logo" className="w-16 h-16 rounded-full object-cover shadow-lg" />
        </div>
        <h1 className="text-2xl font-bold text-center mb-2">DeepSeek WebUI</h1>
        <p className="text-center text-gray-400 mb-8 text-sm">请输入服务端提供的访问密钥</p>
        
        <form onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const key = formData.get('key') as string;
          try {
            const res = await api.verifyKey(key);
            if (res.success) {
              localStorage.setItem('webui_secret_key', key);
              setIsAuthRequired(false);
              window.location.reload();
            } else {
              alert('密钥错误，请重试');
            }
          } catch (err) {
            alert('验证失败，请检查网络或服务端状态');
          }
        }}>
          <input
            type="password"
            name="key"
            placeholder="输入访问密钥..."
            className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors mb-4"
            required
            autoFocus
          />
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors"
          >
            进入系统
          </button>
        </form>
      </div>
    </div>
  );
};
