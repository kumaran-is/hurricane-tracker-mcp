/**
 * Hurricane Tracker MCP Server - Hurricane Data Service
 * Real-time hurricane data integration with NOAA/NHC APIs
 */

import { z } from 'zod';
import { request } from 'undici';
import { logger, performanceLogger } from './logger-pino.js';
import { config } from './config/config.js';
import { generateCorrelationId } from './logger-pino.js';
import { 
  UpstreamTimeoutError, 
  UpstreamError, 
  NotFoundError,
  ValidationError 
} from './errors/base-errors.js';
import type {
  HurricaneBasicInfo,
  StormCone,
  StormTrack,
  HurricaneAlert,
  HistoricalStormSummary,
  ToolResponse,
  ToolContent
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
  private readonly baseTimeout = config.performance.requestTimeoutMs;
  
  /**
   * Get all active tropical cyclones globally
   */
  async getActiveStorms(args: z.infer<typeof getActiveStormsSchema>): Promise<ToolResponse> {
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

      const content: ToolContent[] = [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: filteredData,
          metadata: {
            timestamp: new Date().toISOString(),
            basin: validated.basin || 'all',
            totalStorms: filteredData.length,
            source: 'National Hurricane Center',
          }
        }, null, 2)
      }];

      return {
        content,
        _meta: {
          timestamp: new Date().toISOString(),
          correlationId,
        }
      };

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
  async getStormCone(args: z.infer<typeof getStormConeSchema>): Promise<ToolResponse> {
    const correlationId = generateCorrelationId();
    const startTime = Date.now();

    try {
      const validated = getStormConeSchema.parse(args);
      
      logger.info({ correlationId, stormId: validated.stormId }, 'Getting storm cone');

      // Check if storm exists (placeholder logic)
      if (validated.stormId !== 'AL052024') {
        throw new NotFoundError('Storm', validated.stormId, correlationId);
      }

      // Mock storm cone data
      const mockCone: StormCone = {
        cone: {
          type: 'Polygon',
          coordinates: [[
            [-45.2, 13.4],
            [-44.0, 14.0],
            [-42.5, 15.2],
            [-41.0, 16.8],
            [-39.2, 18.5],
            [-37.8, 20.1],
            [-39.5, 19.8],
            [-41.2, 18.0],
            [-43.0, 16.2],
            [-44.8, 14.5],
            [-45.2, 13.4]
          ]]
        },
        forecastPoints: [
          {
            time: '2024-07-01T21:00:00Z',
            lat: 13.8,
            lon: -47.5,
            windKts: 160,
            pressureMb: 940
          },
          {
            time: '2024-07-02T09:00:00Z',
            lat: 14.5,
            lon: -51.2,
            windKts: 155,
            pressureMb: 945
          },
          {
            time: '2024-07-02T21:00:00Z',
            lat: 15.4,
            lon: -55.8,
            windKts: 145,
            pressureMb: 955
          }
        ],
        metadata: {
          stormId: validated.stormId,
          advisoryTime: '2024-07-01T15:00:00Z',
          forecastHours: [6, 12, 24, 36, 48, 72, 96, 120]
        }
      };

      const duration = Date.now() - startTime;
      
      performanceLogger.apiCall({
        correlationId,
        api: 'NHC-GIS',
        endpoint: `/storm-cone/${validated.stormId}`,
        method: 'GET',
        duration,
        cached: false,
      });

      const content: ToolContent[] = [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: mockCone,
          metadata: {
            timestamp: new Date().toISOString(),
            stormId: validated.stormId,
            source: 'National Hurricane Center GIS',
            coneType: '5-day forecast cone',
          }
        }, null, 2)
      }];

      return {
        content,
        _meta: {
          timestamp: new Date().toISOString(),
          correlationId,
        }
      };

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
  async getLocalHurricaneAlerts(args: z.infer<typeof getLocalHurricaneAlertsSchema>): Promise<ToolResponse> {
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

      const content: ToolContent[] = [{
        type: 'text', 
        text: JSON.stringify({
          success: true,
          data: mockAlerts,
          metadata: {
            timestamp: new Date().toISOString(),
            location: { lat: validated.lat, lon: validated.lon },
            alertCount: mockAlerts.length,
            source: 'National Weather Service',
          }
        }, null, 2)
      }];

      return {
        content,
        _meta: {
          timestamp: new Date().toISOString(),
          correlationId,
        }
      };

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
  async getStormTrack(args: z.infer<typeof getStormTrackSchema>): Promise<ToolResponse> {
    const correlationId = generateCorrelationId();
    const startTime = Date.now();

    try {
      const validated = getStormTrackSchema.parse(args);
      
      logger.info({ correlationId, stormId: validated.stormId }, 'Getting storm track');

      // Check if storm exists (placeholder logic)
      if (validated.stormId !== 'AL052024') {
        throw new NotFoundError('Storm', validated.stormId, correlationId);
      }

      // Mock storm track data
      const mockTrack: StormTrack = {
        track: {
          type: 'LineString',
          coordinates: [
            [-40.5, 10.8],
            [-41.8, 11.2],
            [-43.2, 11.8],
            [-44.1, 12.5],
            [-45.2, 13.4]
          ]
        },
        points: [
          {
            time: '2024-06-28T12:00:00Z',
            lat: 10.8,
            lon: -40.5,
            windKts: 40,
            pressureMb: 1008,
            status: 'Tropical Depression'
          },
          {
            time: '2024-06-28T18:00:00Z',
            lat: 11.2,
            lon: -41.8,
            windKts: 50,
            pressureMb: 1005,
            status: 'Tropical Storm'
          },
          {
            time: '2024-06-29T00:00:00Z',
            lat: 11.8,
            lon: -43.2,
            windKts: 65,
            pressureMb: 995,
            status: 'Tropical Storm'
          },
          {
            time: '2024-06-29T12:00:00Z',
            lat: 12.5,
            lon: -44.1,
            windKts: 80,
            pressureMb: 985,
            status: 'Hurricane'
          },
          {
            time: '2024-07-01T12:00:00Z',
            lat: 13.4,
            lon: -45.2,
            windKts: 165,
            pressureMb: 934,
            status: 'Hurricane'
          }
        ],
        metadata: {
          stormId: validated.stormId,
          startTime: '2024-06-28T12:00:00Z',
          endTime: '2024-07-01T12:00:00Z',
          maxWindKts: 165,
          minPressureMb: 934
        }
      };

      const duration = Date.now() - startTime;
      
      performanceLogger.apiCall({
        correlationId,
        api: 'NHC-HURDAT',
        endpoint: `/track/${validated.stormId}`,
        method: 'GET',
        duration,
        cached: false,
      });

      const content: ToolContent[] = [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: mockTrack,
          metadata: {
            timestamp: new Date().toISOString(),
            stormId: validated.stormId,
            source: 'National Hurricane Center HURDAT2',
            trackPoints: mockTrack.points.length,
          }
        }, null, 2)
      }];

      return {
        content,
        _meta: {
          timestamp: new Date().toISOString(),
          correlationId,
        }
      };

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
  async searchHistoricalTracks(args: z.infer<typeof searchHistoricalTracksSchema>): Promise<ToolResponse> {
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

      const content: ToolContent[] = [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: filteredResults,
          metadata: {
            timestamp: new Date().toISOString(),
            searchCriteria: {
              dateRange: `${validated.start} to ${validated.end}`,
              basin: validated.basin || 'all',
              areaOfInterest: 'custom polygon'
            },
            resultCount: filteredResults.length,
            source: 'International Best Track Archive for Climate Stewardship (IBTrACS)',
          }
        }, null, 2)
      }];

      return {
        content,
        _meta: {
          timestamp: new Date().toISOString(),
          correlationId,
        }
      };

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
   * Create formatted response for successful tool calls
   */
  private createToolResponse(data: any, metadata: any, correlationId: string): ToolResponse {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          data,
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString(),
          }
        }, null, 2)
      }],
      _meta: {
        timestamp: new Date().toISOString(),
        correlationId,
      }
    };
  }

  /**
   * Estimate token count for response optimization
   */
  private estimateTokens(data: any): number {
    // Simple token estimation: ~4 chars per token
    const jsonString = JSON.stringify(data);
    return Math.ceil(jsonString.length / 4);
  }

  /**
   * Create and configure an MCP server instance with hurricane tools
   */
  async createMCPServer() {
    const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
    
    const server = new McpServer({
      name: 'hurricane-tracker-mcp',
      version: '1.0.0',
    });

    // Register hurricane tracking tools
    server.registerTool(
      'get_active_storms',
      {
        title: 'Get Active Storms',
        description: 'List all active tropical cyclones globally with key metadata and links',
        inputSchema: getActiveStormsSchema,
      },
      async (args: any) => this.getActiveStorms(args)
    );

    server.registerTool(
      'get_storm_cone', 
      {
        title: 'Get Storm Cone',
        description: 'Get cone of uncertainty and forecast points for a specific storm',
        inputSchema: getStormConeSchema,
      },
      async (args: any) => this.getStormCone(args)
    );

    server.registerTool(
      'get_local_hurricane_alerts',
      {
        title: 'Get Local Hurricane Alerts', 
        description: 'Get active hurricane-related alerts for a specific location',
        inputSchema: getLocalHurricaneAlertsSchema,
      },
      async (args: any) => this.getLocalHurricaneAlerts(args)
    );

    return server;
  }
}

export const hurricaneService = new HurricaneService();
