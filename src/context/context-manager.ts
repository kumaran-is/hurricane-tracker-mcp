/**
 * LLM Context Management for Hurricane Tracker MCP Server
 * Optimizes responses for different context window sizes and LLM requirements
 */

import { logger } from '../logging/logger-pino.js';

export interface ContextLimits {
  maxInputTokens: number;
  maxOutputTokens: number;
  maxTotalTokens: number;
  preferredResponseSize: number;
}

export interface OptimizationOptions {
  maxTokens: number;
  allowPagination: boolean;
  allowSummary: boolean;
  allowTruncation: boolean;
  prioritizeRecent: boolean;
  includeMetadata: boolean;
}

export interface TokenEstimate {
  tokens: number;
  characters: number;
  words: number;
}

export interface OptimizedResponse<T = any> {
  data: T;
  metadata: {
    tokenEstimate: TokenEstimate;
    optimizationApplied: string;
    hasMore: boolean;
    nextCursor?: string;
    summary?: string;
  };
}

export class ContextManager {
  private readonly defaultLimits: ContextLimits = {
    maxInputTokens: parseInt(process.env.MAX_INPUT_TOKENS || '16000'),
    maxOutputTokens: parseInt(process.env.MAX_OUTPUT_TOKENS || '16000'),
    maxTotalTokens: parseInt(process.env.MAX_TOTAL_TOKENS || '16000'),
    preferredResponseSize: parseInt(process.env.PREFERRED_RESPONSE_SIZE || '2000'),
  };

  constructor(private readonly customLimits?: Partial<ContextLimits>) {}

  /**
   * Get effective context limits (custom + defaults)
   */
  private getLimits(): ContextLimits {
    return {
      ...this.defaultLimits,
      ...this.customLimits,
    };
  }

  /**
   * Estimate token count for any data structure
   * Uses approximate calculation: ~4 characters per token for English
   */
  estimateTokens(data: any): TokenEstimate {
    const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const characters = text.length;
    const words = text.split(/\s+/).length;
    const tokens = Math.ceil(characters / 4); // Rough estimation

    return { tokens, characters, words };
  }

  /**
   * Optimize response for LLM context constraints
   */
  async optimizeResponse<T>(
    data: T,
    options: Partial<OptimizationOptions> = {},
  ): Promise<OptimizedResponse<T>> {
    const limits = this.getLimits();
    const opts: OptimizationOptions = {
      maxTokens: limits.maxOutputTokens,
      allowPagination: true,
      allowSummary: true,
      allowTruncation: false,
      prioritizeRecent: true,
      includeMetadata: true,
      ...options,
    };

    const estimate = this.estimateTokens(data);

    logger.debug({
      currentTokens: estimate.tokens,
      maxTokens: opts.maxTokens,
      dataType: Array.isArray(data) ? 'array' : typeof data,
      optimizationOptions: opts,
    }, 'Hurricane context optimization analysis');

    // If within limits, return as-is
    if (estimate.tokens <= opts.maxTokens) {
      return {
        data,
        metadata: {
          tokenEstimate: estimate,
          optimizationApplied: 'none',
          hasMore: false,
        },
      };
    }

    // Apply optimization strategies in order of preference
    if (opts.allowPagination && this.isPaginatable(data)) {
      return this.applyPagination(data, opts);
    }

    if (opts.allowSummary) {
      return this.applySummarization(data, opts);
    }

    if (opts.allowTruncation) {
      return this.applyTruncation(data, opts);
    }

    // If no optimization allowed, warn and return truncated
    logger.warn({
      tokens: estimate.tokens,
      maxTokens: opts.maxTokens,
    }, 'Hurricane response exceeds context limit and no optimization allowed');

    return this.applyTruncation(data, opts);
  }

  /**
   * Check if data can be paginated
   */
  private isPaginatable(data: any): boolean {
    return Array.isArray(data) && data.length > 1;
  }

