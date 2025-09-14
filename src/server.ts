/**
 * Hurricane Tracker MCP Server - Main Entry Point
 * Production-grade MCP server with complete protocol compliance
 */

import { config, getConfigSummary } from './config/config.js';
import { logger, healthLogger } from './logger-pino.js';
import { StdioTransport } from './transports/stdio-transport.js';

// =============================================================================
// SERVER STARTUP
// =============================================================================

const startTime = Date.now();

async function main() {
  try {
    // Log startup
    logger.info(
      { 
        config: getConfigSummary(),
        version: '1.0.0',
        nodeVersion: process.version,
        transport: config.transport.type
      }, 
      'Starting Hurricane Tracker MCP Server'
    );

    // Create and start transport
    const transport = new StdioTransport();
    await transport.start();

    const startupTime = Date.now() - startTime;
    
    healthLogger.lifecycle({
      event: 'ready',
      component: 'hurricane-tracker-mcp',
      duration: startupTime,
      version: '1.0.0',
    });

    logger.info(
      { 
        startupTimeMs: startupTime,
        transport: config.transport.type 
      }, 
      'Hurricane Tracker MCP Server ready'
    );

    // Handle graceful shutdown
    process.on('SIGINT', () => shutdown(transport));
    process.on('SIGTERM', () => shutdown(transport));

  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

async function shutdown(transport: StdioTransport) {
  logger.info('Shutting down Hurricane Tracker MCP Server');
  
  try {
    await transport.stop();
    
    healthLogger.lifecycle({
      event: 'shutdown',
      component: 'hurricane-tracker-mcp',
    });
    
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error during shutdown');
    process.exit(1);
  }
}

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error({ error }, 'Unhandled error in main');
    process.exit(1);
  });
}

export { main };
