import express from "express";
import { ImageProviderFactory } from "../providers/image/ImageProviderFactory.js";

const router = express.Router();

router.post("/extract-prompt", async (req, res) => {
  const { text, apiKey } = req.body;
  const finalApiKey = apiKey || process.env.DEEPSEEK_API_KEY;
  if (!finalApiKey) return res.status(400).json({ error: "API Key required" });

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${finalApiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { 
            role: "system", 
            content: "You are an expert AI image prompt engineer. Extract the core visual elements from the user's text and create a highly detailed, descriptive image generation prompt in English. Maximum 120 words. Only output the prompt, nothing else." 
          },
          { role: "user", content: text }
        ]
      })
    });
    
    if (!response.ok) {
      throw new Error(`DeepSeek API Error: ${response.status}`);
    }

    const data = await response.json();
    const prompt = data.choices[0].message.content.trim();
    res.json({ prompt });
  } catch (error: any) {
    console.error("Extract Prompt Error:", error);
    res.status(500).json({ error: error.message || "Failed to extract prompt" });
  }
});

router.post("/generate-image", async (req, res) => {
  const { prompt, provider, apiKey } = req.body;
  try {
    const imageProvider = ImageProviderFactory.getProvider(provider);
    const imageUrl = await imageProvider.generateImage(prompt, apiKey);
    res.json({ imageUrl });
  } catch (error: any) {
    console.error("Generate Image Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate image" });
  }
});

export default router;
