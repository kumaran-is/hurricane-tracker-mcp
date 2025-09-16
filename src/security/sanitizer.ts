/**
 * @fileoverview Security sanitization utilities for Hurricane Tracker MCP Server
 * Provides input sanitization and validation based on DOMPurify patterns
 */

import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';
import { logger } from '../logger-pino.js';

/**
 * Security manager for input sanitization and validation
 * Adapted for hurricane-specific data patterns
 */
export class SecurityManager {
  private window: any;
  private purify: any;

  constructor() {
    // Initialize JSDOM for server-side DOMPurify usage
    const dom = new JSDOM('');
    this.window = dom.window;
    this.purify = DOMPurify(this.window);

    this.configurePurify();
  }

  /**
   * Configure DOMPurify with security settings
   */
  private configurePurify(): void {
    // Configure DOMPurify for strict sanitization
    this.purify.setConfig({
      ALLOWED_TAGS: [], // No HTML tags allowed
      ALLOWED_ATTR: [], // No attributes allowed
      KEEP_CONTENT: false, // Remove content from disallowed tags
      FORCE_BODY: false,
      SANITIZE_DOM: true,
      SANITIZE_NAMED_PROPS: true,
    });
  }

  /**
   * Sanitize input to prevent XSS and injection attacks
   * Recursively sanitizes strings, arrays, and objects
   */
  sanitizeInput(input: any): any {
    if (input === null || input === undefined) {
      return input;
    }

    if (typeof input === 'string') {
      return this.sanitizeString(input);
    }

    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }

