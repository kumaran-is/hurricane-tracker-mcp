# Claude Desktop Configuration for Hurricane Tracker MCP

This guide provides instructions for configuring Hurricane Tracker MCP with Claude Desktop using two different transport methods:
1. **Stdio Transport** (Direct Node.js execution - Simple setup)
2. **Streamable HTTP Transport** (Docker container - Production ready)

## 📑 Table of Contents

- [Configuration File Location](#configuration-file-location)
- [Option 1: Stdio Transport (Simplest Setup)](#option-1-stdio-transport-simplest-setup--direct-node-approach)
  - [Overview](#overview)
  - [Prerequisites](#prerequisites)
  - [Configuration](#configuration-in-claude_desktop_configjson)
- [Option 2: Streamable HTTP Transport (Docker-based)](#option-2-streamable-http-transport-docker-based)
  - [Overview](#overview-1)
  - [Prerequisites](#prerequisites-1)
  - [Configuration](#configuration-in-claude_desktop_configjson-1)
  - [Docker Container Management](#docker-container-management)
- [Available Tools](#available-tools)
- [Switching Between Transports](#switching-between-transports)
  - [To Use Stdio Transport](#to-use-stdio-transport)
  - [To Use HTTP Transport](#to-use-http-transport)
- [Restart Claude Desktop](#restart-claude-desktop)
- [Verifying Connection](#verifying-connection)
- [Environment Configuration](#environment-configuration)
  - [Key Environment Variables](#key-environment-variables)
- [Testing the Connection](#testing-the-connection)
  - [Basic Queries](#basic-queries)

## Configuration File Location

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/claude/claude_desktop_config.json`

---

## Option 1: Stdio Transport (Simplest Setup)- Direct node approach 

### Overview
- Runs the MCP server directly via Node.js
- Slightly faster startup, explicit Node version
- No Docker required
- Direct stdio communication with Claude Desktop
- Best for development and testing

### Prerequisites
1. Node.js installed (v22+ recommended)
2. Clone the repo:

   ```bash
   https://github.com/kumaran-is/hurricane-tracker-mcp.git
   npm install
   npm run build
   ```

### Configuration in claude_desktop_config.json

**IMPORTANT**: Use the full path to Node.js v22+ to avoid version conflicts.

```json
 {
    "mcpServers": {
      "hurricane-tracker-mcp": {
        "command": "/path/to/your/.nvm/versions/node/v22.15.0/bin/node",
        "args": [
          "/path/to/your/mydrive/personal/hurricane-tracker-mcp/dist/server.js"
        ],
        "env": {
          "MCP_TRANSPORT": "stdio",
          "NODE_ENV": "production",
          "PRETTY_LOGS": "false",
          "LOG_LEVEL": "info"
        },
        "timeout": 60000
      }
    }
  }
```

**Note**: Replace the Node.js path with your actual Node v22+ installation path. You can find it with: `which node`

## Option 2: Streamable HTTP Transport (Docker-based)

### Overview
- Runs in Docker container
- HTTP-based communication on port 8080
- Better for production deployment
- Supports multiple clients simultaneously

### Prerequisites
1. Docker Desktop installed and running
2. Clone the repo:

   ```bash
   https://github.com/kumaran-is/hurricane-tracker-mcp.git
   npm install
   npm run build
   ```
3. Build and start the container:
cd  /YOURPATH/hurricane-tracker-mcp
   ```bash
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
        "/path/to/your/mydrive/personal/hurricane-tracker-mcp/stdio-http-bridge.js"
      ]
    }
  }
}
```

### Docker Container Management

```bash
docker-compose up --build -d
```

# Check status
```bash
docker ps | grep hurricane-tracker-mcp
```

View logs
```bash
docker logs hurricane-tracker-mcp
```

Stop container
```bash
docker-compose down
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
