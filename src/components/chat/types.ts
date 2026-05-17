import { Message } from '../../types';

export interface ChatMessageProps {
  msg: Message;
  index: number;
  isLastMessage: boolean;
  theme: string;
  isPaintingEnabled: boolean;
  userAvatar: string | null;
  aiAvatar: string | null;
  userName: string;
  aiName: string;
  showMessageMeta: boolean;
  isStoryMode: boolean;
  content: string;
  reasoning: string;
  handleExtractPrompt: (msg: Message) => void;
  setStoryDiscussionOpen: (open: boolean) => void;
}