    if (typeof input === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        const sanitizedKey = this.sanitizeString(key);
        sanitized[sanitizedKey] = this.sanitizeInput(value);
      }
      return sanitized;
    }

    // For numbers, booleans, etc., return as-is
    return input;
  }

  /**
   * Sanitize string input using DOMPurify and additional security measures
   */
  public sanitizeString(str: string): string {
    try {
      // First pass: DOMPurify sanitization
      let sanitized = this.purify.sanitize(str, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
      });

      // Second pass: SQL injection protection
      sanitized = this.escapeSql(sanitized);

      // Third pass: Command injection protection
      sanitized = this.escapeShell(sanitized);

      // Fourth pass: Path traversal protection
      sanitized = this.sanitizePath(sanitized);

      return sanitized;

    } catch (error) {
      logger.warn({
        error: error instanceof Error ? error.message : 'Unknown error',
        inputLength: str.length,
      }, 'String sanitization error');

      // If sanitization fails, return a safe empty string
      return '';
    }
  }

  /**
   * Escape SQL injection patterns
   */
  private escapeSql(str: string): string {
    // eslint-disable-next-line no-control-regex
    return str.replace(/[\0\x08\x09\x1a\n\r"'\\%]/g, (char) => {
      switch (char) {
        case '\0': return '\\0';
        case '\x08': return '\\b';
        case '\x09': return '\\t';
        case '\x1a': return '\\z';
        case '\n': return '\\n';
        case '\r': return '\\r';
        case '"':
        case "'":
        case '\\':
        case '%':
          return '\\' + char;
        default:
          return char;
      }
    });
  }

  /**
   * Escape shell command injection patterns
   */
  private escapeShell(str: string): string {
    // Remove dangerous shell characters
    return str.replace(/[;&|`$(){}[\]<>*?~]/g, '');
  }

  /**
   * Sanitize path traversal attempts
   */
  private sanitizePath(str: string): string {
    // Remove path traversal patterns
    return str.replace(/\.\.\./g, '').replace(/[/\\]/g, '');
  }

  /**
   * Validate API key format and sanitize
   */
  validateApiKey(key: string): boolean {
    if (!key || typeof key !== 'string') {
      return false;
    }

    // Basic format validation
    if (!/^[a-zA-Z0-9_-]{16,128}$/.test(key)) {
      return false;
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /script/i,
      /javascript/i,
      /eval/i,
      /function/i,
      /document/i,
      /window/i,
      /<[^>]*>/,
      /['"]/,
    ];

    return !suspiciousPatterns.some(pattern => pattern.test(key));
  }

  /**
   * Sanitize and validate coordinates
   */
  sanitizeCoordinates(lat: any, lon: any): { lat: number; lon: number } | null {
    try {
      const latitude = parseFloat(String(lat));
      const longitude = parseFloat(String(lon));

      // Validate coordinate ranges
      if (isNaN(latitude) || isNaN(longitude)) {
        return null;
      }

      if (latitude < -90 || latitude > 90) {
        return null;
      }

      if (longitude < -180 || longitude > 180) {
        return null;
      }

      return { lat: latitude, lon: longitude };
    } catch {
      return null;
    }
  }

  /**
   * Sanitize location name for hurricane queries
   */
  sanitizeLocationName(location: string): string | null {
    if (!location || typeof location !== 'string') {
      return null;
    }

    // Sanitize the input
    let sanitized = this.sanitizeString(location);

    // Remove excessive whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    // Validate location name format (letters, spaces, hyphens, apostrophes, commas for state/country)
    if (!/^[a-zA-Z\s',-]{1,100}$/.test(sanitized)) {
      return null;
    }

    // Minimum length check
    if (sanitized.length < 1) {
      return null;
    }

    return sanitized;
  }

  /**
   * Validate and sanitize storm ID (e.g., AL012023, EP042023)
   */
  isValidStormId(stormId: string): boolean {
    if (!stormId || typeof stormId !== 'string') {
      return false;
    }

    const sanitized = this.sanitizeString(stormId);
    
    // Storm ID format: Basin (2 letters) + Number (2 digits) + Year (4 digits)
    const stormIdPattern = /^[A-Z]{2}\d{2}\d{4}$/;
    
    return stormIdPattern.test(sanitized) && sanitized.length === 8;
  }

  /**
   * Validate and sanitize storm name
   */
  isValidStormName(stormName: string): boolean {
    if (!stormName || typeof stormName !== 'string') {
      return false;
    }

    const sanitized = this.sanitizeString(stormName);
    
    // Storm names should only contain letters and spaces
    return /^[a-zA-Z\s]{1,50}$/.test(sanitized);
  }

  /**
   * Sanitize date parameter (YYYY-MM-DD or YYYY format)
   */
  sanitizeDateParam(dateParam: string): string | null {
    if (!dateParam || typeof dateParam !== 'string') {
      return null;
    }

    const sanitized = this.sanitizeString(dateParam);
    
    // Check for ISO date format (YYYY-MM-DD) or year (YYYY)
    if (/^\d{4}-\d{2}-\d{2}$/.test(sanitized)) {
      const date = new Date(sanitized);
      if (isNaN(date.getTime())) {
        return null;
      }
      return sanitized;
    }
    
    if (/^\d{4}$/.test(sanitized)) {
      const year = parseInt(sanitized, 10);
      if (year >= 1851 && year <= new Date().getFullYear() + 1) {
        return sanitized;
      }
    }
    
    return null;
  }

  /**
   * Sanitize URL parameters
   */
  sanitizeUrlParam(param: string): string {
    if (!param || typeof param !== 'string') {
      return '';
    }

    // URL encode and sanitize
    let sanitized = encodeURIComponent(this.sanitizeString(param));

    // Additional URL-specific cleaning
    sanitized = sanitized.replace(/%2F/g, ''); // Remove encoded slashes
    sanitized = sanitized.replace(/%2E/g, ''); // Remove encoded dots

    return sanitized;
  }

  /**
   * Validate email format (for notifications, etc.)
   */
  validateEmail(email: string): boolean {
    if (!email || typeof email !== 'string') {
      return false;
    }

    const sanitized = this.sanitizeString(email);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailRegex.test(sanitized) && sanitized.length <= 254;
  }

  /**
   * Sanitize JSON payload
   */
  sanitizeJsonPayload(payload: any): any {
    try {
      if (typeof payload === 'string') {
        payload = JSON.parse(payload);
      }

      return this.sanitizeInput(payload);
    } catch (error) {
      logger.warn({
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'JSON payload sanitization error');
      return null;
    }
  }

  /**
   * Check for common attack patterns in input
   */
  containsAttackPatterns(input: string): boolean {
    const attackPatterns = [
      // XSS patterns
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,

      // SQL injection patterns
      /'\s*(or|and)\s*'.*?'/gi,
      /union\s+select/gi,
      /drop\s+table/gi,

      // Command injection patterns
      /;\s*(rm|del|format|shutdown)/gi,
      /\|\s*(nc|netcat|curl|wget)/gi,

      // Path traversal
      /\.\.[/\\]/g,

      // NoSQL injection
      /\$ne|\$gt|\$lt|\$regex/gi,
    ];

    return attackPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Generate content security policy for responses
   */
  getContentSecurityPolicy(): string {
    return [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "connect-src 'self'",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      'upgrade-insecure-requests',
    ].join('; ');
  }

  /**
   * Sanitize HTTP headers
   */
  sanitizeHeaders(headers: Record<string, any>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const allowedHeaders = [
      'content-type',
      'authorization',
      'x-api-key',
      'x-correlation-id',
      'user-agent',
      'accept',
      'accept-encoding',
      'accept-language',
      'cache-control',
      'if-none-match',
      'if-modified-since',
    ];

    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();

      if (allowedHeaders.includes(lowerKey) && value) {
        const sanitizedValue = this.sanitizeString(String(value));
        if (sanitizedValue && sanitizedValue.length <= 1000) {
          sanitized[lowerKey] = sanitizedValue;
        }
      }
    }

    return sanitized;
  }
}

/**
 * Global security manager instance
 */
export const securityManager = new SecurityManager();

/**
 * Middleware helper for request sanitization
 */
export function sanitizeRequestData(data: any): any {
  return securityManager.sanitizeInput(data);
}

/**
 * Validate input size limits
 */
export function validateInputSize(input: any, maxSize: number = 1048576): boolean {
  try {
    const size = JSON.stringify(input).length;
    return size <= maxSize;
  } catch {
    return false;
  }
}

/**
 * Rate limiting key generator with sanitization
 */
export function generateRateLimitKey(identifier: string, endpoint?: string): string {
  const sanitizedId = securityManager.sanitizeString(identifier);
  const sanitizedEndpoint = endpoint ? securityManager.sanitizeString(endpoint) : 'global';

  return `${sanitizedId}:${sanitizedEndpoint}`;
}
