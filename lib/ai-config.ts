/**
 * Centralized AI Configuration
 * 
 * This file contains all AI-related configuration including:
 * - Model selection
 * - API client initialization
 * - Default parameters
 * 
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
 * Initialize Google GenAI client
 * The client gets the API key from the environment variable `GEMINI_API_KEY`
 */
export const ai = new GoogleGenAI({});

if (!process.env.GEMINI_API_KEY) {
  console.error("⚠️ Missing GEMINI_API_KEY in environment variables");
  console.error("   AI features will not work without this key");
}

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
  return !!process.env.GEMINI_API_KEY;
}

/**
 * Validate AI configuration and throw if not configured
 */
export function requireAIConfiguration(): void {
  if (!isAIConfigured()) {
    throw new Error("GEMINI_API_KEY not configured. Please set GEMINI_API_KEY in your .env.local file");
  }
}

