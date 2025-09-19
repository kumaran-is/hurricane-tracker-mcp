# Cline Configuration for Hurricane Tracker MCP

This guide provides instructions for configuring Hurricane Tracker MCP with Cline (VS Code extension) using multiple transport methods:
1. **Direct Stdio Transport** (Node.js execution)
2. **Docker Stdio Transport** (Container execution)
3. **HTTP Transport** (Streamable HTTP via Docker)

## Configuration File Location

- **macOS/Linux**: `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
- **Windows**: `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`
- **Alternative Location**: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

## Available Tools

All configurations provide access to these 5 hurricane tracking tools:

1. **get_active_storms** - List currently active tropical cyclones worldwide
2. **get_storm_cone** - Get the cone of uncertainty for a specific storm
3. **get_storm_track** - Get historical track data for a specific storm
4. **get_local_hurricane_alerts** - Get hurricane alerts for a specific location
5. **search_historical_tracks** - Search historical hurricane data within an area

---

## Option 1: Direct Stdio Transport (Simplest)

### Overview
- Runs MCP server directly via Node.js
- No Docker required
- Fastest startup time
- Best for development

### Prerequisites
1. Node.js installed (v18+ recommended)
2. Project built:
   ```bash
   cd /Users/kumaraniyyasamysrinivasan/mydrive/personal/hurricane-tracker-mcp
   npm install
   npm run build
   ```

### Configuration in cline_mcp_settings.json

```json
{
  "mcpServers": {
    "hurricane-tracker": {
      "command": "node",
      "args": [
        "/Users/kumaraniyyasamysrinivasan/mydrive/personal/hurricane-tracker-mcp/dist/server.js"
      ],
      "env": {
        "MCP_TRANSPORT": "stdio",
        "NODE_ENV": "production",
        "PRETTY_LOGS": "false",
        "LOG_LEVEL": "info"
      },
      "autoApprove": [
        "get_active_storms",
        "get_storm_cone",
        "get_storm_track",
        "get_local_hurricane_alerts",
        "search_historical_tracks"
      ],
      "disabled": false,
      "timeout": 30000,
      "type": "stdio"
    }
  }
}
```

### Alternative: Using npm script

```json
{
  "mcpServers": {
    "hurricane-tracker": {
      "command": "npm",
      "args": [
        "run",
        "start:mcp"
      ],
      "cwd": "/Users/kumaraniyyasamysrinivasan/mydrive/personal/hurricane-tracker-mcp",
      "env": {
        "MCP_TRANSPORT": "stdio"
      },
      "autoApprove": [
        "get_active_storms",
        "get_storm_cone",
        "get_storm_track",
        "get_local_hurricane_alerts",
        "search_historical_tracks"
      ],
      "disabled": false,
      "timeout": 30000,
      "type": "stdio"
    }
  }
}
```

---

## Option 2: Docker Stdio Transport (Container-based)

### Overview
- Runs MCP server inside Docker container
- Uses Docker exec to communicate via stdio
- Good balance between isolation and simplicity
- Production-ready

### Prerequisites
1. Docker Desktop installed and running
2. Container running:
   ```bash
   cd /Users/kumaraniyyasamysrinivasan/mydrive/personal/hurricane-tracker-mcp
   docker-compose up -d
   ```

### Configuration in cline_mcp_settings.json

```json
{
  "mcpServers": {
    "hurricane-tracker-docker": {
      "command": "docker",
      "args": [
        "exec",
        "-i",
        "-e",
        "MCP_TRANSPORT=stdio",
        "hurricane-tracker-mcp",
        "node",
        "dist/server.js"
      ],
      "autoApprove": [
        "get_active_storms",
        "get_storm_cone",
        "get_storm_track",
        "get_local_hurricane_alerts",
        "search_historical_tracks"
      ],
      "disabled": false,
      "timeout": 30000,
      "type": "stdio"
    }
  }
}
```

### Docker Container Management

```bash
# Start container
cd /Users/kumaraniyyasamysrinivasan/mydrive/personal/hurricane-tracker-mcp
docker-compose up -d

