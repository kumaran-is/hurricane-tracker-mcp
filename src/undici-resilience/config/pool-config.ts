/**
 * Connection pool configuration for Hurricane Tracker MCP Server
 * Provides optimized settings for ultra-low latency and high performance
 */

export interface PoolConfiguration {
  /** Number of persistent connections to maintain */
  connections: number;
  /** HTTP/1.1 pipelining factor */
  pipelining: number;
  /** Keep-alive timeout in milliseconds */
  keepAliveTimeout: number;
  /** Maximum keep-alive timeout in milliseconds */
  keepAliveMaxTimeout: number;
  /** Connection establishment timeout */
  connectTimeout: number;
  /** Response body timeout (5min for large hurricane data responses) */
  bodyTimeout: number;
  /** Response headers timeout */
  headersTimeout: number;
  /** Request timeout */
  requestTimeout: number;
}

export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Time in ms to wait before attempting recovery */
  recoveryTimeout: number;
  /** Time in ms between health checks when half-open */
  healthCheckInterval: number;
}

export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base delay for exponential backoff */
  baseDelay: number;
  /** Maximum delay cap */
  maxDelay: number;
  /** Jitter factor (0-1) to randomize delays */
  jitterFactor: number;
}

export interface ResilienceConfig {
  circuitBreaker: CircuitBreakerConfig;
  retry: RetryConfig;
  /** Maximum concurrent requests per pool */
  maxConcurrentRequests: number;
  /** Rate limit per second */
  rateLimitPerSecond: number;
}

/**
 * Default optimized pool configuration for production use
 */
export const DEFAULT_POOL_CONFIG: PoolConfiguration = {
  connections: parseInt(process.env.POOL_CONNECTIONS || '50'),
  pipelining: parseInt(process.env.POOL_PIPELINING || '10'),
  keepAliveTimeout: parseInt(process.env.KEEP_ALIVE_TIMEOUT || '60000'),
  keepAliveMaxTimeout: parseInt(process.env.KEEP_ALIVE_MAX_TIMEOUT || '600000'),
  connectTimeout: parseInt(process.env.CONNECT_TIMEOUT || '10000'),
  bodyTimeout: parseInt(process.env.BODY_TIMEOUT || '300000'), // 5min for large hurricane datasets
  headersTimeout: parseInt(process.env.HEADERS_TIMEOUT || '30000'),
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '60000'),
};

/**
 * Default resilience configuration
 */
export const DEFAULT_RESILIENCE_CONFIG: ResilienceConfig = {
  circuitBreaker: {
    failureThreshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5'),
    recoveryTimeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '60000'),
    healthCheckInterval: parseInt(process.env.CIRCUIT_BREAKER_HEALTH_CHECK || '5000'),
  },
  retry: {
    maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
    baseDelay: parseInt(process.env.BASE_RETRY_DELAY || '1000'),
    maxDelay: parseInt(process.env.MAX_RETRY_DELAY || '10000'),
    jitterFactor: parseFloat(process.env.JITTER_FACTOR || '0.1'),
  },
  maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '100'),
  rateLimitPerSecond: parseInt(process.env.RATE_LIMIT_PER_SECOND || '10'),
};

/**
 * Bulkhead configuration from environment
 */
export const DEFAULT_BULKHEAD_CONFIG = {
  maxConcurrent: parseInt(process.env.BULKHEAD_MAX_CONCURRENT || '10'),
  maxQueueSize: parseInt(process.env.BULKHEAD_MAX_QUEUE_SIZE || '20'),
  queueTimeout: parseInt(process.env.BULKHEAD_QUEUE_TIMEOUT || '30000'),
};

/**
 * Rate limiter configuration from environment
 */
export const DEFAULT_RATE_LIMITER_CONFIG = {
  requests: parseInt(process.env.RATE_LIMIT_REQUESTS || '100'),
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  burst: parseInt(process.env.RATE_LIMIT_BURST || '10'),
  sliding: process.env.RATE_LIMIT_SLIDING !== 'false', // Default to true
};

/**
 * Token bucket configuration from environment
 */
export const DEFAULT_TOKEN_BUCKET_CONFIG = {
  capacity: parseInt(process.env.TOKEN_BUCKET_CAPACITY || '100'),
  refillRate: parseInt(process.env.TOKEN_BUCKET_REFILL_RATE || '10'),
};

/**
 * Specialized configuration for NWS API endpoints
 */
export const NWS_POOL_CONFIG: PoolConfiguration = {
  ...DEFAULT_POOL_CONFIG,
  connections: 30, // Moderate connection pool for NWS API
  bodyTimeout: 60000, // 1min for hurricane data
};

/**
 * Specialized configuration for NHC API endpoints
 */
export const NHC_POOL_CONFIG: PoolConfiguration = {
  ...DEFAULT_POOL_CONFIG,
  connections: 25, // Smaller pool for NHC
  bodyTimeout: 90000, // 90s for storm cone data
};

/**
 * Specialized configuration for IBTRACS API endpoints
 */
export const IBTRACS_POOL_CONFIG: PoolConfiguration = {
  ...DEFAULT_POOL_CONFIG,
  connections: 20, // Smaller pool for historical data
  bodyTimeout: 180000, // 3min for large historical datasets
};

/**
 * Validate pool configuration
 */
export function validatePoolConfig(config: PoolConfiguration): void {
  if (config.connections < 1) {
    throw new Error('Pool connections must be at least 1');
  }
  if (config.pipelining < 1) {
    throw new Error('Pool pipelining must be at least 1');
  }
  if (config.keepAliveTimeout < 1000) {
    throw new Error('Keep-alive timeout must be at least 1000ms');
  }
  if (config.connectTimeout < 1000) {
    throw new Error('Connect timeout must be at least 1000ms');
  }
}

/**
 * Validate resilience configuration
 */
export function validateResilienceConfig(config: ResilienceConfig): void {
  if (config.circuitBreaker.failureThreshold < 1) {
    throw new Error('Circuit breaker failure threshold must be at least 1');
  }
  if (config.retry.maxRetries < 0) {
    throw new Error('Max retries cannot be negative');
  }
  if (config.retry.jitterFactor < 0 || config.retry.jitterFactor > 1) {
    throw new Error('Jitter factor must be between 0 and 1');
  }
}