  /**
   * Apply pagination to large arrays
   */
  private applyPagination<T>(
    data: T,
    options: OptimizationOptions,
  ): OptimizedResponse<T> {
    if (!Array.isArray(data)) {
      throw new Error('Cannot paginate non-array data');
    }

    const pageSize = this.calculateOptimalPageSize(data, options.maxTokens);
    const firstPage = data.slice(0, pageSize) as T;
    const hasMore = data.length > pageSize;

    const estimate = this.estimateTokens(firstPage);

    logger.debug({
      originalItems: data.length,
      pageSize,
      hasMore,
      tokensAfterPagination: estimate.tokens,
    }, 'Applied pagination optimization to hurricane data');

    return {
      data: firstPage,
      metadata: {
        tokenEstimate: estimate,
        optimizationApplied: 'pagination',
        hasMore,
        nextCursor: hasMore ? this.generateCursor(pageSize, data.length) : undefined,
      },
    };
  }

  /**
   * Apply intelligent summarization for hurricane data
   */
  private applySummarization<T>(
    data: T,
    options: OptimizationOptions,
  ): OptimizedResponse<T> {
    let summary: any;
    let summaryText: string;

    if (Array.isArray(data)) {
      summary = this.summarizeHurricaneArray(data);
      summaryText = 'Hurricane data array summarized to key statistics and sample items';
    } else if (typeof data === 'object' && data !== null) {
      summary = this.summarizeHurricaneObject(data);
      summaryText = 'Hurricane data object summarized to essential fields';
    } else {
      summary = this.summarizeText(String(data), options);
      summaryText = 'Hurricane text data summarized to fit context window';
    }

    const estimate = this.estimateTokens(summary);

    logger.debug({
      originalTokens: this.estimateTokens(data).tokens,
      summaryTokens: estimate.tokens,
      summaryType: Array.isArray(data) ? 'array' : typeof data,
    }, 'Applied summarization optimization to hurricane data');

    return {
      data: summary as T,
      metadata: {
        tokenEstimate: estimate,
        optimizationApplied: 'summarization',
        hasMore: true,
        summary: summaryText,
      },
    };
  }

  /**
   * Apply truncation as last resort
   */
  private applyTruncation<T>(
    data: T,
    options: OptimizationOptions,
  ): OptimizedResponse<T> {
    const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const maxChars = options.maxTokens * 4; // Rough conversion
    const truncated = text.slice(0, maxChars - 100) + '\n\n[... truncated ...]';

    let result: T;
    if (typeof data === 'string') {
      result = truncated as T;
    } else {
      try {
        result = JSON.parse(truncated) as T;
      } catch {
        // If JSON is invalid after truncation, return a summary object
        result = {
          _truncated: true,
          _originalSize: text.length,
          _preview: truncated.slice(0, 500),
        } as T;
      }
    }

    const estimate = this.estimateTokens(result);

    logger.warn({
      originalTokens: this.estimateTokens(data).tokens,
      truncatedTokens: estimate.tokens,
      truncatedAt: maxChars,
    }, 'Applied truncation optimization to hurricane data');

    return {
      data: result,
      metadata: {
        tokenEstimate: estimate,
        optimizationApplied: 'truncation',
        hasMore: true,
        summary: 'Hurricane data was truncated to fit context window',
      },
    };
  }

  /**
   * Calculate optimal page size for arrays
   */
  private calculateOptimalPageSize(data: any[], maxTokens: number): number {
    if (data.length === 0) {
      return 0;
    }

    // Estimate tokens per item by sampling
    const sampleSize = Math.min(3, data.length);
    const sampleItems = data.slice(0, sampleSize);
    const avgTokensPerItem = this.estimateTokens(sampleItems).tokens / sampleSize;

    // Calculate page size with 10% buffer for metadata
    const availableTokens = maxTokens * 0.9;
    const calculatedPageSize = Math.floor(availableTokens / avgTokensPerItem);

    // Ensure reasonable bounds
    return Math.max(1, Math.min(calculatedPageSize, data.length));
  }

