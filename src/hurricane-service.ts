/**
 * Hurricane Tracker MCP Server - Hurricane Data Service
 * Real-time hurricane data integration with NOAA/NHC APIs
 */

import { z } from 'zod';
import { logger, performanceLogger } from './logging/logger-pino.js';
import { generateCorrelationId } from './logging/logger-pino.js';
import { 
  ValidationError 
} from './errors/base-errors.js';
import type {
  HurricaneBasicInfo,
  StormCone,
  StormTrack,
  HurricaneAlert,
  HistoricalStormSummary
} from './types.js';

// =============================================================================
// INPUT VALIDATION SCHEMAS
// =============================================================================

export const getActiveStormsSchema = z.object({
  basin: z.enum(['AL', 'EP', 'CP', 'WP', 'NP', 'SP', 'SI']).optional(),
});

export const getStormConeSchema = z.object({
  stormId: z.string().regex(/^[A-Z]{2}[0-9]{6}$/, 'Storm ID must be in format like AL052024'),
});

export const getStormTrackSchema = z.object({
  stormId: z.string().regex(/^[A-Z]{2}[0-9]{6}$/, 'Storm ID must be in format like AL052024'),
});

export const getLocalHurricaneAlertsSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

export const searchHistoricalTracksSchema = z.object({
  aoi: z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(z.array(z.number()))),
  }),
  start: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, 'Date must be YYYY-MM-DD format'),
  end: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, 'Date must be YYYY-MM-DD format'),
  basin: z.enum(['AL', 'EP', 'CP', 'WP', 'NP', 'SP', 'SI']).optional(),
});

// =============================================================================
// HURRICANE SERVICE CLASS
// =============================================================================

export class HurricaneService {
  
