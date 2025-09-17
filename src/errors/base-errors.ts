/**
 * Hurricane Tracker MCP Server - Base Error Classes
 * LLM-optimized error hierarchy with recovery hints and JSON-RPC compliance
 */

import type { ErrorDetails, ErrorCode } from '../types.js';

// =============================================================================
// BASE ERROR CLASS
// =============================================================================

/**
 * Base MCP error class with LLM-friendly messages and recovery hints
 */
export class MCPError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly userMessage: string;
  public readonly recoveryHint: string;
  public readonly details: Record<string, any>;
  public readonly correlationId?: string;

  constructor(options: ErrorDetails) {
    super(options.message);
    this.name = this.constructor.name;
    this.code = options.code;
    this.statusCode = options.statusCode || 500;
    this.userMessage = options.userMessage || options.message;
    this.recoveryHint = options.recoveryHint || 'Please try again or contact support if the problem persists';
    this.details = options.details || {};
    this.correlationId = options.correlationId;

    // Maintain proper stack trace for V8 engines
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON format for API responses
   */
  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.userMessage,
        hint: this.recoveryHint,
        details: this.details,
        correlationId: this.correlationId,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Convert error to JSON-RPC 2.0 error response
   */
  toJSONRPC(id: string | number) {
    return {
      jsonrpc: '2.0' as const,
      id,
      error: {
        code: this.getJSONRPCCode(),
        message: this.userMessage,
        data: {
          hint: this.recoveryHint,
          details: this.details,
          correlationId: this.correlationId,
          timestamp: new Date().toISOString(),
        },
      },
    };
  }

  /**
   * Map custom error codes to standard JSON-RPC error codes
   */
  private getJSONRPCCode(): number {
    const codeMap: Record<string, number> = {
      'PARSE_ERROR': -32700,
      'INVALID_REQUEST': -32600,
      'METHOD_NOT_FOUND': -32601,
      'INVALID_PARAMS': -32602,
      'INTERNAL_ERROR': -32603,
      'VALIDATION_ERROR': -32602,
      'NOT_FOUND': -32601,
      'TIMEOUT': -32603,
    };

    return codeMap[this.code] || -32000; // Server error default
  }
}

// =============================================================================
// VALIDATION ERRORS
// =============================================================================

/**
 * Input validation error with field-specific details
 */
export class ValidationError extends MCPError {
  constructor(message: string, field?: string, value?: any, correlationId?: string) {
    super({
      code: 'VALIDATION_ERROR',
      message: `Validation failed: ${message}`,
      statusCode: 400,
      userMessage: `Invalid input: ${message}`,
      recoveryHint: field 
        ? `Please check the '${field}' parameter and ensure it meets the requirements`
        : 'Please verify all input parameters meet the expected format and constraints',
      details: { 
        field, 
        providedValue: value,
        validationError: message 
      },
      correlationId,
    });
  }
}

/**
 * Schema validation error for complex objects
 */
export class SchemaValidationError extends MCPError {
  constructor(errors: Array<{ field: string; message: string; value?: any }>, correlationId?: string) {
    const fieldErrors = errors.map(e => `${e.field}: ${e.message}`).join(', ');
    
    super({
      code: 'VALIDATION_ERROR',
      message: `Schema validation failed: ${fieldErrors}`,
      statusCode: 400,
      userMessage: `Input validation failed for multiple fields`,
      recoveryHint: 'Please review the field-specific error details and correct the input format',
      details: { 
        fieldErrors: errors,
        errorCount: errors.length 
      },
      correlationId,
    });
  }
}

// =============================================================================
// CONTEXT AND LLM OPTIMIZATION ERRORS
// =============================================================================

/**
 * Context limit exceeded error with optimization suggestions
 */
export class ContextLimitError extends MCPError {
  constructor(currentSize: number, maxSize: number, correlationId?: string) {
    super({
      code: 'CONTEXT_LIMIT_EXCEEDED',
      message: `Response size (${currentSize} tokens) exceeds limit (${maxSize} tokens)`,
      statusCode: 413,
      userMessage: 'Response too large for context window',
      recoveryHint: 'Try using pagination, filtering, or the summary option to reduce response size',
      details: { 
        currentSize, 
        maxSize, 
        excessTokens: currentSize - maxSize 
      },
      correlationId,
    });
  }
}

/**
 * Token estimation error for LLM optimization
 */
