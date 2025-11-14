/**
 * Embedding Utilities using Google Gemini embedding-001
 * 
 * This module provides functions to generate embeddings for text content
 * using Google's Gemini embedding model (embedding-001).
 * 
 * The embedding model produces 768-dimensional vectors suitable for
 * semantic similarity search using pgvector.
 */

import { GoogleGenAI } from "@google/genai";

// Initialize Google GenAI client for embeddings
const ai = new GoogleGenAI({});

if (!process.env.GEMINI_API_KEY) {
  console.error("⚠️ Missing GEMINI_API_KEY in environment variables");
  console.error("   Embedding features will not work without this key");
}

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
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not configured. Please set GEMINI_API_KEY in your .env.local file");
  }

  if (!text || text.trim().length === 0) {
    throw new Error("Text cannot be empty");
  }

  try {
    // Truncate text if too long (Gemini has limits)
    const maxLength = 2000; // Conservative limit for embedding model
    const truncatedText = text.length > maxLength 
      ? text.substring(0, maxLength) + "..."
      : text;

    // Generate embedding using Gemini embedding-001
    // The model can produce up to 3072 dimensions, but we'll use 768 for efficiency
    let embedding: number[] = [];
    
    try {
      // Try the standard embedContent method
      const response = await (ai as any).models.embedContent({
        model: "models/embedding-001",
        content: truncatedText,
      });

      // Extract embedding vector - try different response structures
      if ((response as any).embedding?.values) {
        embedding = (response as any).embedding.values;
      } else if ((response as any).embedding) {
        embedding = (response as any).embedding;
      } else if ((response as any).values) {
        embedding = (response as any).values;
      } else if ((response as any).embeddings) {
        // Sometimes it's plural
        embedding = Array.isArray((response as any).embeddings) 
          ? (response as any).embeddings[0] 
          : (response as any).embeddings;
      } else if (Array.isArray(response)) {
        embedding = response;
      } else {
        // Try accessing directly
        const candidate = (response as any)?.embedding?.values || 
                         (response as any)?.embedding ||
                         (response as any)?.values ||
                         (response as any)?.data?.embedding?.values;
        if (Array.isArray(candidate)) {
          embedding = candidate;
        }
      }
    } catch (apiError: any) {
      // If embedContent doesn't work, try alternative API structure
      console.warn("Standard embedContent failed, trying alternative:", apiError.message);
      
      try {
        // Alternative: try with content object
        const altResponse = await (ai as any).models.embedContent?.({
          model: "embedding-001",
          content: {
            parts: [{ text: truncatedText }],
          },
        });
        
        if (altResponse) {
          embedding = (altResponse as any).embedding?.values || 
                      (altResponse as any).embedding ||
                      (altResponse as any).values ||
                      (altResponse as any).embeddings?.[0] ||
                      [];
        }
      } catch (altError: any) {
        throw new Error(`Failed to generate embedding: ${apiError.message || altError.message}`);
      }
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
 * Generate embeddings for multiple texts in batch
 * 
 * @param texts - Array of texts to generate embeddings for
 * @param batchSize - Number of texts to process in parallel (default: 5)
 * @returns Array of embeddings in the same order as input texts
 * 
 * @example
 * ```ts
 * const embeddings = await generateEmbeddings([
 *   "Text 1...",
 *   "Text 2...",
 *   "Text 3..."
 * ]);
 * ```
 */
export async function generateEmbeddings(
  texts: string[],
  batchSize: number = 5
): Promise<number[][]> {
  if (!texts || texts.length === 0) {
    return [];
  }

  const embeddings: number[][] = [];
  
  // Process in batches to avoid rate limits
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchEmbeddings = await Promise.all(
      batch.map(text => generateEmbedding(text))
    );
    embeddings.push(...batchEmbeddings);
    
    // Small delay between batches to avoid rate limits
    if (i + batchSize < texts.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return embeddings;
}

/**
 * Prepare text for embedding by cleaning and chunking
 * 
 * @param text - Raw text to prepare
 * @param maxLength - Maximum length per chunk (default: 1000)
 * @returns Array of cleaned text chunks
 */
export function prepareTextForEmbedding(
  text: string,
  maxLength: number = 1000
): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // Clean text: remove extra whitespace, normalize
  const cleaned = text
    .replace(/\s+/g, ' ')
    .trim();

  // If text is short enough, return as single chunk
  if (cleaned.length <= maxLength) {
    return [cleaned];
  }

  // Split into chunks at sentence boundaries
  const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [cleaned];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= maxLength) {
      currentChunk += sentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(chunk => chunk.length > 0);
}

/**
 * Combine multiple text fields into a single embedding-ready string
 * 
 * @param fields - Object with text fields to combine
 * @returns Combined text string
 */
export function combineTextFields(fields: {
  title?: string;
  description?: string;
  content?: string;
  [key: string]: string | undefined;
}): string {
  const parts: string[] = [];
  
  if (fields.title) parts.push(fields.title);
  if (fields.description) parts.push(fields.description);
  if (fields.content) parts.push(fields.content);
  
  // Add any other text fields
  Object.entries(fields).forEach(([key, value]) => {
    if (key !== 'title' && key !== 'description' && key !== 'content' && value) {
      parts.push(value);
    }
  });

  return parts.join(' ').trim();
}

