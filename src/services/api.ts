import { Message, Conversation } from "../types";
import { useSettingStore } from '../store/settingStore';

const getAuthHeaders = (extraHeaders: Record<string, string> = {}) => {
  const key = localStorage.getItem('webui_secret_key');
  return {
    ...extraHeaders,
    ...(key ? { 
      'x-webui-secret-key': key,
      'Authorization': `Bearer ${key}`
    } : {})
  };
};

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const headers = getAuthHeaders(options.headers as Record<string, string>);
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401 && url.startsWith('/api/') && url !== '/api/verify-key') {
    window.dispatchEvent(new CustomEvent('webui-auth-required'));
  }
  return res;
};

const parseResponse = async (res: Response, defaultErrorMsg = '请求失败') => {
  if (!res.ok) {
    let errMsg = defaultErrorMsg;
    try {
      const text = await res.text();
      try {
        const err = JSON.parse(text);
        errMsg = err.error || errMsg;
        if (typeof errMsg === 'object' && errMsg !== null) {
          const errObj = errMsg as any;
          if (errObj.message) {
            errMsg = String(errObj.message);
          } else {
            errMsg = JSON.stringify(errObj);
          }
        }
      } catch (e) {
        if (res.status === 413) {
          errMsg = '请求数据过大，超出了服务器限制 (Payload Too Large)。请清理历史记录或重启应用。';
        } else {
          errMsg = `服务器错误 (${res.status}): ${text.substring(0, 100)}`;
        }
      }
    } catch (e) {
      errMsg = `网络请求失败 (${res.status})`;
    }
    throw new Error(errMsg);
  }
  
  const text = await res.text();
  try {
    const data = text ? JSON.parse(text) : {};
    // Check if the successful response actually contains an error object (like balance does)
    if (data.error && typeof data.error === 'object') {
      if (data.error.message) data.error = data.error.message;
      else data.error = JSON.stringify(data.error);
    }
    return data;
  } catch (e) {
    console.error("Invalid JSON format from server:", text);
    throw new Error(`服务器返回了无效的数据格式: ${text.substring(0, 30)}`);
  }
};

