import OpenAI from "openai";
import { ILLMProvider } from './ILLMProvider.js';

export class OpenAIProvider implements ILLMProvider {
  private baseUrl: string;

  constructor(baseUrl: string = 'https://api.openai.com/v1') {
    this.baseUrl = baseUrl.replace(/\/chat\/completions$/, '');
  }

  async chat(messages: any[], options: any, apiKey: string): Promise<{ content: string, usage?: any }> {
    const openai = new OpenAI({ apiKey, baseURL: this.baseUrl });
    
    const requestBody: any = {
      model: options.model || 'gpt-4o',
      messages: messages as any,
      temperature: options.temperature,
      max_tokens: options.max_tokens,
      response_format: options.response_format
    };

    if (options.isThinkingMode !== undefined) {
      if (options.isThinkingMode) {
        requestBody.thinking = { type: "enabled" };
        requestBody.reasoning_effort = options.reasoningEffort || "high";
      } else if (options.model && typeof options.model === 'string' && options.model.toLowerCase().includes('deepseek')) {
        requestBody.thinking = { type: "disabled" };
      }
    }

    const response = await openai.chat.completions.create(requestBody);
    const message = response.choices[0].message as any;
    const content = message.content || message.reasoning_content || "";
    return { content, usage: response.usage };
  }

  async streamChat(
    messages: any[],
    options: any,
    apiKey: string,
    onChunk: (chunk: string, reasoningChunk?: string | null) => void,
    onUsage?: (usage: any) => void
  ): Promise<void> {
    const openai = new OpenAI({ apiKey, baseURL: this.baseUrl });
    
    const requestBody: any = {
      model: options.model || 'gpt-4o',
      messages: messages as any,
      temperature: options.temperature,
      max_tokens: options.max_tokens,
      stream: true,
      stream_options: options.stream_options
    };

    if (options.isThinkingMode !== undefined) {
      if (options.isThinkingMode) {
        requestBody.thinking = { type: "enabled" };
        requestBody.reasoning_effort = options.reasoningEffort || "high";
      } else if (options.model && typeof options.model === 'string' && options.model.toLowerCase().includes('deepseek')) {
        requestBody.thinking = { type: "disabled" };
      }
    }

    const stream = await openai.chat.completions.create(requestBody) as any;
    
    for await (const chunk of stream) {
      if (chunk.usage && onUsage) {
        onUsage(chunk.usage);
      }
      const delta = chunk.choices?.[0]?.delta as any;
      if (delta && (delta.content || delta.reasoning_content)) {
        onChunk(delta.content || '', delta.reasoning_content || null);
      }
    }
  }
}