export class TokenEstimationError extends MCPError {
  constructor(reason: string, correlationId?: string) {
    super({
      code: 'TOKEN_ESTIMATION_ERROR',
      message: `Token estimation failed: ${reason}`,
      statusCode: 500,
      userMessage: 'Unable to estimate response size',
      recoveryHint: 'The request may still succeed, but response size optimization is not available',
      details: { reason },
      correlationId,
    });
  }
}

// =============================================================================
// RATE LIMITING ERRORS
// =============================================================================

/**
 * Rate limit exceeded error with retry guidance
 */
export class RateLimitError extends MCPError {
  constructor(limit: number, window: number, retryAfter: number, correlationId?: string) {
    super({
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Rate limit exceeded: ${limit} requests per ${window}ms`,
      statusCode: 429,
      userMessage: 'Too many requests',
      recoveryHint: `Please wait ${Math.ceil(retryAfter / 1000)} seconds before retrying`,
      details: { 
        limit, 
        windowMs: window, 
        retryAfterMs: retryAfter,
        retryAfterSeconds: Math.ceil(retryAfter / 1000)
      },
      correlationId,
    });
  }
}

// =============================================================================
// UPSTREAM API ERRORS
// =============================================================================

/**
 * Upstream API timeout error
 */
export class UpstreamTimeoutError extends MCPError {
  constructor(service: string, timeoutMs: number, correlationId?: string) {
    super({
      code: 'UPSTREAM_TIMEOUT',
      message: `${service} API timeout after ${timeoutMs}ms`,
      statusCode: 504,
      userMessage: `${service} service is currently slow to respond`,
      recoveryHint: 'Try again in a few seconds. The service may be experiencing high load',
      details: { 
        service, 
        timeoutMs,
        timeoutSeconds: Math.ceil(timeoutMs / 1000)
      },
      correlationId,
    });
  }
}

/**
 * Upstream API error with status code mapping
 */
export class UpstreamError extends MCPError {
  constructor(
    service: string, 
    statusCode: number, 
    message: string, 
    correlationId?: string
  ) {
    const userMessage = statusCode >= 500 
      ? `${service} service is temporarily unavailable`
      : `${service} service returned an error`;

    const recoveryHint = statusCode >= 500
      ? 'The external service is experiencing issues. Please try again later'
      : statusCode === 404
      ? 'The requested data was not found. Please verify your parameters'
      : statusCode === 403
      ? 'Access to the requested data is not permitted'
      : 'Please check your request parameters and try again';

    super({
      code: 'UPSTREAM_ERROR',
      message: `${service} API error: ${message}`,
      statusCode: statusCode >= 500 ? 502 : statusCode,
      userMessage,
      recoveryHint,
      details: { 
        service, 
        upstreamStatusCode: statusCode, 
        upstreamMessage: message 
      },
      correlationId,
    });
  }
}

// =============================================================================
// CIRCUIT BREAKER ERRORS
// =============================================================================

/**
 * Circuit breaker open error
 */
export class CircuitBreakerError extends MCPError {
  constructor(service: string, resetTimeMs: number, correlationId?: string) {
    super({
      code: 'CIRCUIT_BREAKER_OPEN',
      message: `Circuit breaker open for ${service}`,
      statusCode: 503,
      userMessage: `${service} service is temporarily unavailable`,
      recoveryHint: `Service is recovering from errors. Please try again in ${Math.ceil(resetTimeMs / 1000)} seconds`,
      details: { 
        service, 
        resetTimeMs,
        resetTimeSeconds: Math.ceil(resetTimeMs / 1000)
      },
      correlationId,
    });
  }
}

// =============================================================================
// RESOURCE NOT FOUND ERRORS
// =============================================================================

/**
 * Resource not found error with specific suggestions
 */
export class NotFoundError extends MCPError {
  constructor(resource: string, identifier: string, correlationId?: string) {
    super({
      code: 'NOT_FOUND',
      message: `${resource} not found: ${identifier}`,
      statusCode: 404,
      userMessage: `The requested ${resource.toLowerCase()} was not found`,
      recoveryHint: resource.includes('storm') || resource.includes('hurricane')
        ? 'Check the storm ID format (e.g., AL052024) or use get_active_storms to find current storms'
        : `Please verify the ${resource.toLowerCase()} identifier and try again`,
      details: { 
        resource, 
        identifier,
        resourceType: resource.toLowerCase()
      },
      correlationId,
    });
  }
}

// =============================================================================
// CONFIGURATION ERRORS
// =============================================================================

/**
 * Configuration error for system setup issues
 */
export class ConfigurationError extends MCPError {
  constructor(setting: string, reason: string, correlationId?: string) {
    super({
      code: 'CONFIGURATION_ERROR',
      message: `Configuration error for ${setting}: ${reason}`,
      statusCode: 500,
      userMessage: 'Server configuration issue',
      recoveryHint: 'This is a server-side configuration problem. Please contact support',
      details: { 
        setting, 
        reason,
        isServerError: true
      },
      correlationId,
    });
  }
}

// =============================================================================
// ERROR FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a validation error from Zod parsing errors
 */
export function createValidationError(
  zodError: any,
  correlationId?: string
): ValidationError | SchemaValidationError {
  if (zodError.errors && Array.isArray(zodError.errors)) {
    const errors = zodError.errors.map((err: any) => ({
      field: err.path.join('.'),
      message: err.message,
      value: err.received,
    }));

    if (errors.length === 1) {
      const error = errors[0];
      return new ValidationError(error.message, error.field, error.value, correlationId);
    }

    return new SchemaValidationError(errors, correlationId);
  }

  return new ValidationError(zodError.message || 'Unknown validation error', undefined, undefined, correlationId);
}

/**
 * Create an upstream error from HTTP response
 */
export function createUpstreamError(
  service: string,
  response: { status: number; statusText: string; data?: any },
  correlationId?: string
): UpstreamError {
  const message = response.data?.message || response.statusText || 'Unknown error';
  return new UpstreamError(service, response.status, message, correlationId);
}

/**
 * Wrap an unknown error in a structured format
 */
export function wrapError(
  error: unknown,
  operation: string,
  correlationId?: string
): MCPError {
  if (error instanceof MCPError) {
    return error;
  }

  if (error instanceof Error) {
    return new MCPError({
      code: 'INTERNAL_ERROR',
      message: `${operation}: ${error.message}`,
      statusCode: 500,
      userMessage: 'An internal error occurred',
      recoveryHint: 'Please try again. If the problem persists, contact support',
      details: { 
        operation, 
        originalError: error.message,
        errorType: error.constructor.name
      },
      correlationId,
    });
  }

  return new MCPError({
    code: 'INTERNAL_ERROR',
    message: `${operation}: Unknown error`,
    statusCode: 500,
    userMessage: 'An unexpected error occurred',
    recoveryHint: 'Please try again. If the problem persists, contact support',
    details: { 
      operation, 
      originalError: String(error) 
    },
    correlationId,
  });
}

// =============================================================================
// ERROR CODE CONSTANTS
// =============================================================================

export const ERROR_CODES: Record<ErrorCode, string> = {
  VALIDATION_ERROR: 'Input validation failed',
  CONTEXT_LIMIT_EXCEEDED: 'Response exceeds context window',
  RATE_LIMIT_EXCEEDED: 'Request rate limit exceeded',
  UPSTREAM_TIMEOUT: 'External service timeout',
  UPSTREAM_ERROR: 'External service error',
  NOT_FOUND: 'Resource not found',
  CIRCUIT_BREAKER_OPEN: 'Service circuit breaker active',
  INTERNAL_ERROR: 'Internal server error',
};

/**
 * Check if an error is recoverable (client can retry)
 */
export function isRecoverableError(error: MCPError): boolean {
  const recoverableCodes: ErrorCode[] = [
    'UPSTREAM_TIMEOUT',
    'CIRCUIT_BREAKER_OPEN',
    'RATE_LIMIT_EXCEEDED',
  ];
  
  return recoverableCodes.includes(error.code as ErrorCode);
}

/**
 * Get retry delay for recoverable errors
 */
export function getRetryDelay(error: MCPError): number {
  switch (error.code) {
    case 'RATE_LIMIT_EXCEEDED':
      return error.details.retryAfterMs || 60000;
    case 'CIRCUIT_BREAKER_OPEN':
      return error.details.resetTimeMs || 30000;
    case 'UPSTREAM_TIMEOUT':
      return 5000; // 5 seconds
    default:
      return 10000; // 10 seconds default
  }
}

// =============================================================================
// CACHE ERRORS
// =============================================================================

/**
 * Cache-related error class
 */
export class CacheError extends MCPError {
  constructor(operation: string, details?: any, correlationId?: string) {
    super({
      code: 'CACHE_ERROR',
      message: `Cache operation failed: ${operation}`,
      statusCode: 500,
      userMessage: 'A caching error occurred',
      recoveryHint: 'Please try again or contact support if the issue persists',
      details,
      correlationId,
    });
  }
}
