/**
 * AI Helper Functions
 * 
 * Provides convenient, standardized functions for common AI operations
 * All functions use the centralized model configuration from ai-config.ts
 */

import { ai, getModelName, getDefaultConfig, requireAIConfiguration } from "./ai-config";

/**
 * Generate content using the configured model
 * 
 * @param prompt - The prompt to send to the AI
 * @param options - Optional configuration overrides
 * @returns The generated text
 * 
 * @example
 * ```ts
 * const text = await generateText("Explain photosynthesis");
 * ```
 */
export async function generateText(
  prompt: string,
  options?: {
    maxTokens?: number;
    responseMimeType?: "text/plain" | "application/json";
    temperature?: number;
  }
): Promise<string> {
  requireAIConfiguration();

  const config = {
    ...getDefaultConfig(),
    ...options,
  };

  const response = await ai.models.generateContent({
    model: getModelName(),
    config,
    contents: prompt,
  });

  // Extract text from response
  let text = "";
  
  if (typeof (response as any).outputText === "function") {
    text = (response as any).outputText();
  } else if ((response as any).outputText) {
    text = (response as any).outputText;
  } else if (response.text) {
    text = typeof response.text === "function" ? response.text() : response.text;
  } else {
    // Fallback: extract from response structure
    const candidate = (response as any)?.response?.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    text = parts
      .map((p: any) => p.text)
      .filter(Boolean)
      .join("\n");
  }
  
  return text || "";
}

/**
 * Generate content as a stream
 * 
 * @param prompt - The prompt to send to the AI
 * @param options - Optional configuration overrides
 * @returns Async generator of text chunks
 * 
 * @example
 * ```ts
 * for await (const chunk of generateTextStream("Tell a story")) {
 *   console.log(chunk);
 * }
 * ```
 */
export async function* generateTextStream(
  prompt: string,
  options?: {
    maxTokens?: number;
    responseMimeType?: "text/plain" | "application/json";
    temperature?: number;
  }
): AsyncGenerator<string, void, unknown> {
  requireAIConfiguration();

  const config = {
    ...getDefaultConfig(),
    ...options,
  };

  const response = await ai.models.generateContentStream({
    model: getModelName(),
    config,
    contents: [
      {
        role: "user",
        text: prompt,
      },
    ],
  });

  for await (const chunk of response) {
    if (chunk.text) {
      yield chunk.text;
    }
  }
}

/**
 * Generate JSON content
 * 
 * @param prompt - The prompt to send to the AI
 * @param options - Optional configuration overrides
 * @returns Parsed JSON object
 * 
 * @example
 * ```ts
 * const data = await generateJSON("Return a JSON object with name and age");
 * ```
 */
export async function generateJSON<T = any>(
  prompt: string,
  options?: {
    maxTokens?: number;
    temperature?: number;
  }
): Promise<T> {
  const text = await generateText(prompt, {
    ...options,
    responseMimeType: "application/json",
  });

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    // Try to extract JSON from text if it's wrapped
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as T;
    }
    throw new Error(`Failed to parse JSON from AI response: ${text.substring(0, 100)}`);
  }
}

/**
 * Generate content with structured output
 * 
 * @param prompt - The prompt to send to the AI
 * @param schema - Optional JSON schema for structured output
 * @param options - Optional configuration overrides
 * @returns The generated text
 */
export async function generateStructured(
  prompt: string,
  schema?: object,
  options?: {
    maxTokens?: number;
    temperature?: number;
  }
): Promise<string> {
  requireAIConfiguration();

  const config = {
    ...getDefaultConfig(),
    ...options,
    responseMimeType: schema ? "application/json" : "text/plain",
  };

  if (schema) {
    // Add schema to config if supported
    (config as any).responseSchema = schema;
  }

  const response = await ai.models.generateContent({
    model: getModelName(),
    config,
    contents: prompt,
  });

  let text = "";
  if (typeof (response as any).outputText === "function") {
    text = (response as any).outputText();
  } else if ((response as any).outputText) {
    text = (response as any).outputText;
  } else if (response.text) {
    text = typeof response.text === "function" ? response.text() : response.text;
  }

  return text || "";
}

