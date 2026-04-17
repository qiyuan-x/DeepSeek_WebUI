import { ILLMProvider } from './ILLMProvider.js';
import { DeepSeekProvider } from './DeepSeekProvider.js';
import { OpenAIProvider } from './OpenAIProvider.js';

export class LLMProviderFactory {
  static getProvider(providerName: string, baseUrl?: string): ILLMProvider {
    switch (providerName.toLowerCase()) {
      case 'deepseek':
        return new DeepSeekProvider(baseUrl);
      case 'openai':
      case 'custom':
      case 'zhipuai':
        return new OpenAIProvider(baseUrl || 'https://open.bigmodel.cn/api/paas/v4/chat/completions');
      // Add more providers here later (e.g., claude)
      default:
        // Use OpenAIProvider as a generic fallback for OpenAI-compatible APIs
        return new OpenAIProvider(baseUrl);
    }
  }
}
