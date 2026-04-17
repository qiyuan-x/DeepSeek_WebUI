import { ILLMProvider } from './ILLMProvider.js';

export class OpenAIProvider implements ILLMProvider {
  private baseUrl: string;

  constructor(baseUrl: string = 'https://api.openai.com/v1/chat/completions') {
    this.baseUrl = baseUrl;
  }

  async chat(messages: any[], options: any, apiKey: string): Promise<string> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: options.model || 'gpt-4o',
        messages,
        temperature: options.temperature,
        max_tokens: options.max_tokens,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API Error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async streamChat(
    messages: any[],
    options: any,
    apiKey: string,
    onChunk: (chunk: string) => void,
    onUsage?: (usage: any) => void
  ): Promise<void> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: options.model || 'gpt-4o',
        messages,
        temperature: options.temperature,
        max_tokens: options.max_tokens,
        stream: true,
        stream_options: options.stream_options
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API Error: ${response.status} ${errorText}`);
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim() === "") continue;
        if (line.startsWith("data: ")) {
          const dataStr = line.slice(6).trim();
          if (dataStr === "[DONE]") continue;

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
            console.error("Error parsing stream data:", e, dataStr);
          }
        }
      }
    }
  }
}
