/**
 * Advanced Security Monitoring System for Hurricane Tracker MCP Server
 * Provides threat detection, intrusion monitoring, and security analytics
 */

import { EventEmitter } from 'events';
import { logger } from '../logger-pino.js';
import { auditLogger } from '../audit/audit-logger.js';

export interface SecurityThreat {
  id: string;
  timestamp: number;
  type: 'brute_force' | 'rate_limit_exceeded' | 'suspicious_pattern' | 'data_exfiltration' | 'injection_attempt' | 'privilege_escalation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: {
    ip?: string;
    userAgent?: string;
    userId?: string;
    sessionId?: string;
  };
  details: {
    description: string;
    indicators: string[];
    affectedResources: string[];
    attemptCount?: number;
    timeWindow?: number;
    metadata?: Record<string, any>;
  };
  mitigationActions: string[];
  resolved: boolean;
  resolvedAt?: number;
}

export interface SecurityConfiguration {
  enabled: boolean;
  bruteForceProtection: {
    enabled: boolean;
    maxAttempts: number;
    timeWindow: number;
    blockDuration: number;
  };
  rateLimitMonitoring: {
    enabled: boolean;
    requestsPerMinute: number;
    burstLimit: number;
    blockDuration: number;
  };
  suspiciousPatternDetection: {
    enabled: boolean;
    sqlInjectionDetection: boolean;
    xssDetection: boolean;
    pathTraversalDetection: boolean;
    commandInjectionDetection: boolean;
  };
  dataExfiltrationDetection: {
    enabled: boolean;
    maxResponseSize: number;
    maxRequestsPerMinute: number;
    sensitiveDataPatterns: string[];
  };
  ipBlocking: {
    enabled: boolean;
    autoBlock: boolean;
    whitelist: string[];
    blacklist: string[];
  };
  alerting: {
    enabled: boolean;
    criticalThreshold: number;
    webhookUrl?: string;
    emailRecipients: string[];
  };
}

export class SecurityMonitor extends EventEmitter {
  private config: SecurityConfiguration;
  private threats: SecurityThreat[] = [];
  private attemptTracking = new Map<string, { count: number; firstAttempt: number; lastAttempt: number }>();
  private rateLimitTracking = new Map<string, { requests: number[]; lastReset: number }>();
  private blockedIPs = new Set<string>();
  private whitelistedIPs = new Set<string>();

  constructor(config: Partial<SecurityConfiguration> = {}) {
    super();
    this.config = {
      enabled: process.env.SECURITY_MONITORING_ENABLED === 'true' || true,
      bruteForceProtection: {
        enabled: true,
        maxAttempts: 5,
        timeWindow: 300000,
        blockDuration: 900000,
      },
      rateLimitMonitoring: {
        enabled: true,
        requestsPerMinute: 100,
        burstLimit: 20,
        blockDuration: 300000,
      },
      suspiciousPatternDetection: {
        enabled: true,
        sqlInjectionDetection: true,
        xssDetection: true,
        pathTraversalDetection: true,
        commandInjectionDetection: true,
      },
      dataExfiltrationDetection: {
        enabled: true,
        maxResponseSize: 10485760,
        maxRequestsPerMinute: 50,
        sensitiveDataPatterns: ['api_key', 'password', 'token', 'secret', 'storm_id', 'location_data'],
      },
      ipBlocking: {
        enabled: true,
        autoBlock: true,
        whitelist: ['127.0.0.1', '::1'],
        blacklist: [],
      },
      alerting: {
        enabled: true,
        criticalThreshold: 10,
        emailRecipients: [],
      },
      ...config,
    };

    this.initializeIPLists();

    if (this.config.enabled) {
      logger.info('Hurricane Tracker security monitoring system initialized');
    }
  }

