/**
 * Optimized HTTP Pool Manager for undici
 * Manages connection pools with resilience patterns and monitoring
 */

import { Pool, Dispatcher } from 'undici';
import { CircuitBreaker, CircuitBreakerStats } from '../resilience/circuit-breaker.js';
import { RetryStrategy } from '../resilience/retry-strategy.js';
import {
  PoolConfiguration,
  NWS_POOL_CONFIG,
  NHC_POOL_CONFIG,
  IBTRACS_POOL_CONFIG,
  DEFAULT_RESILIENCE_CONFIG
} from '../config/pool-config.js';
import { logger } from '../../logging/logger-pino.js';

export interface PoolStats {
  connected: number;
  pending: number;
  running: number;
  size: number;
  utilization: number;
}

export interface PoolHealth {
  isHealthy: boolean;
  stats: PoolStats;
  circuitBreaker: CircuitBreakerStats;
  lastRequestTime: number | null;
  errorRate: number;
}

export class OptimizedPoolManager {
  private pools = new Map<string, Pool>();
  private poolUrls = new Map<string, string>();
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private retryStrategies = new Map<string, RetryStrategy>();
  private requestCounts = new Map<string, number>();
  private errorCounts = new Map<string, number>();
  private lastRequestTimes = new Map<string, number | null>();

  constructor() {
    this.initializePools();
  }

  /**
   * Initialize connection pools for different endpoints
   */
  private initializePools(): void {
    // NWS API pool
    const nwsUrl = process.env.NWS_API_BASE_URL || 'https://api.weather.gov';
    this.createPool('nws', nwsUrl, NWS_POOL_CONFIG);

    // NHC API pool  
    const nhcUrl = process.env.NHC_API_BASE_URL || 'https://www.nhc.noaa.gov';
    this.createPool('nhc', nhcUrl, NHC_POOL_CONFIG);

    // IBTRACS API pool
    const ibtUrl = process.env.IBTRACS_API_BASE_URL || 'https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs';
    this.createPool('ibtracs', ibtUrl, IBTRACS_POOL_CONFIG);

    logger.info({
      pools: Array.from(this.pools.keys())
    }, 'Hurricane Tracker HTTP pools initialized');
  }

  /**
   * Create a connection pool with resilience features
   */
  createPool(name: string, baseUrl: string, config: PoolConfiguration): void {
    // Create the undici pool
    const pool = new Pool(baseUrl, {
      connections: config.connections,
      pipelining: config.pipelining,
      keepAliveTimeout: config.keepAliveTimeout,
      keepAliveMaxTimeout: config.keepAliveMaxTimeout,
      connectTimeout: config.connectTimeout,
      bodyTimeout: config.bodyTimeout,
      headersTimeout: config.headersTimeout,
    });

    // Add event listeners for monitoring
    pool.on('connect', (origin) => {
      logger.debug({ pool: name, origin }, 'Pool connection established');
    });

    pool.on('disconnect', (origin, targets, error) => {
      logger.warn({
        pool: name,
        origin,
        targets: targets?.length || 0,
        error: error?.message
      }, 'Pool connection lost');
    });

    pool.on('drain', () => {
      logger.debug({ pool: name }, 'Pool drained');
    });

    this.pools.set(name, pool);
    this.poolUrls.set(name, baseUrl);

    // Create circuit breaker
    const circuitBreaker = new CircuitBreaker(
      `${name}-pool`,
      DEFAULT_RESILIENCE_CONFIG.circuitBreaker.failureThreshold,
      DEFAULT_RESILIENCE_CONFIG.circuitBreaker.recoveryTimeout
    );
    this.circuitBreakers.set(name, circuitBreaker);

    // Create retry strategy
    const retryStrategy = new RetryStrategy(DEFAULT_RESILIENCE_CONFIG.retry);
    this.retryStrategies.set(name, retryStrategy);

    // Initialize metrics
    this.requestCounts.set(name, 0);
    this.errorCounts.set(name, 0);
    this.lastRequestTimes.set(name, null);

    logger.info({
      pool: name,
      baseUrl,
      connections: config.connections,
      pipelining: config.pipelining
    }, 'Hurricane API pool created with resilience features');
  }

