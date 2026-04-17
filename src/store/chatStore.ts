import { create } from 'zustand';
import { Message, Conversation } from '../types';
import { api } from '../services/api';

interface ChatState {
  conversations: Conversation[];
  currentConvId: string | null;
  messages: Message[];
  isGenerating: boolean;
  
  setConversations: (convs: Conversation[] | ((prev: Conversation[]) => Conversation[])) => void;
  setCurrentConvId: (id: string | null) => void;
  setMessages: (msgs: Message[] | ((prev: Message[]) => Message[])) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  
  loadConversations: () => Promise<void>;
  loadMessages: (convId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConvId: null,
  messages: [],
  isGenerating: false,

  setConversations: (convs) => set((state) => ({ 
    conversations: typeof convs === 'function' ? convs(state.conversations) : convs 
  })),
  setCurrentConvId: (id) => set({ currentConvId: id }),
  setMessages: (msgs) => set((state) => ({ 
    messages: typeof msgs === 'function' ? msgs(state.messages) : msgs 
  })),
  setIsGenerating: (isGenerating) => set({ isGenerating }),

  loadConversations: async () => {
    try {
      const convs = await api.getConversations();
      set({ conversations: convs });
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  },

  loadMessages: async (convId: string) => {
    try {
      const msgs = await api.getMessages(convId);
      set({ messages: msgs });
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  }
}));