export const api = {
  async verifyKey(key: string) {
    const res = await fetch("/api/verify-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    return parseResponse(res, '验证失败');
  },

  async getMemories(conversationName?: string, conversationId?: string): Promise<any[]> {
    let url = "/api/memories";
    if (conversationName && conversationId) {
      url = `/api/memories?conversationName=${encodeURIComponent(conversationName)}&conversationId=${encodeURIComponent(conversationId)}`;
    } else if (conversationName) {
      url = `/api/memories?conversationName=${encodeURIComponent(conversationName)}`;
    } else if (conversationId) {
      url = `/api/memories?conversationId=${encodeURIComponent(conversationId)}`;
    }
    const res = await fetchWithAuth(url);
    return parseResponse(res, '获取记忆失败');
  },

  async ingestMemory(params: any): Promise<{usage: any}> {
    const res = await fetchWithAuth("/api/memories/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return parseResponse(res, '记忆整理失败');
  },

  async getConversations(): Promise<Conversation[]> {
    const res = await fetchWithAuth("/api/conversations");
    return parseResponse(res, '获取对话列表失败');
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    const res = await fetchWithAuth(`/api/conversations/${conversationId}/messages`);
    return parseResponse(res, '获取消息失败');
  },

  async createConversation(conv: Partial<Conversation>) {
    const res = await fetchWithAuth("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(conv),
    });
    return parseResponse(res, '创建对话失败');
  },

  async updateConversation(id: string, updates: Partial<Conversation>) {
    const res = await fetchWithAuth(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    return parseResponse(res, '更新对话失败');
  },

  async deleteConversation(id: string) {
    const res = await fetchWithAuth(`/api/conversations/${id}`, {
      method: "DELETE",
    });
    return parseResponse(res, '删除对话失败');
  },

  async clearDiscussion(id: string) {
    const res = await fetchWithAuth(`/api/conversations/${id}/discussion`, {
      method: "DELETE",
    });
    return parseResponse(res, '清空讨论记录失败');
  },

  async saveMessage(message: Partial<Message>) {
    const res = await fetchWithAuth("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
    return parseResponse(res, '保存消息失败');
  },

  async deleteMessage(id: string) {
    const res = await fetchWithAuth(`/api/messages/${id}`, {
      method: "DELETE",
    });
    return parseResponse(res, '删除消息失败');
  },

  async getBalance(apiKey?: string) {
    const res = await fetchWithAuth("/api/balance", {
      headers: apiKey ? { "X-DeepSeek-API-Key": apiKey } : {},
    });
    return parseResponse(res, '获取余额失败');
  },

  async testConnection(provider: string, apiKey: string, model: string, baseUrl?: string) {
    const res = await fetchWithAuth("/api/test-connection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, apiKey, model, baseUrl }),
    });
    return parseResponse(res, '测试连接失败');
  },

  async testEmbeddingConnection(provider: string, apiKey: string, model: string) {
    const res = await fetchWithAuth("/api/test-embedding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, apiKey, model }),
    });
    return parseResponse(res, '测试 Embedding 连接失败');
  },

  async fetchModels(provider: string, apiKey: string, baseUrl?: string): Promise<{ models: string[] }> {
    const params = new URLSearchParams({ provider, apiKey });
    if (baseUrl) params.append('baseUrl', baseUrl);
    
    const res = await fetchWithAuth(`/api/models?${params.toString()}`);
    return parseResponse(res, '获取模型列表失败');
  },

  async getSettings() {
    const res = await fetchWithAuth("/api/settings");
    return parseResponse(res, '获取设置失败');
  },

  async saveSettings(settings: any) {
    const res = await fetchWithAuth("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    return parseResponse(res, '保存设置失败');
  },

  async extractPrompt(text: string, apiKey?: string, preference?: string) {
    const { provider, baseUrl, baseUrls, model, models } = useSettingStore.getState().llmConfig;
    const currentBaseUrl = baseUrl || baseUrls?.[provider] || '';
    const currentModel = model || models?.[provider] || '';
    const res = await fetchWithAuth("/api/extract-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, apiKey, isReasoning: false, preference, provider, baseUrl: currentBaseUrl, model: currentModel }),
    });
    return parseResponse(res, '提取提示词失败');
  },

  async translatePrompt(text: string, apiKey?: string) {
    const { provider, baseUrl, baseUrls, model, models } = useSettingStore.getState().llmConfig;
    const currentBaseUrl = baseUrl || baseUrls?.[provider] || '';
    const currentModel = model || models?.[provider] || '';
    const res = await fetchWithAuth("/api/translate-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, apiKey, isReasoning: false, provider, baseUrl: currentBaseUrl, model: currentModel }),
    });
    return parseResponse(res, '翻译提示词失败');
  },

  async reverseTranslatePrompt(text: string, apiKey?: string) {
    const { provider, baseUrl, baseUrls, model, models } = useSettingStore.getState().llmConfig;
    const currentBaseUrl = baseUrl || baseUrls?.[provider] || '';
    const currentModel = model || models?.[provider] || '';
    const res = await fetchWithAuth("/api/reverse-translate-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, apiKey, isReasoning: false, provider, baseUrl: currentBaseUrl, model: currentModel }),
    });
    return parseResponse(res, '反向翻译提示词失败');
  },

  async generateImage(prompt: string, provider: string, apiKey?: string, model?: string) {
    const res = await fetchWithAuth("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, provider, apiKey, model }),
    });
    return parseResponse(res, '生成图片失败');
  },

  async chat(params: {
    messages: any[];
    systemPrompt?: string;
    model: string;
    temperature: number;
    stream: boolean;
    apiKey?: string;
    provider?: string;
    baseUrl?: string;
    stream_options?: any;
    useTieredMemory?: boolean;
    memoryMode?: 'off' | 'simple' | 'powermem';
    memorySummarizeFrequency?: number;
    skipMemoryIngest?: boolean;
    conversationId?: string;
    conversationName?: string;
    isThinkingMode?: boolean;
    reasoningEffort?: 'high' | 'max';
    totalUserRounds?: number;
  }, signal?: AbortSignal) {
    const res = await fetchWithAuth("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal,
    });
    
    if (!res.ok) {
      let errMsg = '对话请求失败';
      try {
        const text = await res.text();
        try {
          const err = JSON.parse(text);
          errMsg = err.error || errMsg;
        } catch (e) {
          errMsg = `对话请求失败 (${res.status}): ${text.substring(0, 100)}`;
        }
      } catch (e) {
        errMsg = `网络请求失败 (${res.status})`;
      }
      throw new Error(errMsg);
    }
    
    return res;
  },
};
