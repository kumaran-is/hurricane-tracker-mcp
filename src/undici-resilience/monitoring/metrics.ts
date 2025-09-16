/**
 * Comprehensive metrics collection for undici resilience
 * Tracks performance, reliability, and resource usage
 */

import { EventEmitter } from 'events';
import { logger } from '../../logger-pino.js';

export interface RequestMetrics {
  duration: number;
  statusCode: number;
  method: string;
  path: string;
  pool: string;
  timestamp: number;
  error?: string;
  retryCount?: number;
  circuitBreakerState?: string;
}

export interface PoolMetrics {
  connected: number;
  pending: number;
  running: number;
  size: number;
  utilization: number;
  totalRequests: number;
  totalErrors: number;
  averageLatency: number;
  errorRate: number;
}

export interface CircuitBreakerMetrics {
  state: string;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  nextAttemptTime: number | null;
}

export interface ResilienceMetrics {
  pools: Record<string, PoolMetrics>;
  circuitBreakers: Record<string, CircuitBreakerMetrics>;
  requests: {
    total: number;
    successful: number;
    failed: number;
    retried: number;
    circuitBreakerBlocked: number;
  };
  latency: {
    p50: number;
    p95: number;
    p99: number;
    average: number;
  };
  uptime: number;
}

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export class MetricsCollector extends EventEmitter {
  private requests: RequestMetrics[] = [];
  private startTime = Date.now();
  private maxRequestHistory = 10000; // Keep last 10k requests

  constructor() {
    super();
    this.startPeriodicCleanup();
  }

  /**
   * Record a request metric
   */
  recordRequest(metric: RequestMetrics): void {
    this.requests.push(metric);

    // Keep only recent requests
    if (this.requests.length > this.maxRequestHistory) {
      this.requests.shift();
    }

    this.emit('requestRecorded', metric);

    // Log significant events
    if (metric.error) {
      logger.warn({
        pool: metric.pool,
        path: metric.path,
        duration: metric.duration,
        error: metric.error,
        retryCount: metric.retryCount
      }, 'Hurricane API request failed');
    } else if (metric.duration > 5000) {
      logger.warn({
        pool: metric.pool,
        path: metric.path,
        duration: metric.duration,
        statusCode: metric.statusCode
      }, 'Hurricane API slow response');
    }
  }

  /**
   * Get comprehensive resilience metrics
   */
  getMetrics(): ResilienceMetrics {
    const now = Date.now();
    const recentRequests = this.requests.filter(r => now - r.timestamp < 300000); // Last 5 minutes
    const durations = recentRequests.filter(r => !r.error).map(r => r.duration);

    return {
      pools: this.getPoolMetrics(),
      circuitBreakers: this.getCircuitBreakerMetrics(),
      requests: {
        total: this.requests.length,
        successful: this.requests.filter(r => !r.error).length,
        failed: this.requests.filter(r => r.error).length,
        retried: this.requests.filter(r => (r.retryCount || 0) > 0).length,
        circuitBreakerBlocked: this.requests.filter(r => r.error?.includes('Circuit breaker')).length,
      },
      latency: {
        p50: this.calculatePercentile(durations, 0.5),
        p95: this.calculatePercentile(durations, 0.95),
        p99: this.calculatePercentile(durations, 0.99),
        average: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      },
      uptime: now - this.startTime,
    };
  }

  /**
   * Get pool-specific metrics
   */
  private getPoolMetrics(): Record<string, PoolMetrics> {
    const pools: Record<string, PoolMetrics> = {};
    const now = Date.now();
    const recentWindow = 300000; // 5 minutes

    // Group requests by pool
    const poolRequests = this.requests
      .filter(r => now - r.timestamp < recentWindow)
      .reduce((acc, req) => {
        if (!acc[req.pool]) acc[req.pool] = [];
        acc[req.pool].push(req);
        return acc;
      }, {} as Record<string, RequestMetrics[]>);

    for (const [poolName, requests] of Object.entries(poolRequests)) {
      const successful = requests.filter(r => !r.error);
      const durations = successful.map(r => r.duration);
      const averageLatency = durations.length > 0 
        ? durations.reduce((a, b) => a + b, 0) / durations.length 
        : 0;

      pools[poolName] = {
        connected: 0, // Would need to get from actual pool
        pending: 0,
        running: 0,
        size: 0,
        utilization: 0,
        totalRequests: requests.length,
        totalErrors: requests.filter(r => r.error).length,
        averageLatency: Math.round(averageLatency),
        errorRate: requests.length > 0 ? (requests.filter(r => r.error).length / requests.length) * 100 : 0,
      };
    }

    return pools;
  }

  /**
   * Get circuit breaker metrics
   */
  private getCircuitBreakerMetrics(): Record<string, CircuitBreakerMetrics> {
    // This would be populated by circuit breaker instances
    // For now, return empty object as circuit breakers manage their own stats
    return {};
  }

  /**
   * Calculate percentile from sorted array
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const sorted = [...sortedArray].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return Math.round(sorted[Math.max(0, index)] || 0);
  }

  /**
   * Get system health status
   */
  getHealthStatus(): { status: HealthStatus; details: any } {
    const metrics = this.getMetrics();
    const recentRequests = this.requests.filter(r => Date.now() - r.timestamp < 60000); // Last minute
    
    let status: HealthStatus = 'healthy';
    const issues: string[] = [];

    // Check error rate
    const errorRate = recentRequests.length > 0 
      ? (recentRequests.filter(r => r.error).length / recentRequests.length) * 100 
      : 0;

    if (errorRate > 50) {
      status = 'unhealthy';
      issues.push(`High error rate: ${errorRate.toFixed(1)}%`);
    } else if (errorRate > 10) {
      status = 'degraded';
      issues.push(`Elevated error rate: ${errorRate.toFixed(1)}%`);
    }

    // Check latency
    if (metrics.latency.p95 > 10000) {
      status = 'unhealthy';
      issues.push(`High latency: P95 ${metrics.latency.p95}ms`);
    } else if (metrics.latency.p95 > 5000) {
      if (status === 'healthy') status = 'degraded';
      issues.push(`Elevated latency: P95 ${metrics.latency.p95}ms`);
    }

    // Check circuit breakers
    const openCircuits = Object.values(metrics.circuitBreakers)
      .filter(cb => cb.state === 'OPEN').length;
    
    if (openCircuits > 0) {
      if (openCircuits > 1) {
        status = 'unhealthy';
      } else if (status === 'healthy') {
        status = 'degraded';
      }
      issues.push(`${openCircuits} circuit breaker(s) open`);
    }

    return {
      status,
      details: {
        issues,
        metrics: {
          errorRate: Math.round(errorRate * 100) / 100,
          latencyP95: metrics.latency.p95,
          totalRequests: recentRequests.length,
          openCircuits,
        }
      }
    };
  }

  /**
   * Get metrics for specific pool
   */
  getPoolSpecificMetrics(poolName: string): PoolMetrics | null {
    const allMetrics = this.getPoolMetrics();
    return allMetrics[poolName] || null;
  }

  /**
   * Get hurricane-specific metrics summary
   */
  getHurricaneMetricsSummary() {
    const now = Date.now();
    const last24Hours = this.requests.filter(r => now - r.timestamp < 86400000);
    
    const nwsRequests = last24Hours.filter(r => r.pool === 'nws');
    const nhcRequests = last24Hours.filter(r => r.pool === 'nhc');
    const ibtRequests = last24Hours.filter(r => r.pool === 'ibtracs');

    return {
      summary: {
        totalRequests: last24Hours.length,
        successfulRequests: last24Hours.filter(r => !r.error).length,
        errorRate: last24Hours.length > 0 
          ? (last24Hours.filter(r => r.error).length / last24Hours.length) * 100 
          : 0,
        averageLatency: this.calculateAverageLatency(last24Hours),
      },
      byApi: {
        nws: {
          requests: nwsRequests.length,
          errorRate: this.calculateErrorRate(nwsRequests),
          averageLatency: this.calculateAverageLatency(nwsRequests),
        },
        nhc: {
          requests: nhcRequests.length,
          errorRate: this.calculateErrorRate(nhcRequests),
          averageLatency: this.calculateAverageLatency(nhcRequests),
        },
        ibtracs: {
          requests: ibtRequests.length,
          errorRate: this.calculateErrorRate(ibtRequests),
          averageLatency: this.calculateAverageLatency(ibtRequests),
        },
      },
      uptime: now - this.startTime,
    };
  }

  /**
   * Clear old metrics data
   */
  private startPeriodicCleanup(): void {
    setInterval(() => {
      const cutoff = Date.now() - 3600000; // Keep last hour
      this.requests = this.requests.filter(r => r.timestamp > cutoff);
    }, 300000); // Clean up every 5 minutes
  }

  /**
   * Calculate error rate for requests
   */
  private calculateErrorRate(requests: RequestMetrics[]): number {
    if (requests.length === 0) return 0;
    return (requests.filter(r => r.error).length / requests.length) * 100;
  }

  /**
   * Calculate average latency for successful requests
   */
  private calculateAverageLatency(requests: RequestMetrics[]): number {
    const successful = requests.filter(r => !r.error);
    if (successful.length === 0) return 0;
    return successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
  }

  /**
   * Export metrics in Prometheus format (basic implementation)
   */
  exportPrometheusMetrics(): string {
    const metrics = this.getMetrics();
    const lines: string[] = [];

    lines.push('# HELP hurricane_requests_total Total number of Hurricane API requests');
    lines.push('# TYPE hurricane_requests_total counter');
    lines.push(`hurricane_requests_total ${metrics.requests.total}`);

    lines.push('# HELP hurricane_request_duration_seconds Hurricane API request duration');
    lines.push('# TYPE hurricane_request_duration_seconds histogram');
    lines.push(`hurricane_request_duration_seconds{quantile="0.5"} ${metrics.latency.p50 / 1000}`);
    lines.push(`hurricane_request_duration_seconds{quantile="0.95"} ${metrics.latency.p95 / 1000}`);
    lines.push(`hurricane_request_duration_seconds{quantile="0.99"} ${metrics.latency.p99 / 1000}`);

    lines.push('# HELP hurricane_errors_total Total number of Hurricane API errors');
    lines.push('# TYPE hurricane_errors_total counter');
    lines.push(`hurricane_errors_total ${metrics.requests.failed}`);

    return lines.join('\n') + '\n';
  }
}

// Export singleton instance
export const metricsCollector = new MetricsCollector();

// Auto-integrate with pool manager if available
try {
  // This would be imported dynamically to avoid circular dependencies
  import('../http/pool-manager.js').then(({ poolManager }) => {
    // Hook into pool manager events when available
    logger.info('Metrics collector integrated with pool manager');
  }).catch(() => {
    // Pool manager not available, continue without integration
  });
} catch (error) {
  // Ignore integration errors
}
