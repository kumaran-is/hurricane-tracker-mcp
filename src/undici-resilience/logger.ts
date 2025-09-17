/**
 * Undici resilience logger wrapper
 * Provides consistent logging interface for the resilience package
 */

import { logger as mainLogger } from '../logging/logger-pino.js';

/**
 * Re-export main logger with resilience context
 */
export const logger = mainLogger.child({ component: 'undici-resilience' });

/**
 * Log resilience events with structured data
 */
export const resilienceLogger = {
  /**
   * Log circuit breaker events
   */
  circuitBreaker: (event: string, data: any) => {
    logger.info({ ...data, event, type: 'circuit-breaker' }, `Circuit breaker: ${event}`);
  },

  /**
   * Log retry events
   */
  retry: (event: string, data: any) => {
    logger.warn({ ...data, event, type: 'retry' }, `Retry: ${event}`);
  },

  /**
   * Log bulkhead events
   */
  bulkhead: (event: string, data: any) => {
    logger.debug({ ...data, event, type: 'bulkhead' }, `Bulkhead: ${event}`);
  },

  /**
   * Log pool events
   */
  pool: (event: string, data: any) => {
    logger.info({ ...data, event, type: 'pool' }, `Pool: ${event}`);
  },

  /**
   * Log metrics events
   */
  metrics: (event: string, data: any) => {
    logger.debug({ ...data, event, type: 'metrics' }, `Metrics: ${event}`);
  },
};
