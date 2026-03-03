import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DEEPSEEK_MODELS = [
  { id: "deepseek-chat", name: "DeepSeek-V3 (对话)", description: "通用对话模型" },
  { id: "deepseek-reasoner", name: "DeepSeek-R1 (推理)", description: "深度思考与逻辑推理" },
];

export const PRICING = {
  "deepseek-chat": {
    input: 0.001, // per 1k tokens
    output: 0.002,
    currency: "CNY"
  },
  "deepseek-reasoner": {
    input: 0.004,
    output: 0.016,
    currency: "CNY"
  }
};

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  reasoning_content?: string;
  tokens?: number;
  cost?: number;
  created_at?: string;
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
  temperature: number;
  memory?: string;
  summarized_count?: number;
  created_at: string;
  updated_at: string;
}
