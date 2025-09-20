/**
 * Request validation middleware for MCP protocol compliance
 * Ensures all incoming requests meet the JSON-RPC 2.0 and MCP specifications
 * Specialized for Hurricane Tracker MCP operations
 */

import { logger } from '../logging/logger-pino.js';
import { ValidationError, MCPError } from '../errors/base-errors.js';

/**
 * JSON-RPC 2.0 request structure
 */
export interface JSONRPCRequest {
  jsonrpc: string;
  method: string;
  params?: any;
  id?: string | number | null;
}

/**
 * MCP request validation rules
 */
export interface ValidationRule {
  field: string;
  required: boolean;
  type?: string;
  // eslint-disable-next-line no-unused-vars
  validator?: (value: any) => boolean;
  message?: string;
}

/**
 * Validation context for detailed error reporting
 */
export interface ValidationContext {
  transport: 'stdio' | 'http';
  clientId?: string;
  requestId?: string | number;
}

/**
 * Validate JSON-RPC 2.0 protocol compliance
 */
export function validateJSONRPC(request: any, context?: ValidationContext): void {
  // Check if request is an object
  if (!request || typeof request !== 'object') {
    throw new MCPError({
      code: 'INVALID_REQUEST',
      message: 'Request must be a JSON object',
      statusCode: 400,
      userMessage: 'Invalid request format',
      recoveryHint: 'Ensure the request is a valid JSON object',
      details: { method: request?.method },
    });
  }

  // Validate jsonrpc version
  if (request.jsonrpc !== '2.0') {
    throw new MCPError({
      code: 'INVALID_REQUEST',
      message: 'Invalid JSON-RPC version',
      statusCode: 400,
      userMessage: 'Unsupported JSON-RPC version',
      recoveryHint: 'Use JSON-RPC version 2.0',
      details: {
        method: request.method,
        expected: '2.0',
        received: request.jsonrpc,
      },
    });
  }

  // Validate method
  if (!request.method || typeof request.method !== 'string') {
    throw new ValidationError(
      'Method must be a non-empty string',
      'method',
      request.method,
    );
  }

  // Validate id if present
  if ('id' in request) {
    const validIdType = ['string', 'number'].includes(typeof request.id) || request.id === null;
    if (!validIdType) {
      throw new ValidationError(
        'ID must be a string, number, or null',
        'id',
        request.id,
      );
    }
  }

  logger.debug({
    method: request.method,
    id: request.id,
    hasParams: 'params' in request,
    ...context,
  }, 'JSON-RPC validation passed');
}

/**
 * Validate MCP initialize request
 */
export function validateInitializeRequest(params: any): void {
  if (!params) {
    throw new ValidationError('Initialize params are required', 'params');
  }

  if (!params.protocolVersion) {
    throw new ValidationError('Protocol version is required', 'protocolVersion');
  }

  if (!params.capabilities) {
    throw new ValidationError('Capabilities are required', 'capabilities');
  }

  if (!params.clientInfo) {
    throw new ValidationError('Client info is required', 'clientInfo');
  }

  if (!params.clientInfo.name || !params.clientInfo.version) {
    throw new ValidationError(
      'Client info must include name and version',
      'clientInfo',
      params.clientInfo,
    );
  }

  logger.debug({
    protocolVersion: params.protocolVersion,
    clientName: params.clientInfo.name,
    clientVersion: params.clientInfo.version,
  }, 'Initialize request validated');
}

/**
 * Validate MCP tool call request
 */
export function validateToolCallRequest(params: any): void {
  if (!params) {
    throw new ValidationError('Tool call params are required', 'params');
  }

  if (!params.name || typeof params.name !== 'string') {
    throw new ValidationError(
      'Tool name must be a non-empty string',
      'name',
      params.name,
    );
  }

  // Hurricane-specific tool validation
  switch (params.name) {
  case 'get_current_hurricanes':
    validateCurrentHurricanesParams(params.arguments);
    break;
  case 'get_hurricane_forecast':
    validateHurricaneForecastParams(params.arguments);
    break;
  case 'search_historical_storms':
    validateHistoricalSearchParams(params.arguments);
    break;
  case 'get_storm_track':
    validateStormTrackParams(params.arguments);
    break;
  case 'analyze_hurricane_risk':
    validateRiskAnalysisParams(params.arguments);
    break;
  case 'get_evacuation_zones':
    validateEvacuationZonesParams(params.arguments);
    break;
  default:
    throw new ValidationError(
      `Unknown hurricane tool: ${params.name}`,
      'name',
      params.name,
    );
  }

  logger.debug({
    tool: params.name,
    hasArguments: !!params.arguments,
  }, 'Hurricane tool call request validated');
}