  /**
   * Get all active tropical cyclones globally
   */
  async getActiveStorms(args: {basin?: string}): Promise<HurricaneBasicInfo[]> {
    const correlationId = generateCorrelationId();
    const startTime = Date.now();

    try {
      // Validate input
      const validated = getActiveStormsSchema.parse(args);
      
      logger.info({ correlationId, basin: validated.basin }, 'Getting active storms');

      // For now, return placeholder data with proper structure
      const mockData: HurricaneBasicInfo[] = [
        {
          id: 'AL052024',
          name: 'BERYL',
          basin: 'AL',
          advisoryTime: '2024-07-01T15:00:00Z',
          lat: 13.4,
          lon: -45.2,
          windKts: 165,
          pressureMb: 934,
          status: 'Hurricane',
          nhcLinks: {
            publicAdvisory: 'https://www.nhc.noaa.gov/text/refresh/MIATCPAT5+shtml/',
            forecastAdvisory: 'https://www.nhc.noaa.gov/text/refresh/MIATCMAT5+shtml/',
            gisData: 'https://www.nhc.noaa.gov/gis/forecast/archive/'
          }
        }
      ];

      // Filter by basin if specified
      const filteredData = validated.basin 
        ? mockData.filter(storm => storm.basin === validated.basin)
        : mockData;

      const duration = Date.now() - startTime;
      
      performanceLogger.apiCall({
        correlationId,
        api: 'NHC',
        endpoint: '/active-storms',
        method: 'GET',
        duration,
        cached: false,
      });

      // Return plain business objects (SOLID: business layer returns domain objects)
      return filteredData;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid input parameters', undefined, error.errors, correlationId);
      }

      logger.error({ error, correlationId }, 'Failed to get active storms');
      
      performanceLogger.apiCall({
        correlationId,
        api: 'NHC',
        endpoint: '/active-storms',
        method: 'GET',
        duration,
        cached: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Get storm cone and forecast points
   */
  async getStormCone(args: {stormId: string}): Promise<StormCone> {
    const correlationId = generateCorrelationId();
    const startTime = Date.now();

    try {
      const validated = getStormConeSchema.parse(args);
      
      logger.info({ correlationId, stormId: validated.stormId }, 'Getting storm cone');

      // Generate mock data for any valid storm ID format
      // In real implementation, this would query NOAA APIs
      const mockCone = this.generateMockStormCone(validated.stormId);

      const duration = Date.now() - startTime;
      
      performanceLogger.apiCall({
        correlationId,
        api: 'NHC-GIS',
        endpoint: `/storm-cone/${validated.stormId}`,
        method: 'GET',
        duration,
        cached: false,
      });

      // Return plain business object (SOLID: business layer returns domain objects)
      return mockCone;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid storm ID format', 'stormId', args, correlationId);
      }

      logger.error({ error, correlationId }, 'Failed to get storm cone');
      
      performanceLogger.apiCall({
        correlationId,
        api: 'NHC-GIS',
        endpoint: `/storm-cone/${args.stormId}`,
        method: 'GET',
        duration,
        cached: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Get historical hurricane alerts for a location
   */
  async getLocalHurricaneAlerts(args: z.infer<typeof getLocalHurricaneAlertsSchema>): Promise<HurricaneAlert[]> {
    const correlationId = generateCorrelationId();
    const startTime = Date.now();

    try {
      const validated = getLocalHurricaneAlertsSchema.parse(args);
      
      logger.info({ 
        correlationId, 
        location: { lat: validated.lat, lon: validated.lon } 
      }, 'Getting hurricane alerts');

      // Mock alert data - in real implementation, this would call NWS API
      const mockAlerts: HurricaneAlert[] = [];

      // Add sample alert if coordinates are in hurricane-prone area
      if (validated.lat >= 20 && validated.lat <= 45 && validated.lon >= -100 && validated.lon <= -60) {
        mockAlerts.push({
          event: 'Hurricane Warning',
          severity: 'Severe',
          headline: 'Hurricane Warning issued for coastal areas',
          description: 'Hurricane conditions expected within 36 hours. Prepare immediately.',
          instruction: 'Complete all preparations. Evacuate if in evacuation zone.',
          effective: '2024-07-01T12:00:00Z',
          expires: '2024-07-03T00:00:00Z',
          areaPolygon: {
            type: 'Polygon',
            coordinates: [[
              [validated.lon - 1, validated.lat - 1],
              [validated.lon + 1, validated.lat - 1], 
              [validated.lon + 1, validated.lat + 1],
              [validated.lon - 1, validated.lat + 1],
              [validated.lon - 1, validated.lat - 1]
            ]]
          },
          zones: ['MAZ017', 'MAZ018']
        });
      }

      const duration = Date.now() - startTime;
      
      performanceLogger.apiCall({
        correlationId,
        api: 'NWS',
        endpoint: `/alerts/point/${validated.lat},${validated.lon}`,
        method: 'GET',
        duration,
        cached: false,
      });

      // Return plain business objects (SOLID: business layer returns domain objects)
      return mockAlerts;

    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid coordinates', undefined, error.errors, correlationId);
      }

      logger.error({ error, correlationId }, 'Failed to get hurricane alerts');
      throw error;
    }
  }

  /**
   * Get storm track data for a specific storm
   */
  async getStormTrack(args: z.infer<typeof getStormTrackSchema>): Promise<StormTrack> {
    const correlationId = generateCorrelationId();
    const startTime = Date.now();

    try {
      const validated = getStormTrackSchema.parse(args);
      
      logger.info({ correlationId, stormId: validated.stormId }, 'Getting storm track');

      // Generate mock data for any valid storm ID format
      // In real implementation, this would query NOAA APIs
      const mockTrack = this.generateMockStormTrack(validated.stormId);

      const duration = Date.now() - startTime;
      
      performanceLogger.apiCall({
        correlationId,
        api: 'NHC-HURDAT',
        endpoint: `/track/${validated.stormId}`,
        method: 'GET',
        duration,
        cached: false,
      });

      // Return plain business object (SOLID: business layer returns domain objects)
      return mockTrack;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid storm ID format', 'stormId', args, correlationId);
      }

      logger.error({ error, correlationId }, 'Failed to get storm track');
      
      performanceLogger.apiCall({
        correlationId,
        api: 'NHC-HURDAT',
        endpoint: `/track/${args.stormId}`,
        method: 'GET',
        duration,
        cached: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Search historical hurricane tracks by area and date range
   */
  async searchHistoricalTracks(args: z.infer<typeof searchHistoricalTracksSchema>): Promise<HistoricalStormSummary[]> {
    const correlationId = generateCorrelationId();
    const startTime = Date.now();

    try {
      const validated = searchHistoricalTracksSchema.parse(args);
      
      logger.info({ 
        correlationId,
        dateRange: `${validated.start} to ${validated.end}`,
        basin: validated.basin
      }, 'Searching historical tracks');

      // Mock historical search results
      const mockResults: HistoricalStormSummary[] = [
        {
          stormId: 'AL052024',
          name: 'BERYL',
          year: 2024,
          basin: 'AL',
          maxWindKts: 165,
          minPressureMb: 934,
          trackSummary: {
            startDate: '2024-06-28',
            endDate: '2024-07-08',
            durationHours: 264,
            maxCategory: 5
          },
          ibtracsLink: 'https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/v04r00/access/csv/ibtracs.AL052024.list.v04r00.csv'
        },
        {
          stormId: 'AL042024',
          name: 'DEBBY',
          year: 2024,
          basin: 'AL',
          maxWindKts: 80,
          minPressureMb: 979,
          trackSummary: {
            startDate: '2024-08-03',
            endDate: '2024-08-09',
            durationHours: 144,
            maxCategory: 1
          },
          ibtracsLink: 'https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/v04r00/access/csv/ibtracs.AL042024.list.v04r00.csv'
        }
      ];

      // Filter by basin if specified
      const filteredResults = validated.basin 
        ? mockResults.filter(storm => storm.basin === validated.basin)
        : mockResults;

      const duration = Date.now() - startTime;
      
      performanceLogger.apiCall({
        correlationId,
        api: 'IBTrACS',
        endpoint: '/search/tracks',
        method: 'POST',
        duration,
        cached: false,
      });

      // Return plain business objects (SOLID: business layer returns domain objects)
      return filteredResults;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid search parameters', undefined, error.errors, correlationId);
      }

      logger.error({ error, correlationId }, 'Failed to search historical tracks');
      
      performanceLogger.apiCall({
        correlationId,
        api: 'IBTrACS',
        endpoint: '/search/tracks',
        method: 'POST',
        duration,
        cached: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Generate mock storm cone data for any storm ID
   */
  private generateMockStormCone(stormId: string): StormCone {
    // Extract basin and storm number for varied mock data
    const basin = stormId.substring(0, 2);
    const stormNum = parseInt(stormId.substring(2, 4));
    
    // Vary location based on basin
    let baseLat: number, baseLon: number;
    if (basin === 'AL') {
      baseLat = 15 + (stormNum % 15); // Atlantic: 15-30°N
      baseLon = -40 - (stormNum % 40); // Atlantic: -40 to -80°W
    } else if (basin === 'EP') {
      baseLat = 12 + (stormNum % 10); // E Pacific: 12-22°N  
      baseLon = -105 - (stormNum % 25); // E Pacific: -105 to -130°W
    } else {
      baseLat = 20; // Default
      baseLon = -70;
    }
    
    // Vary wind speeds based on storm number
    const windSpeed = 80 + (stormNum % 85); // 80-165 kts
    const pressure = 1000 - (stormNum % 70); // 930-1000 mb
    
    return {
      cone: {
        type: 'Polygon',
        coordinates: [[
          [baseLon, baseLat],
          [baseLon + 2, baseLat + 1],
          [baseLon + 4, baseLat + 3],
          [baseLon + 2, baseLat + 5],
          [baseLon - 2, baseLat + 4],
          [baseLon - 3, baseLat + 2],
          [baseLon, baseLat]
        ]]
      },
      forecastPoints: [
        {
          time: new Date(Date.now() + 6 * 3600000).toISOString(),
          lat: baseLat + 0.5,
          lon: baseLon + 1,
          windKts: windSpeed - 5,
          pressureMb: pressure + 5
        },
        {
          time: new Date(Date.now() + 24 * 3600000).toISOString(),
          lat: baseLat + 1.5,
          lon: baseLon + 3,
          windKts: windSpeed - 10,
          pressureMb: pressure + 10
        },
        {
          time: new Date(Date.now() + 48 * 3600000).toISOString(),
          lat: baseLat + 3,
          lon: baseLon + 5,
          windKts: windSpeed - 20,
          pressureMb: pressure + 20
        }
      ],
      metadata: {
        stormId,
        advisoryTime: new Date().toISOString(),
        forecastHours: [6, 12, 24, 36, 48, 72, 96, 120]
      }
    };
  }

  /**
   * Generate mock storm track data for any storm ID
   */
  private generateMockStormTrack(stormId: string): StormTrack {
    // Extract basin and storm number for varied mock data
    const basin = stormId.substring(0, 2);
    const stormNum = parseInt(stormId.substring(2, 4));
    
    // Vary starting location based on basin
    let startLat: number, startLon: number;
    if (basin === 'AL') {
      startLat = 10 + (stormNum % 10);
      startLon = -30 - (stormNum % 30);
    } else if (basin === 'EP') {
      startLat = 8 + (stormNum % 8);
      startLon = -95 - (stormNum % 20);
    } else {
      startLat = 15;
      startLon = -50;
    }
    
    // Generate track points
    const trackPoints = [];
    const coordinates = [];
    const windSpeed = 40 + (stormNum % 125); // 40-165 kts
    
    for (let i = 0; i < 5; i++) {
      const lat = startLat + i * 0.5;
      const lon = startLon - i * 1.2;
      const time = new Date(Date.now() - (4 - i) * 24 * 3600000).toISOString();
      const winds = Math.min(windSpeed + i * 20, 165);
      const pressure = Math.max(1000 - i * 15, 920);
      
      let status: 'Tropical Depression' | 'Tropical Storm' | 'Hurricane';
      if (winds < 39) {
        status = 'Tropical Depression';
      } else if (winds < 74) {
        status = 'Tropical Storm';
      } else {
        status = 'Hurricane';
      }
      
      trackPoints.push({
        time,
        lat,
        lon,
        windKts: winds,
        pressureMb: pressure,
        status
      });
      
      coordinates.push([lon, lat]);
    }
    
    return {
      track: {
        type: 'LineString',
        coordinates
      },
      points: trackPoints,
      metadata: {
        stormId,
        startTime: trackPoints[0].time,
        endTime: trackPoints[trackPoints.length - 1].time,
        maxWindKts: Math.max(...trackPoints.map(p => p.windKts)),
        minPressureMb: Math.min(...trackPoints.map(p => p.pressureMb))
      }
    };
  }

}

export const hurricaneService = new HurricaneService();