# Verify container is running
docker ps | grep hurricane-tracker-mcp

# Check container logs
docker logs hurricane-tracker-mcp

# Stop container
docker-compose down

# Rebuild container after changes
docker-compose up --build -d
```

---

## Option 3: HTTP Transport (Streamable HTTP)

### Overview
- Runs as HTTP server in Docker container
- Supports multiple concurrent clients
- Best for shared environments
- Most scalable option

### Prerequisites
1. Docker container running with HTTP transport:
   ```bash
   cd /Users/kumaraniyyasamysrinivasan/mydrive/personal/hurricane-tracker-mcp
   docker-compose up -d
   ```

2. Verify HTTP endpoint:
   ```bash
   curl http://localhost:8080/health
   ```

### Configuration in cline_mcp_settings.json

Since Cline expects stdio, we use a bridge script:

```json
{
  "mcpServers": {
    "hurricane-tracker-http": {
      "command": "node",
      "args": [
        "/Users/kumaraniyyasamysrinivasan/mydrive/personal/hurricane-tracker-mcp/stdio-http-bridge.js"
      ],
      "autoApprove": [
        "get_active_storms",
        "get_storm_cone",
        "get_storm_track",
        "get_local_hurricane_alerts",
        "search_historical_tracks"
      ],
      "disabled": false,
      "timeout": 30000,
      "type": "stdio"
    }
  }
}
```

### Create the Bridge Script

Create `stdio-http-bridge.js` in project root if it doesn't exist:

```javascript
#!/usr/bin/env node

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

