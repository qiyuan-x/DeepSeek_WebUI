export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  stream_options?: any;
  response_format?: any;
  isThinkingMode?: boolean;
  reasoningEffort?: 'high' | 'max';
}

export interface ILLMProvider {
  chat(messages: ChatMessage[], options: ChatOptions, apiKey: string): Promise<{ content: string, usage?: any }>;
  streamChat(
    messages: ChatMessage[], 
    options: ChatOptions, 
    apiKey: string, 
    onChunk: (chunk: string, reasoningChunk?: string | null) => void,
    onUsage?: (usage: any) => void
  ): Promise<void>;
}
