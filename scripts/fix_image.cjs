const fs = require('fs');

let text = fs.readFileSync('server/routes/image.ts', 'utf8');

const importStatement = `import express from "express";
import { ImageProviderFactory } from "../providers/image/ImageProviderFactory.js";
import { LLMProviderFactory } from "../providers/llm/LLMProviderFactory.js";`;

text = text.replace(`import express from "express";
import { ImageProviderFactory } from "../providers/image/ImageProviderFactory.js";`, importStatement);

const route1 = `router.post("/extract-prompt", async (req, res) => {
  const { text, apiKey, isReasoning, preference } = req.body;
  const finalApiKey = apiKey || process.env.DEEPSEEK_API_KEY;
  if (!finalApiKey) return res.status(400).json({ error: "API Key required" });

  const systemContent = \`You are an expert AI image prompt engineer. Extract the core visual elements from the user's text and create a highly detailed, descriptive image generation prompt in English. Maximum 120 words. Only output the prompt, nothing else.\${preference ? \`\\n\\nUser Preference / Instruction: \${preference}\` : ''}\`;

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: \`Bearer \${finalApiKey}\`,
      },
      body: JSON.stringify({
        model: isReasoning ? "deepseek-reasoner" : "deepseek-v4-flash",
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: text }
        ]
      })
    });
    
    if (!response.ok) {
      throw new Error(\`DeepSeek API Error: \${response.status}\`);
    }

    const data = await response.json();
    const prompt = data.choices[0].message.content.trim();
    res.json({ prompt, usage: data.usage });
  } catch (error: any) {
    console.error("Extract Prompt Error:", error);
    res.status(500).json({ error: error.message || "Failed to extract prompt" });
  }
});`;

const replace1 = `router.post("/extract-prompt", async (req, res) => {
  const { text, apiKey, isReasoning, preference, provider, baseUrl, model } = req.body;
  const finalProvider = provider || 'deepseek';
  const finalApiKey = apiKey || (finalProvider === 'deepseek' ? process.env.DEEPSEEK_API_KEY : '');
  if (!finalApiKey) return res.status(400).json({ error: "API Key required for " + finalProvider });

  let systemContent = \`You are an expert AI image prompt engineer. Extract the core visual elements from the user's text and create a highly detailed, descriptive image generation prompt in English. Maximum 120 words. Only output the prompt, nothing else.\${preference ? \`\\n\\nUser Preference / Instruction: \${preference}\` : ''}\`;

  try {
    const llmProvider = LLMProviderFactory.getProvider(finalProvider, baseUrl);
    let finalModel = model;
    let enableThinking = isReasoning;
    
    if (finalProvider === 'deepseek') {
        finalModel = isReasoning ? "deepseek-reasoner" : "deepseek-v4-flash";
    } else if (finalProvider === 'zhipuai') {
        finalModel = finalModel || 'glm-4-plus';
        enableThinking = false;
        if (isReasoning) systemContent += "\\n\\nPlease think step-by-step before answering.";
    } else if (finalProvider === 'openai') {
        finalModel = isReasoning ? "o3-mini" : (finalModel || "gpt-4o-mini");
        if (finalModel !== "o1" && finalModel !== "o3-mini") {
           enableThinking = false;
           if (isReasoning) systemContent += "\\n\\nPlease think step-by-step before answering.";
        }
    } else {
        enableThinking = false;
        if (isReasoning) systemContent += "\\n\\nPlease think step-by-step before answering.";
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
});`;

text = text.replace(route1, replace1);