  /**
   * Execute HTTP request with full resilience
   */
  async request<T = any>(
    poolName: string,
    options: Parameters<Dispatcher['request']>[0],
    context?: string
  ): Promise<T> {
    const pool = this.pools.get(poolName);
    if (!pool) {
      throw new Error(`Hurricane API pool '${poolName}' not found`);
    }

    const circuitBreaker = this.circuitBreakers.get(poolName)!;
    const retryStrategy = this.retryStrategies.get(poolName)!;

    // Update metrics
    this.requestCounts.set(poolName, (this.requestCounts.get(poolName) || 0) + 1);
    this.lastRequestTimes.set(poolName, Date.now());

    const startTime = Date.now();

    try {
      // Execute with circuit breaker and retry
      const result = await circuitBreaker.execute(async () => {
        return await retryStrategy.execute(async () => {
          const baseUrl = this.poolUrls.get(poolName)!;
          const fullUrl = `${baseUrl}${options.path || ''}`;

          logger.debug({
            url: fullUrl,
            method: options.method || 'GET',
            pool: poolName,
            context
          }, 'Hurricane API Request');

          const { statusCode, body } = await pool.request(options);

          logger.info({
            url: fullUrl,
            statusCode,
            latency: Date.now() - startTime,
            pool: poolName,
            context
          }, 'Hurricane API Response');

          if (statusCode >= 400) {
            const errorText = await body.text();
            throw new Error(`Hurricane API HTTP ${statusCode}: ${errorText}`);
          }

          // Parse JSON response
          const data = await body.json();
          return data as T;
        }, context);
      });

      return result;
    } catch (error) {
      // Update error metrics
      this.errorCounts.set(poolName, (this.errorCounts.get(poolName) || 0) + 1);

      logger.error({
        error: (error as Error).message,
        pool: poolName,
        context,
        duration: Date.now() - startTime
      }, 'Hurricane API request failed');

      throw error;
    }
  }

  /**
   * Get pool statistics
   */
  getPoolStats(poolName: string): PoolStats | null {
    const pool = this.pools.get(poolName);
    if (!pool) return null;

    const stats = pool.stats;
    const total = stats.connected + stats.pending + stats.running;

    return {
      connected: stats.connected,
      pending: stats.pending,
      running: stats.running,
      size: stats.size,
      utilization: total > 0 ? (stats.running / total) * 100 : 0,
    };
  }

  /**
   * Get pool health information
   */
  getPoolHealth(poolName: string): PoolHealth | null {
    const pool = this.pools.get(poolName);
    const circuitBreaker = this.circuitBreakers.get(poolName);

    if (!pool || !circuitBreaker) return null;

    const stats = this.getPoolStats(poolName)!;
    const requestCount = this.requestCounts.get(poolName) || 0;
    const errorCount = this.errorCounts.get(poolName) || 0;
    const errorRate = requestCount > 0 ? (errorCount / requestCount) * 100 : 0;

    return {
      isHealthy: circuitBreaker.isHealthy() && stats.utilization < 90,
      stats,
      circuitBreaker: circuitBreaker.getStats(),
      lastRequestTime: this.lastRequestTimes.get(poolName) || null,
      errorRate,
    };
  }

  /**
   * Get all pool health information
   */
  getAllPoolHealth(): Record<string, PoolHealth> {
    const health: Record<string, PoolHealth> = {};

    for (const poolName of this.pools.keys()) {
      const poolHealth = this.getPoolHealth(poolName);
      if (poolHealth) {
        health[poolName] = poolHealth;
      }
    }

    return health;
  }

  /**
   * Hurricane-specific helper methods
   */
  
  /**
   * Make NWS API request
   */
  async requestNWS<T = any>(path: string, context?: string): Promise<T> {
    return this.request<T>('nws', { 
      path,
      method: 'GET',
      headers: {
        'User-Agent': 'Hurricane-Tracker-MCP (contact@hurricane-tracker.com)'
      }
    }, context || 'NWS API');
  }

  /**
   * Make NHC API request  
   */
  async requestNHC<T = any>(path: string, context?: string): Promise<T> {
    return this.request<T>('nhc', {
      path,
      method: 'GET',
      headers: {
        'User-Agent': 'Hurricane-Tracker-MCP (contact@hurricane-tracker.com)'
      }
    }, context || 'NHC API');
  }

  /**
   * Make IBTRACS API request
   */
  async requestIBTRACS<T = any>(path: string, context?: string): Promise<T> {
    return this.request<T>('ibtracs', {
      path,
      method: 'GET',
      headers: {
        'User-Agent': 'Hurricane-Tracker-MCP (contact@hurricane-tracker.com)'
      }
    }, context || 'IBTRACS API');
  }

  /**
   * Force close a pool (for testing or emergency shutdown)
   */
  async closePool(poolName: string): Promise<void> {
    const pool = this.pools.get(poolName);
    if (pool) {
      await pool.close();
      this.pools.delete(poolName);
      this.circuitBreakers.delete(poolName);
      this.retryStrategies.delete(poolName);
      logger.info({ pool: poolName }, 'Hurricane API pool closed');
    }
  }

  /**
   * Close all pools
   */
  async closeAll(): Promise<void> {
    const poolNames = Array.from(this.pools.keys());
    await Promise.all(poolNames.map(name => this.closePool(name)));
    logger.info('All Hurricane API pools closed');
  }

  /**
   * Get available pool names
   */
  getPoolNames(): string[] {
    return Array.from(this.pools.keys());
  }

  /**
   * Check if a pool exists
   */
  hasPool(poolName: string): boolean {
    return this.pools.has(poolName);
  }
}

// Export singleton instance
export const poolManager = new OptimizedPoolManager();