  /**
   * Summarize hurricane array data
   */
  private summarizeHurricaneArray(data: any[]): any {
    const summary: any = {
      _summary: true,
      totalItems: data.length,
      itemTypes: this.analyzeArrayTypes(data),
      sample: data.slice(0, 3), // First 3 items as sample
    };

    // Add hurricane-specific aggregates
    if (this.isHurricaneArray(data)) {
      summary.hurricaneStats = this.extractHurricaneStats(data);
    }

    // Add time-based aggregates for forecasts
    if (this.isForecastArray(data)) {
      summary.dateRange = this.extractDateRange(data);
      summary.windSpeedRange = this.extractWindSpeedRange(data);
    }

    // Add location-based aggregates for alerts
    if (this.isAlertArray(data)) {
      summary.alertTypes = this.extractAlertTypes(data);
      summary.severityDistribution = this.extractSeverityDistribution(data);
    }

    return summary;
  }

  /**
   * Summarize hurricane object data
   */
  private summarizeHurricaneObject(data: any): any {
    const summary: any = { _summary: true };

    // Keep essential hurricane fields
    const hurricaneFields = [
      'id', 'name', 'basin', 'category', 'status', 'latitude', 'longitude',
      'windSpeed', 'pressure', 'movement', 'lastUpdate', 'date', 'time',
      'severity', 'type', 'location', 'coordinates',
    ];

    for (const field of hurricaneFields) {
      if (data[field] !== undefined) {
        summary[field] = data[field];
      }
    }

    // Add metadata about the original object
    summary._metadata = {
      totalFields: Object.keys(data).length,
      fieldTypes: this.analyzeObjectTypes(data),
      hasNestedObjects: this.hasNestedObjects(data),
    };

    return summary;
  }

  /**
   * Summarize text data
   */
  private summarizeText(text: string, options: OptimizationOptions): string {
    const maxChars = options.maxTokens * 4 * 0.8; // 80% of max for summary

    if (text.length <= maxChars) {
      return text;
    }

    // Extract first and last portions
    const partSize = Math.floor(maxChars / 3);
    const beginning = text.slice(0, partSize);
    const ending = text.slice(-partSize);

    return `${beginning}\n\n... [${text.length - (partSize * 2)} characters omitted] ...\n\n${ending}`;
  }

  /**
   * Generate pagination cursor
   */
  private generateCursor(pageSize: number, totalItems: number): string {
    return Buffer.from(JSON.stringify({
      offset: pageSize,
      totalItems,
      timestamp: Date.now(),
    })).toString('base64');
  }

  /**
   * Helper methods for data analysis
   */
  private analyzeArrayTypes(data: any[]): Record<string, number> {
    const types: Record<string, number> = {};
    data.forEach(item => {
      const type = Array.isArray(item) ? 'array' : typeof item;
      types[type] = (types[type] || 0) + 1;
    });
    return types;
  }

  private analyzeObjectTypes(data: any): Record<string, string> {
    const types: Record<string, string> = {};
    Object.entries(data).forEach(([key, value]) => {
      types[key] = Array.isArray(value) ? 'array' : typeof value;
    });
    return types;
  }

  private isHurricaneArray(data: any[]): boolean {
    return data.length > 0 && data.every(item =>
      item && typeof item === 'object' &&
      (item.name || item.windSpeed !== undefined || item.category !== undefined),
    );
  }

  private isForecastArray(data: any[]): boolean {
    return data.length > 0 && data.every(item =>
      item && typeof item === 'object' &&
      (item.date || item.time || item.forecast !== undefined),
    );
  }

  private isAlertArray(data: any[]): boolean {
    return data.length > 0 && data.every(item =>
      item && typeof item === 'object' &&
      (item.alertType || item.severity || item.warning !== undefined),
    );
  }

  private hasNestedObjects(data: any): boolean {
    return Object.values(data).some(value =>
      typeof value === 'object' && value !== null && !Array.isArray(value),
    );
  }

