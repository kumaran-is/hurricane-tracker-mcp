# Claude Desktop Configuration for Hurricane Tracker MCP

## Current Configuration

The Hurricane Tracker MCP is now configured to use **HTTP transport** (streamable) instead of stdio transport.

### Configuration Details
- **Transport Type**: HTTP (Streamable)
- **URL**: http://localhost:8080/mcp
- **Port**: 8080
- **Configuration File**: `~/Library/Application Support/Claude/claude_desktop_config.json`

## Prerequisites

1. **Docker must be running** with the Hurricane Tracker container:
   ```bash
   cd /Users/kumaraniyyasamysrinivasan/mydrive/personal/hurricane-tracker-mcp
   docker-compose up -d
   ```

2. **Verify the container is healthy**:
   ```bash
   docker ps | grep hurricane-tracker-mcp
   curl http://localhost:8080/health
   ```

## Configuration in claude_desktop_config.json

```json
{
  "mcpServers": {
    "hurricane-tracker-mcp": {
      "transport": {
        "type": "http",
        "url": "http://localhost:8080/mcp"
      },
      "name": "Hurricane Tracker MCP",
      "description": "Real-time hurricane tracking and historical data analysis via NOAA/NHC APIs"
    }
  }
}
```

## Available Tools

Once connected, Claude Desktop will have access to these 5 hurricane tracking tools:

1. **get_active_storms** - List currently active tropical cyclones worldwide
2. **get_storm_cone** - Get the cone of uncertainty for a specific storm
3. **get_storm_track** - Get historical track data for a specific storm
4. **get_local_hurricane_alerts** - Get hurricane alerts for a specific location
5. **search_historical_tracks** - Search historical hurricane data within an area

## Starting the Service

### Quick Start
```bash
# Navigate to project directory
cd /Users/kumaraniyyasamysrinivasan/mydrive/personal/hurricane-tracker-mcp

# Start the Docker container
docker-compose up -d

# Check status
docker ps
curl http://localhost:8080/health
```

### Stopping the Service
```bash
docker-compose down
```

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

### If MCP doesn't connect:

1. **Check Docker is running**:
   ```bash
   docker ps | grep hurricane-tracker-mcp
   ```

2. **Check the health endpoint**:
   ```bash
   curl http://localhost:8080/health
   ```

3. **Check Docker logs**:
   ```bash
   docker logs hurricane-tracker-mcp
   ```

4. **Rebuild if needed**:
   ```bash
   docker-compose down
   docker-compose up --build -d
   ```

### Common Issues:

- **Port 8080 already in use**: Stop other services using port 8080 or change the port in docker-compose.yml and .env
- **Container keeps restarting**: Check logs with `docker logs hurricane-tracker-mcp`
- **Connection refused**: Ensure Docker Desktop is running and the container is healthy

## Environment Configuration

The service uses environment variables from `.env` file. Key settings:
- `HTTP_PORT=8080` - HTTP server port
- `HTTP_HOST=0.0.0.0` - Listen on all interfaces
- `MCP_TRANSPORT=http` - Use HTTP transport
- `NODE_ENV=production` - Production mode
- `PRETTY_LOGS=false` - Disable pretty logging in production

## Testing the Connection

Once Claude Desktop is restarted, test with these queries:
- "What hurricanes are currently active?"
- "Show me storms in the Atlantic basin"
- "Get alerts for Miami, Florida"
- "Search for hurricanes in the Gulf of Mexico in 2024"

## Notes

- The HTTP transport provides better stability and session management than stdio
- The server maintains persistent sessions for better performance
- All 5 tools are fully functional and return LLM-friendly responses
- Case-insensitive input is supported for storm IDs and basin codes