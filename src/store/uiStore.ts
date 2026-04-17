import { create } from 'zustand';

interface UIState {
  isSidebarOpen: boolean;
  isSettingsOpen: boolean;
  isMemoryOpen: boolean;
  isStorySetupOpen: boolean;
  isStoryDiscussionOpen: boolean;
  isPromptDialogOpen: boolean;
  activeSettingsTab: 'api' | 'theme' | 'templates' | 'memory' | 'advanced' | 'help';
  memoryTab: 'profile' | 'summary' | 'other';
  
  setSidebarOpen: (isOpen: boolean | ((prev: boolean) => boolean)) => void;
  setSettingsOpen: (isOpen: boolean) => void;
  setMemoryOpen: (isOpen: boolean) => void;
  setStorySetupOpen: (isOpen: boolean) => void;
  setStoryDiscussionOpen: (isOpen: boolean) => void;
  setPromptDialogOpen: (isOpen: boolean) => void;
  setActiveSettingsTab: (tab: 'api' | 'theme' | 'templates' | 'advanced' | 'help') => void;
  setMemoryTab: (tab: 'profile' | 'summary' | 'other') => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: window.innerWidth >= 768,
  isSettingsOpen: false,
  isMemoryOpen: false,
  isStorySetupOpen: false,
  isStoryDiscussionOpen: false,
  isPromptDialogOpen: false,
  activeSettingsTab: 'api',
  memoryTab: 'profile',

  setSidebarOpen: (isOpen) => set((state) => ({ 
    isSidebarOpen: typeof isOpen === 'function' ? isOpen(state.isSidebarOpen) : isOpen 
  })),
  setSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),
  setMemoryOpen: (isOpen) => set({ isMemoryOpen: isOpen }),
  setStorySetupOpen: (isOpen) => set({ isStorySetupOpen: isOpen }),
  setStoryDiscussionOpen: (isOpen) => set({ isStoryDiscussionOpen: isOpen }),
  setPromptDialogOpen: (isOpen) => set({ isPromptDialogOpen: isOpen }),
  setActiveSettingsTab: (tab) => set({ activeSettingsTab: tab }),
  setMemoryTab: (tab) => set({ memoryTab: tab }),
}));