/**
 * Validate current hurricanes tool parameters
 */
function validateCurrentHurricanesParams(args: any): void {
  if (!args || typeof args !== 'object') {
    return; // No arguments required for this tool
  }

  // Optional basin parameter
  if (args.basin && typeof args.basin === 'string') {
    const validBasins = ['AL', 'EP', 'CP', 'WP', 'IO', 'SH', 'NA', 'SA', 'NI', 'SI', 'SP'];
    if (!validBasins.includes(args.basin.toUpperCase())) {
      throw new ValidationError(
        `Invalid basin code '${args.basin}'. Valid codes: ${validBasins.join(', ')}`,
        'basin',
        args.basin,
      );
    }
  }

  // Optional year parameter
  if (args.year !== undefined) {
    const year = Number(args.year);
    const currentYear = new Date().getFullYear();
    if (isNaN(year) || year < 1851 || year > currentYear + 1) {
      throw new ValidationError(
        `Invalid year '${args.year}'. Must be between 1851 and ${currentYear + 1}`,
        'year',
        args.year,
      );
    }
  }
}

/**
 * Validate hurricane forecast tool parameters
 */
function validateHurricaneForecastParams(args: any): void {
  if (!args || typeof args !== 'object') {
    throw new ValidationError('Hurricane forecast arguments are required', 'arguments');
  }

  // Require either storm ID or coordinates
  if (!args.stormId && !(args.latitude && args.longitude)) {
    throw new ValidationError(
      'Either stormId or coordinates (latitude/longitude) are required',
      'stormId|coordinates',
      args,
    );
  }

  // Validate storm ID if provided
  if (args.stormId) {
    if (typeof args.stormId !== 'string') {
      throw new ValidationError(
        'Storm ID must be a string',
        'stormId',
        args.stormId,
      );
    }

    const stormIdPattern = /^[A-Z]{2}\d{2}\d{4}$/;
    if (!stormIdPattern.test(args.stormId.toUpperCase())) {
      throw new ValidationError(
        'Invalid storm ID format. Expected format: BASINNNNYYYY (e.g., AL012023)',
        'stormId',
        args.stormId,
      );
    }
  }

  // Validate coordinates if provided
  if (args.latitude !== undefined || args.longitude !== undefined) {
    validateCoordinates(args.latitude, args.longitude);
  }

  // Validate forecast hours if provided
  if (args.hours !== undefined) {
    const hours = Number(args.hours);
    if (isNaN(hours) || hours < 6 || hours > 168) {
      throw new ValidationError(
        'Forecast hours must be between 6 and 168 (7 days)',
        'hours',
        args.hours,
      );
    }
  }
}

/**
 * Validate historical search tool parameters
 */
function validateHistoricalSearchParams(args: any): void {
  if (!args || typeof args !== 'object') {
    throw new ValidationError('Historical search arguments are required', 'arguments');
  }

  // Validate year range
  if (args.startYear || args.endYear) {
    const currentYear = new Date().getFullYear();

    if (args.startYear) {
      const startYear = Number(args.startYear);
      if (isNaN(startYear) || startYear < 1851 || startYear > currentYear) {
        throw new ValidationError(
          `Invalid start year '${args.startYear}'. Must be between 1851 and ${currentYear}`,
          'startYear',
          args.startYear,
        );
      }
    }

    if (args.endYear) {
      const endYear = Number(args.endYear);
      if (isNaN(endYear) || endYear < 1851 || endYear > currentYear) {
        throw new ValidationError(
          `Invalid end year '${args.endYear}'. Must be between 1851 and ${currentYear}`,
          'endYear',
          args.endYear,
        );
      }
    }

    if (args.startYear && args.endYear && Number(args.startYear) > Number(args.endYear)) {
      throw new ValidationError(
        'Start year cannot be greater than end year',
        'startYear|endYear',
        `${args.startYear} > ${args.endYear}`,
      );
    }
  }

  // Validate basin if provided
  if (args.basin) {
    const validBasins = ['AL', 'EP', 'CP', 'WP', 'IO', 'SH', 'NA', 'SA', 'NI', 'SI', 'SP'];
    if (!validBasins.includes(args.basin.toUpperCase())) {
      throw new ValidationError(
        `Invalid basin code '${args.basin}'. Valid codes: ${validBasins.join(', ')}`,
        'basin',
        args.basin,
      );
    }
  }

  // Validate category range
  if (args.minCategory !== undefined || args.maxCategory !== undefined) {
    if (args.minCategory !== undefined) {
      const minCat = Number(args.minCategory);
      if (isNaN(minCat) || minCat < 0 || minCat > 5) {
        throw new ValidationError(
          'Minimum category must be between 0 and 5',
          'minCategory',
          args.minCategory,
        );
      }
    }

    if (args.maxCategory !== undefined) {
      const maxCat = Number(args.maxCategory);
      if (isNaN(maxCat) || maxCat < 0 || maxCat > 5) {
        throw new ValidationError(
          'Maximum category must be between 0 and 5',
          'maxCategory',
          args.maxCategory,
        );
      }
    }

    if (args.minCategory !== undefined && args.maxCategory !== undefined) {
      if (Number(args.minCategory) > Number(args.maxCategory)) {
        throw new ValidationError(
          'Minimum category cannot be greater than maximum category',
          'minCategory|maxCategory',
          `${args.minCategory} > ${args.maxCategory}`,
        );
      }
    }
  }

  // Validate limit
  if (args.limit !== undefined) {
    const limit = Number(args.limit);
    if (isNaN(limit) || limit < 1 || limit > 1000) {
      throw new ValidationError(
        'Limit must be between 1 and 1000',
        'limit',
        args.limit,
      );
    }
  }
}

