# System Patterns: Hurricane Tracker MCP

## Architecture Overview

### MCP Server Architecture
```
┌─────────────────────────────────────┐
│             MCP Client              │
│        (Cline, Claude, etc.)        │
└─────────────────┬───────────────────┘
                  │ JSON-RPC 2.0
                  │
┌─────────────────▼───────────────────┐
│            Transport Layer          │
│  ┌─────────────┐ ┌─────────────────┐│
│  │    Stdio    │ │ Streamable HTTP ││
│  │ Transport   │ │   Transport     ││
│  └─────────────┘ └─────────────────┘│
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│           Protocol Handler          │
│    (Lifecycle, Capabilities)       │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│            Tool Handlers            │
│  ┌─────────────────────────────────┐│
│  │      Hurricane Tools            ││
│  │ • get_current_hurricanes        ││
│  │ • track_hurricane               ││
│  │ • get_hurricane_forecast        ││
│  │ • get_hurricane_alerts          ││
│  └─────────────────────────────────┘│
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│           Service Layer             │
│  ┌─────────────────────────────────┐│
│  │      Weather API Client         ││
│  │ • NOAA Hurricane Database       ││
│  │ • National Hurricane Center     ││
│  │ • API rate limiting             ││
│  │ • Data caching                  ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

## Key Design Patterns

### 1. Service-Oriented Architecture
- **WeatherService**: Core service for API integration
- **HurricaneTracker**: Specialized service for hurricane-specific operations
- **CacheManager**: Handles data caching to reduce API calls
- **ErrorHandler**: Centralized error handling and logging

### 2. Transport Abstraction
- **Transport Interface**: Common interface for different transport mechanisms
- **Stdio Transport**: For local AI assistant integration
- **HTTP Transport**: For remote/web-based integrations
- **Environment-based Selection**: Transport chosen via environment variables

### 3. Tool Handler Pattern
```typescript
interface ToolHandler {
  name: string;
  schema: JSONSchema;
  handler: (params: any) => Promise<ToolResponse>;
}
```

### 4. JSON-RPC 2.0 Compliance
- **Request/Response Pattern**: Proper ID matching and error codes
- **Batch Support**: Handle multiple requests in single call
- **Notification Support**: One-way messages without responses
- **Error Standards**: Standard JSON-RPC error codes (-32xxx)

## Component Relationships

### Core Components
1. **MCP Server**: Main entry point and lifecycle management
2. **Transport Manager**: Handles different transport protocols
3. **Tool Registry**: Manages available tools and their schemas
4. **Service Layer**: External API integration and data processing
5. **Configuration Manager**: Environment-based configuration

### Data Flow
```
Client Request → Transport → Protocol Handler → Tool Handler → Service → External API
                                    ↓
Client Response ← Transport ← Protocol Handler ← Tool Response ← Service ← API Response
```

## Critical Implementation Paths

### 1. Initialization Sequence
1. Load environment configuration
2. Initialize transport layer
3. Register tool handlers
4. Start MCP server lifecycle
5. Handle capability negotiation
6. Begin accepting requests

### 2. Request Processing
1. Receive JSON-RPC request via transport
2. Validate request format and ID
3. Route to appropriate tool handler
4. Execute business logic via service layer
5. Format response according to MCP spec
6. Return via same transport channel

### 3. Error Handling Path
1. Catch errors at appropriate level
2. Map to standard JSON-RPC error codes
3. Include helpful error messages
4. Log for debugging and monitoring
5. Ensure graceful degradation

## Scalability Considerations
- **Connection Pooling**: Reuse HTTP connections to weather APIs
- **Response Caching**: Cache hurricane data with appropriate TTL
- **Rate Limiting**: Respect API rate limits with backoff strategies
- **Resource Management**: Proper cleanup of connections and timers
