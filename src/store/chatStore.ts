import { create } from 'zustand';
import { Message, Conversation } from '../types';
import { api } from '../services/api';

interface ChatState {
  conversations: Conversation[];
  currentConvId: string | null;
  messages: Message[];
  isGenerating: boolean;
  isIngestingMemory: boolean;
  drafts: Record<string, string>;
  
  setConversations: (convs: Conversation[] | ((prev: Conversation[]) => Conversation[])) => void;
  setCurrentConvId: (id: string | null) => void;
  setMessages: (msgs: Message[] | ((prev: Message[]) => Message[])) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setIsIngestingMemory: (isIngesting: boolean) => void;
  setDraft: (convId: string | null, draft: string) => void;
  
  loadConversations: () => Promise<void>;
  loadMessages: (convId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConvId: null,
  messages: [],
  isGenerating: false,
  isIngestingMemory: false,
  drafts: {},

  setConversations: (convs) => set((state) => ({ 
    conversations: typeof convs === 'function' ? convs(state.conversations) : convs 
  })),
  setCurrentConvId: (id) => set({ currentConvId: id }),
  setMessages: (msgs) => set((state) => ({ 
    messages: typeof msgs === 'function' ? msgs(state.messages) : msgs 
  })),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setIsIngestingMemory: (isIngestingMemory) => set({ isIngestingMemory }),
  setDraft: (convId, draft) => set((state) => ({ 
    drafts: { ...state.drafts, [convId || 'new']: draft } 
  })),

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