  private extractDateRange(data: any[]): { start: string; end: string } | null {
    const dates = data
      .map(item => item.date || item.time || item.validTime)
      .filter(Boolean)
      .sort();

    if (dates.length === 0) {
      return null;
    }

    return {
      start: dates[0],
      end: dates[dates.length - 1],
    };
  }

  private extractWindSpeedRange(data: any[]): { min: number; max: number } | null {
    const windSpeeds = data
      .map(item => item.windSpeed || item.maxWindSpeed || item.winds)
      .filter(speed => typeof speed === 'number');

    if (windSpeeds.length === 0) {
      return null;
    }

    return {
      min: Math.min(...windSpeeds),
      max: Math.max(...windSpeeds),
    };
  }

  private extractHurricaneStats(data: any[]): any {
    const categories = data
      .map(item => item.category)
      .filter(cat => typeof cat === 'number');

    const basins = data
      .map(item => item.basin)
      .filter(Boolean);

    const active = data.filter(item =>
      item.status === 'active' || item.status === 'ongoing',
    ).length;

    return {
      totalStorms: data.length,
      activeStorms: active,
      categoryDistribution: this.countOccurrences(categories),
      basinDistribution: this.countOccurrences(basins),
      averageCategory: categories.length > 0
        ? categories.reduce((a, b) => a + b, 0) / categories.length
        : null,
    };
  }

  private extractAlertTypes(data: any[]): Record<string, number> {
    const types = data
      .map(item => item.alertType || item.type || item.warningType)
      .filter(Boolean);

    return this.countOccurrences(types);
  }

  private extractSeverityDistribution(data: any[]): Record<string, number> {
    const severities = data
      .map(item => item.severity || item.level)
      .filter(Boolean);

    return this.countOccurrences(severities);
  }

  private countOccurrences(items: any[]): Record<string, number> {
    const counts: Record<string, number> = {};
    items.forEach(item => {
      const key = String(item);
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }
}

// Export singleton instance with configurable limits
export const contextManager = new ContextManager({
  maxInputTokens: parseInt(process.env.MAX_INPUT_TOKENS || '16000'),
  maxOutputTokens: parseInt(process.env.MAX_OUTPUT_TOKENS || '16000'),
  maxTotalTokens: parseInt(process.env.MAX_TOTAL_TOKENS || '16000'),
  preferredResponseSize: parseInt(process.env.PREFERRED_RESPONSE_SIZE || '2000'),
});

/**
 * Hurricane-specific context optimization utilities
 */
export const hurricaneContextUtils = {
  /**
   * Optimize hurricane list for LLM context
   */
  async optimizeHurricaneList<T>(
    hurricanes: T[],
    maxTokens?: number,
  ): Promise<OptimizedResponse<T[]>> {
    return contextManager.optimizeResponse(hurricanes, {
      maxTokens: maxTokens || 4000,
      allowPagination: true,
      allowSummary: true,
      prioritizeRecent: true,
    });
  },

  /**
   * Optimize single hurricane data
   */
  async optimizeHurricaneData<T>(
    hurricane: T,
    maxTokens?: number,
  ): Promise<OptimizedResponse<T>> {
    return contextManager.optimizeResponse(hurricane, {
      maxTokens: maxTokens || 2000,
      allowSummary: true,
      allowTruncation: true,
    });
  },

  /**
   * Optimize forecast data for context
   */
  async optimizeForecastData<T>(
    forecast: T,
    maxTokens?: number,
  ): Promise<OptimizedResponse<T>> {
    return contextManager.optimizeResponse(forecast, {
      maxTokens: maxTokens || 3000,
      allowSummary: true,
      prioritizeRecent: true,
    });
  },

  /**
   * Create context-aware error messages
   */
  createContextAwareError(error: Error, context?: any): string {
    const baseMessage = error.message;
    const estimate = contextManager.estimateTokens(baseMessage + JSON.stringify(context || {}));

    if (estimate.tokens > 500) {
      return `${baseMessage} [Context details omitted due to size]`;
    }

    return context ? `${baseMessage}\nContext: ${JSON.stringify(context, null, 2)}` : baseMessage;
  },
};
