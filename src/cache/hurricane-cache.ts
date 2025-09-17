/**
 * LRU Cache implementation for Hurricane Tracker data
 * Reduces API calls and improves response times
 */

import { LRUCache } from 'lru-cache';
import { logger } from '../logging/logger-pino.js';
import { CacheError } from '../errors/base-errors.js';
import type { 
  ActiveHurricane,
  HurricaneTrack,
  HurricaneForecast,
  HurricaneAlert,
  HistoricalHurricane
} from '../types.js';

export interface CacheConfig {
  /** Maximum number of items in cache */
  maxSize: number;
  /** TTL for current hurricane data in milliseconds */
  currentHurricaneTTL: number;
  /** TTL for forecast data in milliseconds */
  forecastTTL: number;
  /** TTL for alert data in milliseconds */
  alertTTL: number;
  /** TTL for track data in milliseconds */
  trackTTL: number;
  /** TTL for historical data in milliseconds */
  historicalTTL: number;
  /** TTL for geocoding data in milliseconds */
  geocodingTTL: number;
  /** Update age on get */
  updateAgeOnGet: boolean;
  /** Update age on has */
  updateAgeOnHas: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRatio: number;
  size: number;
  maxSize: number;
}

/**
 * Default cache configuration for hurricane data
 */
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxSize: 1000,
  currentHurricaneTTL: 5 * 60 * 1000, // 5 minutes for current data
  forecastTTL: 15 * 60 * 1000, // 15 minutes for forecasts
  alertTTL: 2 * 60 * 1000, // 2 minutes for alerts (most time-sensitive)
  trackTTL: 10 * 60 * 1000, // 10 minutes for tracks
  historicalTTL: 24 * 60 * 60 * 1000, // 24 hours for historical data
  geocodingTTL: 7 * 24 * 60 * 60 * 1000, // 7 days for geocoding
  updateAgeOnGet: true,
  updateAgeOnHas: false,
};

/**
 * Hurricane data cache manager with specialized caches for different data types
 */
export class HurricaneCache {
  private currentHurricaneCache: LRUCache<string, ActiveHurricane[]>;
  private forecastCache: LRUCache<string, HurricaneForecast>;
  private alertCache: LRUCache<string, HurricaneAlert[]>;
  private trackCache: LRUCache<string, HurricaneTrack>;
  private historicalCache: LRUCache<string, HistoricalHurricane[]>;
  private geocodingCache: LRUCache<string, { latitude: number; longitude: number }>;
  private config: CacheConfig;

  // Statistics tracking
  private stats = {
    currentHurricanes: { hits: 0, misses: 0, sets: 0, deletes: 0 },
    forecasts: { hits: 0, misses: 0, sets: 0, deletes: 0 },
    alerts: { hits: 0, misses: 0, sets: 0, deletes: 0 },
    tracks: { hits: 0, misses: 0, sets: 0, deletes: 0 },
    historical: { hits: 0, misses: 0, sets: 0, deletes: 0 },
    geocoding: { hits: 0, misses: 0, sets: 0, deletes: 0 },
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };

    // Initialize current hurricanes cache
    this.currentHurricaneCache = new LRUCache<string, ActiveHurricane[]>({
      max: this.config.maxSize,
      ttl: this.config.currentHurricaneTTL,
      updateAgeOnGet: this.config.updateAgeOnGet,
      updateAgeOnHas: this.config.updateAgeOnHas,
      dispose: (_value, key) => {
        logger.debug({ key }, 'Evicting current hurricane cache entry');
      },
    });

    // Initialize forecast cache
    this.forecastCache = new LRUCache<string, HurricaneForecast>({
      max: this.config.maxSize,
      ttl: this.config.forecastTTL,
      updateAgeOnGet: this.config.updateAgeOnGet,
      updateAgeOnHas: this.config.updateAgeOnHas,
      dispose: (_value, key) => {
        logger.debug({ key }, 'Evicting forecast cache entry');
      },
    });

    // Initialize alert cache
    this.alertCache = new LRUCache<string, HurricaneAlert[]>({
      max: this.config.maxSize,
      ttl: this.config.alertTTL,
      updateAgeOnGet: this.config.updateAgeOnGet,
      updateAgeOnHas: this.config.updateAgeOnHas,
      dispose: (_value, key) => {
        logger.debug({ key }, 'Evicting alert cache entry');
      },
    });

