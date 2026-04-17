import { ILLMProvider, ChatMessage, ChatOptions } from './ILLMProvider.js';

export class DeepSeekProvider implements ILLMProvider {
  private baseUrl: string;

  constructor(baseUrl: string = "https://api.deepseek.com/chat/completions") {
    this.baseUrl = baseUrl;
  }

  async chat(messages: ChatMessage[], options: ChatOptions, apiKey: string): Promise<string> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: options.model || "deepseek-chat",
        messages,
        temperature: options.temperature,
        max_tokens: options.max_tokens,
        stream: false,
        response_format: options.response_format
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }

  async streamChat(
    messages: ChatMessage[], 
    options: ChatOptions, 
    apiKey: string, 
    onChunk: (chunk: string) => void,
    onUsage?: (usage: any) => void
  ): Promise<void> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: options.model || "deepseek-chat",
        messages,
        temperature: options.temperature,
        max_tokens: options.max_tokens,
        stream: true,
        stream_options: options.stream_options
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} ${errText}`);
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.trim() === '') continue;
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') continue;
          
          try {
            const data = JSON.parse(dataStr);
            if (data.usage && onUsage) {
              onUsage(data.usage);
            }
            if (data.choices && data.choices.length > 0) {
              const delta = data.choices[0].delta;
              if (delta.content) {
                onChunk(delta.content);
              }
            }
          } catch (e) {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    }
  }
}
