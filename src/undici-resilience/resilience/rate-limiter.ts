/**
 * Rate limiter implementation with sliding window algorithm
 * Prevents abuse by limiting requests over time windows
 */

import { logger } from '../../logger-pino.js';

export interface RateLimiterConfig {
  /** Maximum requests per window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Burst capacity for short spikes */
  burstCapacity: number;
}

export interface RateLimiterStats {
  requestsInWindow: number;
  maxRequests: number;
  windowMs: number;
  rejectCount: number;
  lastReset: number;
}

export class RateLimiter {
  private requests: number[] = [];
  private rejectCount = 0;
  private lastReset = Date.now();

  constructor(
    private name: string,
    private config: RateLimiterConfig
  ) {
    if (config.maxRequests < 1) {
      throw new Error('maxRequests must be at least 1');
    }
    if (config.windowMs < 1000) {
      throw new Error('windowMs must be at least 1000ms');
    }
  }

  /**
   * Check if request should be allowed
   */
  async checkRequest(): Promise<boolean> {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(timestamp => 
      now - timestamp < this.config.windowMs
    );

    // Check if within limits
    if (this.requests.length >= this.config.maxRequests) {
      this.rejectCount++;
      logger.warn({
        rateLimiter: this.name,
        requestsInWindow: this.requests.length,
        maxRequests: this.config.maxRequests,
        rejectCount: this.rejectCount
      }, 'Rate limit exceeded');
      return false;
    }

    // Add current request
    this.requests.push(now);
    return true;
  }

  /**
   * Execute function with rate limiting
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const allowed = await this.checkRequest();
    
    if (!allowed) {
      throw new Error(`Rate limit exceeded for '${this.name}'`);
    }

    return fn();
  }

  /**
   * Get current statistics
   */
  getStats(): RateLimiterStats {
    const now = Date.now();
    
    // Clean old requests
    this.requests = this.requests.filter(timestamp => 
      now - timestamp < this.config.windowMs
    );

    return {
      requestsInWindow: this.requests.length,
      maxRequests: this.config.maxRequests,
      windowMs: this.config.windowMs,
      rejectCount: this.rejectCount,
      lastReset: this.lastReset,
    };
  }

  /**
   * Reset rate limiter
   */
  reset(): void {
    this.requests = [];
    this.rejectCount = 0;
    this.lastReset = Date.now();
    logger.info({ rateLimiter: this.name }, 'Rate limiter reset');
  }
}

/**
 * Rate limiter manager
 */
export class RateLimiterManager {
  private limiters = new Map<string, RateLimiter>();

  /**
   * Get or create rate limiter
   */
  getLimiter(name: string, config: RateLimiterConfig): RateLimiter {
    if (!this.limiters.has(name)) {
      this.limiters.set(name, new RateLimiter(name, config));
    }
    return this.limiters.get(name)!;
  }

  /**
   * Get all stats
   */
  getAllStats(): Record<string, RateLimiterStats> {
    const stats: Record<string, RateLimiterStats> = {};
    for (const [name, limiter] of this.limiters) {
      stats[name] = limiter.getStats();
    }
    return stats;
  }
}

export const rateLimiterManager = new RateLimiterManager();
