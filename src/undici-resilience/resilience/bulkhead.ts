/**
 * Bulkhead pattern implementation for resource isolation
 * Prevents cascading failures by limiting concurrent operations per resource
 */

import { logger } from '../../logger-pino.js';
import { DEFAULT_BULKHEAD_CONFIG } from '../config/pool-config.js';

export interface BulkheadConfig {
  /** Maximum concurrent operations */
  maxConcurrent: number;
  /** Maximum queue size */
  maxQueueSize: number;
  /** Timeout for queued operations (ms) */
  queueTimeout: number;
}

export interface BulkheadStats {
  activeOperations: number;
  queuedOperations: number;
  totalOperations: number;
  rejectedOperations: number;
  averageExecutionTime: number;
}

export class Bulkhead {
  private activeOperations = 0;
  private operationQueue: Array<{
    fn: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timeoutId: NodeJS.Timeout;
    queuedAt: number;
  }> = [];
  private executionTimes: number[] = [];
  private totalOperations = 0;
  private rejectedOperations = 0;

  constructor(
    private name: string,
    private config: BulkheadConfig
  ) {
    if (config.maxConcurrent < 1) {
      throw new Error('maxConcurrent must be at least 1');
    }
    if (config.maxQueueSize < 0) {
      throw new Error('maxQueueSize cannot be negative');
    }
    if (config.queueTimeout < 0) {
      throw new Error('queueTimeout cannot be negative');
    }
  }

  /**
   * Execute a function with bulkhead protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalOperations++;

    // If we have capacity, execute immediately
    if (this.activeOperations < this.config.maxConcurrent) {
      return this.executeOperation(fn);
    }

    // Check if queue has space
    if (this.operationQueue.length >= this.config.maxQueueSize) {
      this.rejectedOperations++;
      logger.warn({
        bulkhead: this.name,
        activeOperations: this.activeOperations,
        queuedOperations: this.operationQueue.length,
        maxConcurrent: this.config.maxConcurrent,
        maxQueueSize: this.config.maxQueueSize
      }, 'Bulkhead rejecting operation - queue full');
      throw new Error(`Bulkhead '${this.name}' queue is full`);
    }

    // Queue the operation
    return new Promise<T>((resolve, reject) => {
      const queuedAt = Date.now();
      const timeoutId = setTimeout(() => {
        // Remove from queue
        const index = this.operationQueue.findIndex(item => item.timeoutId === timeoutId);
        if (index !== -1) {
          this.operationQueue.splice(index, 1);
        }

        this.rejectedOperations++;
        logger.warn({
          bulkhead: this.name,
          queuedTime: Date.now() - queuedAt,
          queueTimeout: this.config.queueTimeout
        }, 'Bulkhead operation timed out in queue');

        reject(new Error(`Bulkhead '${this.name}' operation timed out in queue`));
      }, this.config.queueTimeout);

      this.operationQueue.push({
        fn,
        resolve,
        reject,
        timeoutId,
        queuedAt
      });

      logger.debug({
        bulkhead: this.name,
        activeOperations: this.activeOperations,
        queuedOperations: this.operationQueue.length
      }, 'Operation queued in bulkhead');
    });
  }

  /**
   * Execute an operation and manage the bulkhead state
   */
  private async executeOperation<T>(fn: () => Promise<T>): Promise<T> {
    this.activeOperations++;
    const startTime = Date.now();

    try {
      logger.debug({
        bulkhead: this.name,
        activeOperations: this.activeOperations,
        queuedOperations: this.operationQueue.length
      }, 'Starting bulkhead operation');

      const result = await fn();
      const executionTime = Date.now() - startTime;

      // Track execution time
      this.executionTimes.push(executionTime);
      if (this.executionTimes.length > 100) {
        this.executionTimes.shift(); // Keep only last 100 measurements
      }

      logger.debug({
        bulkhead: this.name,
        executionTime,
        activeOperations: this.activeOperations
      }, 'Bulkhead operation completed successfully');

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      logger.warn({
        bulkhead: this.name,
        executionTime,
        error: (error as Error).message,
        activeOperations: this.activeOperations
      }, 'Bulkhead operation failed');

      throw error;
    } finally {
      this.activeOperations--;

      // Process next queued operation if available
      if (this.operationQueue.length > 0 && this.activeOperations < this.config.maxConcurrent) {
        const nextOperation = this.operationQueue.shift()!;
        clearTimeout(nextOperation.timeoutId);

        // Execute the queued operation
        this.executeOperation(nextOperation.fn)
          .then(nextOperation.resolve)
          .catch(nextOperation.reject);
      }
    }
  }

  /**
   * Get current bulkhead statistics
   */
  getStats(): BulkheadStats {
    const avgExecutionTime = this.executionTimes.length > 0
      ? this.executionTimes.reduce((sum, time) => sum + time, 0) / this.executionTimes.length
      : 0;

    return {
      activeOperations: this.activeOperations,
      queuedOperations: this.operationQueue.length,
      totalOperations: this.totalOperations,
      rejectedOperations: this.rejectedOperations,
      averageExecutionTime: Math.round(avgExecutionTime)
    };
  }

  /**
   * Get bulkhead name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Check if bulkhead can accept new operations
   */
  canAcceptOperations(): boolean {
    return this.activeOperations < this.config.maxConcurrent ||
           this.operationQueue.length < this.config.maxQueueSize;
  }

  /**
   * Get current utilization percentage
   */
  getUtilization(): number {
    return (this.activeOperations / this.config.maxConcurrent) * 100;
  }

  /**
   * Hurricane-specific bulkhead execution helper
   */
  async executeHurricaneOperation<T>(
    fn: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    try {
      return await this.execute(fn);
    } catch (error) {
      const enhancedError = new Error(
        `Hurricane operation '${operationName}' failed in bulkhead: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      (enhancedError as any).originalError = error;
      (enhancedError as any).operationName = operationName;
      (enhancedError as any).bulkheadStats = this.getStats();
      throw enhancedError;
    }
  }
}

/**
 * Bulkhead manager for coordinating multiple bulkheads
 */
export class BulkheadManager {
  private bulkheads = new Map<string, Bulkhead>();

  /**
   * Create or get a bulkhead
   */
  getBulkhead(name: string, config: BulkheadConfig): Bulkhead {
    if (!this.bulkheads.has(name)) {
      const bulkhead = new Bulkhead(name, config);
      this.bulkheads.set(name, bulkhead);
    }
    return this.bulkheads.get(name)!;
  }

  /**
   * Get all bulkhead statistics
   */
  getAllStats(): Record<string, BulkheadStats> {
    const stats: Record<string, BulkheadStats> = {};
    for (const [name, bulkhead] of this.bulkheads) {
      stats[name] = bulkhead.getStats();
    }
    return stats;
  }

  /**
   * Get overall system utilization
   */
  getOverallUtilization(): number {
    if (this.bulkheads.size === 0) return 0;

    const totalUtilization = Array.from(this.bulkheads.values())
      .reduce((sum, bulkhead) => sum + bulkhead.getUtilization(), 0);

    return totalUtilization / this.bulkheads.size;
  }
}

// Export singleton instance
export const bulkheadManager = new BulkheadManager();