/**
 * Validate storm track tool parameters
 */
function validateStormTrackParams(args: any): void {
  if (!args || typeof args !== 'object') {
    throw new ValidationError('Storm track arguments are required', 'arguments');
  }

  if (!args.stormId || typeof args.stormId !== 'string') {
    throw new ValidationError(
      'Storm ID is required and must be a string',
      'stormId',
      args.stormId,
    );
  }

  // Validate storm ID format
  const stormIdPattern = /^[A-Z]{2}\d{2}\d{4}$/;
  if (!stormIdPattern.test(args.stormId.toUpperCase())) {
    throw new ValidationError(
      'Invalid storm ID format. Expected format: BASINNNNYYYY (e.g., AL012023)',
      'stormId',
      args.stormId,
    );
  }

  // Validate resolution if provided
  if (args.resolution && typeof args.resolution === 'string') {
    const validResolutions = ['best', 'preliminary', 'forecast'];
    if (!validResolutions.includes(args.resolution.toLowerCase())) {
      throw new ValidationError(
        `Invalid resolution '${args.resolution}'. Valid options: ${validResolutions.join(', ')}`,
        'resolution',
        args.resolution,
      );
    }
  }
}

/**
 * Validate risk analysis tool parameters
 */
function validateRiskAnalysisParams(args: any): void {
  if (!args || typeof args !== 'object') {
    throw new ValidationError('Risk analysis arguments are required', 'arguments');
  }

  // Require coordinates
  if (args.latitude === undefined || args.longitude === undefined) {
    throw new ValidationError(
      'Latitude and longitude are required for risk analysis',
      'latitude|longitude',
      args,
    );
  }

  validateCoordinates(args.latitude, args.longitude);

  // Validate radius if provided
  if (args.radius !== undefined) {
    const radius = Number(args.radius);
    if (isNaN(radius) || radius < 1 || radius > 500) {
      throw new ValidationError(
        'Radius must be between 1 and 500 nautical miles',
        'radius',
        args.radius,
      );
    }
  }

  // Validate risk factors if provided
  if (args.factors && Array.isArray(args.factors)) {
    const validFactors = ['wind', 'surge', 'flooding', 'tornado', 'landslide'];
    const invalidFactors = args.factors.filter((f: any) => !validFactors.includes(f));
    if (invalidFactors.length > 0) {
      throw new ValidationError(
        `Invalid risk factors: ${invalidFactors.join(', ')}. Valid factors: ${validFactors.join(', ')}`,
        'factors',
        invalidFactors,
      );
    }
  }
}

/**
 * Validate evacuation zones tool parameters
 */
function validateEvacuationZonesParams(args: any): void {
  if (!args || typeof args !== 'object') {
    throw new ValidationError('Evacuation zones arguments are required', 'arguments');
  }

  // Require either coordinates or location
  if (!(args.latitude && args.longitude) && !args.location) {
    throw new ValidationError(
      'Either coordinates (latitude/longitude) or location are required',
      'coordinates|location',
      args,
    );
  }

  // Validate coordinates if provided
  if (args.latitude !== undefined || args.longitude !== undefined) {
    validateCoordinates(args.latitude, args.longitude);
  }

  // Validate location if provided
  if (args.location && typeof args.location === 'string') {
    if (args.location.trim().length === 0) {
      throw new ValidationError(
        'Location cannot be empty',
        'location',
        args.location,
      );
    }

    if (args.location.length > 100) {
      throw new ValidationError(
        'Location name is too long (max 100 characters)',
        'location',
        args.location,
      );
    }
  }
}

