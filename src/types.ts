/**
 * Hurricane Tracker MCP Server - Type Definitions
 * Production-grade TypeScript types for hurricane tracking and MCP protocol compliance
 */

// Import will be handled dynamically in service files
// import type { z } from 'zod';

// =============================================================================
// MCP PROTOCOL TYPES
// =============================================================================

export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: any;
  error?: MCPError;
}

export interface MCPNotification {
  jsonrpc: '2.0';
  method: string;
  params?: any;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

export interface InitializeRequest {
  protocolVersion: string;
  capabilities: ClientCapabilities;
  clientInfo: {
    name: string;
    version: string;
  };
}

export interface InitializeResponse {
  protocolVersion: string;
  capabilities: ServerCapabilities;
  serverInfo: {
    name: string;
    version: string;
  };
  instructions?: string;
}

export interface ClientCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  logging?: {};
  completion?: {};
}

export interface ServerCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  logging?: {};
  completion?: {};
}

// =============================================================================
// TOOL DEFINITION TYPES
// =============================================================================

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

export interface ToolResponse {
  content: ToolContent[];
  isError?: boolean;
  _meta?: {
    timestamp: string;
    correlationId: string;
    [key: string]: any;
  };
}

export interface ToolContent {
  type: 'text' | 'image' | 'resource';
  text?: string;
  data?: string;
  mimeType?: string;
}

export interface ToolCallRequest {
  name: string;
  arguments: Record<string, any>;
}

// =============================================================================
// HURRICANE DATA TYPES
// =============================================================================

export type BasinCode = 'AL' | 'EP' | 'CP' | 'WP' | 'NP' | 'SP' | 'SI';

export interface HurricaneBasicInfo {
  id: string;
  name: string;
  basin: BasinCode;
  advisoryTime: string;
  lat: number;
  lon: number;
  windKts: number;
  pressureMb: number;
  status: HurricaneStatus;
  nhcLinks: NHCLinks;
}

export type HurricaneStatus = 
  | 'Tropical Depression'
  | 'Tropical Storm'
  | 'Hurricane'
  | 'Major Hurricane'
  | 'Post-Tropical'
  | 'Remnant Low'
  | 'Extratropical';

export interface NHCLinks {
  publicAdvisory?: string;
  forecastAdvisory?: string;
  windProbabilities?: string;
  graphicsPackage?: string;
  gisData?: string;
}

export interface StormCone {
  cone: GeoJSONPolygon;
  forecastPoints: ForecastPoint[];
  metadata: {
    stormId: string;
    advisoryTime: string;
    forecastHours: number[];
  };
}

export interface ForecastPoint {
  time: string;
  lat: number;
  lon: number;
  windKts: number;
  pressureMb?: number;
  uncertainty?: {
    radii: number;
    errorCone: GeoJSONPolygon;
  };
}

export interface StormTrack {
  track: GeoJSONLineString;
  points: HistoricalPoint[];
  metadata: {
    stormId: string;
    startTime: string;
    endTime: string;
    maxWindKts: number;
    minPressureMb: number;
  };
}

export interface HistoricalPoint {
  time: string;
  lat: number;
  lon: number;
  windKts: number;
  pressureMb: number;
  status: HurricaneStatus;
  movementDir?: number;
  movementSpeedKts?: number;
}

export interface HurricaneAlert {
  event: string;
  severity: AlertSeverity;
  headline: string;
  description: string;
  instruction?: string;
  effective: string;
  expires: string;
  areaPolygon: GeoJSONPolygon;
  zones: string[];
}

export type AlertSeverity = 'Minor' | 'Moderate' | 'Severe' | 'Extreme';

export interface HistoricalStormSummary {
  stormId: string;
  name: string;
  year: number;
  basin: BasinCode;
  maxWindKts: number;
  minPressureMb: number;
  trackSummary: {
    startDate: string;
    endDate: string;
    durationHours: number;
    maxCategory: number;
  };
  ibtracsLink: string;
}

// =============================================================================
// GEOJSON TYPES
// =============================================================================

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface GeoJSONLineString {
  type: 'LineString';
  coordinates: number[][];
}

export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number];
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface NWSAlert {
  id: string;
  type: string;
  properties: {
    event: string;
    severity: string;
    headline: string;
    description: string;
    instruction?: string;
    effective: string;
    expires: string;
    areaDesc: string;
    geocode: {
      UGC: string[];
    };
  };
  geometry?: GeoJSONPolygon;
}

