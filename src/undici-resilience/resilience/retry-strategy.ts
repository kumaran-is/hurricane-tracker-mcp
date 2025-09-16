/**
 * Retry strategy with exponential backoff and jitter
 * Implements intelligent retry logic to prevent thundering herd problems
 */

import { logger } from '../../logger-pino.js';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  jitterFactor: number;
}

export interface RetryAttempt {
  attempt: number;
  delay: number;
  totalDelay: number;
  error: Error;
}

export class RetryStrategy {
  constructor(private config: RetryConfig) {
    this.validateConfig();
  }

  /**
   * Execute a function with retry logic
   */
  async execute<T>(
    fn: () => Promise<T>,
    context?: string
  ): Promise<T> {
    let lastError: Error | null = null;
    let totalDelay = 0;

    for (let attempt = 1; attempt <= this.config.maxRetries + 1; attempt++) {
      try {
        if (attempt > 1) {
          logger.debug({
            attempt,
            maxRetries: this.config.maxRetries,
            context
          }, 'Retrying operation');
        }

        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt > this.config.maxRetries) {
          break;
        }

        const delay = this.calculateDelay(attempt);
        totalDelay += delay;

        logger.warn({
          attempt,
          maxRetries: this.config.maxRetries,
          delay,
          totalDelay,
          error: lastError.message,
          context
        }, 'Operation failed, retrying');

        await this.sleep(delay);
      }
    }

    if (!lastError) {
      throw new Error('Unexpected error: no error captured during retries');
    }

    logger.error({
      attempts: this.config.maxRetries + 1,
      totalDelay,
      finalError: lastError.message,
      context
    }, 'All retry attempts exhausted');

    throw lastError;
  }

  /**
   * Calculate delay for exponential backoff with jitter
   */
  private calculateDelay(attempt: number): number {
    // Exponential backoff: baseDelay * 2^(attempt - 1)
    const exponentialDelay = this.config.baseDelay * Math.pow(2, attempt - 1);

    // Cap at maxDelay
    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelay);

    // Add jitter to prevent thundering herd
    const jitter = cappedDelay * this.config.jitterFactor * Math.random();

    return Math.floor(cappedDelay + jitter);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate retry configuration
   */
  private validateConfig(): void {
    if (this.config.maxRetries < 0) {
      throw new Error('maxRetries cannot be negative');
    }
    if (this.config.baseDelay < 0) {
      throw new Error('baseDelay cannot be negative');
    }
    if (this.config.maxDelay < this.config.baseDelay) {
      throw new Error('maxDelay must be greater than or equal to baseDelay');
    }
    if (this.config.jitterFactor < 0 || this.config.jitterFactor > 1) {
      throw new Error('jitterFactor must be between 0 and 1');
    }
  }

  /**
   * Get retry configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }

  /**
   * Update retry configuration
   */
  updateConfig(newConfig: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.validateConfig();
  }

  /**
   * Hurricane-specific retry logic for API calls
   */
  async executeHurricaneAPICall<T>(
    fn: () => Promise<T>,
    apiEndpoint: string
  ): Promise<T> {
    return this.execute(fn, `Hurricane API: ${apiEndpoint}`);
  }
}

/**
 * Pre-configured retry strategies for different use cases
 */
export class RetryStrategies {
  /**
   * Aggressive retry strategy for fast-failing operations
   */
  static aggressive(): RetryStrategy {
    return new RetryStrategy({
      maxRetries: 5,
      baseDelay: 100,
      maxDelay: 2000,
      jitterFactor: 0.1,
    });
  }

  /**
   * Conservative retry strategy for slow operations
   */
  static conservative(): RetryStrategy {
    return new RetryStrategy({
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      jitterFactor: 0.2,
    });
  }

  /**
   * Network-specific retry strategy
   */
  static network(): RetryStrategy {
    return new RetryStrategy({
      maxRetries: 4,
      baseDelay: 500,
      maxDelay: 8000,
      jitterFactor: 0.15,
    });
  }

  /**
   * API-specific retry strategy
   */
  static api(): RetryStrategy {
    return new RetryStrategy({
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 15000,
      jitterFactor: 0.25,
    });
  }

  /**
   * Hurricane data specific retry strategy
   */
  static hurricane(): RetryStrategy {
    return new RetryStrategy({
      maxRetries: 4,
      baseDelay: 2000, // Longer base delay for hurricane APIs
      maxDelay: 30000, // Up to 30s for large datasets
      jitterFactor: 0.3, // More jitter for distributed hurricane data requests
    });
  }

  /**
   * NWS API specific retry strategy
   */
  static nws(): RetryStrategy {
    return new RetryStrategy({
      maxRetries: 3,
      baseDelay: 1500,
      maxDelay: 12000,
      jitterFactor: 0.2,
    });
  }

  /**
   * NHC API specific retry strategy
   */
  static nhc(): RetryStrategy {
    return new RetryStrategy({
      maxRetries: 4,
      baseDelay: 2000,
      maxDelay: 15000,
      jitterFactor: 0.25,
    });
  }

  /**
   * Historical data (IBTRACS) retry strategy
   */
  static historical(): RetryStrategy {
    return new RetryStrategy({
      maxRetries: 2, // Less retries for historical data
      baseDelay: 5000, // Longer delays for large datasets
      maxDelay: 60000, // Up to 1 minute for very large requests
      jitterFactor: 0.4,
    });
  }

  /**
   * Custom retry strategy
   */
  static custom(config: RetryConfig): RetryStrategy {
    return new RetryStrategy(config);
  }
}

/**
 * Utility function for simple retry with default strategy
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  context?: string
): Promise<T> {
  const strategy = new RetryStrategy({
    maxRetries,
    baseDelay: 1000,
    maxDelay: 10000,
    jitterFactor: 0.1,
  });

  return strategy.execute(fn, context);
}

/**
 * Hurricane-specific utility function for retrying API calls
 */
export async function withHurricaneRetry<T>(
  fn: () => Promise<T>,
  apiName: string
): Promise<T> {
  const strategy = RetryStrategies.hurricane();
  return strategy.executeHurricaneAPICall(fn, apiName);
}
