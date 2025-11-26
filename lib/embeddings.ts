/**
 * Embedding Utilities using Google Gemini embedding-001
 * 
 * This module provides functions to generate embeddings for text content
 * using Google's Gemini embedding model (embedding-001) via Vertex AI.
 * 
 * The embedding model produces 768-dimensional vectors suitable for
 * semantic similarity search using pgvector.
 */

import { getAI, getEmbeddingModelName, requireAIConfiguration } from "./ai-config";

/**
 * Generate embedding for a single text using Gemini embedding-001
 * 
 * @param text - The text to generate an embedding for
 * @returns A 768-dimensional vector (array of numbers)
 * 
 * @example
 * ```ts
 * const embedding = await generateEmbedding("Photosynthesis is the process...");
 * ```
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  requireAIConfiguration();

  if (!text || text.trim().length === 0) {
    throw new Error("Text cannot be empty");
  }

  try {
    // Truncate text if too long (Gemini has limits)
    const maxLength = 2000; // Conservative limit for embedding model
    const truncatedText = text.length > maxLength 
      ? text.substring(0, maxLength) + "..."
      : text;

    const ai = getAI();

    // Generate embedding using Vertex AI
    const response = await ai.models.embedContent({
      model: getEmbeddingModelName(),
      content: truncatedText,
    });

    // Extract embedding vector from response
    let embedding: number[] = [];
    
    if ((response as any).embedding?.values) {
      embedding = (response as any).embedding.values;
    } else if ((response as any).embedding) {
      embedding = Array.isArray((response as any).embedding) 
        ? (response as any).embedding 
        : [];
    } else if ((response as any).values) {
      embedding = (response as any).values;
    } else if ((response as any).embeddings?.[0]) {
      embedding = (response as any).embeddings[0];
    } else if (Array.isArray(response)) {
      embedding = response;
    }

    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error("Failed to extract embedding from response");
    }

    // Gemini embedding-001 can produce different dimensions (768, 1024, 2048, 3072)
    // We'll use 768 for pgvector efficiency, but truncate/pad if needed
    const originalLength = embedding.length;
    if (embedding.length > 768) {
      embedding = embedding.slice(0, 768);
      console.warn(`⚠️ Truncated embedding from ${originalLength} to 768 dimensions`);
    } else if (embedding.length < 768) {
      // Pad with zeros if needed (shouldn't happen, but just in case)
      embedding = [...embedding, ...new Array(768 - embedding.length).fill(0)];
      console.warn(`⚠️ Padded embedding from ${originalLength} to 768 dimensions`);
    }

    return embedding;
  } catch (error: any) {
    console.error("Error generating embedding:", error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Generates embeddings for a list of texts.
 * @param texts An array of texts to embed.
 * @returns A promise that resolves to an array of embedding vectors.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  // Implement batching and rate limiting if necessary
  const embeddings: number[][] = [];
  for (const text of texts) {
    embeddings.push(await generateEmbedding(text));
  }
  return embeddings;
}

/**
 * Combines multiple text fields into a single string for embedding.
 * Filters out empty or null values.
 * @param fields An object containing various text fields.
 * @returns A single combined string.
 */
export function combineTextFields(fields: { [key: string]: string | null | undefined }): string {
  return Object.values(fields)
    .filter((text) => typeof text === 'string' && text.trim().length > 0)
    .map((text) => text!.trim())
    .join(".\n");
}

/**
 * Prepares text for embedding by cleaning and chunking if necessary.
 * (Placeholder for more advanced text processing)
 * @param text The input text.
 * @returns Cleaned and potentially chunked text.
 */
export function prepareTextForEmbedding(text: string): string {
  // Basic cleaning: remove excessive whitespace, trim
  return text.replace(/\s+/g, ' ').trim();
}
