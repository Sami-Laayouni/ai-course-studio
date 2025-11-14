/**
 * Simplified AI Helper Functions
 * 
 * These functions provide a simple interface for common AI tasks
 * using the centralized AI configuration from lib/ai-config.ts
 */

import { getAI, getModelName, getDefaultConfig, requireAIConfiguration } from "./ai-config";

/**
 * Generates text content from the AI model.
 * @param prompt The text prompt for the AI.
 * @param configOverrides Optional configuration overrides for the AI model.
 * @returns The generated text.
 */
export async function generateText(
  prompt: string,
  configOverrides?: Partial<ReturnType<typeof getDefaultConfig>>
): Promise<string> {
  requireAIConfiguration();
  const ai = getAI();
  const config = { ...getDefaultConfig(), ...configOverrides };

  const response = await ai.models.generateContent({
    model: getModelName(),
    config,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  return extractTextFromResponse(response);
}

/**
 * Generates streaming text content from the AI model.
 * @param prompt The text prompt for the AI.
 * @param configOverrides Optional configuration overrides for the AI model.
 * @returns An async iterable of text chunks.
 */
export async function* generateTextStream(
  prompt: string,
  configOverrides?: Partial<ReturnType<typeof getDefaultConfig>>
): AsyncIterable<string> {
  requireAIConfiguration();
  const ai = getAI();
  const config = { ...getDefaultConfig(), ...configOverrides };

  const streamingResponse = await ai.models.generateContentStream({
    model: getModelName(),
    config,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  for await (const chunk of streamingResponse.stream) {
    yield extractTextFromResponse(chunk);
  }
}

/**
 * Generates JSON content from the AI model.
 * @param prompt The text prompt for the AI.
 * @param configOverrides Optional configuration overrides for the AI model.
 * @returns The parsed JSON object.
 */
export async function generateJSON<T>(
  prompt: string,
  configOverrides?: Partial<ReturnType<typeof getDefaultConfig>>
): Promise<T> {
  requireAIConfiguration();
  const ai = getAI();
  const config = {
    ...getDefaultConfig(),
    responseMimeType: "application/json" as const,
    ...configOverrides,
  };

  const response = await ai.models.generateContent({
    model: getModelName(),
    config,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const text = extractTextFromResponse(response);
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    console.error("Failed to parse JSON from AI response:", text, error);
    throw new Error("Invalid JSON response from AI");
  }
}

/**
 * Extracts text from various possible AI response structures.
 * @param response The AI response object.
 * @returns The extracted text.
 */
function extractTextFromResponse(response: any): string {
  if (typeof response.outputText === "function") {
    return response.outputText();
  }
  if (response.outputText) {
    return response.outputText;
  }
  if (response.text) {
    return typeof response.text === "function" ? response.text() : response.text;
  }
  // Fallback for stream chunks or other structures
  const candidate = response?.candidates?.[0];
  const parts = candidate?.content?.parts || [];
  return parts.map((p: any) => p.text).filter(Boolean).join("\n");
}
