export interface IImageProvider {
  generateImage(prompt: string, apiKey: string): Promise<string>;
}

class JimengProvider implements IImageProvider {
  async generateImage(prompt: string, apiKey: string): Promise<string> {
    console.log(`[JimengProvider] Generating image with prompt: ${prompt}`);
    // Using pollinations.ai as a reliable fallback/mock for the demo to ensure images are actually generated
    // In a production environment, this would use the actual Volcengine Jimeng SDK/API with AK/SK.
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API latency
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;
  }
}

export class ImageProviderFactory {
  static getProvider(name: string): IImageProvider {
    switch (name.toLowerCase()) {
      case 'jimeng':
        return new JimengProvider();
      default:
        return new JimengProvider();
    }
  }
}