/**
 * Helper function to validate coordinates
 */
function validateCoordinates(latitude: any, longitude: any): void {
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (isNaN(lat)) {
    throw new ValidationError(
      'Latitude must be a valid number',
      'latitude',
      latitude,
    );
  }

  if (isNaN(lon)) {
    throw new ValidationError(
      'Longitude must be a valid number',
      'longitude',
      longitude,
    );
  }

  if (lat < -90 || lat > 90) {
    throw new ValidationError(
      'Latitude must be between -90 and 90 degrees',
      'latitude',
      latitude,
    );
  }

  if (lon < -180 || lon > 180) {
    throw new ValidationError(
      'Longitude must be between -180 and 180 degrees',
      'longitude',
      longitude,
    );
  }
}

/**
 * Validate HTTP transport headers
 */
export function validateHTTPHeaders(headers: any): void {
  if (!headers['content-type']?.includes('application/json')) {
    throw new ValidationError(
      'Content-Type must be application/json',
      'content-type',
      headers['content-type'],
    );
  }
}

/**
 * Sanitize user input to prevent injection attacks
 */
export function sanitizeInput(input: string): string {
  // Remove control characters
  // eslint-disable-next-line no-control-regex
  let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length
  if (sanitized.length > 1000) {
    sanitized = sanitized.substring(0, 1000);
  }

  return sanitized;
}

/**
 * Validation middleware factory for different transports
 */
export function createValidationMiddleware(transport: 'stdio' | 'http') {
  return async function validateRequest(request: any, context?: any): Promise<void> {
    const validationContext: ValidationContext = {
      transport,
      clientId: context?.clientId,
      requestId: request?.id,
    };

    try {
      // Validate JSON-RPC structure
      validateJSONRPC(request, validationContext);

      // Method-specific validation
      switch (request.method) {
      case 'initialize':
        validateInitializeRequest(request.params);
        break;
      case 'tools/call':
        validateToolCallRequest(request.params);
        break;
      case 'tools/list':
        // No additional validation needed
        break;
      case 'resources/list':
        // No additional validation needed
        break;
      case 'resources/read':
        // Basic validation for resource reading
        if (request.params && !request.params.uri) {
          throw new ValidationError('Resource URI is required', 'uri');
        }
        break;
      case 'prompts/list':
        // No additional validation needed
        break;
      case 'prompts/get':
        // Basic validation for prompt access
        if (request.params && !request.params.name) {
          throw new ValidationError('Prompt name is required', 'name');
        }
        break;
      case 'notifications/initialized':
        // Notification, no validation needed
        break;
      case 'shutdown':
        // No additional validation needed
        break;
      default:
        // Unknown methods are allowed per MCP spec, just log
        logger.warn({
          method: request.method,
          ...validationContext,
        }, 'Unknown method received');
      }

      logger.debug({
        method: request.method,
        ...validationContext,
      }, 'Hurricane MCP request validation passed');
    } catch (error) {
      logger.error({
        error: (error as Error).message,
        method: request?.method,
        ...validationContext,
      }, 'Hurricane MCP request validation failed');
      throw error;
    }
  };
}

/**
 * Rate limiting validator for hurricane operations
 */
export class HurricaneRateLimitValidator {
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if request should be rate limited
   */
  shouldRateLimit(clientId: string, operation?: string): boolean {
    const key = operation ? `${clientId}:${operation}` : clientId;
    const now = Date.now();
    const clientData = this.requestCounts.get(key);

    if (!clientData || now > clientData.resetTime) {
      // New window
      this.requestCounts.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return false;
    }

    clientData.count++;

    if (clientData.count > this.maxRequests) {
      logger.warn({
        clientId,
        operation,
        count: clientData.count,
        maxRequests: this.maxRequests,
      }, 'Hurricane MCP rate limit exceeded');
      return true;
    }

    return false;
  }

  /**
   * Clean up old entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.requestCounts.entries()) {
      if (now > data.resetTime) {
        this.requestCounts.delete(key);
      }
    }
  }

  /**
   * Get current request count for a client
   */
  getRequestCount(clientId: string, operation?: string): number {
    const key = operation ? `${clientId}:${operation}` : clientId;
    const data = this.requestCounts.get(key);
    return data ? data.count : 0;
  }
}

// Export singleton rate limiter
export const hurricaneRateLimiter = new HurricaneRateLimitValidator();

// Cleanup interval
if (typeof setInterval !== 'undefined') {
  setInterval(() => hurricaneRateLimiter.cleanup(), 60000);
}