    // Initialize track cache
    this.trackCache = new LRUCache<string, HurricaneTrack>({
      max: this.config.maxSize,
      ttl: this.config.trackTTL,
      updateAgeOnGet: this.config.updateAgeOnGet,
      updateAgeOnHas: this.config.updateAgeOnHas,
      dispose: (_value, key) => {
        logger.debug({ key }, 'Evicting track cache entry');
      },
    });

    // Initialize historical cache
    this.historicalCache = new LRUCache<string, HistoricalHurricane[]>({
      max: this.config.maxSize * 2, // More entries for historical data
      ttl: this.config.historicalTTL,
      updateAgeOnGet: this.config.updateAgeOnGet,
      updateAgeOnHas: this.config.updateAgeOnHas,
      dispose: (_value, key) => {
        logger.debug({ key }, 'Evicting historical cache entry');
      },
    });

    // Initialize geocoding cache
    this.geocodingCache = new LRUCache<string, { latitude: number; longitude: number }>({
      max: this.config.maxSize * 3, // Most entries for geocoding
      ttl: this.config.geocodingTTL,
      updateAgeOnGet: this.config.updateAgeOnGet,
      updateAgeOnHas: this.config.updateAgeOnHas,
      dispose: (_value, key) => {
        logger.debug({ key }, 'Evicting geocoding cache entry');
      },
    });

