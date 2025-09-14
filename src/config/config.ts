/**
 * Hurricane Tracker MCP Server - Configuration Management
 * Production-grade configuration with Zod validation and environment-based setup
 */

import { z } from 'zod';
import { config as dotenvConfig } from 'dotenv';
import type { HurricaneTrackerConfig } from '../types.js';

// Load environment variables from .env file
dotenvConfig();

// =============================================================================
// ENVIRONMENT SCHEMA VALIDATION
// =============================================================================

const envSchema = z.object({
  // Transport Configuration
  MCP_TRANSPORT: z.enum(['stdio', 'http', 'sse']).default('stdio'),
  HTTP_PORT: z.coerce.number().min(1).max(65535).default(8080),
  HTTP_HOST: z.string().default('localhost'),

  // Data Sources
  NWS_API_BASE: z.string().url().default('https://api.weather.gov'),
  NWS_USER_AGENT: z.string().default('hurricane-tracker-mcp/1.0.0'),
  NHC_API_BASE: z.string().url().default('https://www.nhc.noaa.gov'),
  NHC_GIS_BASE: z.string().url().default('https://mapservices.weather.noaa.gov/tropical/rest/services'),
  IBTRACS_API_BASE: z.string().url().default('https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs'),

  // LLM Optimization Settings
  MAX_INPUT_TOKENS: z.coerce.number().min(100).max(100000).default(16000),
  MAX_OUTPUT_TOKENS: z.coerce.number().min(100).max(100000).default(16000),
  DEFAULT_PAGE_SIZE: z.coerce.number().min(10).max(1000).default(100),
  ENABLE_RESPONSE_STREAMING: z.coerce.boolean().default(true),
  CONTEXT_WINDOW_TARGET: z.coerce.number().min(1000).max(200000).default(16000),

  // Performance Configuration
  CACHE_TTL_SECONDS: z.coerce.number().min(60).max(3600).default(300),
  CACHE_MAX_SIZE: z.coerce.number().min(100).max(10000).default(1000),
  MAX_RETRIES: z.coerce.number().min(0).max(10).default(3),
  REQUEST_TIMEOUT_MS: z.coerce.number().min(1000).max(300000).default(30000),
  CONNECTION_TIMEOUT_MS: z.coerce.number().min(1000).max(60000).default(10000),

  // Security Settings
  RATE_LIMIT_PER_CLIENT: z.coerce.number().min(1).max(10000).default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().min(1000).max(3600000).default(60000),
  MAX_REQUEST_SIZE_BYTES: z.coerce.number().min(1024).max(10485760).default(1048576),
  ENABLE_AUDIT_LOGGING: z.coerce.boolean().default(true),
  ENABLE_INPUT_SANITIZATION: z.coerce.boolean().default(true),

  // Resilience Patterns
  CIRCUIT_BREAKER_FAILURE_THRESHOLD: z.coerce.number().min(1).max(100).default(5),
  CIRCUIT_BREAKER_RESET_TIMEOUT_MS: z.coerce.number().min(1000).max(300000).default(60000),
  CIRCUIT_BREAKER_MONITORING_PERIOD_MS: z.coerce.number().min(1000).max(60000).default(10000),

  RETRY_BASE_DELAY_MS: z.coerce.number().min(100).max(10000).default(1000),
  RETRY_MAX_DELAY_MS: z.coerce.number().min(1000).max(60000).default(10000),
  RETRY_EXPONENTIAL_FACTOR: z.coerce.number().min(1).max(10).default(2),

  MAX_CONCURRENT_REQUESTS: z.coerce.number().min(1).max(1000).default(50),
  QUEUE_SIZE_LIMIT: z.coerce.number().min(10).max(10000).default(200),

  // Monitoring & Observability
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
  ENABLE_METRICS: z.coerce.boolean().default(true),
  ENABLE_HEALTH_CHECKS: z.coerce.boolean().default(true),
  ENABLE_TRACING: z.coerce.boolean().default(false),

  METRICS_PORT: z.coerce.number().min(1).max(65535).default(9090),
  METRICS_PATH: z.string().default('/metrics'),

  HEALTH_CHECK_INTERVAL_MS: z.coerce.number().min(1000).max(300000).default(30000),
  HEALTH_CHECK_TIMEOUT_MS: z.coerce.number().min(1000).max(60000).default(5000),

  // Development Settings
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DEBUG_MODE: z.coerce.boolean().default(false),
  PRETTY_LOGS: z.coerce.boolean().default(true),

  // Feature Flags
  ENABLE_HISTORICAL_SEARCH: z.coerce.boolean().default(true),
  ENABLE_DETAILED_FORECASTS: z.coerce.boolean().default(true),
  ENABLE_GEOJSON_RESPONSES: z.coerce.boolean().default(true),
  ENABLE_ALERT_NOTIFICATIONS: z.coerce.boolean().default(true),
});

// =============================================================================
// CONFIGURATION VALIDATION AND EXPORT
// =============================================================================

/**
 * Parse and validate environment variables
 * Throws an error if validation fails
 */
function validateEnvironment() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(
        (err) => `${err.path.join('.')}: ${err.message}`
      );
      throw new Error(
        `Invalid environment configuration:\n${errorMessages.join('\n')}`
      );
    }
    throw error;
  }
}

