/**
 * Streaming Pool Manager for optimized hurricane data streaming
 * Combines undici pools with streaming backpressure and metrics
 */

import { Pool, Dispatcher } from 'undici';
import { EventEmitter } from 'events';
import { logger } from '../logger.js';
import { BackpressureHandler, BackpressureConfig, backpressurePoolManager } from './backpressure-handler.js';
import { streamingMetricsCollector } from './streaming-metrics.js';
import { CircuitBreaker } from '../resilience/circuit-breaker.js';
import { RetryStrategy } from '../resilience/retry-strategy.js';
import { 
  NWS_POOL_CONFIG, 
  NHC_POOL_CONFIG, 
  IBTRACS_POOL_CONFIG,
  DEFAULT_RESILIENCE_CONFIG 
} from '../config/pool-config.js';

export interface StreamingPoolOptions {
  poolConfig: {
    connections: number;
    pipelining: number;
    keepAliveTimeout: number;
    bodyTimeout: number;
  };
  backpressureConfig: BackpressureConfig;
  enableMetrics: boolean;
  enableResilience: boolean;
}

export interface StreamingRequest {
  path: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}

export interface StreamingResponse {
  statusCode: number;
  headers: Record<string, string>;
  stream: NodeJS.ReadableStream;
  metadata: {
    streamId: string;
    contentLength?: number;
    contentType?: string;
  };
}

export class StreamingPoolManager extends EventEmitter {
  private pools = new Map<string, Pool>();
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private retryStrategies = new Map<string, RetryStrategy>();
  private activeStreams = new Map<string, {
    startTime: number;
    bytesReceived: number;
    backpressureHandler?: BackpressureHandler;
  }>();

  constructor() {
    super();
    this.initializeHurricanePools();
  }

  /**
   * Initialize hurricane-specific streaming pools
   */
  private initializeHurricanePools(): void {
    // NWS Pool for real-time hurricane data
    this.createStreamingPool('nws', {
      url: process.env.NWS_API_BASE_URL || 'https://api.weather.gov',
      poolConfig: {
        connections: NWS_POOL_CONFIG.connections,
        pipelining: NWS_POOL_CONFIG.pipelining,
        keepAliveTimeout: NWS_POOL_CONFIG.keepAliveTimeout,
        bodyTimeout: NWS_POOL_CONFIG.bodyTimeout,
      },
      backpressureConfig: {
        highWaterMark: 1024 * 1024, // 1MB
        lowWaterMark: 512 * 1024,   // 512KB
        maxBufferSize: 5 * 1024 * 1024, // 5MB
        timeout: 30000,
        adaptive: true,
      },
      enableMetrics: true,
      enableResilience: true,
    });

    // NHC Pool for storm forecast data
    this.createStreamingPool('nhc', {
      url: process.env.NHC_API_BASE_URL || 'https://www.nhc.noaa.gov',
      poolConfig: {
        connections: NHC_POOL_CONFIG.connections,
        pipelining: NHC_POOL_CONFIG.pipelining,
        keepAliveTimeout: NHC_POOL_CONFIG.keepAliveTimeout,
        bodyTimeout: NHC_POOL_CONFIG.bodyTimeout,
      },
      backpressureConfig: {
        highWaterMark: 2 * 1024 * 1024, // 2MB
        lowWaterMark: 1024 * 1024,      // 1MB
        maxBufferSize: 10 * 1024 * 1024, // 10MB
        timeout: 45000,
        adaptive: true,
      },
      enableMetrics: true,
      enableResilience: true,
    });

    // IBTRACS Pool for historical hurricane data
    this.createStreamingPool('ibtracs', {
      url: process.env.IBTRACS_API_BASE_URL || 'https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs',
      poolConfig: {
        connections: IBTRACS_POOL_CONFIG.connections,
        pipelining: IBTRACS_POOL_CONFIG.pipelining,
        keepAliveTimeout: IBTRACS_POOL_CONFIG.keepAliveTimeout,
        bodyTimeout: IBTRACS_POOL_CONFIG.bodyTimeout,
      },
      backpressureConfig: {
        highWaterMark: 5 * 1024 * 1024,  // 5MB
        lowWaterMark: 2 * 1024 * 1024,   // 2MB
        maxBufferSize: 50 * 1024 * 1024, // 50MB
        timeout: 120000,
        adaptive: true,
      },
      enableMetrics: true,
      enableResilience: true,
    });

    logger.info({
      pools: Array.from(this.pools.keys())
    }, 'Hurricane streaming pools initialized');
  }

