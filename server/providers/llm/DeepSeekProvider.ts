import OpenAI from "openai";
import { ILLMProvider, ChatMessage, ChatOptions } from './ILLMProvider.js';

export class DeepSeekProvider implements ILLMProvider {
  private baseUrl: string;

  constructor(baseUrl: string = "https://api.deepseek.com") {
    // OpenAI client expects baseURL without /chat/completions
    this.baseUrl = baseUrl.replace(/\/chat\/completions$/, '');
  }

  async chat(messages: ChatMessage[], options: ChatOptions, apiKey: string): Promise<{ content: string; usage?: any }> {
    const openai = new OpenAI({ apiKey, baseURL: this.baseUrl });
    
    const requestBody: any = {
      model: options.model || "deepseek-chat",
      messages: messages as any,
      temperature: options.temperature,
      max_tokens: options.max_tokens,
      response_format: options.response_format
    };

    if (options.isThinkingMode !== undefined) {
      if (options.isThinkingMode) {
        requestBody.thinking = { type: "enabled" };
        if (options.reasoningEffort) {
          requestBody.reasoning_effort = options.reasoningEffort;
        }
      } else {
        requestBody.thinking = { type: "disabled" };
      }
    }

    const response = await openai.chat.completions.create(requestBody);
    const message = response.choices[0].message as any;
    const content = message.content || message.reasoning_content || "";
    return { content, usage: response.usage };
  }

  async streamChat(
    messages: ChatMessage[], 
    options: ChatOptions, 
    apiKey: string, 
    onChunk: (chunk: string, reasoningChunk?: string | null) => void,
    onUsage?: (usage: any) => void
  ): Promise<void> {
    const openai = new OpenAI({ apiKey, baseURL: this.baseUrl });
    
    const requestBody: any = {
      model: options.model || "deepseek-chat",
      messages: messages as any,
      temperature: options.temperature,
      max_tokens: options.max_tokens,
      stream: true,
      stream_options: options.stream_options
    };

    if (options.isThinkingMode !== undefined) {
      if (options.isThinkingMode) {
        requestBody.thinking = { type: "enabled" };
        if (options.reasoningEffort) {
          requestBody.reasoning_effort = options.reasoningEffort;
        }
      } else {
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

