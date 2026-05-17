import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DEEPSEEK_MODELS = [
  { id: "deepseek-v4-flash", name: "DeepSeek V4-Flash (极速版)", description: "超快响应与经济型日常模型" },
  { id: "deepseek-v4-pro", name: "DeepSeek V4-Pro (专业版)", description: "强劲计算与前沿核心大模型" },
];

export const PRICING = {
  "deepseek-v4-flash": { input: 0.001, output: 0.002, currency: "CNY" },
  "deepseek-v4-pro": { input: 0.012, output: 0.024, currency: "CNY" }
};

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  reasoning_content?: string;
  tokens?: number;
  cost?: number;
  memory_cost?: number;
  memory_tokens?: number;
  response_time?: number;
  created_at?: string;
  imageUrl?: string;
  isGeneratingImage?: boolean;
  isExtractingPrompt?: boolean;
  extractedPrompt?: string;
  translatedPrompt?: string;
  painting_cost?: number;
  painting_tokens?: number;
  status?: 'cancelled' | 'error' | 'success' | 'generating';
  model?: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
}

export interface Conversation {
  id: string;
  title: string;
  system_prompt: string;
  model: string;
  provider?: string;
  temperature: number;
  created_at: string;
  updated_at: string;
  is_story_mode?: boolean;
  story_system_prompt?: string;
  desired_plot?: string;
  desired_characters?: string;
  is_thinking_mode?: boolean;
}
