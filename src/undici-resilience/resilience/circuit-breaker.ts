/**
 * Circuit Breaker implementation for resilient HTTP requests
 * Prevents cascading failures by temporarily stopping requests to failing services
 */

import { logger } from '../../logging/logger-pino.js';

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing recovery
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  nextAttemptTime: number | null;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private consecutiveFailures = 0;
  private successes = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private nextAttemptTime: number | null = null;

  constructor(
    private name: string,
    private failureThreshold: number,
    private recoveryTimeout: number,
    private healthCheckInterval: number = 5000
  ) {
    if (failureThreshold < 1) {
      throw new Error('Failure threshold must be at least 1');
    }
    if (recoveryTimeout < 1000) {
      throw new Error('Recovery timeout must be at least 1000ms');
    }
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) {
      const error = new Error(`Circuit breaker '${this.name}' is ${this.state}`);
      logger.warn({
        circuitBreaker: this.name,
        state: this.state,
        nextAttemptTime: this.nextAttemptTime
      }, 'Circuit breaker blocking request');
      throw error;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Check if request can be executed
   */
  private canExecute(): boolean {
    const now = Date.now();

    switch (this.state) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN:
        if (this.nextAttemptTime && now >= this.nextAttemptTime) {
          this.state = CircuitState.HALF_OPEN;
          logger.info({
            circuitBreaker: this.name,
            previousState: CircuitState.OPEN,
            newState: CircuitState.HALF_OPEN
          }, 'Circuit breaker transitioning to half-open');
          return true;
        }
        return false;

      case CircuitState.HALF_OPEN:
        return true;

      default:
        return false;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    const now = Date.now();
    this.successes++;
    this.lastSuccessTime = now;
    this.consecutiveFailures = 0; // Reset consecutive failures on success

    if (this.state === CircuitState.HALF_OPEN) {
      // Recovery successful, close the circuit
      this.reset();
      logger.info({
        circuitBreaker: this.name,
        previousState: CircuitState.HALF_OPEN,
        newState: CircuitState.CLOSED,
        successes: this.successes
      }, 'Circuit breaker recovered successfully');
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    const now = Date.now();
    this.failures++;
    this.consecutiveFailures++;
    this.lastFailureTime = now;

    if (this.state === CircuitState.HALF_OPEN) {
      // Recovery failed, open the circuit again
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = now + this.recoveryTimeout;
      logger.warn({
        circuitBreaker: this.name,
        previousState: CircuitState.HALF_OPEN,
        newState: CircuitState.OPEN,
        failures: this.failures,
        nextAttemptTime: this.nextAttemptTime
      }, 'Circuit breaker recovery failed');
    } else if (this.state === CircuitState.CLOSED && this.consecutiveFailures >= this.failureThreshold) {
      // Too many consecutive failures, open the circuit
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = now + this.recoveryTimeout;
      logger.warn({
        circuitBreaker: this.name,
        previousState: CircuitState.CLOSED,
        newState: CircuitState.OPEN,
        consecutiveFailures: this.consecutiveFailures,
        threshold: this.failureThreshold,
        nextAttemptTime: this.nextAttemptTime
      }, 'Circuit breaker opened due to failures');
    }
  }

  /**
   * Reset circuit breaker to initial state
   */
  private reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.consecutiveFailures = 0;
    this.nextAttemptTime = null;
  }

  /**
   * Force circuit breaker to open (for testing or manual intervention)
   */
  forceOpen(): void {
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = Date.now() + this.recoveryTimeout;
    logger.warn({
      circuitBreaker: this.name,
      forced: true,
      nextAttemptTime: this.nextAttemptTime
    }, 'Circuit breaker force opened');
  }

  /**
   * Force circuit breaker to close (for testing or manual intervention)
   */
  forceClose(): void {
    this.reset();
    logger.info({
      circuitBreaker: this.name,
      forced: true
    }, 'Circuit breaker force closed');
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  /**
   * Get circuit breaker name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Check if circuit breaker is in a healthy state
   */
  isHealthy(): boolean {
    return this.state === CircuitState.CLOSED ||
           (this.state === CircuitState.HALF_OPEN && this.successes > 0);
  }

  /**
   * Hurricane-specific helper to handle API endpoint failures
   */
  async executeHurricaneAPICall<T>(
    apiCall: () => Promise<T>,
    apiName: string
  ): Promise<T> {
    try {
      return await this.execute(apiCall);
    } catch (error) {
      // Add hurricane-specific error context
      const enhancedError = new Error(
        `Hurricane API call failed for ${apiName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      (enhancedError as any).originalError = error;
      (enhancedError as any).apiName = apiName;
      (enhancedError as any).circuitBreakerState = this.state;
      throw enhancedError;
    }
  }

  /**
   * Check if the circuit breaker should allow a health check
   */
  shouldPerformHealthCheck(): boolean {
    const now = Date.now();
    return this.state === CircuitState.OPEN && 
           this.nextAttemptTime !== null && 
           now >= this.nextAttemptTime - this.healthCheckInterval;
  }
}
