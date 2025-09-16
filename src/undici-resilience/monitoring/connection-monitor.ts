/**
 * Connection monitoring for undici pools
 * Tracks connection health and performance
 */

import { EventEmitter } from 'events';
import { logger } from '../logger.js';

export interface ConnectionStats {
  pool: string;
  connected: number;
  connecting: number;
  pending: number;
  running: number;
  size: number;
  free: number;
  busy: number;
}

export interface ConnectionHealth {
  isHealthy: boolean;
  issues: string[];
  stats: ConnectionStats;
  lastCheck: number;
}

export class ConnectionMonitor extends EventEmitter {
  private healthChecks = new Map<string, ConnectionHealth>();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private checkInterval = 30000; // 30 seconds

  constructor() {
    super();
    this.startMonitoring();
  }

  /**
   * Start connection monitoring
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.checkInterval);

    logger.info('Connection monitoring started');
  }

  /**
   * Stop connection monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    logger.info('Connection monitoring stopped');
  }

  /**
   * Record connection stats for a pool
   */
  recordConnectionStats(poolName: string, stats: ConnectionStats): void {
    const health = this.analyzeConnectionHealth(stats);
    
    this.healthChecks.set(poolName, {
      isHealthy: health.isHealthy,
      issues: health.issues,
      stats,
      lastCheck: Date.now(),
    });

    this.emit('statsRecorded', { poolName, stats, health });

    // Log issues if any
    if (!health.isHealthy) {
      logger.warn({
        pool: poolName,
        issues: health.issues,
        stats
      }, 'Connection health issues detected');
    }
  }

  /**
   * Analyze connection health
   */
  private analyzeConnectionHealth(stats: ConnectionStats): { isHealthy: boolean; issues: string[] } {
    const issues: string[] = [];
    let isHealthy = true;

    // Check utilization
    const utilization = stats.size > 0 ? (stats.busy / stats.size) * 100 : 0;
    if (utilization > 90) {
      issues.push(`High utilization: ${utilization.toFixed(1)}%`);
      isHealthy = false;
    } else if (utilization > 75) {
      issues.push(`Elevated utilization: ${utilization.toFixed(1)}%`);
    }

    // Check pending requests
    if (stats.pending > stats.size * 2) {
      issues.push(`High pending requests: ${stats.pending}`);
      isHealthy = false;
    }

    // Check connection count
    if (stats.connected < stats.size * 0.5) {
      issues.push(`Low connection count: ${stats.connected}/${stats.size}`);
      isHealthy = false;
    }

    // Check if too many connections are connecting (might indicate issues)
    if (stats.connecting > stats.size * 0.3) {
      issues.push(`Many connecting: ${stats.connecting}`);
    }

    return { isHealthy: isHealthy && issues.length === 0, issues };
  }

  /**
   * Get connection health for a pool
   */
  getConnectionHealth(poolName: string): ConnectionHealth | null {
    return this.healthChecks.get(poolName) || null;
  }

  /**
   * Get all connection health data
   */
  getAllConnectionHealth(): Record<string, ConnectionHealth> {
    const health: Record<string, ConnectionHealth> = {};
    for (const [poolName, healthData] of this.healthChecks) {
      health[poolName] = healthData;
    }
    return health;
  }

  /**
   * Get overall system connection health
   */
  getOverallHealth(): { isHealthy: boolean; unhealthyPools: string[]; issues: string[] } {
    const allHealth = this.getAllConnectionHealth();
    const unhealthyPools: string[] = [];
    const allIssues: string[] = [];

    for (const [poolName, health] of Object.entries(allHealth)) {
      if (!health.isHealthy) {
        unhealthyPools.push(poolName);
        allIssues.push(...health.issues.map(issue => `${poolName}: ${issue}`));
      }
    }

    return {
      isHealthy: unhealthyPools.length === 0,
      unhealthyPools,
      issues: allIssues,
    };
  }

  /**
   * Perform periodic health checks
   */
  private performHealthChecks(): void {
    const now = Date.now();
    const staleThreshold = this.checkInterval * 3; // 90 seconds

    // Check for stale data
    for (const [poolName, health] of this.healthChecks) {
      if (now - health.lastCheck > staleThreshold) {
        logger.warn({
          pool: poolName,
          lastCheck: health.lastCheck,
          staleDuration: now - health.lastCheck
        }, 'Stale connection data detected');
        
        this.emit('staleData', { poolName, lastCheck: health.lastCheck });
      }
    }

    // Emit overall health status
    const overallHealth = this.getOverallHealth();
    this.emit('healthCheck', overallHealth);

    if (!overallHealth.isHealthy) {
      logger.warn({
        unhealthyPools: overallHealth.unhealthyPools,
        issues: overallHealth.issues
      }, 'System connection health degraded');
    }
  }

  /**
   * Hurricane-specific connection monitoring
   */
  getHurricaneConnectionSummary() {
    const allHealth = this.getAllConnectionHealth();
    const summary = {
      nws: allHealth['nws'] || null,
      nhc: allHealth['nhc'] || null,
      ibtracs: allHealth['ibtracs'] || null,
    };

    const healthyCount = Object.values(summary).filter(h => h?.isHealthy).length;
    const totalCount = Object.values(summary).filter(h => h !== null).length;

    return {
      ...summary,
      overall: {
        healthyPools: healthyCount,
        totalPools: totalCount,
        healthPercentage: totalCount > 0 ? (healthyCount / totalCount) * 100 : 100,
      },
    };
  }

  /**
   * Set monitoring interval
   */
  setCheckInterval(intervalMs: number): void {
    this.checkInterval = intervalMs;
    if (this.monitoringInterval) {
      this.startMonitoring(); // Restart with new interval
    }
  }
}

// Export singleton instance
export const connectionMonitor = new ConnectionMonitor();
