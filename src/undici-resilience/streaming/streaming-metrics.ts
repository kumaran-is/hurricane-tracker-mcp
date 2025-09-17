/**
 * Streaming metrics collection for undici resilience
 * Specialized metrics for streaming operations and backpressure monitoring
 */

import { EventEmitter } from 'events';
import { logger } from '../logger.js';
import { BackpressureHandler } from './backpressure-handler.js';

export interface StreamingEventMetric {
  timestamp: number;
  streamId: string;
  eventType: 'start' | 'chunk' | 'backpressure' | 'resume' | 'error' | 'end';
  data: {
    bytesProcessed?: number;
    chunkSize?: number;
    bufferSize?: number;
    error?: string;
    processingTime?: number;
  };
}

export interface StreamingSummary {
  activeStreams: number;
  totalStreams: number;
  totalBytesProcessed: number;
  totalBackpressureEvents: number;
  averageStreamDuration: number;
  averageThroughput: number; // bytes per second
  peakConcurrentStreams: number;
  errorRate: number;
}

export interface StreamingHealthMetrics {
  status: 'healthy' | 'degraded' | 'critical';
  issues: string[];
  backpressureRatio: number;
  memoryUtilization: number;
  streamDistribution: {
    nws: number;
    nhc: number;
    ibtracs: number;
    other: number;
  };
}

export class StreamingMetricsCollector extends EventEmitter {
  private events: StreamingEventMetric[] = [];
  private activeStreams = new Map<string, { startTime: number; bytesProcessed: number }>();
  private completedStreams: Array<{ duration: number; bytesProcessed: number }> = [];
  private maxEvents = 50000; // Keep last 50k events
  private peakConcurrentStreams = 0;

  constructor() {
    super();
    this.startPeriodicCleanup();
  }

  /**
   * Record a streaming event
   */
  recordEvent(event: StreamingEventMetric): void {
    this.events.push(event);

    // Maintain event history limit
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Update active streams tracking
    this.updateStreamTracking(event);

    // Emit event for real-time monitoring
    this.emit('streamingEvent', event);

    // Log significant events
    this.logSignificantEvent(event);
  }

  /**
   * Record stream start
   */
  recordStreamStart(streamId: string, metadata?: any): void {
    this.activeStreams.set(streamId, {
      startTime: Date.now(),
      bytesProcessed: 0,
    });

    this.peakConcurrentStreams = Math.max(this.peakConcurrentStreams, this.activeStreams.size);

    this.recordEvent({
      timestamp: Date.now(),
      streamId,
      eventType: 'start',
      data: { ...metadata },
    });
  }

  /**
   * Record chunk processing
   */
  recordChunkProcessed(streamId: string, chunkSize: number, processingTime: number): void {
    const stream = this.activeStreams.get(streamId);
    if (stream) {
      stream.bytesProcessed += chunkSize;
    }

    this.recordEvent({
      timestamp: Date.now(),
      streamId,
      eventType: 'chunk',
      data: {
        chunkSize,
        processingTime,
        bytesProcessed: stream?.bytesProcessed || 0,
      },
    });
  }

  /**
   * Record backpressure event
   */
  recordBackpressure(streamId: string, bufferSize: number): void {
    this.recordEvent({
      timestamp: Date.now(),
      streamId,
      eventType: 'backpressure',
      data: { bufferSize },
    });
  }

  /**
   * Record stream resume after backpressure
   */
  recordResume(streamId: string, bufferSize: number): void {
    this.recordEvent({
      timestamp: Date.now(),
      streamId,
      eventType: 'resume',
      data: { bufferSize },
    });
  }

  /**
   * Record stream error
   */
  recordError(streamId: string, error: string): void {
    this.recordEvent({
      timestamp: Date.now(),
      streamId,
      eventType: 'error',
      data: { error },
    });
  }

  /**
   * Record stream end
   */
  recordStreamEnd(streamId: string): void {
    const stream = this.activeStreams.get(streamId);
    if (stream) {
      const duration = Date.now() - stream.startTime;
      this.completedStreams.push({
        duration,
        bytesProcessed: stream.bytesProcessed,
      });

      // Keep only last 1000 completed streams
      if (this.completedStreams.length > 1000) {
        this.completedStreams.shift();
      }

      this.activeStreams.delete(streamId);
    }

    this.recordEvent({
      timestamp: Date.now(),
      streamId,
      eventType: 'end',
      data: {
        bytesProcessed: stream?.bytesProcessed || 0,
      },
    });
  }

