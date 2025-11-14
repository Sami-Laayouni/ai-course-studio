/**
 * Advanced AI utilities with rate limiting and caching
 * 
 * For simple use cases, prefer the helpers from '@/lib/ai-helpers'
 * Use this module when you need rate limiting, caching, or deduplication
 */

import { generateText } from "@/lib/ai-helpers";
import { checkRateLimit } from "@/lib/rate-limiter";

// Request deduplication map - prevents multiple simultaneous calls for the same request
const pendingRequests = new Map<string, Promise<string>>();

// Track last call time per cache key to prevent rapid successive calls
const lastCallTime = new Map<string, number>();
const MIN_CALL_INTERVAL = 2000; // Minimum 2 seconds between calls for same cache key

/**
 * Generate content using Google GenAI with proper error handling and request deduplication
 * 
 * @param prompt - The prompt to send to the AI
 * @param options - Configuration options
 * @returns Generated text
 * 
 * @example
 * ```ts
 * const text = await generateContent("Explain AI", {
 *   cacheKey: "ai-explanation",
 *   userId: "user123",
 *   endpoint: "explain"
 * });
 * ```
 */
export async function generateContent(
  prompt: string,
  options?: {
    maxRetries?: number;
    retryDelay?: number;
    cacheKey?: string; // Optional cache key for deduplication
    userId?: string; // User ID for rate limiting
    endpoint?: string; // Endpoint name for rate limiting
    minInterval?: number; // Minimum time between calls (ms)
  }
): Promise<string> {
  const { 
    maxRetries = 2, 
    retryDelay = 2000, 
    cacheKey,
    userId,
    endpoint,
    minInterval = MIN_CALL_INTERVAL,
  } = options || {};
  
  // Check rate limits
  const rateLimitCheck = checkRateLimit(userId, endpoint);
  if (!rateLimitCheck.allowed) {
    throw new Error(rateLimitCheck.message || "Rate limit exceeded");
  }
  
  // If cacheKey provided, check for pending request
  if (cacheKey && pendingRequests.has(cacheKey)) {
    console.log(`🔄 Reusing pending request for: ${cacheKey}`);
    return pendingRequests.get(cacheKey)!;
  }

  // Check minimum interval between calls for same cache key
  if (cacheKey) {
    const lastCall = lastCallTime.get(cacheKey);
    if (lastCall) {
      const timeSinceLastCall = Date.now() - lastCall;
      if (timeSinceLastCall < minInterval) {
        const waitTime = minInterval - timeSinceLastCall;
        console.log(`⏳ Rate limiting: waiting ${waitTime}ms before next call for ${cacheKey}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    lastCallTime.set(cacheKey, Date.now());
  }

  const generate = async (): Promise<string> => {
    try {
      // Use the centralized generateText helper
      return await generateText(prompt);
    } catch (error: any) {
      // No retries - just throw the error as-is
      throw error;
    }
  };

  // If cacheKey provided, store the promise for deduplication
  if (cacheKey) {
    const promise = generate().finally(() => {
      // Clean up after request completes (after a delay to allow concurrent requests to reuse)
      setTimeout(() => {
        pendingRequests.delete(cacheKey);
      }, 1000);
    });
    pendingRequests.set(cacheKey, promise);
    return promise;
  }

  return generate();
}

/**
 * Create a cache key from request parameters
 */
export function createCacheKey(...parts: (string | number | undefined)[]): string {
  return parts.filter(Boolean).join(":");
}

