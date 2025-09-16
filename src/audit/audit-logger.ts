/**
 * Enterprise Audit Logging System for Hurricane Tracker MCP
 * Provides comprehensive audit trails for security and compliance requirements
 */

import { logger } from '../logger-pino.js';
import { EventEmitter } from 'events';

export interface AuditEvent {
  id: string;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  action: string;
  resource: string;
  outcome: 'success' | 'failure' | 'error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'authentication' | 'authorization' | 'data_access' | 'configuration' | 'security' | 'api_usage';
  details: {
    method?: string;
    url?: string;
    statusCode?: number;
    userAgent?: string;
    ip?: string;
    requestId?: string;
    duration?: number;
    payload?: any;
    error?: string;
    metadata?: Record<string, any>;
  };
  context?: {
    applicationName: string;
    version: string;
    environment: string;
    instanceId: string;
  };
}

export interface AuditFilter {
  startTime?: number;
  endTime?: number;
  userId?: string;
  action?: string;
  resource?: string;
  outcome?: 'success' | 'failure' | 'error';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  category?: AuditEvent['category'];
  limit?: number;
  offset?: number;
}

export interface AuditConfiguration {
  enabled: boolean;
  enabledCategories: AuditEvent['category'][];
  minimumSeverity: 'low' | 'medium' | 'high' | 'critical';
  retentionDays: number;
  maxEvents: number;
  enableRealTimeAlerts: boolean;
  enableIntegrityChecking: boolean;
  outputFormat: 'json' | 'syslog' | 'cef' | 'structured';
  destinations: {
    console: boolean;
    file: boolean;
    syslog: boolean;
    webhook?: string;
  };
  sensitiveDataMasking: {
    enabled: boolean;
    maskApiKeys: boolean;
    maskPasswords: boolean;
    maskPersonalData: boolean;
    customMaskPatterns: string[];
  };
}

export interface AuditStatistics {
  totalEvents: number;
  eventsByCategory: Record<AuditEvent['category'], number>;
  eventsBySeverity: Record<AuditEvent['severity'], number>;
  eventsByOutcome: Record<AuditEvent['outcome'], number>;
  topActions: Array<{ action: string; count: number }>;
  topResources: Array<{ resource: string; count: number }>;
  timeRange: {
    earliest: number;
    latest: number;
  };
  complianceScore: number;
}

export class AuditLogger extends EventEmitter {
  private config: AuditConfiguration;
  private events: AuditEvent[] = [];
  private instanceId: string;
  private cleanupInterval?: ReturnType<typeof globalThis.setInterval>;

  constructor(config: Partial<AuditConfiguration> = {}) {
    super();
    this.config = {
      enabled: process.env.ENABLE_AUDIT_LOGGING === 'true' || false,
      enabledCategories: ['authentication', 'authorization', 'data_access', 'configuration', 'security', 'api_usage'],
      minimumSeverity: 'low',
      retentionDays: 90,
      maxEvents: 10000,
      enableRealTimeAlerts: true,
      enableIntegrityChecking: true,
      outputFormat: 'json',
      destinations: {
        console: true,
        file: process.env.AUDIT_LOG_FILE === 'true' || false,
        syslog: process.env.AUDIT_LOG_SYSLOG === 'true' || false,
      },
      sensitiveDataMasking: {
        enabled: true,
        maskApiKeys: true,
        maskPasswords: true,
        maskPersonalData: true,
        customMaskPatterns: [],
      },
      ...config,
    };

    this.instanceId = this.generateInstanceId();
    this.startCleanupSchedule();

    if (this.config.enabled) {
      logger.info('Hurricane Tracker audit logging system initialized', {
        instanceId: this.instanceId,
        retentionDays: this.config.retentionDays,
        enabledCategories: this.config.enabledCategories,
      });
    }
  }

  /**
   * Log an audit event
   */
  log(
    action: string,
    resource: string,
    outcome: AuditEvent['outcome'],
    severity: AuditEvent['severity'],
    category: AuditEvent['category'],
    details: AuditEvent['details'] = {},
    userId?: string,
    sessionId?: string,
  ): void {
    if (!this.config.enabled) {
      return;
    }

    // Check if category is enabled
    if (!this.config.enabledCategories.includes(category)) {
      return;
    }

    // Check severity threshold
    if (!this.meetsSeverityThreshold(severity)) {
      return;
    }

    const event: AuditEvent = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      userId,
      sessionId,
      action,
      resource,
      outcome,
      severity,
      category,
      details: this.maskSensitiveData(details),
      context: {
        applicationName: 'hurricane-tracker-mcp',
        version: process.env.npm_package_version || '1.0.3',
        environment: process.env.NODE_ENV || 'development',
        instanceId: this.instanceId,
      },
    };

