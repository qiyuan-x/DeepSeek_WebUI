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
}

export interface ILLMProvider {
  chat(messages: ChatMessage[], options: ChatOptions, apiKey: string): Promise<string>;
  streamChat(
    messages: ChatMessage[], 
    options: ChatOptions, 
    apiKey: string, 
    onChunk: (chunk: string) => void,
    onUsage?: (usage: any) => void
  ): Promise<void>;
}
