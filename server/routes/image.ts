import express from "express";
import { ImageProviderFactory } from "../providers/image/ImageProviderFactory.js";
import { LLMProviderFactory } from "../providers/llm/LLMProviderFactory.js";
import { apiKeyMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.post("/extract-prompt", apiKeyMiddleware, async (req, res) => {
  const { text, isReasoning, preference, provider, baseUrl, model } = req.body;
  const finalProvider = provider || 'deepseek';
  const finalApiKey = res.locals.apiKey;

  let systemContent = `You are an expert AI image prompt engineer. Extract the core visual elements from the user's text and create a highly detailed, descriptive image generation prompt in English. Maximum 120 words. Only output the prompt, nothing else.${preference ? `\n\nUser Preference / Instruction: ${preference}` : ''}`;

  try {
    const llmProvider = LLMProviderFactory.getProvider(finalProvider, baseUrl);
    let finalModel = model;
    let enableThinking = isReasoning;
    
    if (finalProvider === 'deepseek') {
        finalModel = isReasoning ? "deepseek-reasoner" : "deepseek-v4-flash";
    } else if (finalProvider === 'zhipuai') {
        finalModel = finalModel || 'glm-4-plus';
        enableThinking = false;
        if (isReasoning) systemContent += "\n\nPlease think step-by-step before answering.";
    } else if (finalProvider === 'openai') {
        finalModel = isReasoning ? "o3-mini" : (finalModel || "gpt-4o-mini");
        if (finalModel !== "o1" && finalModel !== "o3-mini") {
           enableThinking = false;
           if (isReasoning) systemContent += "\n\nPlease think step-by-step before answering.";
        }
    } else {
        enableThinking = false;
        if (isReasoning) systemContent += "\n\nPlease think step-by-step before answering.";
    }

    const { content, usage } = await llmProvider.chat([
      { role: "system", content: systemContent },
      { role: "user", content: text }
    ], {
      model: finalModel,
      isThinkingMode: enableThinking,
      reasoningEffort: "high",
      temperature: 0.7,
      max_tokens: 1500
    }, finalApiKey);

    res.json({ prompt: content.trim(), usage });
  } catch (error: any) {
    console.error("Extract Prompt Error:", error);
    res.status(500).json({ error: error.message || "Failed to extract prompt" });
  }
});

router.post("/translate-prompt", apiKeyMiddleware, async (req, res) => {
  const { text, isReasoning, provider, baseUrl, model } = req.body;
  const finalProvider = provider || 'deepseek';
  const finalApiKey = res.locals.apiKey;

  let systemContent = "Translate the provided text to Chinese straightforwardly. Only output the exact translation, nothing else.";

  try {
    const llmProvider = LLMProviderFactory.getProvider(finalProvider, baseUrl);
    let finalModel = model;
    let enableThinking = isReasoning;
    
    if (finalProvider === 'deepseek') {
        finalModel = isReasoning ? "deepseek-reasoner" : "deepseek-v4-flash";
    } else if (finalProvider === 'zhipuai') {
        finalModel = finalModel || 'glm-4-plus';
        enableThinking = false;
        if (isReasoning) systemContent += "\n\nPlease think step-by-step before answering.";
    } else if (finalProvider === 'openai') {
        finalModel = isReasoning ? "o3-mini" : (finalModel || "gpt-4o-mini");
        if (finalModel !== "o1" && finalModel !== "o3-mini") {
           enableThinking = false;
           if (isReasoning) systemContent += "\n\nPlease think step-by-step before answering.";
        }
    } else {
        enableThinking = false;
        if (isReasoning) systemContent += "\n\nPlease think step-by-step before answering.";
    }

    const { content, usage } = await llmProvider.chat([
      { role: "system", content: systemContent },
      { role: "user", content: text }
    ], {
      model: finalModel,
      isThinkingMode: enableThinking,
      reasoningEffort: "high",
      temperature: 0.3,
      max_tokens: 1500
    }, finalApiKey);

    res.json({ prompt: content.trim(), usage });
  } catch (error: any) {
    console.error("Translate Prompt Error:", error);
    res.status(500).json({ error: error.message || "Failed to translate prompt" });
  }
});

router.post("/reverse-translate-prompt", apiKeyMiddleware, async (req, res) => {
  const { text, isReasoning, provider, baseUrl, model } = req.body;
  const finalProvider = provider || 'deepseek';
  const finalApiKey = res.locals.apiKey;

  let systemContent = "Translate the provided Chinese text to an English image generation prompt. Maintain the descriptive nature and comma-separated visual keywords if applicable. Only output the exact English translation, nothing else.";

  try {
    const llmProvider = LLMProviderFactory.getProvider(finalProvider, baseUrl);
    let finalModel = model;
    let enableThinking = isReasoning;
    
    if (finalProvider === 'deepseek') {
        finalModel = isReasoning ? "deepseek-reasoner" : "deepseek-v4-flash";
    } else if (finalProvider === 'zhipuai') {
        finalModel = finalModel || 'glm-4-plus';
        enableThinking = false;
        if (isReasoning) systemContent += "\n\nPlease think step-by-step before answering.";
    } else if (finalProvider === 'openai') {
        finalModel = isReasoning ? "o3-mini" : (finalModel || "gpt-4o-mini");
        if (finalModel !== "o1" && finalModel !== "o3-mini") {
           enableThinking = false;
           if (isReasoning) systemContent += "\n\nPlease think step-by-step before answering.";
        }
    } else {
        enableThinking = false;
        if (isReasoning) systemContent += "\n\nPlease think step-by-step before answering.";
    }

    const { content, usage } = await llmProvider.chat([
      { role: "system", content: systemContent },
      { role: "user", content: text }
    ], {
      model: finalModel,
      isThinkingMode: enableThinking,
      reasoningEffort: "high",
      temperature: 0.7,
      max_tokens: 1500
    }, finalApiKey);

    res.json({ prompt: content.trim(), usage });
  } catch (error: any) {
    console.error("Reverse Translate Prompt Error:", error);
    res.status(500).json({ error: error.message || "Failed to reverse translate prompt" });
  }
});

router.post("/generate-image", apiKeyMiddleware, async (req, res) => {
  const { prompt, provider, model } = req.body;
  const apiKey = res.locals.apiKey;
  try {
    const imageProvider = ImageProviderFactory.getProvider(provider);
    const imageUrl = await imageProvider.generateImage(prompt, apiKey, model);
    res.json({ imageUrl });
  } catch (error: any) {
    console.error("Generate Image Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate image" });
  }
});

export default router;