const route2 = `router.post("/translate-prompt", async (req, res) => {
  const { text, apiKey, isReasoning } = req.body;
  const finalApiKey = apiKey || process.env.DEEPSEEK_API_KEY;
  if (!finalApiKey) return res.status(400).json({ error: "API Key required" });

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: \`Bearer \${finalApiKey}\`,
      },
      body: JSON.stringify({
        model: isReasoning ? "deepseek-reasoner" : "deepseek-v4-flash",
        messages: [
          { 
            role: "system", 
            content: "Translate the provided text to Chinese straightforwardly. Only output the exact translation, nothing else." 
          },
          { role: "user", content: text }
        ]
      })
    });
    
    if (!response.ok) {
      throw new Error(\`DeepSeek API Error: \${response.status}\`);
    }

    const data = await response.json();
    const prompt = data.choices[0].message.content.trim();
    res.json({ prompt, usage: data.usage });
  } catch (error: any) {
    console.error("Translate Prompt Error:", error);
    res.status(500).json({ error: error.message || "Failed to translate prompt" });
  }
});`;

const replace2 = `router.post("/translate-prompt", async (req, res) => {
  const { text, apiKey, isReasoning, provider, baseUrl, model } = req.body;
  const finalProvider = provider || 'deepseek';
  const finalApiKey = apiKey || (finalProvider === 'deepseek' ? process.env.DEEPSEEK_API_KEY : '');
  if (!finalApiKey) return res.status(400).json({ error: "API Key required for " + finalProvider });

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
        if (isReasoning) systemContent += "\\n\\nPlease think step-by-step before answering.";
    } else if (finalProvider === 'openai') {
        finalModel = isReasoning ? "o3-mini" : (finalModel || "gpt-4o-mini");
        if (finalModel !== "o1" && finalModel !== "o3-mini") {
           enableThinking = false;
           if (isReasoning) systemContent += "\\n\\nPlease think step-by-step before answering.";
        }
    } else {
        enableThinking = false;
        if (isReasoning) systemContent += "\\n\\nPlease think step-by-step before answering.";
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
});`;

text = text.replace(route2, replace2);

const route3 = `router.post("/reverse-translate-prompt", async (req, res) => {
  const { text, apiKey, isReasoning } = req.body;
  const finalApiKey = apiKey || process.env.DEEPSEEK_API_KEY;
  if (!finalApiKey) return res.status(400).json({ error: "API Key required" });

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: \`Bearer \${finalApiKey}\`,
      },
      body: JSON.stringify({
        model: isReasoning ? "deepseek-reasoner" : "deepseek-v4-flash",
        messages: [
          { 
            role: "system", 
            content: "Translate the provided Chinese text to an English image generation prompt. Maintain the descriptive nature and comma-separated visual keywords if applicable. Only output the exact English translation, nothing else." 
          },
          { role: "user", content: text }
        ]
      })
    });
    
    if (!response.ok) {
      throw new Error(\`DeepSeek API Error: \${response.status}\`);
    }

    const data = await response.json();
    const prompt = data.choices[0].message.content.trim();
    res.json({ prompt, usage: data.usage });
  } catch (error: any) {
    console.error("Reverse Translate Prompt Error:", error);
    res.status(500).json({ error: error.message || "Failed to reverse translate prompt" });
  }
});`;

const replace3 = `router.post("/reverse-translate-prompt", async (req, res) => {
  const { text, apiKey, isReasoning, provider, baseUrl, model } = req.body;
  const finalProvider = provider || 'deepseek';
  const finalApiKey = apiKey || (finalProvider === 'deepseek' ? process.env.DEEPSEEK_API_KEY : '');
  if (!finalApiKey) return res.status(400).json({ error: "API Key required for " + finalProvider });

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
        if (isReasoning) systemContent += "\\n\\nPlease think step-by-step before answering.";
    } else if (finalProvider === 'openai') {
        finalModel = isReasoning ? "o3-mini" : (finalModel || "gpt-4o-mini");
        if (finalModel !== "o1" && finalModel !== "o3-mini") {
           enableThinking = false;
           if (isReasoning) systemContent += "\\n\\nPlease think step-by-step before answering.";
        }
    } else {
        enableThinking = false;
        if (isReasoning) systemContent += "\\n\\nPlease think step-by-step before answering.";
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
});`;

text = text.replace(route3, replace3);

fs.writeFileSync('server/routes/image.ts', text);
console.log("image.ts rewritten");
