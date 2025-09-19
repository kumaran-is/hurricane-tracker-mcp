/**
 * Hurricane Tracker MCP Server - JSON-RPC 2.0 Protocol Handler
 * Full JSON-RPC 2.0 compliance with MCP protocol support
 */

import { v4 as uuidv4 } from 'uuid';
import { logger, mcpLogger } from '../logging/logger-pino.js';
import { MCPError, ValidationError, wrapError } from '../errors/base-errors.js';
import type {
  MCPRequest,
  MCPResponse,
  MCPNotification,
  MCPError as MCPErrorType,
} from '../types.js';

// =============================================================================
// JSON-RPC 2.0 CONSTANTS
// =============================================================================

export const JSONRPC_VERSION = '2.0';

export const JSON_RPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

// =============================================================================
// MESSAGE VALIDATION
// =============================================================================

/**
 * Validate JSON-RPC 2.0 message format
 */
export function validateJSONRPCMessage(message: any): {
  valid: boolean;
  type: 'request' | 'notification' | 'response' | 'unknown';
  error?: MCPErrorType;
} {
  // Must be an object
  if (!message || typeof message !== 'object') {
    return {
      valid: false,
      type: 'unknown',
      error: {
        code: JSON_RPC_ERRORS.INVALID_REQUEST,
        message: 'Message must be an object',
      },
    };
  }

  // Must have jsonrpc: "2.0"
  if (message.jsonrpc !== JSONRPC_VERSION) {
    return {
      valid: false,
      type: 'unknown',
      error: {
        code: JSON_RPC_ERRORS.INVALID_REQUEST,
        message: `Invalid jsonrpc version. Expected "${JSONRPC_VERSION}", got "${message.jsonrpc}"`,
      },
    };
  }

  // Determine message type
  if (message.method) {
    // Request or Notification
    if (typeof message.method !== 'string') {
      return {
        valid: false,
        type: 'unknown',
        error: {
          code: JSON_RPC_ERRORS.INVALID_REQUEST,
          message: 'Method must be a string',
        },
      };
    }

    if (message.id !== undefined) {
      // Request - must have non-null ID
      if (message.id === null) {
        return {
          valid: false,
          type: 'unknown',
          error: {
            code: JSON_RPC_ERRORS.INVALID_REQUEST,
            message: 'Request ID cannot be null',
          },
        };
      }

      if (typeof message.id !== 'string' && typeof message.id !== 'number') {
        return {
          valid: false,
          type: 'unknown',
          error: {
            code: JSON_RPC_ERRORS.INVALID_REQUEST,
            message: 'Request ID must be a string or number',
          },
        };
      }

      return { valid: true, type: 'request' };
    } else {
      // Notification - no ID
      return { valid: true, type: 'notification' };
    }
  } else if (message.id !== undefined) {
    // Response - must have result or error
    if (!message.hasOwnProperty('result') && !message.hasOwnProperty('error')) {
      return {
        valid: false,
        type: 'unknown',
        error: {
          code: JSON_RPC_ERRORS.INVALID_REQUEST,
          message: 'Response must have either result or error',
        },
      };
    }

    // Cannot have both result and error
    if (message.hasOwnProperty('result') && message.hasOwnProperty('error')) {
      return {
        valid: false,
        type: 'unknown',
        error: {
          code: JSON_RPC_ERRORS.INVALID_REQUEST,
          message: 'Response cannot have both result and error',
        },
      };
    }

    return { valid: true, type: 'response' };
  }

  return {
    valid: false,
    type: 'unknown',
    error: {
      code: JSON_RPC_ERRORS.INVALID_REQUEST,
      message: 'Invalid message format',
    },
  };
}

// =============================================================================
// MESSAGE CREATORS
// =============================================================================

/**
 * Create a JSON-RPC 2.0 request
 */
export function createRequest(
  method: string,
  params?: any,
  id?: string | number,
): MCPRequest {
  return {
    jsonrpc: JSONRPC_VERSION,
    id: id || uuidv4(),
    method,
    ...(params && { params }),
  };
}

/**
 * Create a JSON-RPC 2.0 notification
 */
export function createNotification(method: string, params?: any): MCPNotification {
  return {
    jsonrpc: JSONRPC_VERSION,
    method,
    ...(params && { params }),
  };
}

/**
 * Create a JSON-RPC 2.0 success response
 */