    this.storeEvent(event);
    this.outputEvent(event);
    this.emit('auditEvent', event);

    // Real-time alerts for critical events
    if (this.config.enableRealTimeAlerts && severity === 'critical') {
      this.emit('criticalEvent', event);
    }
  }

  /**
   * Log hurricane tool usage
   */
  logHurricaneToolUsage(
    toolName: string,
    outcome: AuditEvent['outcome'],
    duration: number,
    requestId?: string,
    userId?: string,
    details: AuditEvent['details'] = {},
  ): void {
    this.log(
      `hurricane_tool_${toolName}`,
      'hurricane_data',
      outcome,
      outcome === 'success' ? 'low' : 'medium',
      'api_usage',
      {
        duration,
        requestId,
        ...details,
      },
      userId,
    );
  }

  /**
   * Log authentication events
   */
  logAuthentication(
    action: 'login' | 'logout' | 'token_refresh' | 'password_change',
    outcome: AuditEvent['outcome'],
    userId?: string,
    details: AuditEvent['details'] = {},
  ): void {
    this.log(
      action,
      'authentication',
      outcome,
      action === 'login' && outcome === 'failure' ? 'high' : 'medium',
      'authentication',
      details,
      userId,
    );
  }

  /**
   * Log authorization events
   */
  logAuthorization(
    action: string,
    resource: string,
    outcome: AuditEvent['outcome'],
    userId?: string,
    details: AuditEvent['details'] = {},
  ): void {
    this.log(
      action,
      resource,
      outcome,
      outcome === 'failure' ? 'high' : 'low',
      'authorization',
      details,
      userId,
    );
  }

  /**
   * Log data access events
   */
  logDataAccess(
    action: 'read' | 'write' | 'delete' | 'export',
    resource: string,
    outcome: AuditEvent['outcome'],
    userId?: string,
    details: AuditEvent['details'] = {},
  ): void {
    const severity = action === 'delete' || action === 'export' ? 'high' : 'medium';
    this.log(action, resource, outcome, severity, 'data_access', details, userId);
  }

  /**
   * Log configuration changes
   */
  logConfiguration(
    action: string,
    resource: string,
    outcome: AuditEvent['outcome'],
    userId?: string,
    details: AuditEvent['details'] = {},
  ): void {
    this.log(action, resource, outcome, 'high', 'configuration', details, userId);
  }

  /**
   * Log security events
   */
  logSecurity(
    action: string,
    resource: string,
    outcome: AuditEvent['outcome'],
    severity: AuditEvent['severity'] = 'critical',
    userId?: string,
    details: AuditEvent['details'] = {},
  ): void {
    this.log(action, resource, outcome, severity, 'security', details, userId);
  }

  /**
   * Log API usage events
   */
  logApiUsage(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    userId?: string,
    details: AuditEvent['details'] = {},
  ): void {
    const outcome: AuditEvent['outcome'] = statusCode >= 200 && statusCode < 400 ? 'success' :
      statusCode >= 400 && statusCode < 500 ? 'failure' : 'error';
    const severity: AuditEvent['severity'] = statusCode >= 500 ? 'high' :
      statusCode === 401 || statusCode === 403 ? 'medium' : 'low';

    this.log(
      `${method} ${url}`,
      'api',
      outcome,
      severity,
      'api_usage',
      {
        method,
        url,
        statusCode,
        duration,
        ...details,
      },
      userId,
    );
  }

  /**
   * Query audit events
   */
  query(filter: AuditFilter = {}): AuditEvent[] {
    let filteredEvents = [...this.events];

    // Apply filters
    if (typeof filter.startTime === 'number') {
      const startTime = filter.startTime;
      filteredEvents = filteredEvents.filter(e => e.timestamp >= startTime);
    }
    if (typeof filter.endTime === 'number') {
      const endTime = filter.endTime;
      filteredEvents = filteredEvents.filter(e => e.timestamp <= endTime);
    }
    if (filter.userId) {
      filteredEvents = filteredEvents.filter(e => e.userId === filter.userId);
    }
    if (filter.action) {
      const action = filter.action;
      filteredEvents = filteredEvents.filter(e => e.action.includes(action));
    }
    if (filter.resource) {
      const resource = filter.resource;
      filteredEvents = filteredEvents.filter(e => e.resource.includes(resource));
    }
    if (filter.outcome) {
      filteredEvents = filteredEvents.filter(e => e.outcome === filter.outcome);
    }
    if (filter.severity) {
      filteredEvents = filteredEvents.filter(e => e.severity === filter.severity);
    }
    if (filter.category) {
      filteredEvents = filteredEvents.filter(e => e.category === filter.category);
    }

    // Sort by timestamp descending
    filteredEvents.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    const offset = filter.offset || 0;
    const limit = filter.limit || filteredEvents.length;
    return filteredEvents.slice(offset, offset + limit);
  }

  /**
   * Get audit statistics
   */
  getStatistics(): AuditStatistics {
    const eventsByCategory: Record<AuditEvent['category'], number> = {
      authentication: 0,
      authorization: 0,
      data_access: 0,
      configuration: 0,
      security: 0,
      api_usage: 0,
    };

    const eventsBySeverity: Record<AuditEvent['severity'], number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    const eventsByOutcome: Record<AuditEvent['outcome'], number> = {
      success: 0,
      failure: 0,
      error: 0,
    };

    const actionCounts = new Map<string, number>();
    const resourceCounts = new Map<string, number>();
    let earliest = Date.now();
    let latest = 0;

    for (const event of this.events) {
      eventsByCategory[event.category]++;
      eventsBySeverity[event.severity]++;
      eventsByOutcome[event.outcome]++;

      actionCounts.set(event.action, (actionCounts.get(event.action) || 0) + 1);
      resourceCounts.set(event.resource, (resourceCounts.get(event.resource) || 0) + 1);

      if (event.timestamp < earliest) {
        earliest = event.timestamp;
      }
      if (event.timestamp > latest) {
        latest = event.timestamp;
      }
    }

    const topActions = Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topResources = Array.from(resourceCounts.entries())
      .map(([resource, count]) => ({ resource, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalEvents: this.events.length,
      eventsByCategory,
      eventsBySeverity,
      eventsByOutcome,
      topActions,
      topResources,
      timeRange: {
        earliest: this.events.length > 0 ? earliest : Date.now(),
        latest: this.events.length > 0 ? latest : Date.now(),
      },
      complianceScore: this.calculateComplianceScore(),
    };
  }

  /**
   * Clear audit events (use with caution)
   */
  clear(): void {
    const eventCount = this.events.length;
    this.events = [];

    this.log(
      'audit_log_cleared',
      'audit_system',
      'success',
      'critical',
      'security',
      { metadata: { clearedEvents: eventCount } },
    );

    logger.warn('Hurricane Tracker audit log cleared', { clearedEvents: eventCount });
  }

  /**
   * Store event in memory
   */
  private storeEvent(event: AuditEvent): void {
    this.events.push(event);

    // Enforce max events limit
    if (this.events.length > this.config.maxEvents) {
      const removedCount = this.events.length - this.config.maxEvents;
      this.events = this.events.slice(-this.config.maxEvents);

      logger.debug('Audit events trimmed due to max limit', {
        removedCount,
        maxEvents: this.config.maxEvents,
      });
    }
  }

  /**
   * Output event to configured destinations
   */
  private outputEvent(event: AuditEvent): void {
    const formattedEvent = this.formatEvent(event);

    if (this.config.destinations.console) {
      logger.info('HURRICANE_AUDIT', formattedEvent);
    }

    if (this.config.destinations.file) {
      // In production, you'd write to a dedicated audit log file
      logger.info('HURRICANE_AUDIT_FILE', formattedEvent);
    }

    if (this.config.destinations.syslog) {
      // In production, you'd send to syslog
      logger.info('HURRICANE_AUDIT_SYSLOG', formattedEvent);
    }

    if (this.config.destinations.webhook) {
      // In production, you'd send to webhook endpoint
      this.sendToWebhook(formattedEvent);
    }
  }

  /**
   * Format event according to configured format
   */
  private formatEvent(event: AuditEvent): any {
    switch (this.config.outputFormat) {
    case 'json':
      return event;
    case 'syslog':
      return this.formatAsSyslog(event);
    case 'cef':
      return this.formatAsCef(event);
    case 'structured':
      return this.formatAsStructured(event);
    default:
      return event;
    }
  }

  /**
   * Mask sensitive data
   */
  private maskSensitiveData(details: AuditEvent['details']): AuditEvent['details'] {
    if (!this.config.sensitiveDataMasking.enabled) {
      return details;
    }

    const masked = { ...details };

    // Mask API keys
    if (this.config.sensitiveDataMasking.maskApiKeys && masked.payload) {
      masked.payload = this.maskInObject(masked.payload, /api[_-]?key|token|secret/i);
    }

    // Mask passwords
    if (this.config.sensitiveDataMasking.maskPasswords && masked.payload) {
      masked.payload = this.maskInObject(masked.payload, /password|pwd|pass/i);
    }

    // Apply custom mask patterns
    for (const pattern of this.config.sensitiveDataMasking.customMaskPatterns) {
      if (masked.payload) {
        masked.payload = this.maskInObject(masked.payload, new RegExp(pattern, 'i'));
      }
    }

    return masked;
  }

  /**
   * Mask sensitive fields in object
   */
  private maskInObject(obj: any, pattern: RegExp): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const masked = Array.isArray(obj) ? [...obj] : { ...obj };

    for (const key in masked) {
      if (pattern.test(key)) {
        masked[key] = '***MASKED***';
      } else if (typeof masked[key] === 'object') {
        masked[key] = this.maskInObject(masked[key], pattern);
      }
    }

    return masked;
  }

  /**
   * Check if severity meets threshold
   */
  private meetsSeverityThreshold(severity: AuditEvent['severity']): boolean {
    const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
    const minLevel = severityLevels[this.config.minimumSeverity];
    const eventLevel = severityLevels[severity];

    return eventLevel >= minLevel;
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `hurricane-audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique instance ID
   */
  private generateInstanceId(): string {
    return `hurricane-instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start cleanup schedule for old events
   */
  private startCleanupSchedule(): void {
    // Clean up old events every hour
    this.cleanupInterval = globalThis.setInterval(() => {
      this.cleanupOldEvents();
    }, 3600000);
  }

  /**
   * Clean up events older than retention period
   */
  private cleanupOldEvents(): void {
    const retentionMs = this.config.retentionDays * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - retentionMs;
    const originalCount = this.events.length;

    this.events = this.events.filter(event => event.timestamp > cutoffTime);

    const removedCount = originalCount - this.events.length;
    if (removedCount > 0) {
      logger.debug('Hurricane audit events cleaned up', {
        removedCount,
        retentionDays: this.config.retentionDays,
      });
    }
  }

  /**
   * Calculate compliance score
   */
  private calculateComplianceScore(): number {
    if (this.events.length === 0) {
      return 100;
    }

    const totalEvents = this.events.length;
    const successfulEvents = this.events.filter(e => e.outcome === 'success').length;
    const criticalEvents = this.events.filter(e => e.severity === 'critical').length;

    // Basic compliance scoring
    const successRate = (successfulEvents / totalEvents) * 100;
    const criticalPenalty = Math.min(criticalEvents * 5, 50); // Max 50 point penalty

    return Math.max(0, Math.min(100, successRate - criticalPenalty));
  }

  /**
   * Format event as syslog
   */
  private formatAsSyslog(event: AuditEvent): string {
    const timestamp = new Date(event.timestamp).toISOString();
    return `<134>${timestamp} hurricane-tracker-mcp: AUDIT [${event.id}] user=${event.userId || 'system'} action=${event.action} resource=${event.resource} outcome=${event.outcome}`;
  }

  /**
   * Format event as CEF (Common Event Format)
   */
  private formatAsCef(event: AuditEvent): string {
    return `CEF:0|Hurricane Tracker|MCP Server|1.0.3|${event.category}|${event.action}|${event.severity}|rt=${event.timestamp} suser=${event.userId || 'system'} outcome=${event.outcome}`;
  }

  /**
   * Format event as structured log
   */
  private formatAsStructured(event: AuditEvent): any {
    return {
      '@timestamp': new Date(event.timestamp).toISOString(),
      event: {
        id: event.id,
        action: event.action,
        outcome: event.outcome,
        severity: event.severity,
        category: event.category,
      },
      user: {
        id: event.userId,
      },
      resource: event.resource,
      details: event.details,
      context: event.context,
    };
  }

  /**
   * Send event to webhook
   */
  private async sendToWebhook(event: any): Promise<void> {
    // In production, implement actual webhook sending
    logger.debug('Would send hurricane audit event to webhook', { event });
  }

  /**
   * Stop audit logger
   */
  stop(): void {
    if (this.cleanupInterval) {
      globalThis.clearInterval(this.cleanupInterval);
    }

    this.log(
      'audit_logger_stopped',
      'audit_system',
      'success',
      'medium',
      'security',
    );

    logger.info('Hurricane Tracker audit logger stopped');
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();
