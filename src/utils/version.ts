/**
 * Version utility for Hurricane Tracker MCP Server
 * Provides package version and metadata information
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get version from package.json
const packageJsonPath = join(__dirname, '..', '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

export const VERSION = packageJson.version;
export const NAME = packageJson.name;
export const DESCRIPTION = packageJson.description || 'Hurricane Tracker MCP Server';
export const AUTHOR = packageJson.author || 'Hurricane Tracker Team';
export const LICENSE = packageJson.license || 'MIT';

/**
 * Get full version information
 */
export function getVersionInfo() {
  return {
    name: NAME,
    version: VERSION,
    description: DESCRIPTION,
    author: AUTHOR,
    license: LICENSE,
    node: process.version,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get formatted version string for logging
 */
export function getVersionString(): string {
  return `${NAME} v${VERSION}`;
}

/**
 * Check if current version meets minimum requirements
 */
export function isVersionCompatible(minVersion: string): boolean {
  const currentParts = VERSION.split('.').map(Number);
  const minParts = minVersion.split('.').map(Number);

  for (let i = 0; i < Math.max(currentParts.length, minParts.length); i++) {
    const current = currentParts[i] || 0;
    const min = minParts[i] || 0;

    if (current > min) {
      return true;
    }
    if (current < min) {
      return false;
    }
  }

  return true; // Equal versions
}

/**
 * Get build information for diagnostics
 */
export function getBuildInfo() {
  return {
    version: VERSION,
    name: NAME,
    buildTime: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    architecture: process.arch,
    pid: process.pid,
    startTime: new Date(Date.now() - process.uptime() * 1000).toISOString(),
  };
}

/**
 * Hurricane-specific utility functions
 */
export const HurricaneUtils = {
  /**
   * Validate storm season year
   */
  isValidStormYear(year: number): boolean {
    const currentYear = new Date().getFullYear();
    return year >= 1851 && year <= currentYear + 1;
  },

  /**
   * Get current hurricane season
   */
  getCurrentHurricaneSeason(): { year: number; isActive: boolean } {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 0-based to 1-based

    // Atlantic hurricane season: June 1 - November 30
    // Eastern Pacific: May 15 - November 30
    // For simplicity, using Atlantic season dates
    const isActive = month >= 6 && month <= 11;

    return { year, isActive };
  },

  /**
   * Format storm ID for display
   */
  formatStormId(stormId: string): string {
    if (!stormId || stormId.length !== 8) {
      return stormId;
    }

    const basin = stormId.substring(0, 2);
    const number = stormId.substring(2, 4);
    const year = stormId.substring(4, 8);

    return `${basin}${number}${year}`;
  },

  /**
   * Parse storm ID components
   */
  parseStormId(stormId: string): { basin: string; number: string; year: string } | null {
    if (!stormId || stormId.length !== 8) {
      return null;
    }

    return {
      basin: stormId.substring(0, 2),
      number: stormId.substring(2, 4),
      year: stormId.substring(4, 8),
    };
  },

  /**
   * Convert knots to mph
   */
  knotsToMph(knots: number): number {
    return Math.round(knots * 1.15078);
  },

  /**
   * Convert mph to knots
   */
  mphToKnots(mph: number): number {
    return Math.round(mph / 1.15078);
  },

  /**
   * Convert millibars to inches of mercury
   */
  mbToInHg(mb: number): number {
    return Number((mb * 0.02953).toFixed(2));
  },

  /**
   * Categorize hurricane by wind speed (Saffir-Simpson scale)
   */
  categorizeHurricane(windKnots: number): { category: number | string; description: string } {
    const windMph = HurricaneUtils.knotsToMph(windKnots);

    if (windMph < 39) {
      return { category: 'TD', description: 'Tropical Depression' };
    } else if (windMph < 74) {
      return { category: 'TS', description: 'Tropical Storm' };
    } else if (windMph < 96) {
      return { category: 1, description: 'Category 1 Hurricane' };
    } else if (windMph < 111) {
      return { category: 2, description: 'Category 2 Hurricane' };
    } else if (windMph < 129) {
      return { category: 3, description: 'Category 3 Hurricane (Major)' };
    } else if (windMph < 157) {
      return { category: 4, description: 'Category 4 Hurricane (Major)' };
    } else {
      return { category: 5, description: 'Category 5 Hurricane (Major)' };
    }
  },

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  },

  /**
   * Format date for hurricane data
   */
  formatHurricaneDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
  },

  /**
   * Validate coordinates
   */
  isValidCoordinate(lat: number, lon: number): boolean {
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  },
};

/**
 * Performance monitoring utilities
 */
export const PerformanceUtils = {
  /**
   * Create a timer for measuring execution time
   */
  timer(): { end: () => number } {
    const start = process.hrtime.bigint();
    return {
      end: (): number => {
        const end = process.hrtime.bigint();
        return Number(end - start) / 1000000; // Convert to milliseconds
      },
    };
  },

  /**
   * Format bytes to human readable string
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) {
      return '0 Bytes';
    }
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Get memory usage information
   */
  getMemoryUsage(): { used: string; total: string; percentage: number } {
    const usage = process.memoryUsage();
    const total = usage.heapTotal;
    const used = usage.heapUsed;
    const percentage = Math.round((used / total) * 100);

    return {
      used: PerformanceUtils.formatBytes(used),
      total: PerformanceUtils.formatBytes(total),
      percentage,
    };
  },
};

/**
 * Error handling utilities
 */
export const ErrorUtils = {
  /**
   * Generate correlation ID for error tracking
   */
  generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Sanitize error for logging (remove sensitive data)
   */
  sanitizeError(error: any): any {
    if (!error) {
      return error;
    }

    const sanitized = { ...error };

    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'apikey', 'secret', 'authorization'];

    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }

      const result = Array.isArray(obj) ? [] : {};

      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          (result as any)[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          (result as any)[key] = sanitizeObject(value);
        } else {
          (result as any)[key] = value;
        }
      }

      return result;
    };

    return sanitizeObject(sanitized);
  },
};