export function createSuccessResponse(id: string | number, result: any): MCPResponse {
  return {
    jsonrpc: JSONRPC_VERSION,
    id,
    result,
  };
}

/**
 * Create a JSON-RPC 2.0 error response
 */
export function createErrorResponse(
  id: string | number | null,
  error: MCPErrorType,
): MCPResponse {
  return {
    jsonrpc: JSONRPC_VERSION,
    id: id ?? null,
    error,
  };
}

/**
 * Create an error response from an MCPError
 */
export function createErrorResponseFromMCPError(
  id: string | number | null,
  mcpError: MCPError,
): MCPResponse {
  return mcpError.toJSONRPC(id ?? 'unknown');
}

// =============================================================================
// BATCH MESSAGE HANDLING
// =============================================================================

/**
 * Check if message is a batch request
 */
export function isBatchMessage(message: any): boolean {
  return Array.isArray(message);
}

/**
 * Validate batch message
 */
export function validateBatchMessage(messages: any[]): {
  valid: boolean;
  error?: MCPErrorType;
} {
  if (messages.length === 0) {
    return {
      valid: false,
      error: {
        code: JSON_RPC_ERRORS.INVALID_REQUEST,
        message: 'Batch cannot be empty',
      },
    };
  }

  return { valid: true };
}

// =============================================================================
// JSON-RPC HANDLER CLASS
// =============================================================================

export interface JSONRPCHandler {
  handleRequest(request: MCPRequest): Promise<any>;
  handleNotification(notification: MCPNotification): Promise<void>;
}

/**
 * JSON-RPC 2.0 message processor with full protocol compliance
 */
export class JSONRPCProcessor {
  private handler: JSONRPCHandler;

  constructor(handler: JSONRPCHandler) {
    this.handler = handler;
  }

  /**
   * Process a JSON-RPC message (single or batch)
   */
  async processMessage(rawMessage: any): Promise<MCPResponse | MCPResponse[] | null> {
    const correlationId = uuidv4();

    try {
      // Parse JSON if it's a string
      let message: any;
      if (typeof rawMessage === 'string') {
        try {
          message = JSON.parse(rawMessage);
        } catch (parseError) {
          logger.warn(
            { correlationId, rawMessage, error: parseError },
            'JSON parse error',
          );
          return createErrorResponse(null, {
            code: JSON_RPC_ERRORS.PARSE_ERROR,
            message: 'Parse error',
          });
        }
      } else {
        message = rawMessage;
      }

      // Handle batch messages
      if (isBatchMessage(message)) {
        return await this.processBatch(message, correlationId);
      }

      // Handle single message
      return await this.processSingle(message, correlationId);

    } catch (error) {
      const wrappedError = wrapError(error, 'processMessage', correlationId);
      mcpLogger.protocolError({
        correlationId,
        error: wrappedError,
        message: rawMessage,
      });

      return createErrorResponseFromMCPError(null, wrappedError);
    }
  }

  /**
   * Process a single JSON-RPC message
   */
  private async processSingle(
    message: any,
    correlationId: string,
  ): Promise<MCPResponse | null> {
    const validation = validateJSONRPCMessage(message);

    if (!validation.valid) {
      logger.warn(
        { correlationId, message, validationError: validation.error },
        'Invalid JSON-RPC message',
      );
      return createErrorResponse(message.id || null, validation.error!);
    }

    try {
      switch (validation.type) {
      case 'request':
        const result = await this.handler.handleRequest(message as MCPRequest);
        return createSuccessResponse(message.id, result);

      case 'notification':
        await this.handler.handleNotification(message as MCPNotification);
        return null; // Notifications don't get responses

      case 'response':
        logger.warn(
          { correlationId, message },
          'Received response message (should be handled by client)',
        );
        return null;

      default:
        return createErrorResponse(message.id || null, {
          code: JSON_RPC_ERRORS.INVALID_REQUEST,
          message: 'Unknown message type',
        });
      }
    } catch (error) {
      const wrappedError = wrapError(error, `handle_${validation.type}`, correlationId);

      mcpLogger.protocolError({
        correlationId,
        error: wrappedError,
        message,
      });

      return createErrorResponseFromMCPError(message.id || null, wrappedError);
    }
  }

