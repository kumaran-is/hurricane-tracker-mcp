/**
 * Authentication middleware for Hurricane Tracker MCP Server
 * Handles API key validation and user authentication
 */

import { logger } from '../logging/logger-pino.js';

export interface AuthConfig {
  enabled: boolean;
  apiKeys: string[];
  headerName: string;
  allowAnonymous: boolean;
  sessionTimeout: number;
}

export interface AuthContext {
  isAuthenticated: boolean;
  userId?: string;
  apiKey?: string;
  sessionId?: string;
  permissions: string[];
}

/**
 * Default authentication configuration
 */
const DEFAULT_AUTH_CONFIG: AuthConfig = {
  enabled: process.env.AUTH_ENABLED === 'true' || false,
  apiKeys: process.env.MCP_SERVER_API_KEYS?.split(',') || [],
  headerName: 'X-API-Key',
  allowAnonymous: true,
  sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600000'), // 1 hour
};

/**
 * Authentication middleware for MCP requests
 */
export class AuthMiddleware {
  private config: AuthConfig;
  private sessions: Map<string, { userId: string; expires: number }> = new Map();

  constructor(config: Partial<AuthConfig> = {}) {
    this.config = { ...DEFAULT_AUTH_CONFIG, ...config };
    
    if (this.config.enabled) {
      logger.info('Hurricane Tracker auth middleware initialized', {
        headerName: this.config.headerName,
        allowAnonymous: this.config.allowAnonymous,
        apiKeysConfigured: this.config.apiKeys.length,
      });
    }
  }

  /**
   * Authenticate a request
   */
  async authenticate(headers: Record<string, string>): Promise<AuthContext> {
    if (!this.config.enabled) {
      return this.createAnonymousContext();
    }

    const apiKey = headers[this.config.headerName.toLowerCase()] || 
                   headers[this.config.headerName];

    if (!apiKey) {
      if (this.config.allowAnonymous) {
        return this.createAnonymousContext();
      }
      throw new AuthenticationError('API key required');
    }

    if (!this.isValidApiKey(apiKey)) {
      throw new AuthenticationError('Invalid API key');
    }

    const userId = this.getUserIdFromApiKey(apiKey);
    const sessionId = this.createSession(userId);

    return {
      isAuthenticated: true,
      userId,
      apiKey,
      sessionId,
      permissions: this.getPermissions(userId),
    };
  }

  /**
   * Validate session
   */
  validateSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    if (session.expires < Date.now()) {
      this.sessions.delete(sessionId);
      return false;
    }

    return true;
  }

  /**
   * Refresh session
   */
  refreshSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.expires = Date.now() + this.config.sessionTimeout;
    return true;
  }

  /**
   * Invalidate session
   */
  invalidateSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Check if user has permission
   */
  hasPermission(context: AuthContext, permission: string): boolean {
    return context.permissions.includes(permission) || 
           context.permissions.includes('*');
  }

  /**
   * Create anonymous context
   */
  private createAnonymousContext(): AuthContext {
    return {
      isAuthenticated: false,
      permissions: ['hurricane:read'], // Limited permissions for anonymous users
    };
  }

  /**
   * Check if API key is valid
   */
  private isValidApiKey(apiKey: string): boolean {
    return this.config.apiKeys.includes(apiKey);
  }

  /**
   * Get user ID from API key (simple mapping)
   */
  private getUserIdFromApiKey(apiKey: string): string {
    // In production, this would be a proper lookup
    const index = this.config.apiKeys.indexOf(apiKey);
    return `user_${index}`;
  }

  /**
   * Create new session
   */
  private createSession(userId: string): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expires = Date.now() + this.config.sessionTimeout;

    this.sessions.set(sessionId, { userId, expires });

    // Clean up expired sessions periodically
    this.cleanupExpiredSessions();

    return sessionId;
  }

  /**
   * Get permissions for user
   */
  private getPermissions(userId: string): string[] {
    // In production, this would be fetched from a database
    // For now, return default permissions based on user
    if (userId === 'user_0') {
      return ['*']; // Admin permissions
    }
    
    return [
      'hurricane:read',
      'hurricane:forecast',
      'hurricane:alerts',
      'hurricane:track',
      'hurricane:historical',
    ];
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expires < now) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug('Cleaned up expired sessions', { count: cleanedCount });
    }
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    const now = Date.now();
    const activeSessions = Array.from(this.sessions.values())
      .filter(session => session.expires > now);

    return {
      totalSessions: this.sessions.size,
      activeSessions: activeSessions.length,
      expiredSessions: this.sessions.size - activeSessions.length,
    };
  }
}

/**
 * Authentication error class
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error class
 */
export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

// Export singleton instance
export const authMiddleware = new AuthMiddleware();

/**
 * Authentication utilities
 */
export const authUtils = {
  /**
   * Generate secure API key
   */
  generateApiKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Hash API key for storage
   */
  hashApiKey(apiKey: string): string {
    // In production, use a proper hashing algorithm like bcrypt
    // This is just a placeholder
    return Buffer.from(apiKey).toString('base64');
  },

  /**
   * Create bearer token
   */
  createBearerToken(sessionId: string): string {
    return `Bearer ${sessionId}`;
  },

  /**
   * Parse bearer token
   */
  parseBearerToken(authorization: string): string | null {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return null;
    }
    
    return authorization.substring(7);
  },

  /**
   * Validate request origin
   */
  validateOrigin(origin: string, allowedOrigins: string[]): boolean {
    if (allowedOrigins.includes('*')) {
      return true;
    }
    
    return allowedOrigins.includes(origin);
  },

  /**
   * Extract IP address from request
   */
  extractIP(headers: Record<string, string>): string {
    return headers['x-forwarded-for'] || 
           headers['x-real-ip'] || 
           headers['cf-connecting-ip'] || 
           'unknown';
  },

  /**
   * Create authentication challenge
   */
  createAuthChallenge(): Record<string, string> {
    return {
      'WWW-Authenticate': `Bearer realm="Hurricane Tracker MCP"`,
      'X-Auth-Methods': 'api-key,bearer-token',
    };
  },
};
