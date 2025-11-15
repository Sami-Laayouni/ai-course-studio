/**
 * Centralized AI Configuration
 * 
 * This file contains all AI-related configuration including:
 * - Model selection
 * - API client initialization
 * - Default parameters
 * 
 * Uses Vertex AI with service account credentials (GOOGLE_PROJECT_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY)
 * To change the model used across the entire platform, update MODEL_NAME below.
 */

import { GoogleGenAI } from "@google/genai";

// ============================================================================
// MODEL CONFIGURATION
// ============================================================================

/**
 * The Gemini model to use across the entire platform
 * Change this value to switch models globally
 * 
 * Available models:
 * - "gemini-2.5-flash" (recommended - fast and efficient)
 * - "gemini-2.0-flash-lite" (legacy)
 * - "gemini-1.5-pro" (more capable, slower)
 * - "gemini-1.5-flash" (balanced)
 */
export const MODEL_NAME = "gemini-2.5-flash";

/**
 * Default generation parameters
 */
export const DEFAULT_GENERATION_CONFIG = {
  responseMimeType: "text/plain" as const,
  maxOutputTokens: 2000,
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
};

/**
 * Model-specific configurations
 */
export const MODEL_CONFIGS: Record<string, { maxTokens: number; defaultMimeType: string }> = {
  "gemini-2.5-flash": {
    maxTokens: 8192,
    defaultMimeType: "text/plain",
  },
  "gemini-2.0-flash-lite": {
    maxTokens: 8192,
    defaultMimeType: "text/plain",
  },
  "gemini-1.5-pro": {
    maxTokens: 8192,
    defaultMimeType: "text/plain",
  },
  "gemini-1.5-flash": {
    maxTokens: 8192,
    defaultMimeType: "text/plain",
  },
};

// ============================================================================
// CLIENT INITIALIZATION
// ============================================================================

/**
 * Initialize Google GenAI client with service account credentials
 * Uses GOOGLE_PROJECT_ID, GOOGLE_CLIENT_EMAIL, and GOOGLE_PRIVATE_KEY
 */
let ai: GoogleGenAI | null = null;

function initializeAI() {
  if (ai) return ai;

  if (!process.env.GOOGLE_PROJECT_ID || !process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    console.error("⚠️ Missing Google Cloud credentials for AI");
    console.error("   Required: GOOGLE_PROJECT_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY");
    console.error("   AI features will not work without these credentials");
    return null;
  }

  try {
    // Initialize with service account credentials - same pattern as Document AI and GCS
    // @google/genai supports Vertex AI mode with service account credentials
    // Explicitly set scopes for Generative Language API access
    ai = new GoogleGenAI({
      project: process.env.GOOGLE_PROJECT_ID,
      location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
      googleAuthOptions: {
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: [
          'https://www.googleapis.com/auth/generative-language',
          'https://www.googleapis.com/auth/cloud-platform',
        ],
      },
    });
    console.log("✅ [AI] Google GenAI initialized with service account credentials");
    console.log("   Project:", process.env.GOOGLE_PROJECT_ID);
    console.log("   Location:", process.env.GOOGLE_CLOUD_LOCATION || "us-central1");
    return ai;
  } catch (error: any) {
    console.error("❌ [AI] Failed to initialize Google GenAI:", error.message);
    return null;
  }
}

// Initialize on module load
ai = initializeAI();

// Export getter function
export function getAI(): GoogleGenAI {
  if (!ai) {
    ai = initializeAI();
  }
  if (!ai) {
    throw new Error("AI not configured. Please set GOOGLE_PROJECT_ID, GOOGLE_CLIENT_EMAIL, and GOOGLE_PRIVATE_KEY in your .env.local file");
  }
  return ai;
}

// Export for backward compatibility
export { ai };

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the current model name
 */
export function getModelName(): string {
  return MODEL_NAME;
}

/**
 * Get default config for the current model
 */
export function getDefaultConfig() {
  const modelConfig = MODEL_CONFIGS[MODEL_NAME] || MODEL_CONFIGS["gemini-2.5-flash"];
  return {
    ...DEFAULT_GENERATION_CONFIG,
    responseMimeType: modelConfig.defaultMimeType as "text/plain" | "application/json",
    maxOutputTokens: modelConfig.maxTokens,
  };
}

/**
 * Check if AI is properly configured
 */
export function isAIConfigured(): boolean {
  return !!(process.env.GOOGLE_PROJECT_ID && process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
}

/**
 * Validate AI configuration and throw if not configured
 */
export function requireAIConfiguration(): void {
  if (!isAIConfigured()) {
    throw new Error("AI not configured. Please set GOOGLE_PROJECT_ID, GOOGLE_CLIENT_EMAIL, and GOOGLE_PRIVATE_KEY in your .env.local file");
  }
}

/**
 * Get embedding model name
 */
export function getEmbeddingModelName(): string {
  return "embedding-001";
}