export interface NHCStormData {
  id: string;
  properties: {
    name: string;
    basin: string;
    advisory: string;
    datetime: string;
    wind: number;
    pressure: number;
    status: string;
    lat: number;
    lon: number;
  };
  geometry: GeoJSONPoint;
}

export interface IBTrACSRecord {
  sid: string;
  name: string;
  season: number;
  basin: string;
  max_wind: number;
  min_pressure: number;
  track_data: Array<{
    iso_time: string;
    lat: number;
    lon: number;
    wind: number;
    pressure: number;
    status: string;
  }>;
}

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

export interface HurricaneTrackerConfig {
  transport: {
    type: 'stdio' | 'http';
    port?: number;
    host?: string;
    httpPort?: number;
    httpHost?: string;
    httpCors?: {
      allowedOrigins: string[];
    };
  };
  dataSources: {
    nws: {
      baseUrl: string;
      userAgent: string;
    };
    nhc: {
      baseUrl: string;
      gisBaseUrl: string;
    };
    ibtracs: {
      baseUrl: string;
    };
  };
  llm: {
    maxInputTokens: number;
    maxOutputTokens: number;
    defaultPageSize: number;
    enableStreaming: boolean;
    contextWindowTarget: number;
  };
  performance: {
    cacheTtlSeconds: number;
    cacheMaxSize: number;
    maxRetries: number;
    requestTimeoutMs: number;
    connectionTimeoutMs: number;
  };
  security: {
    authEnabled: boolean;
    apiKeys: string[];
    sessionTimeout: number;
    allowedOrigins: string;
    rateLimitPerClient: number;
    rateLimitWindowMs: number;
    rateLimitEnabled: boolean;
    rateLimitBurst: number;
    rateLimitBlockDuration: number;
    rateLimitWhitelist: string[];
    maxRequestSizeBytes: number;
    enableAuditLogging: boolean;
    enableInputSanitization: boolean;
  };
  resilience: {
    circuitBreaker: {
      failureThreshold: number;
      resetTimeoutMs: number;
      monitoringPeriodMs: number;
    };
    retry: {
      baseDelayMs: number;
      maxDelayMs: number;
      exponentialFactor: number;
    };
    bulkhead: {
      maxConcurrentRequests: number;
      queueSizeLimit: number;
    };
  };
  monitoring: {
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    logFormat: 'json' | 'pretty';
    enableMetrics: boolean;
    enableHealthChecks: boolean;
    enableTracing: boolean;
  };
}

// =============================================================================
// CONTEXT AND OPTIMIZATION TYPES
// =============================================================================

export interface RequestContext {
  requestId: string;
  correlationId: string;
  clientId?: string;
  sessionId?: string;
  startTime: number;
  toolName: string;
  userId?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    pageSize: number;
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrevious: boolean;
    nextCursor?: string;
    previousCursor?: string;
  };
}

export interface OptimizationOptions {
  maxTokens: number;
  allowPagination: boolean;
  allowSummary: boolean;
  allowTruncation: boolean;
  summaryOnly?: boolean;
  pageSize?: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  size: number;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export interface ErrorDetails {
  code: string;
  message: string;
  statusCode?: number;
  userMessage?: string;
  recoveryHint?: string;
  details?: Record<string, any>;
  correlationId?: string;
}

export type ErrorCode = 
  | 'VALIDATION_ERROR'
  | 'CONTEXT_LIMIT_EXCEEDED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_ERROR'
  | 'NOT_FOUND'
  | 'CIRCUIT_BREAKER_OPEN'
  | 'INTERNAL_ERROR';

// =============================================================================
// TOOL-SPECIFIC INPUT SCHEMAS
// =============================================================================
// These will be defined in the service files to avoid circular dependencies

// =============================================================================
// MONITORING AND METRICS TYPES
// =============================================================================

export interface PerformanceMetrics {
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  cacheHitRate: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  dependencies: {
    [key: string]: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      responseTime?: number;
      lastCheck: string;
      error?: string;
    };
  };
  metrics: PerformanceMetrics;
}

// =============================================================================
// TRANSPORT TYPES
// =============================================================================

export interface TransportConfig {
  type: 'stdio' | 'http';
  options?: {
    port?: number;
    host?: string;
    cors?: {
      origin: string | string[];
      credentials: boolean;
    };
  };
}

export interface Transport {
  start(): Promise<void>;
  stop(): Promise<void>;
  send(message: any): Promise<void>;
  onMessage(handler: (message: any) => Promise<any>): void;
  onError(handler: (error: Error) => void): void;
  onClose(handler: () => void): void;
}
