import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn(
    "[Gemini] VITE_GEMINI_API_KEY is not set. AI features will be disabled."
  );
}

export const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export const getGeminiModel = (modelName: string = "gemini-2.5-flash") => {
  if (!genAI) {
    console.warn("[Gemini] API key not configured. Returning null.");
    return null;
  }
  
  // Try models in order of preference
  // Note: gemini-2.5-flash is the latest fast and cost-effective model
  const modelsToTry = [
    modelName,
    "gemini-2.5-flash",   // Latest fast model (recommended)
    "gemini-2.0-flash",   // Previous fast model
    "gemini-2.5-pro",     // More capable but slower
    "gemini-2.0-flash-001", // Stable version
  ];
  
  // Remove duplicates
  const uniqueModels = [...new Set(modelsToTry)];
  
  for (const model of uniqueModels) {
    try {
      const modelInstance = genAI.getGenerativeModel({ model });
      // Test if model is accessible (doesn't throw immediately)
      return modelInstance;
    } catch (error: any) {
      // Only log if it's not a 404 (which means model doesn't exist)
      if (!error.message?.includes("404") && !error.message?.includes("not found")) {
        console.warn(`[Gemini] Model ${model} error:`, error.message);
      }
      continue;
    }
  }
  
  console.warn("[Gemini] No available models found, AI features will use fallbacks");
  return null;
};
