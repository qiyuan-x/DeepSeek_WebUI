import { Message, Conversation } from "../types";

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
    return text ? JSON.parse(text) : {};
  } catch (e) {
    throw new Error('服务器返回了无效的数据格式');
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

  async getMemories(conversationName?: string): Promise<any[]> {
    const url = conversationName ? `/api/memories?conversationName=${encodeURIComponent(conversationName)}` : "/api/memories";
    const res = await fetchWithAuth(url);
    return parseResponse(res, '获取记忆失败');
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

  async extractPrompt(text: string, apiKey?: string) {
    const res = await fetchWithAuth("/api/extract-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, apiKey }),
    });
    return parseResponse(res, '提取提示词失败');
  },

  async generateImage(prompt: string, provider: string, apiKey?: string) {
    const res = await fetchWithAuth("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, provider, apiKey }),
    });
    return parseResponse(res, '生成图片失败');
  },

  async chat(params: {
    messages: any[];
    model: string;
    temperature: number;
    stream: boolean;
    apiKey?: string;
    provider?: string;
    stream_options?: any;
    useTieredMemory?: boolean;
    skipMemoryIngest?: boolean;
    conversationId?: string;
    conversationName?: string;
  }, signal?: AbortSignal) {
    return fetchWithAuth("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal,
    });
  },
};
