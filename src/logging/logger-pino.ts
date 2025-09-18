/**
 * Hurricane Tracker MCP Server - Structured Logging with Pino
 * Production-grade logging with correlation IDs, performance metrics, and audit trails
 */

import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';
import { config, getEnvironmentConfig } from '../config/config.js';
import type { RequestContext } from '../types.js';

// =============================================================================
// LOGGER CONFIGURATION
// =============================================================================

const envConfig = getEnvironmentConfig();

/**
 * Pino logger configuration with environment-specific settings
 */
const loggerConfig: pino.LoggerOptions = {
  level: config.monitoring.logLevel,
  formatters: {
    // Custom log level formatter
    level: (label) => ({ level: label }),
    // Remove PID and hostname for cleaner logs in development
    bindings: () => ({}),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Pretty print in development
  transport: envConfig.prettyLogs
    ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    }
    : undefined,
};

/**
 * Main application logger instance
 */
export const logger = pino(loggerConfig);

// =============================================================================
// CORRELATION ID MANAGEMENT
// =============================================================================

/**
 * Generate a new correlation ID for request tracking
 */
export function generateCorrelationId(): string {
  return uuidv4();
}

/**
 * Create a child logger with correlation context
 */
export function createContextLogger(context: Partial<RequestContext>) {
  return logger.child({
    correlationId: context.correlationId,
    requestId: context.requestId,
    toolName: context.toolName,
    clientId: context.clientId,
    sessionId: context.sessionId,
  });
}

// =============================================================================
// SPECIALIZED LOGGING METHODS
// =============================================================================

/**
 * Log MCP protocol events with structured data
 */
export const mcpLogger = {
  /**
   * Log initialization events
   */
  initialize(data: {
    protocolVersion: string;
    clientName: string;
    clientVersion: string;
    capabilities: string[];
  }) {
    logger.info(
      {
        event: 'mcp_initialize',
        protocol: data.protocolVersion,
        client: {
          name: data.clientName,
          version: data.clientVersion,
        },
        capabilities: data.capabilities,
      },
      'MCP client initialized',
    );
  },

  /**
   * Log tool calls with performance metrics
   */
  toolCall(data: {
    correlationId: string;
    toolName: string;
    clientId?: string;
    inputSize: number;
    success: boolean;
    duration: number;
    error?: string;
  }) {
    const logData = {
      event: 'mcp_tool_call',
      correlationId: data.correlationId,
      tool: data.toolName,
      clientId: data.clientId,
      metrics: {
        inputSizeBytes: data.inputSize,
        durationMs: data.duration,
      },
      success: data.success,
      ...(data.error && { error: data.error }),
    };

    if (data.success) {
      logger.info(logData, `Tool call completed: ${data.toolName}`);
    } else {
      logger.error(logData, `Tool call failed: ${data.toolName}`);
    }
  },

  /**
   * Log transport events
   */
  transport(data: {
    event: 'start' | 'stop' | 'error' | 'message';
    transport: string;
    details?: any;
    error?: Error;
  }) {
    const logData = {
      event: `mcp_transport_${data.event}`,
      transport: data.transport,
      ...(data.details && { details: data.details }),
    };

    if (data.error) {
      logger.error(
        { ...logData, error: data.error.message, stack: data.error.stack },
        `Transport ${data.event}: ${data.transport}`,
      );
    } else {
      logger.info(logData, `Transport ${data.event}: ${data.transport}`);
    }
  },

  /**
   * Log protocol errors
   */
  protocolError(data: {
    correlationId?: string;
    error: Error;
    message: any;
    code?: number;
  }) {
    logger.error(
      {
        event: 'mcp_protocol_error',
        correlationId: data.correlationId,
        error: data.error.message,
        stack: data.error.stack,
        message: data.message,
        errorCode: data.code,
      },
      'MCP protocol error',
    );
  },
};

/**
 * Log performance metrics and monitoring data
 */
export const performanceLogger = {
  /**
   * Log API call performance
   */
  apiCall(data: {
    correlationId: string;
    api: string;
    endpoint: string;
    method: string;
    duration: number;
    statusCode?: number;
    cached: boolean;
    retryCount?: number;
    error?: string;
  }) {
    const logData = {
      event: 'api_call',
      correlationId: data.correlationId,
      api: data.api,
      endpoint: data.endpoint,
      method: data.method,
      metrics: {
        durationMs: data.duration,
        statusCode: data.statusCode,
        cached: data.cached,
        retryCount: data.retryCount || 0,
      },
      ...(data.error && { error: data.error }),
    };

    if (data.error) {
      logger.warn(logData, `API call failed: ${data.api}${data.endpoint}`);
    } else {
      logger.debug(logData, `API call completed: ${data.api}${data.endpoint}`);
    }
  },

  /**
   * Log cache operations
   */
  cache(data: {
    correlationId: string;
    operation: 'hit' | 'miss' | 'set' | 'invalidate';
    key: string;
    size?: number;
    ttl?: number;
  }) {
    logger.debug(
      {
        event: 'cache_operation',
        correlationId: data.correlationId,
        operation: data.operation,
        key: data.key,
        ...(data.size && { sizeBytes: data.size }),
        ...(data.ttl && { ttlSeconds: data.ttl }),
      },
      `Cache ${data.operation}: ${data.key}`,
    );
  },

  /**
   * Log HTTP request details
   */
  httpRequest(data: {
    correlationId: string;
    method: string;
    url: string;
    userAgent: string;
    ip: string;
  }) {
    logger.debug(
      {
        event: 'http_request',
        correlationId: data.correlationId,
        method: data.method,
        url: data.url,
        userAgent: data.userAgent,
        ip: data.ip,
      },
      `HTTP ${data.method} ${data.url}`,
    );
  },

  /**
   * Log HTTP response details
   */
  httpResponse(data: {
    correlationId: string;
    method: string;
    url: string;
    statusCode: number;
    responseTime: number;
  }) {
    const logLevel = data.statusCode >= 400 ? 'warn' : 'debug';

    logger[logLevel](
      {
        event: 'http_response',
        correlationId: data.correlationId,
        method: data.method,
        url: data.url,
        statusCode: data.statusCode,
        responseTimeMs: data.responseTime,
      },
      `HTTP ${data.method} ${data.url} ${data.statusCode}`,
    );
  },

  /**
   * Log system performance metrics
   */
  systemMetrics(data: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    requests: {
      total: number;
      errors: number;
      averageResponseTime: number;
    };
    cache: {
      hitRate: number;
      size: number;
    };
  }) {
    logger.info(
      {
        event: 'system_metrics',
        metrics: data,
      },
      'System performance metrics',
    );
  },
};