  /**
   * Create a streaming pool with full resilience
   */
  createStreamingPool(poolName: string, options: {
    url: string;
    poolConfig: StreamingPoolOptions['poolConfig'];
    backpressureConfig: BackpressureConfig;
    enableMetrics: boolean;
    enableResilience: boolean;
  }): void {
    // Create undici pool
    const pool = new Pool(options.url, {
      connections: options.poolConfig.connections,
      pipelining: options.poolConfig.pipelining,
      keepAliveTimeout: options.poolConfig.keepAliveTimeout,
      bodyTimeout: options.poolConfig.bodyTimeout,
    });

    this.pools.set(poolName, pool);

    // Setup resilience if enabled
    if (options.enableResilience) {
      const circuitBreaker = new CircuitBreaker(
        `${poolName}-streaming`,
        DEFAULT_RESILIENCE_CONFIG.circuitBreaker.failureThreshold,
        DEFAULT_RESILIENCE_CONFIG.circuitBreaker.recoveryTimeout
      );
      this.circuitBreakers.set(poolName, circuitBreaker);

      const retryStrategy = new RetryStrategy(DEFAULT_RESILIENCE_CONFIG.retry);
      this.retryStrategies.set(poolName, retryStrategy);
    }

    // Setup pool event handlers
    pool.on('connect', (origin) => {
      logger.debug({ pool: poolName, origin }, 'Streaming pool connected');
    });

    pool.on('disconnect', (origin, targets, error) => {
      logger.warn({
        pool: poolName,
        origin,
        targets: targets?.length || 0,
        error: error?.message
      }, 'Streaming pool disconnected');
    });

    logger.info({
      pool: poolName,
      url: options.url,
      connections: options.poolConfig.connections,
      resilience: options.enableResilience,
      metrics: options.enableMetrics
    }, 'Streaming pool created');
  }

  /**
   * Make a streaming request with full resilience and backpressure handling
   */
  async streamRequest(
    poolName: string, 
    request: StreamingRequest,
    processor: (chunk: Buffer) => Promise<void>
  ): Promise<StreamingResponse> {
    const pool = this.pools.get(poolName);
    if (!pool) {
      throw new Error(`Streaming pool '${poolName}' not found`);
    }

    const streamId = this.generateStreamId(poolName);
    const startTime = Date.now();

    // Record stream start
    streamingMetricsCollector.recordStreamStart(streamId, {
      poolName,
      path: request.path,
      method: request.method || 'GET'
    });

    try {
      // Execute with resilience if available
      const circuitBreaker = this.circuitBreakers.get(poolName);
      const retryStrategy = this.retryStrategies.get(poolName);

      const executeRequest = async () => {
        const response = await pool.request({
          path: request.path,
          method: request.method || 'GET',
          headers: {
            'User-Agent': 'Hurricane-Tracker-MCP-Streaming (contact@hurricane-tracker.com)',
            ...request.headers,
          },
          body: request.body,
        });

        if (response.statusCode >= 400) {
          throw new Error(`HTTP ${response.statusCode} for ${request.path}`);
        }

        return response;
      };

      let response: Dispatcher.ResponseData;

      if (circuitBreaker && retryStrategy) {
        response = await circuitBreaker.execute(async () => {
          return await retryStrategy.execute(executeRequest, `Streaming ${poolName}`);
        });
      } else {
        response = await executeRequest();
      }

      // Create backpressure handler for this stream
      const backpressureHandler = backpressurePoolManager.createHurricaneHandler(
        poolName as 'nws' | 'nhc' | 'ibtracs'
      );

      // Integrate with metrics
      streamingMetricsCollector.integrateWithBackpressureHandler(backpressureHandler, streamId);

      // Track active stream
      this.activeStreams.set(streamId, {
        startTime,
        bytesReceived: 0,
        backpressureHandler,
      });

      // Create streaming response wrapper
      const streamingResponse: StreamingResponse = {
        statusCode: response.statusCode,
        headers: response.headers as Record<string, string>,
        stream: this.createManagedStream(response.body, streamId, backpressureHandler, processor),
        metadata: {
          streamId,
          contentLength: response.headers['content-length'] 
            ? parseInt(response.headers['content-length'] as string) 
            : undefined,
          contentType: response.headers['content-type'] as string,
        },
      };

      logger.info({
        streamId,
        poolName,
        path: request.path,
        statusCode: response.statusCode,
        contentLength: streamingResponse.metadata.contentLength,
        setupTime: Date.now() - startTime
      }, 'Streaming request initiated');

      return streamingResponse;

    } catch (error) {
      streamingMetricsCollector.recordError(streamId, (error as Error).message);
      
      logger.error({
        streamId,
        poolName,
        path: request.path,
        error: (error as Error).message,
        duration: Date.now() - startTime
      }, 'Streaming request failed');

      throw error;
    }
  }

