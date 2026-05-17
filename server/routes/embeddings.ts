import express from "express";
import { pipeline, env } from "@xenova/transformers";
import path from "path";
import { DATA_DIR } from "../config.js";

const router = express.Router();

let extractor: any = null;
let isModelLoading = false;
let downloadProgressData: any = null;

// Initialize the model lazily
async function getExtractor(modelName = "Xenova/all-MiniLM-L6-v2") {
  if (extractor && extractor._modelName === modelName) return extractor;
  if (!isModelLoading) {
    isModelLoading = true;
    downloadProgressData = null;
    try {
      // Set the cache directory to be within the app's data directory so users can find it easily
      env.cacheDir = path.join(DATA_DIR, "models");

      const p = pipeline as any;
      const newExtractor = await p("feature-extraction", modelName, {
        quantized: true, // Use quantized format for lighter memory usage
        progress_callback: (x: any) => {
          downloadProgressData = x;
        }
      });
      extractor = newExtractor;
      extractor._modelName = modelName;
      console.log("Local embedding model loaded successfully.");
    } catch (e) {
      console.error("Failed to load local embedding model:", e);
      throw e;
    } finally {
      isModelLoading = false;
    }
  } else {
    // Wait for it to finish loading
    while (isModelLoading) {
      await new Promise(r => setTimeout(r, 100));
    }
  }
  return extractor;
}

router.get("/embeddings/local/status", (req, res) => {
  const queryModel = req.query.model as string;
  const isInstalled = !!extractor && (!queryModel || extractor._modelName === queryModel);
  res.json({ installed: isInstalled, loading: isModelLoading, progress: downloadProgressData });
});

router.post("/embeddings/local/install", async (req, res) => {
  const { modelName } = req.body;
  if (extractor && (!modelName || extractor._modelName === modelName)) {
    return res.json({ success: true, message: "Already installed" });
  }
  try {
    await getExtractor(modelName || "Xenova/all-MiniLM-L6-v2");
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const handleEmbeddings = async (req: express.Request, res: express.Response) => {
  const { input, model } = req.body;
  if (!input) {
    return res.status(400).json({ error: "Input text is required" });
  }
  // Allow auto-loading the model: removing the 400 error return
  // if (!extractor && !isModelLoading) {
  //   return res.status(400).json({ error: "Local embedding model not installed yet." });
  // }

  try {
    const ext = await getExtractor(model || "Xenova/all-MiniLM-L6-v2");
    
    // Handle both single string and array of strings
    const texts = Array.isArray(input) ? input : [input];
    
    // Generate embeddings
    const output = await ext(texts, { pooling: 'mean', normalize: true });
    
    // Convert to regular arrays
    const embeddings = output.tolist();
    
    // Format response to be compatible with OpenAI embeddings so powerMem can use it
    const formattedData = embeddings.map((embedding: number[], index: number) => ({
      object: "embedding",
      embedding,
      index
    }));

    res.json({
      object: "list",
      data: formattedData,
      model: model || "Xenova/all-MiniLM-L6-v2",
      usage: {
        prompt_tokens: 0,
        total_tokens: 0
      }
    });
  } catch (error: any) {
    console.error("Local embedding generation failed:", error);
    res.status(500).json({ error: "Local embedding generation failed: " + error.message });
  }
};

router.post("/embeddings/local", handleEmbeddings);
router.post("/embeddings", handleEmbeddings); // Alias for powermem standard OpenAI SDK calls

export default router;

