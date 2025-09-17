/**
 * Hurricane Tracker MCP Server - Protocol Layer & Tool Registration
 * SOLID Architecture: Single Responsibility - MCP Protocol Implementation & Tool Orchestration
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { logger, performanceLogger, generateCorrelationId } from './logging/logger-pino.js';
import { hurricaneService } from './hurricane-service.js';
import { 
  NotFoundError, 
  UpstreamTimeoutError 
} from './errors/base-errors.js';
import type { ToolResponse } from './types.js';

// =============================================================================
// MCP TOOL SCHEMAS (Protocol Layer)
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
// MCP PROTOCOL HANDLER CLASS
// =============================================================================

export class HurricaneMcpServer {
  private mcpServer: McpServer;
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
    this.mcpServer = new McpServer({
      name: 'hurricane-tracker-mcp',
      version: '1.0.1',
    });

    this.setupToolHandlers();
    this.setupProtocolHandlers();
  }

  /**
   * Setup MCP protocol event handlers for lifecycle management
   */
  private setupProtocolHandlers(): void {
    // MCP server handles errors through transport layer
    // No direct error handler needed here

    logger.info({
      serverName: 'hurricane-tracker-mcp',
      version: '1.0.1',
      toolCount: 5,
    }, 'MCP Protocol handlers configured');
  }

  /**
   * Setup tool handlers with proper MCP registration and validation
   */
  private setupToolHandlers(): void {
    // Tool 1: Get Active Storms
    this.mcpServer.registerTool(
      'get_active_storms',
      {
        title: 'Get Active Storms',
        description: 'List all active tropical cyclones globally with key metadata and links',
        inputSchema: {
          type: 'object',
          properties: {
            basin: {
              type: 'string',
              enum: ['AL', 'EP', 'CP', 'WP', 'NP', 'SP', 'SI'],
              description: 'Filter by basin code: AL (Atlantic), EP (Eastern Pacific), CP (Central Pacific), WP (Western Pacific), SI (South Indian)'
            }
          },
          additionalProperties: false
        } as any,
      },
      async (args: any) => this.handleGetActiveStorms(args)
    );

    // Tool 2: Get Storm Cone
    this.mcpServer.registerTool(
      'get_storm_cone',
      {
        title: 'Get Storm Cone',
        description: 'Get cone of uncertainty and forecast points for a specific storm',
        inputSchema: {
          type: 'object',
          properties: {
            stormId: {
              type: 'string',
              pattern: '^[A-Z]{2}[0-9]{6}$',
              description: 'Storm identifier (e.g., AL052024 for Atlantic storm 5 in 2024)'
            }
          },
          required: ['stormId'],
          additionalProperties: false
        } as any,
      },
      async (args: any) => this.handleGetStormCone(args)
    );

    // Tool 3: Get Storm Track
    this.mcpServer.registerTool(
      'get_storm_track',
      {
        title: 'Get Storm Track',
        description: 'Get historical track (past positions) for a storm',
        inputSchema: {
          type: 'object',
          properties: {
            stormId: {
              type: 'string',
              pattern: '^[A-Z]{2}[0-9]{6}$',
              description: 'Storm identifier'
            }
          },
          required: ['stormId'],
          additionalProperties: false
        } as any,
      },
      async (args: any) => this.handleGetStormTrack(args)
    );

    // Tool 4: Get Local Hurricane Alerts
    this.mcpServer.registerTool(
      'get_local_hurricane_alerts',
      {
        title: 'Get Local Hurricane Alerts',
        description: 'Get active hurricane-related alerts for a specific location',
        inputSchema: {
          type: 'object',
          properties: {
            lat: {
              type: 'number',
              minimum: -90,
              maximum: 90,
              description: 'Latitude in decimal degrees'
            },
            lon: {
              type: 'number',
              minimum: -180,
              maximum: 180,
              description: 'Longitude in decimal degrees'
            }
          },
          required: ['lat', 'lon'],
          additionalProperties: false
        } as any,
      },
      async (args: any) => this.handleGetLocalHurricaneAlerts(args)
    );

    // Tool 5: Search Historical Tracks
    this.mcpServer.registerTool(
      'search_historical_tracks',
      {
        title: 'Search Historical Tracks',
        description: 'Query historical hurricane tracks by area and date range',
        inputSchema: {
          type: 'object',
          properties: {
            aoi: {
              type: 'object',
              description: 'Area of interest as GeoJSON Polygon',
              properties: {
                type: {
                  type: 'string',
                  enum: ['Polygon']
                },
                coordinates: {
                  type: 'array',
                  items: {
                    type: 'array',
                    items: {
                      type: 'array',
                      items: {
                        type: 'number'
                      }
                    }
                  }
                }
              },
              required: ['type', 'coordinates'],
              additionalProperties: false
            },
            start: {
              type: 'string',
              pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$',
              description: 'Start date for search (YYYY-MM-DD format)'
            },
            end: {
              type: 'string',
              pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$',
              description: 'End date for search (YYYY-MM-DD format)'
            },
            basin: {
              type: 'string',
              enum: ['AL', 'EP', 'CP', 'WP', 'NP', 'SP', 'SI'],
              description: 'Filter by basin code'
            }
          },
          required: ['aoi', 'start', 'end'],
          additionalProperties: false
        } as any,
      },
      async (args: any) => this.handleSearchHistoricalTracks(args)
    );

    logger.info({ toolCount: 5 }, 'Hurricane tools registered with MCP server');
  }

  // ==========================================================================
  // TOOL HANDLERS (Protocol Layer - Orchestration & Validation)
  // ==========================================================================

  /**
   * Handle get_active_storms tool call with proper protocol compliance
   */
  private async handleGetActiveStorms(args: any): Promise<any> {
    const correlationId = generateCorrelationId();
    const startTime = Date.now();

    try {
      // Protocol-level input validation
      const validated = getActiveStormsSchema.parse(args);
      
      logger.info({ 
        correlationId, 
        tool: 'get_active_storms', 
        basin: validated.basin 
      }, 'MCP tool call: get_active_storms');

      // Delegate to business layer
      const result = await hurricaneService.getActiveStorms(validated);

      // Protocol-level response formatting and logging
      const duration = Date.now() - startTime;
      performanceLogger.apiCall({
        correlationId,
        api: 'hurricane-service',
        endpoint: 'get_active_storms',
        method: 'TOOL_CALL',
        duration,
        cached: false,
      });

      return this.formatMcpResponse(result, correlationId);

    } catch (error) {
      return this.handleToolError(error, 'get_active_storms', correlationId, startTime);
    }
  }

  /**
   * Handle get_storm_cone tool call with proper protocol compliance
   */
  private async handleGetStormCone(args: any): Promise<any> {
    const correlationId = generateCorrelationId();
    const startTime = Date.now();

    try {
      const validated = getStormConeSchema.parse(args);
      
      logger.info({ 
        correlationId, 
        tool: 'get_storm_cone', 
        stormId: validated.stormId 
      }, 'MCP tool call: get_storm_cone');

      const result = await hurricaneService.getStormCone(validated);

      const duration = Date.now() - startTime;
      performanceLogger.apiCall({
        correlationId,
        api: 'hurricane-service',
        endpoint: 'get_storm_cone',
        method: 'TOOL_CALL',
        duration,
        cached: false,
      });

      return this.formatMcpResponse(result, correlationId);

    } catch (error) {
      return this.handleToolError(error, 'get_storm_cone', correlationId, startTime);
    }
  }

  /**
   * Handle get_storm_track tool call with proper protocol compliance
   */
  private async handleGetStormTrack(args: any): Promise<any> {
    const correlationId = generateCorrelationId();
    const startTime = Date.now();

    try {
      const validated = getStormTrackSchema.parse(args);
      
      logger.info({ 
        correlationId, 
        tool: 'get_storm_track', 
        stormId: validated.stormId 
      }, 'MCP tool call: get_storm_track');

      const result = await hurricaneService.getStormTrack(validated);

      const duration = Date.now() - startTime;
      performanceLogger.apiCall({
        correlationId,
        api: 'hurricane-service',
        endpoint: 'get_storm_track',
        method: 'TOOL_CALL',
        duration,
        cached: false,
      });

      return this.formatMcpResponse(result, correlationId);

    } catch (error) {
      return this.handleToolError(error, 'get_storm_track', correlationId, startTime);
    }
  }

  /**
   * Handle get_local_hurricane_alerts tool call with proper protocol compliance
   */
  private async handleGetLocalHurricaneAlerts(args: any): Promise<any> {
    const correlationId = generateCorrelationId();
    const startTime = Date.now();

    try {
      const validated = getLocalHurricaneAlertsSchema.parse(args);
      
      logger.info({ 
        correlationId, 
        tool: 'get_local_hurricane_alerts', 
        location: { lat: validated.lat, lon: validated.lon }
      }, 'MCP tool call: get_local_hurricane_alerts');

      const result = await hurricaneService.getLocalHurricaneAlerts(validated);

      const duration = Date.now() - startTime;
      performanceLogger.apiCall({
        correlationId,
        api: 'hurricane-service',
        endpoint: 'get_local_hurricane_alerts',
        method: 'TOOL_CALL',
        duration,
        cached: false,
      });

      return this.formatMcpResponse(result, correlationId);

    } catch (error) {
      return this.handleToolError(error, 'get_local_hurricane_alerts', correlationId, startTime);
    }
  }

  /**
   * Handle search_historical_tracks tool call with proper protocol compliance
   */
  private async handleSearchHistoricalTracks(args: any): Promise<any> {
    const correlationId = generateCorrelationId();
    const startTime = Date.now();

    try {
      const validated = searchHistoricalTracksSchema.parse(args);
      
      logger.info({ 
        correlationId, 
        tool: 'search_historical_tracks', 
        dateRange: `${validated.start} to ${validated.end}`,
        basin: validated.basin
      }, 'MCP tool call: search_historical_tracks');

      const result = await hurricaneService.searchHistoricalTracks(validated);

      const duration = Date.now() - startTime;
      performanceLogger.apiCall({
        correlationId,
        api: 'hurricane-service',
        endpoint: 'search_historical_tracks',
        method: 'TOOL_CALL',
        duration,
        cached: false,
      });

      return this.formatMcpResponse(result, correlationId);

    } catch (error) {
      return this.handleToolError(error, 'search_historical_tracks', correlationId, startTime);
    }
  }

  // ==========================================================================
  // MCP PROTOCOL UTILITIES
  // ==========================================================================

  /**
   * Format response according to MCP protocol standards
   */
  private formatMcpResponse(data: any, correlationId: string): ToolResponse {
    return {
      content: [
        {
          type: 'text',
          text: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
        },
      ],
      _meta: {
        timestamp: new Date().toISOString(),
        correlationId,
        protocolVersion: '2025-06-18',
      },
    };
  }

  /**
   * Handle tool errors with proper MCP error formatting
   */
  private handleToolError(
    error: any, 
    toolName: string, 
    correlationId: string, 
    startTime: number
  ): ToolResponse {
    const duration = Date.now() - startTime;

    // Log error with correlation context
    logger.error({ 
      error: error.message, 
      correlationId, 
      tool: toolName,
      duration 
    }, `MCP tool error: ${toolName}`);

    // Track error metrics
    performanceLogger.apiCall({
      correlationId,
      api: 'hurricane-service',
      endpoint: toolName,
      method: 'TOOL_CALL',
      duration,
      cached: false,
      error: error.message,
    });

    // Convert to MCP-compliant error response
    let mcpError: ToolResponse;

    if (error instanceof z.ZodError) {
      mcpError = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid input parameters',
                details: error.errors,
                hint: 'Please check the input parameters and ensure they meet the schema requirements',
              },
            }, null, 2),
          },
        ],
        _meta: {
          timestamp: new Date().toISOString(),
          correlationId,
          error: true,
        },
      };
    } else if (error instanceof NotFoundError) {
      mcpError = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: {
                code: 'NOT_FOUND',
                message: error.message,
                hint: 'Check the identifier format or use get_active_storms to find valid storm IDs',
              },
            }, null, 2),
          },
        ],
        _meta: {
          timestamp: new Date().toISOString(),
          correlationId,
          error: true,
        },
      };
    } else if (error instanceof UpstreamTimeoutError) {
      mcpError = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: {
                code: 'UPSTREAM_TIMEOUT',
                message: 'Service timeout occurred',
                hint: 'Try again in a few seconds. The external hurricane data service may be temporarily unavailable',
              },
            }, null, 2),
          },
        ],
        _meta: {
          timestamp: new Date().toISOString(),
          correlationId,
          error: true,
        },
      };
    } else {
      mcpError = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: {
                code: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred',
                hint: 'Please try again. If the problem persists, check the server logs',
              },
            }, null, 2),
          },
        ],
        _meta: {
          timestamp: new Date().toISOString(),
          correlationId,
          error: true,
        },
      };
    }

    return mcpError;
  }

  // ==========================================================================
  // SERVER LIFECYCLE MANAGEMENT
  // ==========================================================================

  /**
   * Get the configured MCP server instance for transport connection
   */
  getMcpServer(): McpServer {
    return this.mcpServer;
  }

  /**
   * Get server statistics for monitoring
   */
  getServerStats() {
    const uptime = Date.now() - this.startTime;
    return {
      name: 'hurricane-tracker-mcp',
      version: '1.0.1',
      uptime,
      toolCount: 5,
      protocolVersion: '2025-06-18',
      capabilities: {
        tools: true,
        logging: true,
        completion: false,
        resources: false,
      },
    };
  }

  /**
   * Shutdown the MCP server gracefully
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Hurricane MCP server');
    
    try {
      // The MCP server will handle its own cleanup through transport disconnection
      logger.info('Hurricane MCP server shutdown complete');
    } catch (error) {
      logger.error({ error }, 'Error during MCP server shutdown');
      throw error;
    }
  }
}

// Export singleton instance for use by transport layer
export const hurricaneMcpServer = new HurricaneMcpServer();