/**
 * Security and audit logging
 */
export const auditLogger = {
  /**
   * Log security events
   */
  security(data: {
    event: 'rate_limit_exceeded' | 'invalid_input' | 'auth_failure' | 'suspicious_activity';
    correlationId?: string;
    clientId?: string;
    details: any;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }) {
    const logLevel = data.severity === 'critical' || data.severity === 'high' ? 'error' : 'warn';

    logger[logLevel](
      {
        event: 'security_event',
        securityEvent: data.event,
        correlationId: data.correlationId,
        clientId: data.clientId,
        severity: data.severity,
        details: data.details,
      },
      `Security event: ${data.event}`,
    );
  },

  /**
   * Log user actions for compliance
   */
  userAction(data: {
    correlationId: string;
    userId?: string;
    action: string;
    resource: string;
    success: boolean;
    metadata?: any;
  }) {
    logger.info(
      {
        event: 'user_action',
        correlationId: data.correlationId,
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        success: data.success,
        ...(data.metadata && { metadata: data.metadata }),
      },
      `User action: ${data.action} on ${data.resource}`,
    );
  },

  /**
   * Log data access for audit trails
   */
  dataAccess(data: {
    correlationId: string;
    dataType: string;
    operation: 'read' | 'write' | 'delete';
    recordCount?: number;
    source: string;
  }) {
    logger.info(
      {
        event: 'data_access',
        correlationId: data.correlationId,
        dataType: data.dataType,
        operation: data.operation,
        recordCount: data.recordCount,
        source: data.source,
      },
      `Data access: ${data.operation} ${data.dataType}`,
    );
  },
};

/**
 * Health and monitoring logger
 */
export const healthLogger = {
  /**
   * Log health check results
   */
  healthCheck(data: {
    component: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime?: number;
    error?: string;
    details?: any;
  }) {
    const logLevel = data.status === 'healthy' ? 'debug' : 'warn';

    logger[logLevel](
      {
        event: 'health_check',
        component: data.component,
        status: data.status,
        responseTimeMs: data.responseTime,
        ...(data.error && { error: data.error }),
        ...(data.details && { details: data.details }),
      },
      `Health check: ${data.component} is ${data.status}`,
    );
  },

  /**
   * Log startup and shutdown events
   */
  lifecycle(data: {
    event: 'startup' | 'shutdown' | 'ready';
    component: string;
    duration?: number;
    version?: string;
    config?: any;
  }) {
    logger.info(
      {
        event: 'lifecycle_event',
        lifecycleEvent: data.event,
        component: data.component,
        ...(data.duration && { durationMs: data.duration }),
        ...(data.version && { version: data.version }),
        ...(data.config && { config: data.config }),
      },
      `${data.component} ${data.event}`,
    );
  },
};

// =============================================================================
// ERROR LOGGING UTILITIES
// =============================================================================

/**
 * Enhanced error logging with context and stack traces
 */
export function logError(
  error: Error,
  context: {
    correlationId?: string;
    operation?: string;
    metadata?: any;
  },
) {
  logger.error(
    {
      error: error.message,
      stack: error.stack,
      correlationId: context.correlationId,
      operation: context.operation,
      ...(context.metadata && { metadata: context.metadata }),
    },
    `Error in ${context.operation || 'unknown operation'}`,
  );
}

/**
 * Log warnings with context
 */
export function logWarning(
  message: string,
  context: {
    correlationId?: string;
    metadata?: any;
  },
) {
  logger.warn(
    {
      correlationId: context.correlationId,
      ...(context.metadata && { metadata: context.metadata }),
    },
    message,
  );
}

// =============================================================================
// LOGGER UTILITIES
// =============================================================================

/**
 * Get current logger configuration
 */
export function getLoggerConfig() {
  return {
    level: config.monitoring.logLevel,
    format: config.monitoring.logFormat,
    prettyLogs: envConfig.prettyLogs,
  };
}

/**
 * Set logger level at runtime
 */
export function setLogLevel(level: 'debug' | 'info' | 'warn' | 'error') {
  logger.level = level;
  logger.info({ newLevel: level }, 'Logger level changed');
}

/**
 * Export the main logger instance
 */
export default logger;
