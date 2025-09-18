/**
 * @fileoverview Input sanitization middleware for Hurricane Tracker MCP Server
 * Provides comprehensive input sanitization for hurricane data processing
 */

import { SecurityManager, validateInputSize } from '../security/sanitizer.js';
import { logger } from '../logging/logger-pino.js';

/**
 * Sanitization middleware factory
 * Sanitizes all inputs (tool calls, resources, prompts) before processing
 */
export function createSanitizationMiddleware() {
  const securityManager = new SecurityManager();

  return async function sanitizationMiddleware(
    input: any,
    context?: { correlationId?: string; source?: string },
  ): Promise<any> {
    const correlationId = context?.correlationId || 'unknown';
    const startTime = Date.now();

    try {
      // Check input size limits first
      const maxSize = 1048576; // 1MB default

      if (input && !validateInputSize(input, maxSize)) {
        logger.warn({
          correlationId,
          source: context?.source,
          maxSize,
        }, 'Input rejected: Input size exceeds limit');

        throw new Error(`Input payload exceeds size limit of ${maxSize} bytes`);
      }

      // Sanitize the input
      if (input) {
        try {
          const sanitizedInput = securityManager.sanitizeInput(input);

          // Check for attack patterns in the original input
          const inputString = JSON.stringify(input);
          if (securityManager.containsAttackPatterns(inputString)) {
            logger.warn({
              correlationId,
              source: context?.source,
              inputSize: inputString.length,
            }, 'Input rejected: Attack patterns detected');

            throw new Error('Input contains potentially malicious content');
          }

          logger.debug({
            correlationId,
            source: context?.source,
            duration: Date.now() - startTime,
          }, 'Input sanitization completed');

          return sanitizedInput;

        } catch (error) {
          logger.warn({
            correlationId,
            error: error instanceof Error ? error.message : 'Unknown error',
          }, 'Input sanitization failed');

          throw new Error('Input contains invalid data');
        }
      }

      return input;

    } catch (error) {
      logger.error({
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        source: context?.source,
        duration: Date.now() - startTime,
      }, 'Sanitization middleware error');

      throw error;
    }
  };
}

/**
 * Hurricane-specific input sanitization middleware
 * Validates and sanitizes hurricane-related parameters
 */