  /**
   * Monitor an MCP request for security threats
   */
  monitorMCPRequest(
    method: string,
    toolName: string,
    params: any,
    headers: Record<string, string>,
    sourceIP?: string,
    userId?: string,
  ): SecurityThreat[] {
    if (!this.config.enabled) {
      return [];
    }

    const threats: SecurityThreat[] = [];
    const context = {
      method,
      toolName,
      params,
      headers,
      sourceIP,
      userId,
      timestamp: Date.now(),
    };

    // Check if IP is blocked
    if (sourceIP && this.isIPBlocked(sourceIP)) {
      threats.push(this.createThreat('suspicious_pattern', 'high', context, {
        description: 'Request from blocked IP address',
        indicators: [`Blocked IP: ${sourceIP}`],
        affectedResources: [toolName],
      }));
    }

    // Brute force detection
    if (this.config.bruteForceProtection.enabled) {
      const bruteForceThreats = this.detectBruteForce(context);
      threats.push(...bruteForceThreats);
    }

    // Rate limit monitoring
    if (this.config.rateLimitMonitoring.enabled) {
      const rateLimitThreats = this.detectRateLimitViolations(context);
      threats.push(...rateLimitThreats);
    }

    // Suspicious pattern detection
    if (this.config.suspiciousPatternDetection.enabled) {
      const patternThreats = this.detectSuspiciousPatterns(context);
      threats.push(...patternThreats);
    }

    // Hurricane-specific security checks
    const hurricaneThreats = this.detectHurricaneSpecificThreats(context);
    threats.push(...hurricaneThreats);

    // Store and process threats
    for (const threat of threats) {
      this.processThreat(threat);
    }

    return threats;
  }

  /**
   * Monitor an HTTP request for security threats
   */
  monitorRequest(
    method: string,
    url: string,
    headers: Record<string, string>,
    body?: any,
    sourceIP?: string,
    userId?: string,
  ): SecurityThreat[] {
    if (!this.config.enabled) {
      return [];
    }

    const threats: SecurityThreat[] = [];
    const context = {
      method,
      url,
      headers,
      body,
      sourceIP,
      userId,
      timestamp: Date.now(),
    };

    // Check if IP is blocked
    if (sourceIP && this.isIPBlocked(sourceIP)) {
      threats.push(this.createThreat('suspicious_pattern', 'high', context, {
        description: 'Request from blocked IP address',
        indicators: [`Blocked IP: ${sourceIP}`],
        affectedResources: [url],
      }));
    }

    // Brute force detection
    if (this.config.bruteForceProtection.enabled) {
      const bruteForceThreats = this.detectBruteForce(context);
      threats.push(...bruteForceThreats);
    }

    // Rate limit monitoring
    if (this.config.rateLimitMonitoring.enabled) {
      const rateLimitThreats = this.detectRateLimitViolations(context);
      threats.push(...rateLimitThreats);
    }

    // Suspicious pattern detection
    if (this.config.suspiciousPatternDetection.enabled) {
      const patternThreats = this.detectSuspiciousPatterns(context);
      threats.push(...patternThreats);
    }

    // Store and process threats
    for (const threat of threats) {
      this.processThreat(threat);
    }

    return threats;
  }

  /**
   * Block an IP address
   */
  blockIP(ip: string, reason: string, duration?: number): void {
    this.blockedIPs.add(ip);

    if (duration) {
      globalThis.setTimeout(() => {
        this.unblockIP(ip);
      }, duration);
    }

    logger.warn({ ip, reason, duration }, 'IP address blocked');
    auditLogger.logSecurity(
      'ip_blocked',
      'security_blocking',
      'success',
      'high',
      undefined,
      { metadata: { ip, reason, duration } },
    );

    this.emit('ipBlocked', { ip, reason, duration });
  }

  /**
   * Unblock an IP address
   */
  unblockIP(ip: string): void {
    const wasBlocked = this.blockedIPs.delete(ip);
    if (wasBlocked) {
      logger.info({ ip }, 'IP address unblocked');
      this.emit('ipUnblocked', { ip });
    }
  }

  /**
   * Check if an IP address is blocked
   */
  isIPBlocked(ip: string): boolean {
    if (this.whitelistedIPs.has(ip)) {
      return false;
    }
    return this.blockedIPs.has(ip);
  }

