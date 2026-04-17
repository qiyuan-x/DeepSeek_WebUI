import { create } from 'zustand';
import { Message } from '../types';

interface StoryState {
  isStoryMode: boolean;
  isTransitioning: boolean;
  isExitingStoryMode: boolean;
  nextPlotGuidance: string;
  discussionMessages: Message[];
  
  setIsStoryMode: (isStoryMode: boolean) => void;
  setIsTransitioning: (isTransitioning: boolean) => void;
  setIsExitingStoryMode: (isExitingStoryMode: boolean) => void;
  setNextPlotGuidance: (guidance: string) => void;
  setDiscussionMessages: (msgs: Message[] | ((prev: Message[]) => Message[])) => void;
}

export const useStoryStore = create<StoryState>((set) => ({
  isStoryMode: false,
  isTransitioning: false,
  isExitingStoryMode: false,
  nextPlotGuidance: "",
  discussionMessages: [],

  setIsStoryMode: (isStoryMode) => set({ isStoryMode }),
  setIsTransitioning: (isTransitioning) => set({ isTransitioning }),
  setIsExitingStoryMode: (isExitingStoryMode) => set({ isExitingStoryMode }),
  setNextPlotGuidance: (nextPlotGuidance) => set({ nextPlotGuidance }),
  setDiscussionMessages: (msgs) => set((state) => ({
    discussionMessages: typeof msgs === 'function' ? msgs(state.discussionMessages) : msgs
  })),
}));
