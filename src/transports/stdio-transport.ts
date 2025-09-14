/**
 * Hurricane Tracker MCP Server - Stdio Transport
 * Standard I/O transport for local AI assistant integration (Cline, Claude Desktop, etc.)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
  InitializeRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { logger, mcpLogger } from '../logger-pino.js';
import type { Transport } from '../types.js';

// =============================================================================
// MCP STDIO TRANSPORT
// =============================================================================

export class StdioTransport implements Transport {
  private server: Server;
  private transport: StdioServerTransport;

  constructor() {
    // Create MCP server instance
    this.server = new Server(
      {
        name: 'hurricane-tracker-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Create stdio transport
    this.transport = new StdioServerTransport();
    
    this.setupHandlers();
  }

  private setupHandlers() {
    // Initialize handler
    this.server.setRequestHandler(InitializeRequestSchema, async (request) => {
      mcpLogger.initialize({
        protocolVersion: request.params.protocolVersion,
        clientName: request.params.clientInfo.name,
        clientVersion: request.params.clientInfo.version,
        capabilities: Object.keys(request.params.capabilities || {}),
      });

      return {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'hurricane-tracker-mcp',
          version: '1.0.0',
        },
        instructions: 'Hurricane Tracker MCP Server provides real-time hurricane tracking, forecast cones, local alerts, and historical storm data. Use the available tools to access comprehensive hurricane information from NOAA and NHC sources.',
      };
    });

    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_active_storms',
            description: 'List all active tropical cyclones globally with key metadata and links',
            inputSchema: {
              type: 'object',
              properties: {
                basin: {
                  type: 'string',
                  description: 'Filter by basin code: AL (Atlantic), EP (Eastern Pacific), CP (Central Pacific), WP (Western Pacific), SI (South Indian)',
                  enum: ['AL', 'EP', 'CP', 'WP', 'NP', 'SP', 'SI'],
                },
              },
              additionalProperties: false,
            },
          },
          {
            name: 'get_storm_cone',
            description: 'Get cone of uncertainty and forecast points for a specific storm',
            inputSchema: {
              type: 'object',
              properties: {
                stormId: {
                  type: 'string',
                  description: 'Storm identifier (e.g., AL052024 for Atlantic storm 5 in 2024)',
                  pattern: '^[A-Z]{2}[0-9]{6}$',
                },
              },
              required: ['stormId'],
              additionalProperties: false,
            },
          },
          {
            name: 'get_storm_track',
            description: 'Get historical track (past positions) for a storm',
            inputSchema: {
              type: 'object',
              properties: {
                stormId: {
                  type: 'string',
                  description: 'Storm identifier',
                  pattern: '^[A-Z]{2}[0-9]{6}$',
                },
              },
              required: ['stormId'],
              additionalProperties: false,
            },
          },
          {
            name: 'get_local_hurricane_alerts',
            description: 'Get active hurricane-related alerts for a specific location',
            inputSchema: {
              type: 'object',
              properties: {
                lat: {
                  type: 'number',
                  description: 'Latitude in decimal degrees',
                  minimum: -90,
                  maximum: 90,
                },
                lon: {
                  type: 'number',
                  description: 'Longitude in decimal degrees',
                  minimum: -180,
                  maximum: 180,
                },
              },
              required: ['lat', 'lon'],
              additionalProperties: false,
            },
          },
          {
            name: 'search_historical_tracks',
            description: 'Query historical hurricane tracks by area and date range',
            inputSchema: {
              type: 'object',
              properties: {
                aoi: {
                  type: 'object',
                  description: 'Area of interest as GeoJSON Polygon',
                  properties: {
                    type: { type: 'string', enum: ['Polygon'] },
                    coordinates: { type: 'array' },
                  },
                  required: ['type', 'coordinates'],
                },
                start: {
                  type: 'string',
                  description: 'Start date for search',
                  pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$',
                },
                end: {
                  type: 'string',
                  description: 'End date for search',
                  pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$',
                },
                basin: {
                  type: 'string',
                  description: 'Filter by basin code',
                  enum: ['AL', 'EP', 'CP', 'WP', 'NP', 'SP', 'SI'],
                },
              },
              required: ['aoi', 'start', 'end'],
              additionalProperties: false,
            },
          },
        ],
      };
    });

    // Call tool handler - for now return placeholder responses
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      mcpLogger.toolCall({
        correlationId: 'temp-id',
        toolName: name,
        inputSize: JSON.stringify(args).length,
        success: true,
        duration: 100,
      });

      // Placeholder responses for each tool
      switch (name) {
        case 'get_active_storms':
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  data: [],
                  message: 'Hurricane Tracker MCP Server is starting up. Tool implementations are being loaded.',
                  metadata: {
                    timestamp: new Date().toISOString(),
                    basin: args?.basin || 'all',
                  },
                }, null, 2),
              },
            ],
          };

        case 'get_storm_cone':
        case 'get_storm_track':
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: 'NOT_FOUND',
                  message: 'Storm data loading. Full implementation coming soon.',
                  hint: 'Try again once the server is fully initialized.',
                  metadata: {
                    timestamp: new Date().toISOString(),
                    stormId: args?.stormId,
                  },
                }, null, 2),
              },
            ],
          };

        case 'get_local_hurricane_alerts':
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  data: [],
                  message: 'No active hurricane alerts for the specified location.',
                  metadata: {
                    timestamp: new Date().toISOString(),
                    location: { lat: args?.lat, lon: args?.lon },
                  },
                }, null, 2),
              },
            ],
          };

        case 'search_historical_tracks':
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  data: [],
                  message: 'Historical hurricane track search capability is being implemented.',
                  metadata: {
                    timestamp: new Date().toISOString(),
                    dateRange: { start: args?.start, end: args?.end },
                  },
                }, null, 2),
              },
            ],
          };

        default:
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: 'METHOD_NOT_FOUND',
                  message: `Unknown tool: ${name}`,
                }, null, 2),
              },
            ],
            isError: true,
          };
      }
    });
  }

  async start(): Promise<void> {
    try {
      logger.info('Starting stdio transport for MCP');
      
      // Connect server to transport
      await this.server.connect(this.transport);
      
      logger.info('Stdio transport started successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to start stdio transport');
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      logger.info('Stopping stdio transport');
      await this.server.close();
      logger.info('Stdio transport stopped');
    } catch (error) {
      logger.error({ error }, 'Error stopping stdio transport');
      throw error;
    }
  }

  async send(_message: any): Promise<void> {
    // Not implemented for stdio - handled by SDK
    throw new Error('Direct send not supported for stdio transport');
  }

  onMessage(_handler: (message: any) => Promise<any>): void {
    // Not implemented for stdio - handled by SDK
    throw new Error('Direct message handling not supported for stdio transport');
  }

  onError(_handler: (error: Error) => void): void {
    // Error handling is managed by the MCP SDK
  }

  onClose(_handler: () => void): void {
    // Close handling is managed by the MCP SDK
  }
}