  /**
   * Get security threats
   */
  getThreats(): SecurityThreat[] {
    return [...this.threats].sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get security statistics
   */
  getSecurityStats() {
    const now = Date.now();
    const last24Hours = now - 86400000;
    const recentThreats = this.threats.filter(threat => threat.timestamp > last24Hours);

    return {
      totalThreats: this.threats.length,
      recentThreats: recentThreats.length,
      blockedIPs: this.blockedIPs.size,
      whitelistedIPs: this.whitelistedIPs.size,
      threatsByType: this.getThreatsGroupedByType(recentThreats),
      threatsBySeverity: this.getThreatsGroupedBySeverity(recentThreats),
      activeSessions: this.attemptTracking.size,
      monitoringEnabled: this.config.enabled,
    };
  }

  /**
   * Initialize IP whitelist and blacklist
   */
  private initializeIPLists(): void {
    this.whitelistedIPs.clear();
    this.blockedIPs.clear();

    for (const ip of this.config.ipBlocking.whitelist) {
      this.whitelistedIPs.add(ip);
    }

    for (const ip of this.config.ipBlocking.blacklist) {
      this.blockedIPs.add(ip);
    }
  }

  /**
   * Detect brute force attacks
   */
  private detectBruteForce(context: any): SecurityThreat[] {
    const threats: SecurityThreat[] = [];
    const { sourceIP, userId, url, toolName } = context;

    // Check for authentication-related endpoints or tools
    const isAuthRelated = (url && (url.includes('auth') || url.includes('login'))) ||
                         (toolName && (toolName.includes('auth') || toolName.includes('login')));

    if (!isAuthRelated) {
      return threats;
    }

    const key = sourceIP || userId || 'unknown';
    const now = Date.now();
    const tracking = this.attemptTracking.get(key);

    if (tracking) {
      if (now - tracking.firstAttempt <= this.config.bruteForceProtection.timeWindow) {
        tracking.count++;
        tracking.lastAttempt = now;

        if (tracking.count >= this.config.bruteForceProtection.maxAttempts) {
          threats.push(this.createThreat('brute_force', 'high', context, {
            description: 'Brute force attack detected',
            indicators: [`${tracking.count} attempts in ${this.config.bruteForceProtection.timeWindow}ms`],
            affectedResources: [url || toolName],
            attemptCount: tracking.count,
            timeWindow: this.config.bruteForceProtection.timeWindow,
          }));

          if (this.config.ipBlocking.autoBlock && sourceIP) {
            this.blockIP(sourceIP, 'Brute force attack', this.config.bruteForceProtection.blockDuration);
          }
        }
      } else {
        tracking.count = 1;
        tracking.firstAttempt = now;
        tracking.lastAttempt = now;
      }
    } else {
      this.attemptTracking.set(key, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now,
      });
    }

    return threats;
  }

  /**
   * Detect rate limit violations
   */
  private detectRateLimitViolations(context: any): SecurityThreat[] {
    const threats: SecurityThreat[] = [];
    const { sourceIP } = context;

    if (!sourceIP) {
      return threats;
    }

    const now = Date.now();
    const key = sourceIP;
    const tracking = this.rateLimitTracking.get(key);

    if (tracking) {
      tracking.requests = tracking.requests.filter(timestamp => now - timestamp <= 60000);
      tracking.requests.push(now);

      if (tracking.requests.length > this.config.rateLimitMonitoring.requestsPerMinute) {
        threats.push(this.createThreat('rate_limit_exceeded', 'medium', context, {
          description: 'Rate limit exceeded',
          indicators: [`${tracking.requests.length} requests in last minute`],
          affectedResources: ['hurricane_api'],
        }));

        if (this.config.ipBlocking.autoBlock) {
          this.blockIP(sourceIP, 'Rate limit exceeded', this.config.rateLimitMonitoring.blockDuration);
        }
      }
    } else {
      this.rateLimitTracking.set(key, {
        requests: [now],
        lastReset: now,
      });
    }

    return threats;
  }