    logger.info({ config: this.config }, 'Hurricane cache initialized');
  }

  // =============================================================================
  // CACHE KEY GENERATORS
  // =============================================================================

  private getCurrentHurricanesKey(): string {
    return 'hurricanes:current:all';
  }

  private getForecastKey(hurricaneId: string): string {
    return `forecast:${hurricaneId.toLowerCase()}`;
  }

  private getAlertsKey(location: string): string {
    return `alerts:${location.toLowerCase().trim()}`;
  }

  private getTrackKey(hurricaneId: string): string {
    return `track:${hurricaneId.toLowerCase()}`;
  }

  private getHistoricalKey(query: {
    year?: number;
    basin?: string;
    category?: number;
    name?: string;
  }): string {
    const parts = ['historical'];
    if (query.year) parts.push(`year:${query.year}`);
    if (query.basin) parts.push(`basin:${query.basin.toLowerCase()}`);
    if (query.category) parts.push(`cat:${query.category}`);
    if (query.name) parts.push(`name:${query.name.toLowerCase()}`);
    return parts.join(':');
  }

  private getGeocodingKey(location: string): string {
    return `geo:${location.toLowerCase().trim()}`;
  }

  // =============================================================================
  // CURRENT HURRICANES CACHE
  // =============================================================================

  getCurrentHurricanes(): ActiveHurricane[] | undefined {
    try {
      const key = this.getCurrentHurricanesKey();
      const data = this.currentHurricaneCache.get(key);

      if (data) {
        this.stats.currentHurricanes.hits++;
        logger.debug({ key }, 'Current hurricanes cache hit');
      } else {
        this.stats.currentHurricanes.misses++;
        logger.debug({ key }, 'Current hurricanes cache miss');
      }

      return data;
    } catch (error) {
      logger.error({ error }, 'Error getting current hurricanes from cache');
      throw new CacheError('Failed to get current hurricanes from cache', 'get');
    }
  }

  setCurrentHurricanes(data: ActiveHurricane[]): void {
    try {
      const key = this.getCurrentHurricanesKey();
      this.currentHurricaneCache.set(key, data);
      this.stats.currentHurricanes.sets++;
      logger.debug({ key, count: data.length }, 'Current hurricanes cached');
    } catch (error) {
      logger.error({ error }, 'Error setting current hurricanes in cache');
      throw new CacheError('Failed to set current hurricanes in cache', 'set');
    }
  }

  // =============================================================================
  // FORECAST CACHE
  // =============================================================================

  getForecast(hurricaneId: string): HurricaneForecast | undefined {
    try {
      const key = this.getForecastKey(hurricaneId);
      const data = this.forecastCache.get(key);

      if (data) {
        this.stats.forecasts.hits++;
        logger.debug({ hurricaneId, key }, 'Forecast cache hit');
      } else {
        this.stats.forecasts.misses++;
        logger.debug({ hurricaneId, key }, 'Forecast cache miss');
      }

      return data;
    } catch (error) {
      logger.error({ hurricaneId, error }, 'Error getting forecast from cache');
      throw new CacheError('Failed to get forecast from cache', 'get');
    }
  }

  setForecast(hurricaneId: string, data: HurricaneForecast): void {
    try {
      const key = this.getForecastKey(hurricaneId);
      this.forecastCache.set(key, data);
      this.stats.forecasts.sets++;
      logger.debug({ hurricaneId, key }, 'Forecast cached');
    } catch (error) {
      logger.error({ hurricaneId, error }, 'Error setting forecast in cache');
      throw new CacheError('Failed to set forecast in cache', 'set');
    }
  }

  // =============================================================================
  // ALERT CACHE
  // =============================================================================

  getAlerts(location: string): HurricaneAlert[] | undefined {
    try {
      const key = this.getAlertsKey(location);
      const data = this.alertCache.get(key);

      if (data) {
        this.stats.alerts.hits++;
        logger.debug({ location, key }, 'Alerts cache hit');
      } else {
        this.stats.alerts.misses++;
        logger.debug({ location, key }, 'Alerts cache miss');
      }

      return data;
    } catch (error) {
      logger.error({ location, error }, 'Error getting alerts from cache');
      throw new CacheError('Failed to get alerts from cache', 'get');
    }
  }

  setAlerts(location: string, data: HurricaneAlert[]): void {
    try {
      const key = this.getAlertsKey(location);
      this.alertCache.set(key, data);
      this.stats.alerts.sets++;
      logger.debug({ location, key, count: data.length }, 'Alerts cached');
    } catch (error) {
      logger.error({ location, error }, 'Error setting alerts in cache');
      throw new CacheError('Failed to set alerts in cache', 'set');
    }
  }

  // =============================================================================
  // TRACK CACHE
  // =============================================================================

  getTrack(hurricaneId: string): HurricaneTrack | undefined {
    try {
      const key = this.getTrackKey(hurricaneId);
      const data = this.trackCache.get(key);

      if (data) {
        this.stats.tracks.hits++;
        logger.debug({ hurricaneId, key }, 'Track cache hit');
      } else {
        this.stats.tracks.misses++;
        logger.debug({ hurricaneId, key }, 'Track cache miss');
      }

      return data;
    } catch (error) {
      logger.error({ hurricaneId, error }, 'Error getting track from cache');
      throw new CacheError('Failed to get track from cache', 'get');
    }
  }

  setTrack(hurricaneId: string, data: HurricaneTrack): void {
    try {
      const key = this.getTrackKey(hurricaneId);
      this.trackCache.set(key, data);
      this.stats.tracks.sets++;
      logger.debug({ hurricaneId, key }, 'Track cached');
    } catch (error) {
      logger.error({ hurricaneId, error }, 'Error setting track in cache');
      throw new CacheError('Failed to set track in cache', 'set');
    }
  }

  // =============================================================================
  // HISTORICAL CACHE
  // =============================================================================

  getHistorical(query: {
    year?: number;
    basin?: string;
    category?: number;
    name?: string;
  }): HistoricalHurricane[] | undefined {
    try {
      const key = this.getHistoricalKey(query);
      const data = this.historicalCache.get(key);

      if (data) {
        this.stats.historical.hits++;
        logger.debug({ query, key }, 'Historical cache hit');
      } else {
        this.stats.historical.misses++;
        logger.debug({ query, key }, 'Historical cache miss');
      }

      return data;
    } catch (error) {
      logger.error({ query, error }, 'Error getting historical data from cache');
      throw new CacheError('Failed to get historical data from cache', 'get');
    }
  }

  setHistorical(query: {
    year?: number;
    basin?: string;
    category?: number;
    name?: string;
  }, data: HistoricalHurricane[]): void {
    try {
      const key = this.getHistoricalKey(query);
      this.historicalCache.set(key, data);
      this.stats.historical.sets++;
      logger.debug({ query, key, count: data.length }, 'Historical data cached');
    } catch (error) {
      logger.error({ query, error }, 'Error setting historical data in cache');
      throw new CacheError('Failed to set historical data in cache', 'set');
    }
  }

  // =============================================================================
  // GEOCODING CACHE
  // =============================================================================

  getGeocoding(location: string): { latitude: number; longitude: number } | undefined {
    try {
      const key = this.getGeocodingKey(location);
      const data = this.geocodingCache.get(key);

      if (data) {
        this.stats.geocoding.hits++;
        logger.debug({ location, key }, 'Geocoding cache hit');
      } else {
        this.stats.geocoding.misses++;
        logger.debug({ location, key }, 'Geocoding cache miss');
      }

      return data;
    } catch (error) {
      logger.error({ location, error }, 'Error getting geocoding from cache');
      throw new CacheError('Failed to get geocoding from cache', 'get');
    }
  }

  setGeocoding(location: string, latitude: number, longitude: number): void {
    try {
      const key = this.getGeocodingKey(location);
      this.geocodingCache.set(key, { latitude, longitude });
      this.stats.geocoding.sets++;
      logger.debug({ location, key, latitude, longitude }, 'Geocoding cached');
    } catch (error) {
      logger.error({ location, error }, 'Error setting geocoding in cache');
      throw new CacheError('Failed to set geocoding in cache', 'set');
    }
  }

  // =============================================================================
  // CACHE MANAGEMENT
  // =============================================================================

  /**
   * Clear all caches
   */
  clear(): void {
    try {
      this.currentHurricaneCache.clear();
      this.forecastCache.clear();
      this.alertCache.clear();
      this.trackCache.clear();
      this.historicalCache.clear();
      this.geocodingCache.clear();
      logger.info('All hurricane caches cleared');
    } catch (error) {
      logger.error({ error }, 'Error clearing caches');
      throw new CacheError('Failed to clear caches', 'clear');
    }
  }

  /**
   * Clear expired entries from all caches
   */
  purgeStale(): void {
    const currentPurged = this.currentHurricaneCache.purgeStale();
    const forecastPurged = this.forecastCache.purgeStale();
    const alertPurged = this.alertCache.purgeStale();
    const trackPurged = this.trackCache.purgeStale();
    const historicalPurged = this.historicalCache.purgeStale();
    const geocodingPurged = this.geocodingCache.purgeStale();

    logger.info({
      currentHurricanes: currentPurged,
      forecasts: forecastPurged,
      alerts: alertPurged,
      tracks: trackPurged,
      historical: historicalPurged,
      geocoding: geocodingPurged,
    }, 'Purged stale hurricane cache entries');
  }

  /**
   * Get comprehensive cache statistics
   */
  getStats(): Record<string, CacheStats> {
    const calculateHitRatio = (hits: number, misses: number) => {
      const total = hits + misses;
      return total > 0 ? hits / total : 0;
    };

    return {
      currentHurricanes: {
        ...this.stats.currentHurricanes,
        hitRatio: calculateHitRatio(
          this.stats.currentHurricanes.hits, 
          this.stats.currentHurricanes.misses
        ),
        size: this.currentHurricaneCache.size,
        maxSize: this.config.maxSize,
      },
      forecasts: {
        ...this.stats.forecasts,
        hitRatio: calculateHitRatio(this.stats.forecasts.hits, this.stats.forecasts.misses),
        size: this.forecastCache.size,
        maxSize: this.config.maxSize,
      },
      alerts: {
        ...this.stats.alerts,
        hitRatio: calculateHitRatio(this.stats.alerts.hits, this.stats.alerts.misses),
        size: this.alertCache.size,
        maxSize: this.config.maxSize,
      },
      tracks: {
        ...this.stats.tracks,
        hitRatio: calculateHitRatio(this.stats.tracks.hits, this.stats.tracks.misses),
        size: this.trackCache.size,
        maxSize: this.config.maxSize,
      },
      historical: {
        ...this.stats.historical,
        hitRatio: calculateHitRatio(this.stats.historical.hits, this.stats.historical.misses),
        size: this.historicalCache.size,
        maxSize: this.config.maxSize * 2,
      },
      geocoding: {
        ...this.stats.geocoding,
        hitRatio: calculateHitRatio(this.stats.geocoding.hits, this.stats.geocoding.misses),
        size: this.geocodingCache.size,
        maxSize: this.config.maxSize * 3,
      },
    };
  }

  /**
   * Reset all statistics
   */
  resetStats(): void {
    this.stats = {
      currentHurricanes: { hits: 0, misses: 0, sets: 0, deletes: 0 },
      forecasts: { hits: 0, misses: 0, sets: 0, deletes: 0 },
      alerts: { hits: 0, misses: 0, sets: 0, deletes: 0 },
      tracks: { hits: 0, misses: 0, sets: 0, deletes: 0 },
      historical: { hits: 0, misses: 0, sets: 0, deletes: 0 },
      geocoding: { hits: 0, misses: 0, sets: 0, deletes: 0 },
    };
    logger.info('Hurricane cache statistics reset');
  }

  /**
   * Get cache information for monitoring
   */
  getInfo() {
    return {
      config: this.config,
      stats: this.getStats(),
      sizes: {
        currentHurricanes: this.currentHurricaneCache.size,
        forecasts: this.forecastCache.size,
        alerts: this.alertCache.size,
        tracks: this.trackCache.size,
        historical: this.historicalCache.size,
        geocoding: this.geocodingCache.size,
        total: this.currentHurricaneCache.size + 
               this.forecastCache.size + 
               this.alertCache.size + 
               this.trackCache.size + 
               this.historicalCache.size + 
               this.geocodingCache.size,
      },
    };
  }
}

