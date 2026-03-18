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

export const api = {
  async verifyKey(key: string) {
    const res = await fetch("/api/verify-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    return res.json();
  },

  async getMemories(conversationName?: string): Promise<any[]> {
    const url = conversationName ? `/api/memories?conversationName=${encodeURIComponent(conversationName)}` : "/api/memories";
    const res = await fetchWithAuth(url);
    return res.json();
  },

  async getConversations(): Promise<Conversation[]> {
    const res = await fetchWithAuth("/api/conversations");
    return res.json();
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    const res = await fetchWithAuth(`/api/conversations/${conversationId}/messages`);
    return res.json();
  },

  async createConversation(conv: Partial<Conversation>) {
    const res = await fetchWithAuth("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(conv),
    });
    return res.json();
  },

  async updateConversation(id: string, updates: Partial<Conversation>) {
    const res = await fetchWithAuth(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    return res.json();
  },

  async deleteConversation(id: string) {
    const res = await fetchWithAuth(`/api/conversations/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '删除失败');
    }
    return res.json();
  },

  async saveMessage(message: Partial<Message>) {
    const res = await fetchWithAuth("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
    return res.json();
  },

  async deleteMessage(id: string) {
    const res = await fetchWithAuth(`/api/messages/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '删除失败');
    }
    return res.json();
  },

  async getBalance(apiKey?: string) {
    const res = await fetchWithAuth("/api/balance", {
      headers: apiKey ? { "X-DeepSeek-API-Key": apiKey } : {},
    });
    return res.json();
  },

  async getSettings() {
    const res = await fetchWithAuth("/api/settings");
    return res.json();
  },

  async saveSettings(settings: any) {
    const res = await fetchWithAuth("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    return res.json();
  },

  async extractPrompt(text: string, apiKey?: string) {
    const res = await fetchWithAuth("/api/extract-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, apiKey }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '提取提示词失败');
    }
    return res.json();
  },

  async generateImage(prompt: string, provider: string, apiKey?: string) {
    const res = await fetchWithAuth("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, provider, apiKey }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '生成图片失败');
    }
    return res.json();
  },

  async chat(params: {
    messages: any[];
    model: string;
    temperature: number;
    stream: boolean;
    apiKey?: string;
    stream_options?: any;
    useTieredMemory?: boolean;
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