// Handle incoming JSON-RPC messages from Cline
rl.on('line', async (line) => {
  try {
    const request = JSON.parse(line);
    const response = await forwardToHTTP(request);
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

      // Capture session ID
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
              resolve(JSON.parse(line.substring(6)));
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

// Log startup
process.stderr.write('Hurricane Tracker MCP stdio-to-HTTP bridge started\n');

// Handle graceful shutdown
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
```

Make it executable:
```bash
chmod +x stdio-http-bridge.js
```

---

## Configuration Options Explained

### autoApprove
List of tools that Cline can use without asking for permission each time:
```json
"autoApprove": [
  "get_active_storms",      // Auto-approve listing active storms
  "get_storm_cone",         // Auto-approve forecast cone requests
  "get_storm_track",        // Auto-approve track history requests
  "get_local_hurricane_alerts", // Auto-approve location alerts
  "search_historical_tracks"    // Auto-approve historical searches
]
```

### timeout
Maximum time (in milliseconds) to wait for a response:
```json
"timeout": 30000  // 30 seconds (increase for historical searches)
```

### disabled
Toggle to temporarily disable the MCP server:
```json
"disabled": false  // Set to true to disable without removing config
```

---

## Testing the Configuration

### In VS Code with Cline

1. **Open Cline panel** in VS Code
2. **Check MCP status** - should show "hurricane-tracker" as connected
3. **Test with queries**:
   ```
   @hurricane-tracker What storms are currently active?
   @hurricane-tracker Get alerts for Miami
   @hurricane-tracker Search for storms in Gulf of Mexico 2024
   ```

### Direct Testing

#### Test Stdio Transport
```bash
cd /Users/kumaraniyyasamysrinivasan/mydrive/personal/hurricane-tracker-mcp
echo '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}' | MCP_TRANSPORT=stdio node dist/server.js
```

#### Test Docker Stdio
```bash
echo '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}' | docker exec -i -e MCP_TRANSPORT=stdio hurricane-tracker-mcp node dist/server.js
```

#### Test HTTP Transport
```bash
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}'
```

---

## Troubleshooting

### Common Issues and Solutions

#### MCP Not Showing in Cline
- **Check JSON syntax** in cline_mcp_settings.json
- **Verify paths** are absolute, not relative
- **Restart VS Code** after configuration changes
- **Check Cline logs**: View → Output → Select "Cline"

#### "Command not found" Error
- **For Node.js**: Ensure Node is installed: `which node`
- **For Docker**: Ensure Docker Desktop is running: `docker ps`
- **Use full paths** in configuration

#### Container Not Found (Docker configs)
- **Start container**: `docker-compose up -d`
- **Verify name**: `docker ps` (should show "hurricane-tracker-mcp")
- **Check logs**: `docker logs hurricane-tracker-mcp`

#### Timeout Errors
- **Increase timeout** in configuration (e.g., 60000 for 1 minute)
- **Check network**: Ensure localhost:8080 is accessible
- **Historical searches** may take longer (10-15 seconds)

#### Permission Denied
- **Make scripts executable**: `chmod +x stdio-http-bridge.js`
- **Check file ownership**: `ls -la dist/server.js`

---

## Comparison of Transport Options

| Feature | Direct Stdio | Docker Stdio | HTTP Transport |
|---------|-------------|--------------|----------------|
| **Setup Complexity** | Simple | Medium | Complex |
| **Dependencies** | Node.js only | Docker + Node.js | Docker + Bridge |
| **Startup Time** | ~1 second | ~2 seconds | ~3 seconds |
| **Isolation** | None | Container | Container |
| **Resource Usage** | Low | Medium | Medium-High |
| **Multiple Clients** | No | No | Yes |
| **Best For** | Development | Testing | Production |
| **Debugging** | Easy | Docker logs | HTTP + Docker logs |

---

## Environment Variables

### Key Variables for Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_TRANSPORT` | `stdio` | Transport type: stdio or http |
| `NODE_ENV` | `production` | Environment mode |
| `LOG_LEVEL` | `info` | Logging verbosity |
| `PRETTY_LOGS` | `false` | Pretty printing (dev only) |
| `HTTP_PORT` | `8080` | HTTP server port |
| `REQUEST_TIMEOUT_MS` | `30000` | API request timeout |

### Setting Environment Variables

In configuration:
```json
"env": {
  "MCP_TRANSPORT": "stdio",
  "NODE_ENV": "production",
  "LOG_LEVEL": "debug"  // For troubleshooting
}
```

---

## Best Practices

1. **Development Setup**
   - Use Direct Stdio for fastest iteration
   - Enable debug logging: `"LOG_LEVEL": "debug"`
   - Keep autoApprove list minimal during testing

2. **Production Setup**
   - Use Docker Stdio or HTTP Transport
   - Set appropriate timeouts (30-60 seconds)
   - Auto-approve read-only tools

3. **Security Considerations**
   - Review autoApprove list carefully
   - Use Docker for isolation in shared environments
   - Keep sensitive data out of logs

4. **Performance Tips**
   - Historical searches may take 10-15 seconds
   - API responses are cached for 5 minutes
   - Increase timeout for large area searches

---

## Quick Start Examples

### Minimal Stdio Configuration
```json
{
  "mcpServers": {
    "hurricane": {
      "command": "node",
      "args": ["/path/to/hurricane-tracker-mcp/dist/server.js"],
      "env": {"MCP_TRANSPORT": "stdio"},
      "type": "stdio"
    }
  }
}
```

### Production Docker Configuration
```json
{
  "mcpServers": {
    "hurricane": {
      "command": "docker",
      "args": ["exec", "-i", "-e", "MCP_TRANSPORT=stdio", "hurricane-tracker-mcp", "node", "dist/server.js"],
      "autoApprove": ["get_active_storms", "get_storm_cone", "get_storm_track", "get_local_hurricane_alerts", "search_historical_tracks"],
      "timeout": 30000,
      "type": "stdio"
    }
  }
}
```

---

## Additional Resources

- [Cline Documentation](https://github.com/saoudrizwan/claude-dev)
- [MCP Specification](https://modelcontextprotocol.io)
- [Hurricane Tracker API Docs](../API_DOCUMENTATION.md)
- [VS Code Extension Development](https://code.visualstudio.com/api)

---

## Notes

- All configurations provide access to the same 5 hurricane tracking tools
- Case-insensitive input is supported for storm IDs and basin codes
- Empty results return helpful context messages
- Errors include actionable hints for resolution
- The server follows SOLID architecture principles for maintainability