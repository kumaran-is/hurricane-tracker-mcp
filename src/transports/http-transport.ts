/**
 * Hurricane Tracker MCP Server - HTTP Transport (Streamable HTTP + Fastify)
 * Proper MCP StreamableHTTPServerTransport implementation using Fastify 5.6.0
 */

import Fastify, { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { config } from '../config/config.js';
import { logger } from '../logger-pino.js';
import { hurricaneService } from '../hurricane-service.js';

// =============================================================================
// MCP HTTP TRANSPORT CLASS
// =============================================================================

export class HttpTransport {
  private fastify: FastifyInstance;
  private transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
    this.fastify = Fastify({
      logger: false, // We use our own Pino logger
      disableRequestLogging: true,
      requestTimeout: config.performance.requestTimeoutMs,
      bodyLimit: config.security.maxRequestSizeBytes,
    });

    this.setupRoutes();
  }

  /**
   * Setup MCP StreamableHTTP routes following the SDK specification
   */
  private setupRoutes(): void {
    // CORS support for browser clients
    this.fastify.register(import('@fastify/cors'), {
      origin: config.transport.httpCors?.allowedOrigins || ['http://localhost:3000'],
      exposedHeaders: ['Mcp-Session-Id'],
      allowedHeaders: ['Content-Type', 'mcp-session-id'],
    });

    // Handle POST requests for client-to-server communication
    this.fastify.post('/mcp', async (request, reply) => {
      try {
        // Check for existing session ID
        const sessionId = request.headers['mcp-session-id'] as string | undefined;
        let transport: StreamableHTTPServerTransport;

        if (sessionId && this.transports[sessionId]) {
          // Reuse existing transport
          transport = this.transports[sessionId];
        } else if (!sessionId && isInitializeRequest(request.body)) {
          // New initialization request - create new transport
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sessionId) => {
              // Store the transport by session ID
              this.transports[sessionId] = transport;
              logger.info({ sessionId }, 'MCP session initialized');
            },
            // Disable DNS rebinding protection for local development
            enableDnsRebindingProtection: false,
          });

          // Clean up transport when closed
          transport.onclose = () => {
            if (transport.sessionId) {
              logger.info({ sessionId: transport.sessionId }, 'MCP session closed');
              delete this.transports[transport.sessionId];
            }
          };

          // Create hurricane service and connect to transport
          const mcpServer = await hurricaneService.createMCPServer();
          await mcpServer.connect(transport);
        } else {
          // Invalid request
          return reply.status(400).send({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: 'Bad Request: No valid session ID provided',
            },
            id: null,
          });
        }

        // Handle the MCP request through the transport
        await transport.handleRequest(request.raw, reply.raw, request.body);
      } catch (error) {
        logger.error({ error: (error as Error).message }, 'MCP POST request error');
        return reply.status(500).send({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    });

    // Handle GET requests for server-to-client notifications via MCP StreamableHTTP
    this.fastify.get('/mcp', async (request, reply) => {
      try {
        const sessionId = request.headers['mcp-session-id'] as string | undefined;
        if (!sessionId || !this.transports[sessionId]) {
          return reply.status(400).send('Invalid or missing session ID');
        }

        const transport = this.transports[sessionId];
        await transport.handleRequest(request.raw, reply.raw);
      } catch (error) {
        logger.error({ error: (error as Error).message }, 'MCP GET request error');
        return reply.status(500).send('Internal server error');
      }
    });

    // Handle DELETE requests for session termination
    this.fastify.delete('/mcp', async (request, reply) => {
      try {
        const sessionId = request.headers['mcp-session-id'] as string | undefined;
        if (!sessionId || !this.transports[sessionId]) {
          return reply.status(400).send('Invalid or missing session ID');
        }

        const transport = this.transports[sessionId];
        await transport.handleRequest(request.raw, reply.raw);
      } catch (error) {
        logger.error({ error: (error as Error).message }, 'MCP DELETE request error');
        return reply.status(500).send('Internal server error');
      }
    });

    // Health check endpoint
    this.fastify.get('/health', async (_request, reply) => {
      const uptime = Date.now() - this.startTime;
      return reply.send({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        transport: 'http-streamable',
        activeSessions: Object.keys(this.transports).length,
        uptime,
        services: {
          mcp: 'ready',
          hurricane: 'ready',
          cache: 'ready',
        },
      });
    });

    // Ready check endpoint
    this.fastify.get('/ready', async (_request, reply) => {
      return reply.send({ 
        status: 'ready', 
        timestamp: new Date().toISOString(),
        transport: 'streamable-http'
      });
    });
  }

  /**
   * Start the HTTP server with proper MCP StreamableHTTP support
   */
  async start(): Promise<void> {
    try {
      const port = config.transport.httpPort || config.transport.port || 8080;
      const host = config.transport.httpHost || config.transport.host || 'localhost';

      await this.fastify.listen({ port, host });

      logger.info({
        port,
        host,
        transport: 'streamable-http',
        mcpEndpoint: `/mcp`,
        healthEndpoint: '/health',
      }, 'MCP StreamableHTTP transport started');

    } catch (error) {
      logger.error({ error }, 'Failed to start StreamableHTTP transport');
      throw error;
    }
  }

  /**
   * Stop the HTTP server and cleanup all MCP sessions
   */
  async stop(): Promise<void> {
    try {
      logger.info('Shutting down MCP StreamableHTTP transport');

      // Close all active MCP transports
      const closePromises = Object.values(this.transports).map(transport => 
        transport.close().catch(error => 
          logger.warn({ error: (error as Error).message }, 'Error closing MCP transport')
        )
      );
      
      await Promise.all(closePromises);

      // Close Fastify server
      await this.fastify.close();

      logger.info('MCP StreamableHTTP transport stopped');
    } catch (error) {
      logger.error({ error }, 'Error stopping StreamableHTTP transport');
      throw error;
    }
  }

  /**
   * Get server instance for testing
   */
  getServer(): FastifyInstance {
    return this.fastify;
  }

  /**
   * Get active session count
   */
  getActiveSessionCount(): number {
    return Object.keys(this.transports).length;
  }
}
