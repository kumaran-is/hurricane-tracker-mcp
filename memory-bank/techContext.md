# Technical Context: Hurricane Tracker MCP

## Technology Stack

### Core Technologies
- **TypeScript 5.9.2**: Strict typing with zero compilation errors throughout entire codebase
- **Node.js 22.x**: Latest LTS with enhanced WebSocket diagnostics and performance optimizations
- **@modelcontextprotocol/sdk 1.17.5**: Official MCP SDK with Claude Desktop compatibility fixes
- **ESM Modules**: Modern ES module system with .js imports throughout

### MCP Protocol Compliance
- **JSON-RPC 2.0**: Strict adherence with stdout/stderr separation for stdio transport
- **MCP Specification**: Revision 2025-06-18 full compliance with client compatibility
- **Transport Protocols**: 
  - **stdio**: Fixed logging interference, stderr for logs, stdout for JSON-RPC
  - **Fastify HTTP**: High-performance HTTP transport with CORS and session management
- **Lifecycle Management**: Complete initialize → initialized → operation → shutdown flow

### Enterprise Production Stack
- **Fastify 5.6.0**: High-performance HTTP server framework with CORS support
- **Pino 9.9.4**: Structured logging with conditional output (stderr/stdout)
- **Undici 7.16.0**: Modern HTTP client with advanced resilience patterns
- **Zod 3.23.8**: Runtime validation and type safety throughout all layers
- **DOMPurify 3.2.0**: XSS protection and comprehensive input sanitization
- **JSDOM 27.0.0**: Safe HTML processing for security middleware
- **P-Queue 8.0.1**: Advanced queue management for HTTP request handling
- **Rate-Limiter-Flexible 5.0.3**: Enterprise-grade rate limiting with multiple algorithms
- **LRU-Cache 11.2.1**: High-performance caching with TTL support
- **UUID 13.0.0**: Session management and correlation ID generation

### Testing & Development Infrastructure
- **Vitest 3.2.4**: Modern testing framework with multiple configurations
- **@vitest/coverage-v8 3.2.4**: Comprehensive coverage reporting (targeting >90%)
- **Supertest 7.0.0**: HTTP integration testing for Fastify server
- **ESLint 9.35.0**: Code quality enforcement with TypeScript rules
- **TSX 4.20.5**: Fast TypeScript execution for development
- **Pino-Pretty 13.1.1**: Beautiful log formatting for development

### External APIs & Integration
- **NOAA Hurricane Database**: Primary data source for active storm information
- **National Hurricane Center (NHC)**: Real-time hurricane tracking and forecast cones
- **National Weather Service (NWS)**: Location-based hurricane alerts and warnings
- **IBTrACS**: International Best Track Archive for historical hurricane data
- **GeoJSON Support**: Complete geographic data handling for storm tracks and cones

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

### Production Dependencies (Enterprise Stack)
```json
{
  "@fastify/cors": "^11.1.0",
  "@modelcontextprotocol/sdk": "1.17.5",
  "dompurify": "^3.2.0",
  "dotenv": "17.2.2",
  "fastify": "5.6.0",
  "jsdom": "^27.0.0",
  "lru-cache": "11.2.1",
  "p-queue": "8.0.1",
  "pino": "9.9.4",
  "rate-limiter-flexible": "5.0.3",
  "undici": "^7.16.0",
  "uuid": "13.0.0",
  "zod": "3.23.8"
}
```

### Development Dependencies (Comprehensive Tooling)
```json
{
  "@types/dompurify": "^3.2.0",
  "@types/jsdom": "^21.1.7",
  "@types/long": "5.0.0",
  "@types/lru-cache": "7.10.9",
  "@types/node": "22.0.0",
  "@types/uuid": "10.0.0",
  "@typescript-eslint/eslint-plugin": "8.43.0",
  "@typescript-eslint/parser": "8.43.0",
  "@vitest/coverage-v8": "3.2.4",
  "eslint": "9.35.0",
  "pino-pretty": "13.1.1",
  "supertest": "7.0.0",
  "tsx": "4.20.5",
  "typescript": "5.9.2",
  "vitest": "3.2.4"
}
```

## Tool Usage Patterns

### TypeScript Configuration (Production-Grade)
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
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

### Build and Development Scripts (Comprehensive)
```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "tsx src/server.ts", 
    "stdio": "MCP_TRANSPORT=stdio tsx src/server.ts",
    "start:mcp": "MCP_TRANSPORT=stdio tsx src/server.ts",
    "http": "MCP_TRANSPORT=http tsx src/server.ts",
    "test": "vitest run --coverage",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest run --coverage",
    "test:ci": "NODE_OPTIONS='--max-old-space-size=4096' vitest run --coverage --reporter=verbose",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:llm": "vitest run --config vitest.llm.config.ts",
    "lint": "eslint src/**/*.ts --no-warn-ignored",
    "lint:fix": "eslint src/**/*.ts --fix --no-warn-ignored",
    "security:check": "npm audit --audit-level=high",
    "validate": "npm run lint && npm run test && npm run security:check && npm run build",
    "health:check": "curl -f http://localhost:8080/health || exit 1"
  }
}
```

## Integration Patterns

### MCP Client Integration

#### Cline Configuration (Working)
```json
{
  "mcpServers": {
    "hurricane-tracker": {
      "command": "npm",
      "args": ["run", "stdio"],
      "cwd": "/path/to/hurricane-tracker-mcp"
    }
  }
}
```

#### Claude Desktop Configuration (Fixed)
```json
{
  "mcpServers": {
    "hurricane-tracker": {
      "command": "/Users/username/.nvm/versions/node/v22.15.0/bin/node",
      "args": ["dist/server.js"], 
      "cwd": "/path/to/hurricane-tracker-mcp",
      "env": {
        "MCP_TRANSPORT": "stdio"
      },
      "timeout": 60000
    }
  }
}
```

### Testing Strategy (Comprehensive)
- **Unit Tests**: Individual component testing with Vitest
- **Integration Tests**: Layer interaction and MCP protocol compliance  
- **LLM Tests**: AI assistant compatibility and response quality
- **Security Tests**: Input validation, XSS protection, rate limiting
- **Performance Tests**: Load testing and response time validation
- **Coverage Goals**: >90% code coverage with V8 coverage reporting
- **CI/CD Integration**: Automated testing pipeline with multiple configurations