  /**
   * Get streaming summary metrics
   */
  getStreamingSummary(): StreamingSummary {
    const now = Date.now();
    const last24Hours = this.events.filter(e => now - e.timestamp < 86400000);
    
    const totalStreams = new Set(last24Hours.map(e => e.streamId)).size;
    const backpressureEvents = last24Hours.filter(e => e.eventType === 'backpressure').length;
    const errorEvents = last24Hours.filter(e => e.eventType === 'error').length;

    const totalBytesProcessed = this.completedStreams
      .reduce((sum, stream) => sum + stream.bytesProcessed, 0);

    const averageStreamDuration = this.completedStreams.length > 0
      ? this.completedStreams.reduce((sum, stream) => sum + stream.duration, 0) / this.completedStreams.length
      : 0;

    const averageThroughput = averageStreamDuration > 0
      ? (totalBytesProcessed / (averageStreamDuration / 1000)) 
      : 0;

    return {
      activeStreams: this.activeStreams.size,
      totalStreams,
      totalBytesProcessed,
      totalBackpressureEvents: backpressureEvents,
      averageStreamDuration: Math.round(averageStreamDuration),
      averageThroughput: Math.round(averageThroughput),
      peakConcurrentStreams: this.peakConcurrentStreams,
      errorRate: totalStreams > 0 ? (errorEvents / totalStreams) * 100 : 0,
    };
  }

  /**
   * Get streaming health metrics
   */
  getStreamingHealth(): StreamingHealthMetrics {
    const summary = this.getStreamingSummary();
    const now = Date.now();
    const recentEvents = this.events.filter(e => now - e.timestamp < 300000); // Last 5 minutes

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    const issues: string[] = [];

    // Calculate backpressure ratio
    const totalEvents = recentEvents.length;
    const backpressureEvents = recentEvents.filter(e => e.eventType === 'backpressure').length;
    const backpressureRatio = totalEvents > 0 ? (backpressureEvents / totalEvents) * 100 : 0;

    // Analyze health issues
    if (summary.errorRate > 25) {
      status = 'critical';
      issues.push(`High error rate: ${summary.errorRate.toFixed(1)}%`);
    } else if (summary.errorRate > 10) {
      status = 'degraded';
      issues.push(`Elevated error rate: ${summary.errorRate.toFixed(1)}%`);
    }

    if (backpressureRatio > 50) {
      status = 'critical';
      issues.push(`Excessive backpressure: ${backpressureRatio.toFixed(1)}%`);
    } else if (backpressureRatio > 20) {
      if (status === 'healthy') status = 'degraded';
      issues.push(`High backpressure: ${backpressureRatio.toFixed(1)}%`);
    }

    if (summary.activeStreams > 100) {
      if (status === 'healthy') status = 'degraded';
      issues.push(`High concurrent streams: ${summary.activeStreams}`);
    }

    // Stream distribution
    const streamDistribution = this.getStreamDistribution();

    // Memory utilization (estimated)
    const memoryUtilization = Math.min(100, (summary.activeStreams / 200) * 100);

    return {
      status,
      issues,
      backpressureRatio: Math.round(backpressureRatio * 100) / 100,
      memoryUtilization: Math.round(memoryUtilization),
      streamDistribution,
    };
  }

  /**
   * Get stream distribution by API type
   */
  private getStreamDistribution(): { nws: number; nhc: number; ibtracs: number; other: number } {
    const distribution = { nws: 0, nhc: 0, ibtracs: 0, other: 0 };

    for (const streamId of this.activeStreams.keys()) {
      if (streamId.includes('nws')) {
        distribution.nws++;
      } else if (streamId.includes('nhc')) {
        distribution.nhc++;
      } else if (streamId.includes('ibtracs')) {
        distribution.ibtracs++;
      } else {
        distribution.other++;
      }
    }

    return distribution;
  }

  /**
   * Get hurricane-specific streaming metrics
   */
  getHurricaneStreamingMetrics() {
    const now = Date.now();
    const last24Hours = this.events.filter(e => now - e.timestamp < 86400000);

    const nwsEvents = last24Hours.filter(e => e.streamId.includes('nws'));
    const nhcEvents = last24Hours.filter(e => e.streamId.includes('nhc'));
    const ibtEvents = last24Hours.filter(e => e.streamId.includes('ibtracs'));

    const getApiMetrics = (events: StreamingEventMetric[]) => {
      const streams = new Set(events.map(e => e.streamId)).size;
      const bytesProcessed = events
        .filter(e => e.data.bytesProcessed)
        .reduce((sum, e) => sum + (e.data.bytesProcessed || 0), 0);
      const backpressureEvents = events.filter(e => e.eventType === 'backpressure').length;
      const errors = events.filter(e => e.eventType === 'error').length;

      return {
        streams,
        bytesProcessed,
        backpressureEvents,
        errorRate: streams > 0 ? (errors / streams) * 100 : 0,
      };
    };

    return {
      nws: getApiMetrics(nwsEvents),
      nhc: getApiMetrics(nhcEvents),
      ibtracs: getApiMetrics(ibtEvents),
      summary: this.getStreamingSummary(),
      health: this.getStreamingHealth(),
    };
  }