  /**
   * Create a managed stream with backpressure and metrics
   */
  private createManagedStream(
    sourceStream: NodeJS.ReadableStream,
    streamId: string,
    backpressureHandler: BackpressureHandler,
    processor: (chunk: Buffer) => Promise<void>
  ): NodeJS.ReadableStream {
    const { Transform } = require('stream');

    const managedStream = new Transform({
      transform: async (chunk: Buffer, _encoding: any, callback: any) => {
        try {
          const chunkStartTime = Date.now();
          
          // Update stream tracking
          const stream = this.activeStreams.get(streamId);
          if (stream) {
            stream.bytesReceived += chunk.length;
          }

          // Record chunk processing
          streamingMetricsCollector.recordChunkProcessed(
            streamId, 
            chunk.length, 
            Date.now() - chunkStartTime
          );

          // Handle backpressure and processing
          await backpressureHandler.handleChunk(chunk);
          
          // Process the chunk
          await processor(chunk);

          // Pass chunk downstream
          callback(null, chunk);

        } catch (error) {
          streamingMetricsCollector.recordError(streamId, (error as Error).message);
          callback(error);
        }
      }
    });

    // Handle stream completion
    sourceStream.on('end', () => {
      streamingMetricsCollector.recordStreamEnd(streamId);
      this.cleanupStream(streamId);
      
      logger.info({
        streamId,
        duration: Date.now() - (this.activeStreams.get(streamId)?.startTime || Date.now()),
        bytesReceived: this.activeStreams.get(streamId)?.bytesReceived || 0
      }, 'Stream completed');
    });

    sourceStream.on('error', (error) => {
      streamingMetricsCollector.recordError(streamId, error.message);
      this.cleanupStream(streamId);
      
      logger.error({
        streamId,
        error: error.message
      }, 'Stream error');
    });

    // Pipe source through managed stream
    sourceStream.pipe(managedStream);

    return managedStream;
  }

  /**
   * Hurricane-specific streaming methods
   */

  /**
   * Stream NWS hurricane alerts
   */
  async streamNWSAlerts(processor: (chunk: Buffer) => Promise<void>): Promise<StreamingResponse> {
    return this.streamRequest('nws', {
      path: '/alerts/active?event=Hurricane,Tropical%20Storm',
      method: 'GET',
    }, processor);
  }

  /**
   * Stream NHC storm forecasts
   */
  async streamNHCForecasts(processor: (chunk: Buffer) => Promise<void>): Promise<StreamingResponse> {
    return this.streamRequest('nhc', {
      path: '/storm_graphics/AT/refresh.xml',
      method: 'GET',
    }, processor);
  }

  /**
   * Stream IBTRACS historical data
   */
  async streamIBTRACSData(
    year: number,
    basin?: string,
    processor?: (chunk: Buffer) => Promise<void>
  ): Promise<StreamingResponse> {
    const path = basin 
      ? `/v04r01/access/csv/ibtracs.${basin}.list.v04r01.csv`
      : `/v04r01/access/csv/ibtracs.ALL.list.v04r01.csv`;

    return this.streamRequest('ibtracs', {
      path,
      method: 'GET',
    }, processor || (async (chunk) => {
      // Default processor for historical data
      logger.debug({
        chunkSize: chunk.length,
        year,
        basin
      }, 'Processing IBTRACS historical data chunk');
    }));
  }

