/**
 * @fileoverview Authentication configuration adapter
 * Provides backward-compatible config exports for middleware
 */

import { config as rawConfig, getEnvironmentConfig } from './config.js';

const envConfig = getEnvironmentConfig();

// Simple config object for backward compatibility with middleware
export const config = {
  NODE_ENV: envConfig.isDev ? 'development' : envConfig.isProd ? 'production' : 'test',
  AUTH_ENABLED: rawConfig.security.authEnabled,
  MCP_SERVER_API_KEYS: rawConfig.security.apiKeys,
  SESSION_TIMEOUT: rawConfig.security.sessionTimeout,
  RATE_LIMIT_PER_CLIENT: rawConfig.security.rateLimitPerClient,
  RATE_LIMIT_WINDOW_MS: rawConfig.security.rateLimitWindowMs,
  RATE_LIMIT_ENABLED: rawConfig.security.rateLimitEnabled,
  RATE_LIMIT_BURST: rawConfig.security.rateLimitBurst,
  RATE_LIMIT_BLOCK_DURATION: rawConfig.security.rateLimitBlockDuration,
  RATE_LIMIT_WHITELIST: rawConfig.security.rateLimitWhitelist,
  ENABLE_INPUT_SANITIZATION: rawConfig.security.enableInputSanitization,
  MAX_REQUEST_SIZE_BYTES: rawConfig.security.maxRequestSizeBytes,
  ALLOWED_ORIGINS: rawConfig.security.allowedOrigins,
};
