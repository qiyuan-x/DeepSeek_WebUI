import { ILLMProvider } from './ILLMProvider.js';
import { DeepSeekProvider } from './DeepSeekProvider.js';
import { OpenAIProvider } from './OpenAIProvider.js';

export class LLMProviderFactory {
  static getProvider(providerName: string, baseUrl?: string): ILLMProvider {
    const validBaseUrl = typeof baseUrl === 'string' && baseUrl.trim().length > 0 ? baseUrl : undefined;

    switch (providerName.toLowerCase()) {
      case 'deepseek':
        return new DeepSeekProvider(validBaseUrl);
      case 'openai':
      case 'custom':
        return new OpenAIProvider(validBaseUrl || 'https://api.openai.com/v1/chat/completions');
      case 'zhipuai':
        return new OpenAIProvider(validBaseUrl || 'https://open.bigmodel.cn/api/paas/v4/chat/completions');
      case 'dashscope':
        return new OpenAIProvider(validBaseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions');
      case 'local':
        return new OpenAIProvider(validBaseUrl || 'http://127.0.0.1:11434/v1/chat/completions');
      default:
        // Use OpenAIProvider as a generic fallback for OpenAI-compatible APIs
        return new OpenAIProvider(baseUrl);
    }
  }
}