export function createHurricaneSanitizationMiddleware() {
  const securityManager = new SecurityManager();

  return async function hurricaneSanitizationMiddleware(
    input: any,
    context?: { correlationId?: string; operation?: string },
  ): Promise<any> {
    const correlationId = context?.correlationId || 'unknown';

    try {
      if (!input || typeof input !== 'object') {
        return input;
      }

      const sanitized = { ...input };

      // Sanitize location names (city, state, region)
      const locationFields = ['city', 'location', 'region', 'state', 'place', 'name'];
      for (const field of locationFields) {
        if (sanitized[field] && typeof sanitized[field] === 'string') {
          const sanitizedLocation = securityManager.sanitizeLocationName(sanitized[field]);

          if (!sanitizedLocation) {
            logger.warn({
              correlationId,
              field,
              originalValue: sanitized[field],
            }, 'Invalid location name in input');

            throw new Error(`Invalid ${field} name format`);
          }

          sanitized[field] = sanitizedLocation;
        }
      }

      // Sanitize coordinates if present
      if ((sanitized.lat !== undefined && sanitized.lon !== undefined) ||
          (sanitized.latitude !== undefined && sanitized.longitude !== undefined)) {
        const lat = sanitized.lat || sanitized.latitude;
        const lon = sanitized.lon || sanitized.longitude;

        const coordinates = securityManager.sanitizeCoordinates(lat, lon);

        if (!coordinates) {
          logger.warn({
            correlationId,
            lat,
            lon,
          }, 'Invalid coordinates in input');

          throw new Error('Invalid latitude or longitude values');
        }

        if (sanitized.lat !== undefined) {
          sanitized.lat = coordinates.lat;
          sanitized.lon = coordinates.lon;
        }
        if (sanitized.latitude !== undefined) {
          sanitized.latitude = coordinates.lat;
          sanitized.longitude = coordinates.lon;
        }
      }

      // Validate hurricane-specific numeric parameters
      const numericParams = {
        year: { min: 1850, max: new Date().getFullYear() + 10 },
        season: { min: 1850, max: new Date().getFullYear() + 10 },
        category: { min: 0, max: 5 },
        windSpeed: { min: 0, max: 300 }, // mph
        pressure: { min: 800, max: 1100 }, // mb
        days: { min: 0, max: 365 },
        hours: { min: 0, max: 8760 }, // 24 * 365
        radius: { min: 0, max: 1000 }, // nautical miles
        limit: { min: 1, max: 1000 },
      };

      for (const [param, range] of Object.entries(numericParams)) {
        if (sanitized[param] !== undefined) {
          const value = Number(sanitized[param]);

          if (isNaN(value) || value < range.min || value > range.max) {
            logger.warn({
              correlationId,
              parameter: param,
              value: sanitized[param],
              range,
            }, 'Invalid numeric parameter in hurricane input');

            throw new Error(`Invalid value for parameter '${param}': must be between ${range.min} and ${range.max}`);
          }

          sanitized[param] = value;
        }
      }

      // Validate hurricane basin codes
      if (sanitized.basin && typeof sanitized.basin === 'string') {
        const validBasins = ['AL', 'EP', 'CP', 'WP', 'IO', 'SH', 'NA', 'SA', 'NI', 'SI', 'SP'];
        const basinCode = sanitized.basin.toUpperCase();

        if (!validBasins.includes(basinCode)) {
          logger.warn({
            correlationId,
            basin: sanitized.basin,
            validBasins,
          }, 'Invalid basin code in hurricane input');

          throw new Error(`Invalid basin code '${sanitized.basin}'. Valid codes: ${validBasins.join(', ')}`);
        }

        sanitized.basin = basinCode;
      }

      // Validate storm IDs (format: BASINNNNYYYY, e.g., AL012023)
      if (sanitized.stormId && typeof sanitized.stormId === 'string') {
        const stormIdPattern = /^[A-Z]{2}\d{2}\d{4}$/;

        if (!stormIdPattern.test(sanitized.stormId.toUpperCase())) {
          logger.warn({
            correlationId,
            stormId: sanitized.stormId,
          }, 'Invalid storm ID format in hurricane input');

          throw new Error(`Invalid storm ID format '${sanitized.stormId}'. Expected format: BASINNNNYYYY (e.g., AL012023)`);
        }

        sanitized.stormId = sanitized.stormId.toUpperCase();
      }

      // Validate date ranges
      const dateFields = ['startDate', 'endDate', 'date', 'fromDate', 'toDate'];
      for (const field of dateFields) {
        if (sanitized[field] && typeof sanitized[field] === 'string') {
          const date = new Date(sanitized[field]);

          if (isNaN(date.getTime())) {
            logger.warn({
              correlationId,
              field,
              value: sanitized[field],
            }, 'Invalid date format in hurricane input');

            throw new Error(`Invalid date format for '${field}'`);
          }

          // Check reasonable date range (1850 to 10 years in future)
          const minDate = new Date('1850-01-01');
          const maxDate = new Date();
          maxDate.setFullYear(maxDate.getFullYear() + 10);

          if (date < minDate || date > maxDate) {
            logger.warn({
              correlationId,
              field,
              value: sanitized[field],
              range: { min: minDate.toISOString(), max: maxDate.toISOString() },
            }, 'Date out of valid range in hurricane input');

            throw new Error(`Date '${field}' is outside valid range (1850 to ${maxDate.getFullYear()})`);
          }

          sanitized[field] = date.toISOString();
        }
      }

      logger.debug({
        correlationId,
        operation: context?.operation,
      }, 'Hurricane-specific sanitization completed');

      return sanitized;

    } catch (error) {
      logger.error({
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        operation: context?.operation,
      }, 'Hurricane sanitization middleware error');

      throw error;
    }
  };
}

/**
 * Create combined sanitization middleware for comprehensive protection
 */
