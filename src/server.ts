/**
 * Hurricane Tracker MCP Server - Transport Layer & Infrastructure Management
 * SOLID Architecture: Single Responsibility - Application Entry Point & Transport Orchestration
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import fastify from 'fastify';
import { randomUUID } from 'node:crypto';
import { config, getConfigSummary } from './config/config.js';
import { logger, healthLogger } from './logging/logger-pino.js';
import { hurricaneMcpServer } from './hurricane-mcp-server.js';
import { VERSION } from './utils/version.js';

// =============================================================================
// TRANSPORT LAYER - Infrastructure and Transport Management  
// =============================================================================

const startTime = Date.now();

/**
 * Transport Layer Responsibilities (SOLID: Single Responsibility Principle):
 * - Application entry point and command-line argument parsing
 * - Environment configuration loading and validation
 * - Transport selection and initialization (stdio, Streamable HTTP)
 * - Fastify HTTP server setup with multiple endpoints (/mcp for POST/GET/DELETE, /health)
 * - Session management for HTTP transport with session ID tracking
 * - Graceful shutdown with proper resource cleanup
 * - Process-level error handling (uncaught exceptions, unhandled rejections)
 * - Server lifecycle management (start, stop, error handling)
 */

async function main() {
  try {
    // Log startup with configuration summary
    logger.info(
      {
        config: getConfigSummary(),
        version: VERSION,
        nodeVersion: process.version,
        transport: config.transport.type
      },
      `Starting Hurricane Tracker MCP Server v${VERSION} - SOLID Architecture`
    );

    // Create and start transport based on configuration
    const transport = await createTransport(config.transport.type);
    
    const startupTime = Date.now() - startTime;
    
    healthLogger.lifecycle({
      event: 'ready',
      component: 'hurricane-tracker-mcp',
      duration: startupTime,
      version: VERSION,
      config: {
        transport: config.transport.type,
        tools: 5,
        mcpCompliance: '2025-06-18'
      }
    });

    logger.info(
      { 
        startupTimeMs: startupTime,
        transport: config.transport.type,
        toolCount: 5,
        mcpVersion: '2025-06-18'
      }, 
      `Hurricane Tracker MCP Server ready - SOLID 3-Layer Architecture v${VERSION}`
    );

    // Setup graceful shutdown handlers
    setupShutdownHandlers(transport);

  } catch (error) {
    logger.error({ error }, 'Failed to start Hurricane Tracker MCP Server');
    process.exit(1);
  }
}

/**
 * Create Transport Layer based on Configuration
 * Follows SOLID: Open/Closed Principle - Easy to extend with new transports
 * Delegates MCP protocol handling to hurricane-mcp-server.ts
 */
async function createTransport(transportType: string) {
  switch (transportType) {
    case 'stdio':
      return await createStdioTransport();
    case 'http':
      return await createHttpTransport();
    default:
      logger.warn(`Unknown transport type: ${transportType}, using stdio`);
      return await createStdioTransport();
  }
}

/**
 * Create Stdio Transport for Local AI Assistants (Cline, Claude Desktop)
 * Delegates to Protocol Layer (hurricane-mcp-server.ts)
 */
async function createStdioTransport() {
  const transport = new StdioServerTransport();
  
  // Connect protocol layer to transport
  await hurricaneMcpServer.getMcpServer().connect(transport);
  
  logger.info({ transport: 'stdio' }, 'Connected Hurricane MCP Server via Stdio transport');
  
  return {
    type: 'stdio' as const,
    transport,
    stop: async () => {
      logger.info('Stopping stdio transport');
      await hurricaneMcpServer.shutdown();
    }
  };
}

/**
 * Create HTTP Transport for Production/Remote Access with Session Management
 * Uses Fastify for high-performance HTTP handling
 */
