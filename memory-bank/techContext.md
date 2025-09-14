# Technical Context: Hurricane Tracker MCP

## Technology Stack

### Core Technologies
- **TypeScript 5.8+**: Strict typing, advanced features, async inference
- **Node.js 22.x**: Latest LTS with enhanced WebSocket diagnostics
- **@modelcontextprotocol/sdk**: Official MCP SDK for TypeScript/Node.js
- **ESM Modules**: Modern ES module system throughout

### MCP Protocol Compliance
- **JSON-RPC 2.0**: Strict adherence to request/response patterns
- **MCP Specification**: Revision 2025-06-18 compliance
- **Transport Protocols**: Stdio (primary) and Streamable HTTP
- **Lifecycle Management**: Initialize → Initialized → Operation → Shutdown

### External APIs
- **NOAA Hurricane Database**: Primary data source for hurricane information
- **National Hurricane Center**: Real-time hurricane tracking and forecasts
- **Weather.gov API**: Additional weather data and alerts

## Development Setup

### Prerequisites
```bash
# Node.js 22.x (via nvm recommended)
nvm install 22
nvm use 22

# Verify versions
node --version  # Should be 22.x
npm --version   # Latest npm
```

### Environment Configuration
```bash
# Required environment variables
NOAA_API_KEY=your_noaa_api_key_here
NHC_API_BASE=https://www.nhc.noaa.gov/api
WEATHER_API_KEY=your_weather_api_key_here

# Optional configuration
MCP_TRANSPORT=stdio  # stdio | http | websocket
HTTP_PORT=3000       # For Streamable HTTP transport
LOG_LEVEL=info       # debug | info | warn | error
CACHE_TTL=300        # Cache time-to-live in seconds
```

### Project Structure
```
hurricane-tracker-mcp/
├── src/
│   ├── index.ts              # Main entry point
│   ├── server.ts             # MCP server implementation
│   ├── transports/           # Transport implementations
│   │   ├── stdio.ts          # Stdio transport
│   │   ├── http.ts           # Streamable HTTP transport
│   │   └── websocket.ts      # Custom WebSocket transport
│   ├── tools/                # Tool implementations
│   │   ├── getCurrentHurricanes.ts
│   │   ├── trackHurricane.ts
│   │   ├── getHurricaneForecast.ts
│   │   └── getHurricaneAlerts.ts
│   ├── services/             # External API integrations
│   │   ├── weatherService.ts
│   │   ├── hurricaneTracker.ts
│   │   └── cacheManager.ts
│   ├── types/                # TypeScript type definitions
│   │   ├── mcp.ts
│   │   ├── weather.ts
│   │   └── hurricane.ts
│   └── utils/                # Utility functions
│       ├── config.ts
│       ├── logger.ts
│       └── errors.ts
├── tests/                    # Test files
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Technical Constraints

### MCP Protocol Requirements
- **Message Format**: All messages must be valid JSON-RPC 2.0
- **Transport Compliance**: Stdio uses newline-delimited JSON on stdin/stdout
- **Capability Negotiation**: Must support tools, logging capabilities minimum
- **Error Handling**: Use standard JSON-RPC error codes (-32xxx range)

### Performance Requirements
- **Response Time**: Tool calls should respond within 2-5 seconds
- **API Rate Limits**: Respect external API rate limiting
- **Memory Usage**: Keep memory footprint reasonable for long-running process
- **Error Recovery**: Graceful handling of network and API failures

### Security Considerations
- **API Key Management**: Store sensitive keys in environment variables
- **Input Validation**: Validate all tool parameters before API calls
- **HTTPS Only**: All external API calls must use HTTPS
- **Origin Validation**: For HTTP transport, validate request origins

## Dependencies

### Production Dependencies
```json
{
  "@modelcontextprotocol/sdk": "^1.0.0",
  "dotenv": "^16.4.0",
  "ws": "^8.18.0"
}
```

### Development Dependencies
```json
{
  "@types/node": "^22.0.0",
  "@types/ws": "^8.5.0",
  "typescript": "^5.8.0",
  "tsx": "^4.0.0",
  "jest": "^29.7.0",
  "@types/jest": "^29.5.0",
  "eslint": "^9.0.0",
  "@typescript-eslint/eslint-plugin": "^8.0.0",
  "@typescript-eslint/parser": "^8.0.0"
}
```

## Tool Usage Patterns

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Node",
    "strict": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### Build and Development Scripts
```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsx --watch src/index.ts",
    "start": "node dist/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src/**/*.ts",
    "type-check": "tsc --noEmit"
  }
}
```

## Integration Patterns

### MCP Client Integration (Cline Example)
```json
{
  "mcpServers": {
    "hurricane-tracker": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "NOAA_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Testing Strategy
- **Unit Tests**: Individual tool and service testing
- **Integration Tests**: MCP protocol compliance testing
- **End-to-End Tests**: Full client-server interaction testing
- **API Mock Testing**: Test without hitting real weather APIs
