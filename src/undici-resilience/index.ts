/**
 * Hurricane Tracker Undici Resilience Package
 * A comprehensive HTTP client library with resilience patterns for Node.js
 *
 * Features:
 * - Ultra-low latency connection pooling
 * - Circuit breaker pattern
 * - Exponential backoff with jitter
 * - Bulkhead pattern for resource isolation
 * - Rate limiting
 * - Production-ready error handling
 *
 * @packageDocumentation
 */

// Configuration
export * from './config/pool-config.js';

// Resilience patterns
export * from './resilience/circuit-breaker.js';
export * from './resilience/retry-strategy.js';
export * from './resilience/bulkhead.js';
export * from './resilience/rate-limiter.js';

// Type definitions
export type {
  PoolConfiguration,
  CircuitBreakerConfig,
  RetryConfig,
  ResilienceConfig,
} from './config/pool-config.js';

export type {
  CircuitState,
  CircuitBreakerStats,
} from './resilience/circuit-breaker.js';

export type {
  RetryAttempt,
} from './resilience/retry-strategy.js';

export type {
  BulkheadConfig,
  BulkheadStats,
} from './resilience/bulkhead.js';

export type {
  RateLimiterConfig,
  RateLimiterStats,
} from './resilience/rate-limiter.js';

// Re-export commonly used classes
export { CircuitBreaker } from './resilience/circuit-breaker.js';
export { RetryStrategy, RetryStrategies } from './resilience/retry-strategy.js';
export { Bulkhead, bulkheadManager } from './resilience/bulkhead.js';
export { RateLimiter, rateLimiterManager } from './resilience/rate-limiter.js';

// Import for internal use
import { CircuitBreaker } from './resilience/circuit-breaker.js';
import { RetryStrategies } from './resilience/retry-strategy.js';
import { bulkheadManager } from './resilience/bulkhead.js';
import { rateLimiterManager } from './resilience/rate-limiter.js';

/**
 * Hurricane-specific resilience factory
 */
export class HurricaneResilience {
  /**
   * Create NWS API resilience configuration
   */
  static createNWSResilience() {
    return {
      circuitBreaker: new CircuitBreaker('nws-api', 5, 30000),
      retryStrategy: RetryStrategies.nws(),
      bulkhead: bulkheadManager.getBulkhead('nws', {
        maxConcurrent: 10,
        maxQueueSize: 20,
        queueTimeout: 30000,
      }),
      rateLimiter: rateLimiterManager.getLimiter('nws', {
        maxRequests: 100,
        windowMs: 60000,
        burstCapacity: 10,
      }),
    };
  }

  /**
   * Create NHC API resilience configuration
   */
  static createNHCResilience() {
    return {
      circuitBreaker: new CircuitBreaker('nhc-api', 3, 60000),
      retryStrategy: RetryStrategies.nhc(),
      bulkhead: bulkheadManager.getBulkhead('nhc', {
        maxConcurrent: 8,
        maxQueueSize: 15,
        queueTimeout: 45000,
      }),
      rateLimiter: rateLimiterManager.getLimiter('nhc', {
        maxRequests: 60,
        windowMs: 60000,
        burstCapacity: 8,
      }),
    };
  }

  /**
   * Create IBTRACS (historical) API resilience configuration
   */
  static createHistoricalResilience() {
    return {
      circuitBreaker: new CircuitBreaker('ibtracs-api', 2, 120000),
      retryStrategy: RetryStrategies.historical(),
      bulkhead: bulkheadManager.getBulkhead('ibtracs', {
        maxConcurrent: 5,
        maxQueueSize: 10,
        queueTimeout: 180000,
      }),
      rateLimiter: rateLimiterManager.getLimiter('ibtracs', {
        maxRequests: 30,
        windowMs: 60000,
        burstCapacity: 5,
      }),
    };
  }
}

/**
 * Quick start example:
 *
 * ```typescript
 * import { HurricaneResilience, CircuitBreaker, RetryStrategies } from 'hurricane-tracker-mcp/undici-resilience';
 *
 * // Create resilient NWS API client
 * const nwsResilience = HurricaneResilience.createNWSResilience();
 *
 * // Make resilient requests
 * const data = await nwsResilience.retryStrategy.execute(async () => {
 *   return await nwsResilience.circuitBreaker.execute(async () => {
 *     return await nwsResilience.bulkhead.execute(async () => {
 *       // Your API call here
 *       return fetch('/api/hurricanes');
 *     });
 *   });
 * });
 * ```
 */