async function createHttpTransport() {
  const app = fastify({ logger: false });

  // Register CORS plugin for browser-based clients
  await app.register(import('@fastify/cors'), {
    origin: '*', // Configure appropriately for production
    exposedHeaders: ['Mcp-Session-Id'],
    allowedHeaders: ['Content-Type', 'mcp-session-id'],
  });

  // Session management for stateful MCP communication
  const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

  // Handle POST requests for client-to-server communication
  app.post('/mcp', async (request, reply) => {
    try {
      const sessionId = request.headers['mcp-session-id'] as string | undefined;
      let transport: StreamableHTTPServerTransport;

      if (sessionId && transports[sessionId]) {
        // Reuse existing transport for session continuity
        transport = transports[sessionId];
      } else if (!sessionId) {
        // New initialization request - create new transport
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sessionId) => {
            transports[sessionId] = transport;
            logger.debug({ sessionId }, 'New MCP session initialized');
          },
          enableDnsRebindingProtection: false,  // Disabled for Docker
          allowedHosts: ['127.0.0.1', 'localhost', '0.0.0.0'],
        });

        // Clean up transport when closed
        transport.onclose = () => {
          if (transport.sessionId) {
            delete transports[transport.sessionId];
            logger.debug({ sessionId: transport.sessionId }, 'MCP session closed');
          }
        };

        // Connect protocol layer to the new transport
        await hurricaneMcpServer.getMcpServer().connect(transport);
      } else {
        // Invalid request
        reply.code(400).send({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided',
          },
          id: null,
        });
        return;
      }

      // Handle the MCP request through transport
      await transport.handleRequest(request.raw, reply.raw, request.body);
    } catch (error) {
      logger.error({ error }, 'Error handling MCP request');
      if (!reply.sent) {
        reply.code(500).send({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  });

  // Handle GET requests for server-to-client notifications via SSE
  app.get('/mcp', async (request, reply) => {
    const sessionId = request.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      reply.code(400).send('Invalid or missing session ID');
      return;
    }
    
    const transport = transports[sessionId];
    await transport.handleRequest(request.raw, reply.raw);
  });

  // Handle DELETE requests for session termination
  app.delete('/mcp', async (request, reply) => {
    const sessionId = request.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      reply.code(400).send('Invalid or missing session ID');
      return;
    }
    
    const transport = transports[sessionId];
    await transport.handleRequest(request.raw, reply.raw);
  });

  // Health check endpoint
  app.get('/health', async (_, reply) => {
    reply.send({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: VERSION,
      uptime: Date.now() - startTime,
      transport: 'http',
      sessions: Object.keys(transports).length,
      architecture: '3-layer-solid',
      layers: {
        transport: 'server.ts',
        protocol: 'hurricane-mcp-server.ts', 
        business: 'hurricane-service.ts'
      }
    });
  });

  // Start Fastify HTTP server
  const port = config.transport.httpPort || 8080;
  const host = config.transport.httpHost || '0.0.0.0';
  await app.listen({ port, host });
  
  logger.info({ port, transport: 'http' }, 'Hurricane MCP Server HTTP transport listening on Fastify');

  return {
    type: 'http' as const,
    app,
    transports,
    stop: async () => {
      logger.info('Stopping HTTP transport');
      await app.close();
      await hurricaneMcpServer.shutdown();
      logger.info('HTTP transport stopped');
    }
  };
}

/**
 * Setup Graceful Shutdown Handlers
 * Follows SOLID: Single Responsibility - Clean resource management
 */
function setupShutdownHandlers(transport: any) {
  const gracefulShutdown = async (signal: string) => {
    logger.info({ signal }, 'Received shutdown signal');
    
    try {
      await transport.stop();
      
      healthLogger.lifecycle({
        event: 'shutdown',
        component: 'hurricane-tracker-mcp',
      });
      
      logger.info('Hurricane Tracker MCP Server shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Error during graceful shutdown');
      process.exit(1);
    }
  };

  // Handle shutdown signals
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  
  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error({ error }, 'Uncaught exception');
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason, promise }, 'Unhandled promise rejection');
    process.exit(1);
  });
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error({ error }, 'Unhandled error in main');
    process.exit(1);
  });
}

export { main };
