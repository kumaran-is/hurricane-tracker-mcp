# Cline Configuration for Hurricane Tracker MCP

This guide provides instructions for configuring Hurricane Tracker MCP with Cline (VS Code extension) using multiple transport methods:
1. **Direct Stdio Transport** (Node.js execution)
2. **Docker Stdio Transport** (Container execution)

**Note**: Cline does not support Streamable HTTP via Docker

## 📑 Table of Contents

- [Available Tools](#available-tools)
- [Option 1: Direct Stdio Transport (Simplest)](#option-1-direct-stdio-transport-simplest)
  - [Overview](#overview)
  - [Alternative: Using npm script](#alternative-using-npm-script)
  - [Prerequisites](#prerequisites)
  - [Configuration in cline_mcp_settings.json](#configuration-in-cline_mcp_settingsjson)
  - [timeout](#timeout)
  - [disabled](#disabled)
- [Option 2: Docker Stdio Transport (Container-based)](#option-2-docker-stdio-transport-container-based)
  - [Overview](#overview-1)
  - [Prerequisites](#prerequisites-1)
  - [Configuration in cline_mcp_settings.json](#configuration-in-cline_mcp_settingsjson-1)

## Available Tools

All configurations provide access to these 5 hurricane tracking tools:

1. **get_active_storms** - List currently active tropical cyclones worldwide
2. **get_storm_cone** - Get the cone of uncertainty for a specific storm
3. **get_storm_track** - Get historical track data for a specific storm
4. **get_local_hurricane_alerts** - Get hurricane alerts for a specific location
5. **search_historical_tracks** - Search historical hurricane data within an area

## Option 1: Direct Stdio Transport (Simplest)

### Overview
- Runs MCP server directly via NPM scripts
- No Docker required
- Fastest startup time
- Best for development

```json
{
  "mcpServers": {
    "hurricane-tracker": {
      "command": "npm",
      "args": [
        "run",
        "stdio"
      ],
      "cwd": "/path/to/your/mydrive/personal/hurricane-tracker-mcp",
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
### Alternative: Using npm script

Build and Runs MCP server directly using Node.js

### Prerequisites
1. Node.js installed (v22+ recommended)
2. Project built:
   ```bash
    cd /YOURPATH/hurricane-tracker-mcp/hurricane-tracker-mcp
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
        "/path/to/your/mydrive/personal/hurricane-tracker-mcp/dist/server.js"
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

## Option 2: Docker Stdio Transport (Container-based)

### Overview
- Runs MCP server inside Docker container
- Uses Docker exec to communicate via stdio
- Only for development and testing 

### Prerequisites
1. Docker Desktop installed and running
2. Container running:
3. cd `/YOUR-PATH/hurricane-tracker-mcp`
   
  ```bash
  docker-compose up --build -d
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
4. Verify container is running
```bash
docker ps | grep hurricane-tracker-mcp
```

5. Check container logs
```bash
docker logs hurricane-tracker-mcp
```

6. Stop container
```bash
docker-compose down
```