  /**
   * Update stream tracking
   */
  private updateStreamTracking(event: StreamingEventMetric): void {
    const { streamId, eventType } = event;

    switch (eventType) {
      case 'start':
        if (!this.activeStreams.has(streamId)) {
          this.activeStreams.set(streamId, {
            startTime: event.timestamp,
            bytesProcessed: 0,
          });
        }
        break;

      case 'chunk':
        const stream = this.activeStreams.get(streamId);
        if (stream && event.data.chunkSize) {
          stream.bytesProcessed += event.data.chunkSize;
        }
        break;

      case 'end':
      case 'error':
        this.activeStreams.delete(streamId);
        break;
    }

    this.peakConcurrentStreams = Math.max(this.peakConcurrentStreams, this.activeStreams.size);
  }

  /**
   * Log significant streaming events
   */
  private logSignificantEvent(event: StreamingEventMetric): void {
    const { eventType, streamId, data } = event;

    switch (eventType) {
      case 'backpressure':
        logger.warn({
          streamId,
          bufferSize: data.bufferSize,
          activeStreams: this.activeStreams.size
        }, 'Stream backpressure applied');
        break;

      case 'error':
        logger.error({
          streamId,
          error: data.error,
          activeStreams: this.activeStreams.size
        }, 'Stream processing error');
        break;

      case 'chunk':
        if (data.chunkSize && data.chunkSize > 10 * 1024 * 1024) { // > 10MB
          logger.warn({
            streamId,
            chunkSize: data.chunkSize,
            processingTime: data.processingTime
          }, 'Large chunk processed');
        }
        break;
    }
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusMetrics(): string {
    const summary = this.getStreamingSummary();
    const health = this.getStreamingHealth();
    const lines: string[] = [];

    lines.push('# HELP hurricane_streaming_active_streams Number of active streaming connections');
    lines.push('# TYPE hurricane_streaming_active_streams gauge');
    lines.push(`hurricane_streaming_active_streams ${summary.activeStreams}`);

    lines.push('# HELP hurricane_streaming_bytes_total Total bytes processed through streaming');
    lines.push('# TYPE hurricane_streaming_bytes_total counter');
    lines.push(`hurricane_streaming_bytes_total ${summary.totalBytesProcessed}`);

    lines.push('# HELP hurricane_streaming_backpressure_events_total Total backpressure events');
    lines.push('# TYPE hurricane_streaming_backpressure_events_total counter');
    lines.push(`hurricane_streaming_backpressure_events_total ${summary.totalBackpressureEvents}`);

    lines.push('# HELP hurricane_streaming_throughput_bytes_per_second Average streaming throughput');
    lines.push('# TYPE hurricane_streaming_throughput_bytes_per_second gauge');
    lines.push(`hurricane_streaming_throughput_bytes_per_second ${summary.averageThroughput}`);

    lines.push('# HELP hurricane_streaming_error_rate_percent Streaming error rate percentage');
    lines.push('# TYPE hurricane_streaming_error_rate_percent gauge');
    lines.push(`hurricane_streaming_error_rate_percent ${summary.errorRate}`);

    lines.push('# HELP hurricane_streaming_backpressure_ratio_percent Backpressure event ratio');
    lines.push('# TYPE hurricane_streaming_backpressure_ratio_percent gauge');
    lines.push(`hurricane_streaming_backpressure_ratio_percent ${health.backpressureRatio}`);

    return lines.join('\n') + '\n';
  }

  /**
   * Start periodic cleanup of old data
   */
  private startPeriodicCleanup(): void {
    setInterval(() => {
      const cutoff = Date.now() - 3600000; // Keep last hour
      this.events = this.events.filter(e => e.timestamp > cutoff);

      // Clean up orphaned active streams (older than 1 hour)
      for (const [streamId, stream] of this.activeStreams) {
        if (Date.now() - stream.startTime > 3600000) {
          logger.warn({ streamId }, 'Cleaning up orphaned stream');
          this.activeStreams.delete(streamId);
        }
      }
    }, 300000); // Clean up every 5 minutes
  }

  /**
   * Integration with backpressure handlers
   */
  integrateWithBackpressureHandler(handler: BackpressureHandler, streamId: string): void {
    handler.on('backpressure', (data) => {
      this.recordBackpressure(streamId, data.bufferSize);
    });

    handler.on('resume', (data) => {
      this.recordResume(streamId, data.bufferSize);
    });

    handler.on('error', (error) => {
      this.recordError(streamId, error.message);
    });

    logger.debug({ streamId }, 'Integrated streaming metrics with backpressure handler');
  }

  /**
   * Get events for a specific stream
   */
  getStreamEvents(streamId: string, limit: number = 100): StreamingEventMetric[] {
    return this.events
      .filter(e => e.streamId === streamId)
      .slice(-limit)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Clear all metrics (for testing)
   */
  clear(): void {
    this.events = [];
    this.activeStreams.clear();
    this.completedStreams = [];
    this.peakConcurrentStreams = 0;
  }
}

// Export singleton instance
export const streamingMetricsCollector = new StreamingMetricsCollector();
