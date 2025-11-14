/**
 * Rate limiter to prevent excessive API calls
 * Uses in-memory tracking with sliding window
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private readonly defaultMaxRequests: number;
  private readonly defaultWindowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 60000) {
    this.defaultMaxRequests = maxRequests;
    this.defaultWindowMs = windowMs;
  }

  /**
   * Check if a request is allowed
   * @param key - Unique identifier for the rate limit (e.g., user_id, endpoint)
   * @param maxRequests - Maximum requests allowed in the window
   * @param windowMs - Time window in milliseconds
   * @returns true if allowed, false if rate limited
   */
  isAllowed(
    key: string,
    maxRequests?: number,
    windowMs?: number
  ): boolean {
    const max = maxRequests || this.defaultMaxRequests;
    const window = windowMs || this.defaultWindowMs;
    const now = Date.now();

    const entry = this.requests.get(key);

    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired one
      this.requests.set(key, {
        count: 1,
        resetTime: now + window,
      });
      return true;
    }

    if (entry.count >= max) {
      return false;
    }

    entry.count++;
    return true;
  }

  /**
   * Get remaining requests for a key
   */
  getRemaining(key: string, maxRequests?: number): number {
    const max = maxRequests || this.defaultMaxRequests;
    const entry = this.requests.get(key);
    
    if (!entry || Date.now() > entry.resetTime) {
      return max;
    }

    return Math.max(0, max - entry.count);
  }

  /**
   * Get time until reset
   */
  getResetTime(key: string): number {
    const entry = this.requests.get(key);
    if (!entry) return 0;
    return Math.max(0, entry.resetTime - Date.now());
  }

  /**
   * Clear expired entries (call periodically)
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.requests.entries()) {
      if (now > entry.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * Reset a specific key
   */
  reset(key: string) {
    this.requests.delete(key);
  }

  /**
   * Clear all entries
   */
  clear() {
    this.requests.clear();
  }
}

// Global rate limiter instances
export const globalRateLimiter = new RateLimiter(20, 60000); // 20 requests per minute globally
export const userRateLimiter = new RateLimiter(10, 60000); // 10 requests per minute per user
export const endpointRateLimiter = new RateLimiter(5, 30000); // 5 requests per 30 seconds per endpoint

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    globalRateLimiter.cleanup();
    userRateLimiter.cleanup();
    endpointRateLimiter.cleanup();
  }, 5 * 60 * 1000);
}

/**
 * Check rate limits for API calls
 */
export function checkRateLimit(
  userId?: string,
  endpoint?: string
): { allowed: boolean; retryAfter?: number; message?: string } {
  // Check global rate limit
  if (!globalRateLimiter.isAllowed("global")) {
    const retryAfter = Math.ceil(globalRateLimiter.getResetTime("global") / 1000);
    return {
      allowed: false,
      retryAfter,
      message: `Global rate limit exceeded. Please try again in ${retryAfter} seconds.`,
    };
  }

  // Check user-specific rate limit
  if (userId && !userRateLimiter.isAllowed(`user:${userId}`)) {
    const retryAfter = Math.ceil(userRateLimiter.getResetTime(`user:${userId}`) / 1000);
    return {
      allowed: false,
      retryAfter,
      message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
    };
  }

  // Check endpoint-specific rate limit
  if (endpoint && !endpointRateLimiter.isAllowed(`endpoint:${endpoint}`)) {
    const retryAfter = Math.ceil(endpointRateLimiter.getResetTime(`endpoint:${endpoint}`) / 1000);
    return {
      allowed: false,
      retryAfter,
      message: `Too many requests to ${endpoint}. Please try again in ${retryAfter} seconds.`,
    };
  }

  return { allowed: true };
}