  /**
   * Process a batch of JSON-RPC messages
   */
  private async processBatch(
    messages: any[],
    correlationId: string,
  ): Promise<MCPResponse[]> {
    const batchValidation = validateBatchMessage(messages);
    if (!batchValidation.valid) {
      return [createErrorResponse(null, batchValidation.error!)];
    }

    logger.debug(
      { correlationId, messageCount: messages.length },
      'Processing batch request',
    );

    // Process all messages in parallel
    const responses = await Promise.all(
      messages.map(async (msg, index) => {
        const msgCorrelationId = `${correlationId}_${index}`;
        return await this.processSingle(msg, msgCorrelationId);
      }),
    );

    // Filter out null responses (notifications)
    return responses.filter((response): response is MCPResponse => response !== null);
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if a method is a reserved JSON-RPC method
 */
export function isReservedMethod(method: string): boolean {
  return method.startsWith('rpc.');
}

/**
 * Extract method name from JSON-RPC request
 */
export function getMethodName(message: MCPRequest | MCPNotification): string {
  return message.method;
}

/**
 * Extract parameters from JSON-RPC request
 */
export function getParams(message: MCPRequest | MCPNotification): any {
  return message.params || {};
}

/**
 * Check if message has parameters
 */
export function hasParams(message: MCPRequest | MCPNotification): boolean {
  return message.params !== undefined;
}

/**
 * Validate method name format
 */
export function validateMethodName(method: string): boolean {
  // Method names should not start with "rpc." (reserved)
  // and should be valid identifiers
  if (isReservedMethod(method)) {
    return false;
  }

  // Simple validation for method names
  return /^[a-zA-Z][a-zA-Z0-9_/]*$/.test(method);
}

/**
 * Create standard JSON-RPC error objects
 */
export const StandardErrors = {
  parseError: (): MCPErrorType => ({
    code: JSON_RPC_ERRORS.PARSE_ERROR,
    message: 'Parse error',
  }),

  invalidRequest: (details?: string): MCPErrorType => ({
    code: JSON_RPC_ERRORS.INVALID_REQUEST,
    message: 'Invalid Request',
    ...(details && { data: details }),
  }),

  methodNotFound: (method: string): MCPErrorType => ({
    code: JSON_RPC_ERRORS.METHOD_NOT_FOUND,
    message: 'Method not found',
    data: { method },
  }),

  invalidParams: (details?: string): MCPErrorType => ({
    code: JSON_RPC_ERRORS.INVALID_PARAMS,
    message: 'Invalid params',
    ...(details && { data: details }),
  }),

  internalError: (details?: string): MCPErrorType => ({
    code: JSON_RPC_ERRORS.INTERNAL_ERROR,
    message: 'Internal error',
    ...(details && { data: details }),
  }),
};

/**
 * Convert Error to JSON-RPC error format
 */
export function errorToJSONRPC(error: unknown): MCPErrorType {
  if (error instanceof MCPError) {
    return {
      code: error.statusCode >= 500 ? JSON_RPC_ERRORS.INTERNAL_ERROR : -32000,
      message: error.userMessage,
      data: {
        code: error.code,
        hint: error.recoveryHint,
        details: error.details,
      },
    };
  }

  if (error instanceof ValidationError) {
    return StandardErrors.invalidParams(error.message);
  }

  if (error instanceof Error) {
    return StandardErrors.internalError(error.message);
  }

  return StandardErrors.internalError('Unknown error');
}

// =============================================================================
// MESSAGE SERIALIZATION
// =============================================================================

/**
 * Serialize JSON-RPC message to string
 */
export function serializeMessage(message: MCPResponse | MCPResponse[]): string {
  try {
    return JSON.stringify(message);
  } catch (error) {
    logger.error({ error, message }, 'Failed to serialize JSON-RPC message');
    return JSON.stringify(createErrorResponse(null, StandardErrors.internalError('Serialization error')));
  }
}

/**
 * Deserialize JSON-RPC message from string
 */
export function deserializeMessage(data: string): any {
  try {
    return JSON.parse(data);
  } catch (error) {
    throw new MCPError({
      code: 'PARSE_ERROR',
      message: 'Failed to parse JSON message',
      statusCode: 400,
      userMessage: 'Invalid JSON format',
      recoveryHint: 'Ensure the message is valid JSON',
      details: { parseError: error instanceof Error ? error.message : 'Unknown parse error' },
    });
  }
}
