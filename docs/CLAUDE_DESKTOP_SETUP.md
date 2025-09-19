# Claude Desktop Configuration for Hurricane Tracker MCP

This guide provides instructions for configuring Hurricane Tracker MCP with Claude Desktop using two different transport methods:
1. **Stdio Transport** (Direct Node.js execution - Simple setup)
2. **Streamable HTTP Transport** (Docker container - Production ready)

## Configuration File Location

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/claude/claude_desktop_config.json`

---

## Option 1: Stdio Transport (Simplest Setup)

### Overview
- Runs the MCP server directly via Node.js
- No Docker required
- Direct stdio communication with Claude Desktop
- Best for development and testing

### Prerequisites
1. Node.js installed (v18+ recommended)
2. Project dependencies installed:
   ```bash
   cd /Users/kumaraniyyasamysrinivasan/mydrive/personal/hurricane-tracker-mcp
   npm install
   npm run build
   ```

### Configuration in claude_desktop_config.json

```json
{
  "mcpServers": {
    "hurricane-tracker-mcp": {
      "command": "node",
      "args": [
        "/Users/kumaraniyyasamysrinivasan/mydrive/personal/hurricane-tracker-mcp/dist/server.js"
      ],
      "env": {
        "MCP_TRANSPORT": "stdio",
        "NODE_ENV": "production",
        "PRETTY_LOGS": "false",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Quick Test
```bash
# Test the stdio server directly
cd /Users/kumaraniyyasamysrinivasan/mydrive/personal/hurricane-tracker-mcp
MCP_TRANSPORT=stdio node dist/server.js
# Type: {"jsonrpc":"2.0","method":"initialize","params":{},"id":1}
# Should return initialization response
```

---

## Option 2: Streamable HTTP Transport (Docker-based)

### Overview
- Runs in Docker container
- HTTP-based communication on port 8080
- Better for production deployment
- Supports multiple clients simultaneously

### Prerequisites
1. Docker Desktop installed and running
2. Build and start the container:
   ```bash
   cd /Users/kumaraniyyasamysrinivasan/mydrive/personal/hurricane-tracker-mcp
   docker-compose up --build -d
   ```

### Configuration in claude_desktop_config.json

Since Claude Desktop expects stdio, we use a bridge script to connect to the HTTP server:

```json
{
  "mcpServers": {
    "hurricane-tracker-mcp": {
      "command": "node",
      "args": [
        "/Users/kumaraniyyasamysrinivasan/mydrive/personal/hurricane-tracker-mcp/stdio-http-bridge.js"
      ]
    }
  }
}
```

### Create the Bridge Script (if not exists)

Create file `stdio-http-bridge.js` in the project root:

```javascript
#!/usr/bin/env node

const http = require('http');
const readline = require('readline');

const MCP_HTTP_URL = 'http://localhost:8080/mcp';
let sessionId = null;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', async (line) => {
  try {
    const request = JSON.parse(line);
    const response = await forwardToHTTP(request);
    process.stdout.write(JSON.stringify(response) + '\n');
  } catch (error) {
    const errorResponse = {
      jsonrpc: '2.0',
      error: { code: -32603, message: error.message },
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

    if (sessionId) headers['mcp-session-id'] = sessionId;

    const req = http.request({
      hostname: 'localhost',
      port: 8080,
      path: '/mcp',
      method: 'POST',
      headers
    }, (res) => {
      let data = '';

      if (!sessionId && res.headers['mcp-session-id']) {
        sessionId = res.headers['mcp-session-id'];
      }

      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const lines = data.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              resolve(JSON.parse(line.substring(6)));
              return;
            }
          }
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

process.stderr.write('Hurricane Tracker MCP stdio-to-HTTP bridge started\n');
```

Make it executable:
```bash
chmod +x stdio-http-bridge.js
```

### Docker Container Management

```bash
# Start container
docker-compose up -d

# Check status
docker ps | grep hurricane-tracker-mcp

# View logs
docker logs hurricane-tracker-mcp

# Stop container
docker-compose down

# Rebuild after changes
docker-compose up --build -d
```

## Available Tools

Once connected, Claude Desktop will have access to these 5 hurricane tracking tools:

1. **get_active_storms** - List currently active tropical cyclones worldwide
2. **get_storm_cone** - Get the cone of uncertainty for a specific storm
3. **get_storm_track** - Get historical track data for a specific storm
4. **get_local_hurricane_alerts** - Get hurricane alerts for a specific location
5. **search_historical_tracks** - Search historical hurricane data within an area

---

## Switching Between Transports

### To Use Stdio Transport
1. Update `claude_desktop_config.json` with stdio configuration
2. Ensure project is built: `npm run build`
3. Restart Claude Desktop

### To Use HTTP Transport
1. Start Docker container: `docker-compose up -d`
2. Update `claude_desktop_config.json` with bridge configuration
3. Restart Claude Desktop

---

## Restart Claude Desktop

After updating the configuration:
1. **Quit Claude Desktop completely** (Cmd+Q on macOS)
2. **Restart Claude Desktop**
3. The Hurricane Tracker MCP should connect automatically

## Verifying Connection

In Claude Desktop, you can verify the MCP is connected by:
1. Opening a new conversation
2. Looking for the MCP indicator showing connected servers
3. Asking Claude to "list active hurricanes" or "get current storms"

## Troubleshooting

### For Stdio Transport Issues

1. **Check Node.js installation**:
   ```bash
   node --version  # Should be v18+
   ```

2. **Verify build**:
   ```bash
   cd /Users/kumaraniyyasamysrinivasan/mydrive/personal/hurricane-tracker-mcp
   npm run build
   ls -la dist/server.js
   ```

3. **Test directly**:
   ```bash
   MCP_TRANSPORT=stdio node dist/server.js
   # Type: {"jsonrpc":"2.0","method":"initialize","params":{},"id":1}
   ```

### For HTTP Transport Issues

1. **Check Docker is running**:
   ```bash
   docker ps | grep hurricane-tracker-mcp
   ```

2. **Check health endpoint**:
   ```bash
   curl http://localhost:8080/health
   ```

3. **Check Docker logs**:
   ```bash
   docker logs hurricane-tracker-mcp --tail 50
   ```

4. **Rebuild if needed**:
   ```bash
   docker-compose down
   docker-compose up --build -d
   ```

### Common Issues

- **"Command not found"**: Use absolute paths in configuration
- **Port 8080 in use**: Change port in docker-compose.yml and .env
- **Container restarting**: Check `docker logs` for errors
- **JSON parse errors**: Verify claude_desktop_config.json syntax
- **MCP not showing**: Restart Claude Desktop completely

## Environment Configuration

### Key Environment Variables

The service uses environment variables from `.env` file:

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_TRANSPORT` | `http` | Transport type: `stdio` or `http` |
| `HTTP_PORT` | `8080` | HTTP server port |
| `HTTP_HOST` | `0.0.0.0` | Listen interface |
| `NODE_ENV` | `production` | Environment mode |
| `PRETTY_LOGS` | `false` | Pretty logging (false in production) |
| `LOG_LEVEL` | `info` | Logging level: debug, info, warn, error |

## Testing the Connection

Once Claude Desktop is restarted, test with these queries:

### Basic Queries
- "What hurricanes are currently active?"
- "Show me storms in the Atlantic basin"
- "Are there any storms near Florida?"

### Advanced Queries
- "Get the forecast cone for storm AL072025"
- "Show track history for Hurricane Milton"
- "Search for major hurricanes in the Gulf of Mexico in 2024"
- "Find all Category 5 storms from last year"

## Comparison: Stdio vs HTTP Transport

| Feature | Stdio Transport | HTTP Transport |
|---------|----------------|----------------|
| **Setup Complexity** | Simple | Requires Docker |
| **Dependencies** | Node.js only | Docker + Node.js |
| **Startup Time** | Fast (~1s) | Slower (~5s) |
| **Resource Usage** | Low | Higher (container) |
| **Multiple Clients** | No | Yes |
| **Session Management** | No | Yes |
| **Production Ready** | Development | Yes |
| **Debugging** | Easy | Via Docker logs |

## Best Practices

1. **For Development**: Use stdio transport for simplicity
2. **For Production**: Use HTTP transport with Docker
3. **For Testing**: Have both configurations ready to switch
4. **Monitor Logs**: Check Claude Desktop logs at `~/Library/Logs/Claude/`
5. **Keep Updated**: Regularly update dependencies and rebuild

## Notes

- All 5 tools are fully functional with both transports
- Case-insensitive input is supported for storm IDs and basin codes
- The server caches API responses for better performance
- LLM-friendly responses with helpful error messages
- Basin codes: AL (Atlantic), EP (Eastern Pacific), WP (Western Pacific), etc.