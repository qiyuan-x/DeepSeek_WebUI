import { Message, Conversation } from "../types";

export const api = {
  async getConversations(): Promise<Conversation[]> {
    const res = await fetch("/api/conversations");
    return res.json();
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    const res = await fetch(`/api/conversations/${conversationId}/messages`);
    return res.json();
  },

  async createConversation(conv: Partial<Conversation>) {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(conv),
    });
    return res.json();
  },

  async updateConversation(id: string, updates: Partial<Conversation>) {
    const res = await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    return res.json();
  },

  async deleteConversation(id: string) {
    const res = await fetch(`/api/conversations/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '删除失败');
    }
    return res.json();
  },

  async saveMessage(message: Partial<Message>) {
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
    return res.json();
  },

  async getBalance(apiKey?: string) {
    const res = await fetch("/api/balance", {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    });
    return res.json();
  },

  async getSettings() {
    const res = await fetch("/api/settings");
    return res.json();
  },

  async saveSettings(settings: any) {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    return res.json();
  },

  async chat(params: {
    messages: any[];
    model: string;
    temperature: number;
    stream: boolean;
    apiKey?: string;
  }) {
    return fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  },
};