// Create singleton instance
export const hurricaneCache = new HurricaneCache();

// Export cache utilities
export const cacheUtils = {
  /**
   * Invalidate cache for a specific hurricane
   */
  invalidateHurricane(hurricaneId: string): void {
    const forecastKey = `forecast:${hurricaneId.toLowerCase()}`;
    const trackKey = `track:${hurricaneId.toLowerCase()}`;

    hurricaneCache['forecastCache'].delete(forecastKey);
    hurricaneCache['trackCache'].delete(trackKey);

    logger.info({ hurricaneId }, 'Cache invalidated for hurricane');
  },

  /**
   * Invalidate cache for a specific location
   */
  invalidateLocation(location: string): void {
    const alertsKey = `alerts:${location.toLowerCase().trim()}`;
    const geoKey = `geo:${location.toLowerCase().trim()}`;

    hurricaneCache['alertCache'].delete(alertsKey);
    hurricaneCache['geocodingCache'].delete(geoKey);

    logger.info({ location }, 'Cache invalidated for location');
  },

  /**
   * Invalidate current hurricanes cache (force refresh)
   */
  invalidateCurrentHurricanes(): void {
    const key = 'hurricanes:current:all';
    hurricaneCache['currentHurricaneCache'].delete(key);
    logger.info('Current hurricanes cache invalidated');
  },

  /**
   * Warm up cache with common data
   */
  async warmUp(
    fetchCurrentHurricanes: () => Promise<ActiveHurricane[]>,
    commonLocations: string[] = ['Miami, FL', 'New Orleans, LA', 'Tampa, FL', 'Houston, TX']
  ): Promise<void> {
    logger.info({ locations: commonLocations.length }, 'Warming up hurricane cache');

    try {
      // Warm up current hurricanes
      const currentHurricanes = await fetchCurrentHurricanes();
      hurricaneCache.setCurrentHurricanes(currentHurricanes);

      // Note: Location-based warming would require actual geocoding service
      // This is a placeholder for when real APIs are integrated
      logger.info('Hurricane cache warm-up complete');
    } catch (error) {
      logger.warn({ error }, 'Failed to warm up hurricane cache');
    }
  },

  /**
   * Get cache performance summary
   */
  getPerformanceSummary() {
    const stats = hurricaneCache.getStats();
    const totalHits = Object.values(stats).reduce((sum, cache) => sum + cache.hits, 0);
    const totalMisses = Object.values(stats).reduce((sum, cache) => sum + cache.misses, 0);
    const overallHitRatio = totalHits + totalMisses > 0 ? totalHits / (totalHits + totalMisses) : 0;

    return {
      overallHitRatio,
      totalHits,
      totalMisses,
      totalEntries: Object.values(stats).reduce((sum, cache) => sum + cache.size, 0),
      cacheTypes: Object.keys(stats).length,
      bestPerforming: Object.entries(stats)
        .sort(([, a], [, b]) => b.hitRatio - a.hitRatio)
        .slice(0, 3)
        .map(([name, stat]) => ({ name, hitRatio: stat.hitRatio })),
    };
  },
};