  /**
   * Detect suspicious patterns
   */
  private detectSuspiciousPatterns(context: any): SecurityThreat[] {
    const threats: SecurityThreat[] = [];
    const { url, params, body } = context;

    const content = [url, JSON.stringify(params), JSON.stringify(body)].filter(Boolean).join(' ');

    // SQL Injection patterns
    if (this.config.suspiciousPatternDetection.sqlInjectionDetection) {
      const sqlPatterns = [
        /(\bunion\b.*\bselect\b)|(\bselect\b.*\bfrom\b)/i,
        /(\bdrop\b|\bdelete\b|\btruncate\b).*\btable\b/i,
        /'.*or.*'.*=/i,
        /\|\|.*concat/i,
      ];

      for (const pattern of sqlPatterns) {
        if (pattern.test(content)) {
          threats.push(this.createThreat('injection_attempt', 'high', context, {
            description: 'SQL injection attempt detected',
            indicators: [pattern.toString()],
            affectedResources: ['database'],
          }));
        }
      }
    }

    // XSS patterns
    if (this.config.suspiciousPatternDetection.xssDetection) {
      const xssPatterns = [
        /<script.*?>.*?<\/script>/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /<iframe.*?>/i,
      ];

      for (const pattern of xssPatterns) {
        if (pattern.test(content)) {
          threats.push(this.createThreat('injection_attempt', 'high', context, {
            description: 'XSS attempt detected',
            indicators: [pattern.toString()],
            affectedResources: ['web_application'],
          }));
        }
      }
    }

    // Command injection patterns
    if (this.config.suspiciousPatternDetection.commandInjectionDetection) {
      const commandPatterns = [
        /[;&|`]+.*?(rm|del|format|shutdown)/i,
        /\$\(.*?\)|`.*?`/,
        /\|\s*(nc|netcat|curl|wget)/i,
      ];

      for (const pattern of commandPatterns) {
        if (pattern.test(content)) {
          threats.push(this.createThreat('injection_attempt', 'critical', context, {
            description: 'Command injection attempt detected',
            indicators: [pattern.toString()],
            affectedResources: ['system'],
          }));
        }
      }
    }

    // Path traversal patterns
    if (this.config.suspiciousPatternDetection.pathTraversalDetection) {
      const pathTraversalPatterns = [
        /\.\.[\\/\\]/g,
        /[\\/\\]\.\.[\\/\\]/g,
        /%2e%2e/i,
      ];

      for (const pattern of pathTraversalPatterns) {
        if (pattern.test(content)) {
          threats.push(this.createThreat('injection_attempt', 'high', context, {
            description: 'Path traversal attempt detected',
            indicators: [pattern.toString()],
            affectedResources: ['file_system'],
          }));
        }
      }
    }

    return threats;
  }

  /**
   * Detect hurricane-specific security threats
   */
  private detectHurricaneSpecificThreats(context: any): SecurityThreat[] {
    const threats: SecurityThreat[] = [];
    const { params, toolName } = context;

    // Detect suspicious storm data requests
    if (toolName === 'search_historical_storms' && params) {
      // Check for unusually broad historical searches that might indicate data scraping
      if (params.year && Array.isArray(params.year) && params.year.length > 50) {
        threats.push(this.createThreat('data_exfiltration', 'medium', context, {
          description: 'Suspicious broad historical storm data request',
          indicators: [`Requesting data for ${params.year.length} years`],
          affectedResources: ['historical_storm_data'],
        }));
      }

      // Check for patterns that might indicate automated scraping
      if (params.limit && params.limit > 1000) {
        threats.push(this.createThreat('data_exfiltration', 'high', context, {
          description: 'Excessive data limit requested',
          indicators: [`Limit: ${params.limit}`],
          affectedResources: ['storm_database'],
        }));
      }
    }

    // Monitor location-based queries for privacy concerns
    if ((toolName === 'get_hurricane_alerts' || toolName === 'get_current_hurricanes') && params) {
      if (params.location && typeof params.location === 'string') {
        // Check for suspicious location patterns
        const suspiciousLocationPatterns = [
          /<script/i,
          /javascript:/i,
          /[;&|]/,
        ];

        for (const pattern of suspiciousLocationPatterns) {
          if (pattern.test(params.location)) {
            threats.push(this.createThreat('injection_attempt', 'high', context, {
              description: 'Malicious content in location parameter',
              indicators: [pattern.toString()],
              affectedResources: ['location_services'],
            }));
          }
        }
      }
    }

    return threats;
  }

  /**
   * Create a security threat
   */
  private createThreat(
    type: SecurityThreat['type'],
    severity: SecurityThreat['severity'],
    context: any,
    details: Partial<SecurityThreat['details']>,
  ): SecurityThreat {
    const threat: SecurityThreat = {
      id: this.generateThreatId(),
      timestamp: Date.now(),
      type,
      severity,
      source: {
        ip: context.sourceIP,
        userAgent: context.headers?.['user-agent'],
        userId: context.userId,
        sessionId: context.sessionId,
      },
      details: {
        description: details.description || 'Security threat detected',
        indicators: details.indicators || [],
        affectedResources: details.affectedResources || [],
        attemptCount: details.attemptCount,
        timeWindow: details.timeWindow,
        metadata: details.metadata,
      },
      mitigationActions: [],
      resolved: false,
    };

    return threat;
  }

  /**
   * Process a detected threat
   */
  private processThreat(threat: SecurityThreat): void {
    this.threats.push(threat);

    // Keep only the last 1000 threats to prevent memory issues
    if (this.threats.length > 1000) {
      this.threats.shift();
    }

    auditLogger.logSecurity(
      `threat_detected_${threat.type}`,
      'security_monitor',
      'success',
      threat.severity,
      threat.source.userId,
      {
        metadata: {
          threatId: threat.id,
          threatType: threat.type,
          threatSeverity: threat.severity,
          sourceIP: threat.source.ip,
          indicators: threat.details.indicators,
        },
      },
    );

    this.emit('threatDetected', threat);

    if (threat.severity === 'critical') {
      this.emit('criticalThreat', threat);
    }

    logger.warn({
      threatId: threat.id,
      type: threat.type,
      severity: threat.severity,
      sourceIP: threat.source.ip,
      description: threat.details.description,
    }, 'Security threat detected');
  }

  /**
   * Generate unique threat ID
   */
  private generateThreatId(): string {
    return `threat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Group threats by type
   */
  private getThreatsGroupedByType(threats: SecurityThreat[]): Record<string, number> {
    return threats.reduce((acc, threat) => {
      acc[threat.type] = (acc[threat.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Group threats by severity
   */
  private getThreatsGroupedBySeverity(threats: SecurityThreat[]): Record<string, number> {
    return threats.reduce((acc, threat) => {
      acc[threat.severity] = (acc[threat.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Clean up old tracking data
   */
  cleanup(): void {
    const now = Date.now();
    
    // Clean up old attempt tracking
    for (const [key, data] of this.attemptTracking.entries()) {
      if (now - data.lastAttempt > this.config.bruteForceProtection.timeWindow) {
        this.attemptTracking.delete(key);
      }
    }

    // Clean up old rate limit tracking
    for (const [key, data] of this.rateLimitTracking.entries()) {
      data.requests = data.requests.filter(timestamp => now - timestamp <= 60000);
      if (data.requests.length === 0) {
        this.rateLimitTracking.delete(key);
      }
    }

    // Clean up old threats (keep last 7 days)
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    this.threats = this.threats.filter(threat => threat.timestamp > sevenDaysAgo);
  }
}

// Export singleton instance
export const securityMonitor = new SecurityMonitor();

// Set up periodic cleanup
setInterval(() => {
  securityMonitor.cleanup();
}, 300000); // Clean up every 5 minutes
