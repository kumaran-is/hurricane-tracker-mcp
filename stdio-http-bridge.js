#!/usr/bin/env node

/**
 * Stdio to HTTP Bridge for Hurricane Tracker MCP
 * This bridges stdio communication from Claude Desktop to HTTP MCP server
 */

const http = require('http');
const readline = require('readline');

const MCP_HTTP_URL = 'http://localhost:8080/mcp';
let sessionId = null;

// Create readline interface for stdio
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Handle incoming JSON-RPC messages from Claude Desktop
rl.on('line', async (line) => {
  try {
    const request = JSON.parse(line);

    // Forward request to HTTP MCP server
    const response = await forwardToHTTP(request);

    // Send response back to Claude Desktop
    process.stdout.write(JSON.stringify(response) + '\n');
  } catch (error) {
    const errorResponse = {
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: `Bridge error: ${error.message}`
      },
      id: null
    };
    process.stdout.write(JSON.stringify(errorResponse) + '\n');
  }
});

async function forwardToHTTP(request) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(request);

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Content-Length': Buffer.byteLength(body)
    };

    if (sessionId) {
      headers['mcp-session-id'] = sessionId;
    }

    const options = {
      hostname: 'localhost',
      port: 8080,
      path: '/mcp',
      method: 'POST',
      headers
    };

    const req = http.request(options, (res) => {
      let data = '';

      // Capture session ID from response
      if (!sessionId && res.headers['mcp-session-id']) {
        sessionId = res.headers['mcp-session-id'];
      }

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          // Handle SSE format
          const lines = data.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonData = JSON.parse(line.substring(6));
              resolve(jsonData);
              return;
            }
          }
          // Handle regular JSON
          resolve(JSON.parse(data));
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
});

// Log startup
process.stderr.write('Hurricane Tracker MCP stdio-to-HTTP bridge started\n');