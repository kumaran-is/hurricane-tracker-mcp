/**
 * Rate limiting middleware for Hurricane Tracker MCP Server
 * Implements token bucket and sliding window algorithms
 */

import { logger } from '../logging/logger-pino.js';

export interface RateLimitConfig {
  enabled: boolean;
  requestsPerWindow: number;
  windowSizeMs: number;
  burstAllowance: number;
  blockDuration: number;
  skipIfError: boolean;
  whitelist: string[];
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Default rate limiting configuration
 */
const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  enabled: process.env.RATE_LIMIT_ENABLED === 'true' || true,
  requestsPerWindow: parseInt(process.env.RATE_LIMIT_PER_CLIENT || '100'),
  windowSizeMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  burstAllowance: parseInt(process.env.RATE_LIMIT_BURST || '10'),
  blockDuration: parseInt(process.env.RATE_LIMIT_BLOCK_DURATION || '300000'), // 5 minutes
  skipIfError: true,
  whitelist: process.env.RATE_LIMIT_WHITELIST?.split(',') || [],
};

/**
 * Token bucket for rate limiting
 */
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private capacity: number,
    private refillRate: number, // tokens per second
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  /**
   * Try to consume tokens
   */
  consume(count: number = 1): boolean {
    this.refill();

    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }

    return false;
  }

  /**
   * Get current token count
   */
  getTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Get time until next token is available
   */
  getTimeUntilToken(): number {
    this.refill();
    if (this.tokens > 0) return 0;
    
    return Math.ceil((1 / this.refillRate) * 1000);
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

/**
 * Sliding window rate limiter
 */
class SlidingWindow {
  private requests: number[] = [];

  constructor(private windowSizeMs: number) {}

  /**
   * Add a request timestamp
   */
  addRequest(): void {
    const now = Date.now();
    this.requests.push(now);
    this.cleanup();
  }

  /**
   * Get current request count in window
   */
  getRequestCount(): number {
    this.cleanup();
    return this.requests.length;
  }

  /**
   * Get oldest request timestamp
   */
  getOldestRequest(): number | null {
    this.cleanup();
    return this.requests.length > 0 ? this.requests[0] : null;
  }

  /**
   * Remove expired requests
   */
  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.windowSizeMs;
    this.requests = this.requests.filter(timestamp => timestamp > cutoff);
  }
}

/**
 * Rate limiting middleware
 */
export class RateLimitMiddleware {
  private config: RateLimitConfig;
  private buckets: Map<string, TokenBucket> = new Map();
  private windows: Map<string, SlidingWindow> = new Map();
  private blockedIPs: Map<string, number> = new Map();

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_RATE_LIMIT_CONFIG, ...config };

    if (this.config.enabled) {
      logger.info('Hurricane Tracker rate limit middleware initialized');
    }
  }

  /**
   * Check if request is allowed
   */
  async checkLimit(identifier: string, ip: string = 'unknown'): Promise<RateLimitResult> {
    if (!this.config.enabled) {
      return this.allowRequest(this.config.requestsPerWindow);
    }

    // Check if IP is whitelisted
    if (this.isWhitelisted(identifier) || this.isWhitelisted(ip)) {
      return this.allowRequest(this.config.requestsPerWindow);
    }

    // Check if IP is currently blocked
    const blockExpiry = this.blockedIPs.get(ip);
    if (blockExpiry && Date.now() < blockExpiry) {
      const retryAfter = Math.ceil((blockExpiry - Date.now()) / 1000);
      return this.blockRequest(retryAfter);
    }

    // Remove expired blocks
    if (blockExpiry && Date.now() >= blockExpiry) {
      this.blockedIPs.delete(ip);
    }

    try {
      // Check sliding window
      const window = this.getOrCreateWindow(identifier);
      const currentRequests = window.getRequestCount();

      if (currentRequests >= this.config.requestsPerWindow) {
        // Check token bucket for burst allowance
        const bucket = this.getOrCreateBucket(identifier);
        if (!bucket.consume(1)) {
          // Block IP if they exceed limits repeatedly
          this.blockIP(ip);
          
          const oldestRequest = window.getOldestRequest();
          const resetTime = oldestRequest ? oldestRequest + this.config.windowSizeMs : Date.now() + this.config.windowSizeMs;
          const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
          
          return this.blockRequest(retryAfter);
        }
      }

      // Allow request and record it
      window.addRequest();
      const remaining = Math.max(0, this.config.requestsPerWindow - window.getRequestCount());
      const resetTime = Date.now() + this.config.windowSizeMs;

      return this.allowRequest(remaining, resetTime);

    } catch (error) {
      logger.error('Error in rate limiting check', { identifier, ip, error });
      
      if (this.config.skipIfError) {
        return this.allowRequest(this.config.requestsPerWindow);
      }
      
      return this.blockRequest(60); // Block for 1 minute on error
    }
  }

  /**
   * Get or create token bucket for identifier
   */
  private getOrCreateBucket(identifier: string): TokenBucket {
    let bucket = this.buckets.get(identifier);
    if (!bucket) {
      const refillRate = this.config.burstAllowance / (this.config.windowSizeMs / 1000);
      bucket = new TokenBucket(this.config.burstAllowance, refillRate);
      this.buckets.set(identifier, bucket);
    }
    return bucket;
  }

  /**
   * Get or create sliding window for identifier
   */
  private getOrCreateWindow(identifier: string): SlidingWindow {
    let window = this.windows.get(identifier);
    if (!window) {
      window = new SlidingWindow(this.config.windowSizeMs);
      this.windows.set(identifier, window);
    }
    return window;
  }

  /**
   * Check if identifier is whitelisted
   */
  private isWhitelisted(identifier: string): boolean {
    return this.config.whitelist.includes(identifier);
  }

  /**
   * Block IP address
   */
  private blockIP(ip: string): void {
    const blockUntil = Date.now() + this.config.blockDuration;
    this.blockedIPs.set(ip, blockUntil);
    
    logger.warn('IP blocked due to rate limit violation', {
      ip,
      blockDurationMs: this.config.blockDuration,
      blockUntil: new Date(blockUntil).toISOString(),
    });
  }

  /**
   * Create allowed response
   */
  private allowRequest(remaining: number, resetTime?: number): RateLimitResult {
    return {
      allowed: true,
      remaining,
      resetTime: resetTime || Date.now() + this.config.windowSizeMs,
    };
  }

  /**
   * Create blocked response
   */
  private blockRequest(retryAfter: number): RateLimitResult {
    return {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + (retryAfter * 1000),
      retryAfter,
    };
  }

  /**
   * Clean up old data
   */
  cleanup(): void {
    const now = Date.now();
    let cleanedBuckets = 0;
    let cleanedWindows = 0;
    let cleanedBlocks = 0;

    // Clean up expired blocked IPs
    for (const [ip, expiry] of this.blockedIPs.entries()) {
      if (expiry <= now) {
        this.blockedIPs.delete(ip);
        cleanedBlocks++;
      }
    }

    // Clean up inactive buckets (older than 2x window size)
    const inactiveThreshold = now - (this.config.windowSizeMs * 2);
    for (const [identifier, bucket] of this.buckets.entries()) {
      if (bucket.getTokens() === this.config.burstAllowance && 
          !this.windows.has(identifier)) {
        this.buckets.delete(identifier);
        cleanedBuckets++;
      }
    }

    // Windows clean themselves automatically

    if (cleanedBuckets > 0 || cleanedWindows > 0 || cleanedBlocks > 0) {
      logger.debug('Rate limit middleware cleanup completed', {
        cleanedBuckets,
        cleanedWindows,
        cleanedBlocks,
      });
    }
  }

  /**
   * Get rate limit statistics
   */
  getStats() {
    return {
      activeBuckets: this.buckets.size,
      activeWindows: this.windows.size,
      blockedIPs: this.blockedIPs.size,
      config: {
        enabled: this.config.enabled,
        requestsPerWindow: this.config.requestsPerWindow,
        windowSizeMs: this.config.windowSizeMs,
        burstAllowance: this.config.burstAllowance,
      },
    };
  }

  /**
   * Reset limits for identifier
   */
  resetLimits(identifier: string): void {
    this.buckets.delete(identifier);
    this.windows.delete(identifier);
    logger.info('Rate limits reset for identifier', { identifier });
  }

  /**
   * Unblock IP address
   */
  unblockIP(ip: string): boolean {
    const wasBlocked = this.blockedIPs.has(ip);
    this.blockedIPs.delete(ip);
    
    if (wasBlocked) {
      logger.info('IP unblocked manually', { ip });
    }
    
    return wasBlocked;
  }
}