// Validate environment on module load
const env = validateEnvironment();

/**
 * Production-grade configuration object with full type safety
 */
export const config: HurricaneTrackerConfig = {
  transport: {
    type: env.MCP_TRANSPORT,
    port: env.HTTP_PORT,
    host: env.HTTP_HOST,
  },
  dataSources: {
    nws: {
      baseUrl: env.NWS_API_BASE,
      userAgent: env.NWS_USER_AGENT,
    },
    nhc: {
      baseUrl: env.NHC_API_BASE,
      gisBaseUrl: env.NHC_GIS_BASE,
    },
    ibtracs: {
      baseUrl: env.IBTRACS_API_BASE,
    },
  },
  llm: {
    maxInputTokens: env.MAX_INPUT_TOKENS,
    maxOutputTokens: env.MAX_OUTPUT_TOKENS,
    defaultPageSize: env.DEFAULT_PAGE_SIZE,
    enableStreaming: env.ENABLE_RESPONSE_STREAMING,
    contextWindowTarget: env.CONTEXT_WINDOW_TARGET,
  },
  performance: {
    cacheTtlSeconds: env.CACHE_TTL_SECONDS,
    cacheMaxSize: env.CACHE_MAX_SIZE,
    maxRetries: env.MAX_RETRIES,
    requestTimeoutMs: env.REQUEST_TIMEOUT_MS,
    connectionTimeoutMs: env.CONNECTION_TIMEOUT_MS,
  },
  security: {
    rateLimitPerClient: env.RATE_LIMIT_PER_CLIENT,
    rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequestSizeBytes: env.MAX_REQUEST_SIZE_BYTES,
    enableAuditLogging: env.ENABLE_AUDIT_LOGGING,
    enableInputSanitization: env.ENABLE_INPUT_SANITIZATION,
  },
  resilience: {
    circuitBreaker: {
      failureThreshold: env.CIRCUIT_BREAKER_FAILURE_THRESHOLD,
      resetTimeoutMs: env.CIRCUIT_BREAKER_RESET_TIMEOUT_MS,
      monitoringPeriodMs: env.CIRCUIT_BREAKER_MONITORING_PERIOD_MS,
    },
    retry: {
      baseDelayMs: env.RETRY_BASE_DELAY_MS,
      maxDelayMs: env.RETRY_MAX_DELAY_MS,
      exponentialFactor: env.RETRY_EXPONENTIAL_FACTOR,
    },
    bulkhead: {
      maxConcurrentRequests: env.MAX_CONCURRENT_REQUESTS,
      queueSizeLimit: env.QUEUE_SIZE_LIMIT,
    },
  },
  monitoring: {
    logLevel: env.LOG_LEVEL,
    logFormat: env.LOG_FORMAT,
    enableMetrics: env.ENABLE_METRICS,
    enableHealthChecks: env.ENABLE_HEALTH_CHECKS,
    enableTracing: env.ENABLE_TRACING,
  },
};

// =============================================================================
// CONFIGURATION UTILITIES
// =============================================================================

/**
 * Get configuration for a specific feature
 */
export function getFeatureConfig(feature: keyof HurricaneTrackerConfig) {
  return config[feature];
}

/**
 * Check if running in production environment
 */
export function isProduction(): boolean {
  return env.NODE_ENV === 'production';
}

/**
 * Check if running in development environment
 */
export function isDevelopment(): boolean {
  return env.NODE_ENV === 'development';
}

/**
 * Check if running in test environment
 */
export function isTest(): boolean {
  return env.NODE_ENV === 'test';
}

/**
 * Get environment-specific configuration overrides
 */
export function getEnvironmentConfig() {
  return {
    isProd: isProduction(),
    isDev: isDevelopment(),
    isTest: isTest(),
    debugMode: env.DEBUG_MODE,
    prettyLogs: env.PRETTY_LOGS && isDevelopment(),
  };
}

/**
 * Validate configuration at runtime (useful for health checks)
 */
export function validateConfiguration(): { valid: boolean; errors?: string[] } {
  try {
    envSchema.parse(process.env);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(
        (err) => `${err.path.join('.')}: ${err.message}`
      );
      return { valid: false, errors };
    }
    return { valid: false, errors: ['Unknown validation error'] };
  }
}

/**
 * Get configuration summary for logging/debugging
 */
export function getConfigSummary() {
  return {
    transport: config.transport.type,
    logLevel: config.monitoring.logLevel,
    environment: env.NODE_ENV,
    features: {
      metrics: config.monitoring.enableMetrics,
      healthChecks: config.monitoring.enableHealthChecks,
      tracing: config.monitoring.enableTracing,
      streaming: config.llm.enableStreaming,
      auditLogging: config.security.enableAuditLogging,
    },
    limits: {
      maxInputTokens: config.llm.maxInputTokens,
      maxOutputTokens: config.llm.maxOutputTokens,
      rateLimitPerClient: config.security.rateLimitPerClient,
      maxConcurrentRequests: config.resilience.bulkhead.maxConcurrentRequests,
    },
  };
}

// Export environment schema for external validation if needed
export { envSchema };