export function createComprehensiveSanitizationMiddleware() {
  const generalSanitization = createSanitizationMiddleware();
  const hurricaneSanitization = createHurricaneSanitizationMiddleware();

  return async function comprehensiveSanitizationMiddleware(
    input: any,
    context?: {
      correlationId?: string;
      source?: string;
      operation?: string;
      isHurricaneOperation?: boolean;
    },
  ): Promise<any> {
    // First apply general sanitization
    let sanitized = await generalSanitization(input, {
      correlationId: context?.correlationId,
      source: context?.source,
    });

    // Then apply hurricane-specific sanitization for hurricane operations
    if (context?.isHurricaneOperation ||
        context?.operation?.toLowerCase().includes('hurricane') ||
        context?.operation?.toLowerCase().includes('storm') ||
        context?.operation?.toLowerCase().includes('weather')) {
      sanitized = await hurricaneSanitization(sanitized, {
        correlationId: context?.correlationId,
        operation: context?.operation,
      });
    }

    return sanitized;
  };
}

/**
 * MCP Tool call sanitization
 * Sanitizes MCP tool call arguments before execution
 */
export async function sanitizeToolCall(
  toolName: string,
  args: any,
  correlationId?: string,
): Promise<any> {
  const middleware = createComprehensiveSanitizationMiddleware();

  return await middleware(args, {
    correlationId,
    source: 'tool-call',
    operation: toolName,
    isHurricaneOperation: true,
  });
}

/**
 * MCP Resource sanitization
 * Sanitizes MCP resource access parameters
 */
export async function sanitizeResourceAccess(
  resourceUri: string,
  params: any,
  correlationId?: string,
): Promise<any> {
  const middleware = createComprehensiveSanitizationMiddleware();

  return await middleware(params, {
    correlationId,
    source: 'resource-access',
    operation: resourceUri,
    isHurricaneOperation: true,
  });
}

/**
 * Response sanitization helper
 * Sanitizes outgoing response data to prevent information leakage
 */
export function sanitizeResponse(data: any): any {
  const securityManager = new SecurityManager();

  // Remove sensitive fields from response
  const sensitiveFields = [
    'password',
    'secret',
    'key',
    'token',
    'auth',
    'private',
    'internal',
    'debug',
    'api_key',
    'apikey',
    'authorization',
  ];

  function removeSensitiveFields(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => removeSensitiveFields(item));
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {};

      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();

        // Skip sensitive fields
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          continue;
        }

        sanitized[key] = removeSensitiveFields(value);
      }

      return sanitized;
    }

    // Sanitize string values
    if (typeof obj === 'string') {
      return securityManager.sanitizeInput(obj);
    }

    return obj;
  }

  return removeSensitiveFields(data);
}

/**
 * Hurricane data specific response sanitization
 * Ensures hurricane data doesn't contain sensitive information
 */
export function sanitizeHurricaneResponse(data: any): any {
  const basesanitized = sanitizeResponse(data);

  // Additional hurricane-specific sanitization
  function sanitizeHurricaneData(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeHurricaneData(item));
    }

    if (obj && typeof obj === 'object') {
      const sanitized = { ...obj };

      // Ensure coordinates are properly formatted
      if (sanitized.latitude && sanitized.longitude) {
        sanitized.latitude = Number(Number(sanitized.latitude).toFixed(6));
        sanitized.longitude = Number(Number(sanitized.longitude).toFixed(6));
      }

      if (sanitized.lat && sanitized.lon) {
        sanitized.lat = Number(Number(sanitized.lat).toFixed(6));
        sanitized.lon = Number(Number(sanitized.lon).toFixed(6));
      }

      // Ensure wind speeds are reasonable
      if (sanitized.windSpeed && typeof sanitized.windSpeed === 'number') {
        sanitized.windSpeed = Math.max(0, Math.min(300, sanitized.windSpeed));
      }

      // Ensure pressure values are reasonable
      if (sanitized.pressure && typeof sanitized.pressure === 'number') {
        sanitized.pressure = Math.max(800, Math.min(1100, sanitized.pressure));
      }

      // Recursively sanitize nested objects
      for (const [key, value] of Object.entries(sanitized)) {
        sanitized[key] = sanitizeHurricaneData(value);
      }

      return sanitized;
    }

    return obj;
  }

  return sanitizeHurricaneData(basesanitized);
}