/**
 * Rate limit error class
 */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter: number,
    public limit: number,
    public remaining: number,
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// Export singleton instance
export const rateLimitMiddleware = new RateLimitMiddleware();

// Set up periodic cleanup
setInterval(() => {
  rateLimitMiddleware.cleanup();
}, 60000); // Clean up every minute

/**
 * Rate limiting utilities
 */
export const rateLimitUtils = {
  /**
   * Create rate limit headers
   */
  createHeaders(result: RateLimitResult, limit: number): Record<string, string> {
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
    };

    if (result.retryAfter) {
      headers['Retry-After'] = result.retryAfter.toString();
    }

    return headers;
  },

  /**
   * Generate client identifier
   */
  generateClientId(ip: string, userAgent: string = '', apiKey: string = ''): string {
    if (apiKey) {
      // Use API key hash for authenticated requests
      return `api:${Buffer.from(apiKey).toString('base64').slice(0, 16)}`;
    }

    // Use IP + User-Agent hash for anonymous requests
    const combined = `${ip}:${userAgent}`;
    return `anon:${Buffer.from(combined).toString('base64').slice(0, 16)}`;
  },

  /**
   * Parse rate limit configuration from environment
   */
  parseRateLimitConfig(): Partial<RateLimitConfig> {
    return {
      enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
      requestsPerWindow: parseInt(process.env.RATE_LIMIT_REQUESTS || '100'),
      windowSizeMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
      burstAllowance: parseInt(process.env.RATE_LIMIT_BURST || '10'),
      blockDuration: parseInt(process.env.RATE_LIMIT_BLOCK_DURATION || '300000'),
      whitelist: process.env.RATE_LIMIT_WHITELIST?.split(',').map(ip => ip.trim()) || [],
    };
  },

  /**
   * Validate rate limit configuration
   */
  validateConfig(config: Partial<RateLimitConfig>): string[] {
    const errors: string[] = [];

    if (config.requestsPerWindow && config.requestsPerWindow < 1) {
      errors.push('requestsPerWindow must be at least 1');
    }

    if (config.windowSizeMs && config.windowSizeMs < 1000) {
      errors.push('windowSizeMs must be at least 1000ms');
    }

    if (config.burstAllowance && config.burstAllowance < 1) {
      errors.push('burstAllowance must be at least 1');
    }

    if (config.blockDuration && config.blockDuration < 1000) {
      errors.push('blockDuration must be at least 1000ms');
    }

    return errors;
  },
};