  /**
   * Stream live hurricane tracking data
   */
  async streamLiveTracking(processor: (chunk: Buffer) => Promise<void>): Promise<{
    nws: StreamingResponse;
    nhc: StreamingResponse;
  }> {
    const [nwsResponse, nhcResponse] = await Promise.all([
      this.streamNWSAlerts(processor),
      this.streamNHCForecasts(processor),
    ]);

    return {
      nws: nwsResponse,
      nhc: nhcResponse,
    };
  }

  /**
   * Generate unique stream ID
   */
  private generateStreamId(poolName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${poolName}-stream-${timestamp}-${random}`;
  }

  /**
   * Cleanup completed/failed stream
   */
  private cleanupStream(streamId: string): void {
    const stream = this.activeStreams.get(streamId);
    if (stream && stream.backpressureHandler) {
      stream.backpressureHandler.shutdown().catch(error => {
        logger.error({
          streamId,
          error: error.message
        }, 'Error shutting down backpressure handler');
      });
    }
    
    this.activeStreams.delete(streamId);
    backpressurePoolManager.removeHandler(streamId);
  }

  /**
   * Get streaming pool statistics
   */
  getPoolStatistics() {
    const stats = {
      pools: {} as Record<string, any>,
      activeStreams: this.activeStreams.size,
      streamingMetrics: streamingMetricsCollector.getHurricaneStreamingMetrics(),
      backpressureMetrics: backpressurePoolManager.getPoolMetrics(),
    };

    for (const [poolName, pool] of this.pools) {
      const poolStats = pool.stats;
      const circuitBreaker = this.circuitBreakers.get(poolName);
      
      stats.pools[poolName] = {
        connected: poolStats.connected,
        pending: poolStats.pending,
        running: poolStats.running,
        size: poolStats.size,
        circuitBreaker: circuitBreaker ? circuitBreaker.getStats() : null,
      };
    }

    return stats;
  }

  /**
   * Get active stream information
   */
  getActiveStreams() {
    const streams: Record<string, any> = {};
    
    for (const [streamId, stream] of this.activeStreams) {
      streams[streamId] = {
        startTime: stream.startTime,
        duration: Date.now() - stream.startTime,
        bytesReceived: stream.bytesReceived,
        events: streamingMetricsCollector.getStreamEvents(streamId, 10),
      };
    }

    return streams;
  }

  /**
   * Force cleanup of stale streams
   */
  cleanupStaleStreams(): void {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour

    for (const [streamId, stream] of this.activeStreams) {
      if (now - stream.startTime > maxAge) {
        logger.warn({
          streamId,
          age: now - stream.startTime
        }, 'Cleaning up stale stream');
        
        this.cleanupStream(streamId);
      }
    }
  }

  /**
   * Shutdown all pools and cleanup
   */
  async shutdown(): Promise<void> {
    // Cleanup all active streams
    for (const streamId of this.activeStreams.keys()) {
      this.cleanupStream(streamId);
    }

    // Close all pools
    const shutdownPromises = Array.from(this.pools.entries()).map(
      async ([poolName, pool]) => {
        try {
          await pool.close();
          logger.info({ pool: poolName }, 'Streaming pool closed');
        } catch (error) {
          logger.error({
            pool: poolName,
            error: (error as Error).message
          }, 'Error closing streaming pool');
        }
      }
    );

    await Promise.all(shutdownPromises);

    // Shutdown backpressure pool manager
    await backpressurePoolManager.shutdown();

    this.pools.clear();
    this.circuitBreakers.clear();
    this.retryStrategies.clear();

    logger.info('Streaming pool manager shut down');
  }
}

// Export singleton instance
export const streamingPoolManager = new StreamingPoolManager();

// Setup periodic cleanup
setInterval(() => {
  streamingPoolManager.cleanupStaleStreams();
}, 300000); // Every 5 minutes
