export interface IImageProvider {
  generateImage(prompt: string, apiKey: string, model?: string): Promise<string>;
}

class JimengProvider implements IImageProvider {
  async generateImage(prompt: string, apiKey: string, model?: string): Promise<string> {
    console.log(`[JimengProvider] Generating image with prompt: ${prompt}`);
    // Using pollinations.ai as a reliable fallback/mock for the demo to ensure images are actually generated
    // In a production environment, this would use the actual Volcengine Jimeng SDK/API with AK/SK.
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API latency
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;
  }
}

class ZhipuAIImageProvider implements IImageProvider {
  async generateImage(prompt: string, apiKey: string, model: string = "cogview-3-plus"): Promise<string> {
    if (!apiKey) throw new Error("API Key is required for ZhipuAI Image Generation");
    console.log(`[ZhipuAIImageProvider] Generating image with prompt: ${prompt}, model: ${model}`);
    
    const response = await fetch("https://open.bigmodel.cn/api/paas/v4/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ZhipuAI error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    if (data.data && data.data.length > 0 && data.data[0].url) {
      return data.data[0].url;
    }
    throw new Error("Failed to extract image url from response");
  }
}

export class ImageProviderFactory {
  static getProvider(name: string): IImageProvider {
    switch (name.toLowerCase()) {
      case 'jimeng':
        return new JimengProvider();
      case 'zhipuai':
        return new ZhipuAIImageProvider();
      default:
        return new JimengProvider();
    }
  }
}
