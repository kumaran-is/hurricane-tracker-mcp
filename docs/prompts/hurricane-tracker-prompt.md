# 🚀 Universal MCP Server Scaffold Template v3.0
*The Industry-Standard Template for Creating Production-Ready, LLM-Optimized MCP Servers*

---

## 📝 USER REQUIREMENTS INPUT SECTION
**Hurricane Tracker MCP Server Requirements**

project_name: "hurricane-tracker-mcp"
domain: "Weather & Climate - Tropical Cyclone Tracking"
purpose: "Provide real-time hurricane tracking, forecast cones, local alerts, and historical storm data through MCP tools"
version: "1.0.0"

environment:
  deployment: "Local/Cloud/Hybrid"
  expected_load: "100 requests/second"
  data_sensitivity: "Public"
  compliance: "None"
  context_window: "16K tokens"


use_cases:
  - "List all active tropical cyclones globally with real-time updates"
  - "Fetch forecast cones and uncertainty tracks for specific storms"
  - "Get location-based hurricane alerts and warnings"
  - "Search historical hurricane tracks by area and date range"
  - "Provide visualization-ready GeoJSON data for mapping"

data_sources:
  - name: "NWS Weather API"
    type: "REST"
    baseUrl: "https://api.weather.gov"
    authentication: "None"
    description: "US alerts for hurricanes, tropical storms, and storm surge"
    
  - name: "NHC CurrentStorms"
    type: "REST"
    baseUrl: "https://www.nhc.noaa.gov"
    authentication: "None"
    description: "Active storm list with links to GIS products"
    
  - name: "NHC ArcGIS REST"
    type: "REST"
    baseUrl: "https://mapservices.weather.noaa.gov/tropical/rest/services"
    authentication: "None"
    description: "Cone, forecast points, and track layers in GeoJSON format"
    
  - name: "NOAA IBTrACS"
    type: "REST/File"
    baseUrl: "https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs"
    authentication: "None"
    description: "Global historical hurricane best-track archive"
tools:
  - name: "get_active_storms"
    description: "List all active tropical cyclones with key metadata and links"
    category: "data_retrieval"
    llm_hints: "Use this to get a current snapshot of all active storms globally or filter by basin"
    inputs:
      - name: "basin"
        type: "string"
        required: false
        description: "Filter by basin code: AL (Atlantic), EP (Eastern Pacific), CP (Central Pacific), WP (Western Pacific), SI (South Indian)"
        validation: "enum: ['AL', 'EP', 'CP', 'WP', 'NP', 'SP', 'SI']"
        example: "AL"
    output:
      type: "array"
      schema: "[{id, name, basin, advisoryTime, lat, lon, windKts, pressureMb, status, nhcLinks}]"
      size_estimate: "500-2000 tokens"
      streaming_supported: false
    errors:
      - code: "UPSTREAM_TIMEOUT"
        description: "NHC service timeout"
        user_message: "Unable to fetch active storms due to service timeout"
        recovery_hint: "Try again in a few seconds"
    performance:
      typical_latency_ms: "500"
      timeout_ms: "6000"
      cacheable: true
      cache_ttl_seconds: "120"

  - name: "get_storm_cone"
    description: "Get cone of uncertainty and forecast points for a specific storm"
    category: "data_retrieval"
    llm_hints: "Returns GeoJSON cone showing probable path uncertainty for next 5 days"
    inputs:
      - name: "stormId"
        type: "string"
        required: true
        description: "Storm identifier (e.g., 'AL052024' for Atlantic storm 5 in 2024)"
        validation: "regex: ^[A-Z]{2}[0-9]{6}$"
        example: "AL052024"
    output:
      type: "object"
      schema: "{cone: GeoJSON.Polygon, forecastPoints: [{time, lat, lon, windKts}], metadata: {...}}"
      size_estimate: "2000-5000 tokens"
      streaming_supported: false
    errors:
      - code: "NOT_FOUND"
        description: "Storm ID not found or inactive"
        user_message: "Storm not found or no longer active"
        recovery_hint: "Check storm ID format or use get_active_storms first"
    performance:
      typical_latency_ms: "800"
      timeout_ms: "8000"
      cacheable: true
      cache_ttl_seconds: "120"

  - name: "get_storm_track"
    description: "Get historical track (past positions) for a storm"
    category: "data_retrieval"
    llm_hints: "Returns the storm's path to date as a line with position/intensity points"
    inputs:
      - name: "stormId"
        type: "string"
        required: true
        description: "Storm identifier"
        validation: "regex: ^[A-Z]{2}[0-9]{6}$"
        example: "AL052024"
    output:
      type: "object"
      schema: "{track: GeoJSON.LineString, points: [{time, lat, lon, windKts, pressureMb}]}"
      size_estimate: "1000-3000 tokens"
      streaming_supported: false
    performance:
      typical_latency_ms: "600"
      timeout_ms: "8000"
      cacheable: true
      cache_ttl_seconds: "600"

  - name: "get_local_hurricane_alerts"
    description: "Get active hurricane-related alerts for a specific location"
    category: "data_retrieval"
    llm_hints: "Returns all active NWS alerts including hurricanes, tropical storms, and surge warnings for the given coordinates"
    inputs:
      - name: "lat"
        type: "number"
        required: true
        description: "Latitude in decimal degrees"
        validation: "min: -90, max: 90"
        example: "25.76"
      - name: "lon"
        type: "number"
        required: true
        description: "Longitude in decimal degrees"
        validation: "min: -180, max: 180"
        example: "-80.19"
    output:
      type: "array"
      schema: "[{event, severity, headline, description, instruction, effective, expires, areaPolygon}]"
      size_estimate: "1000-4000 tokens"
      streaming_supported: false
    performance:
      typical_latency_ms: "400"
      timeout_ms: "6000"
      cacheable: true
      cache_ttl_seconds: "60"

  - name: "search_historical_tracks"
    description: "Query historical hurricane tracks by area and date range"
    category: "analysis"
    llm_hints: "Search IBTrACS archive for historical storms in a region. Useful for climate analysis and risk assessment"
    inputs:
      - name: "aoi"
        type: "object"
        required: true
        description: "Area of interest as GeoJSON Polygon"
        validation: "valid GeoJSON Polygon"
        example: "{type: 'Polygon', coordinates: [[[-90,20],[-90,30],[-80,30],[-80,20],[-90,20]]]}"
      - name: "start"
        type: "string"
        required: true
        description: "Start date for search"
        validation: "format: YYYY-MM-DD"
        example: "2020-01-01"
      - name: "end"
        type: "string"
        required: true
        description: "End date for search"
        validation: "format: YYYY-MM-DD"
        example: "2024-12-31"
      - name: "basin"
        type: "string"
        required: false
        description: "Filter by basin code"
        validation: "enum: ['AL', 'EP', 'CP', 'WP', 'NP', 'SP', 'SI']"
    output:
      type: "array"
      schema: "[{stormId, name, year, maxWindKts, minPressureMb, trackSummary, ibtracsLink}]"
      size_estimate: "2000-8000 tokens"
      streaming_supported: true
    performance:
      typical_latency_ms: "2000"
      timeout_ms: "30000"
      cacheable: true

integrations:
  - name: "NHC Services"
    type: "REST"
    baseUrl: "https://www.nhc.noaa.gov"
    authentication: "None"
    rateLimit: "30 requests/minute"
    timeout_ms: "6000"
    retry_policy:
      max_attempts: 2
      backoff_strategy: "exponential"
    circuit_breaker:
      failure_threshold: 5
      reset_timeout_ms: 60000
    fallback: "Return cached data or empty response with appropriate error"

  - name: "NWS API"
    type: "REST"
    baseUrl: "https://api.weather.gov"
    authentication: "None"
    rateLimit: "30 requests/minute"
    timeout_ms: "6000"
    retry_policy:
      max_attempts: 2
      backoff_strategy: "exponential"
    circuit_breaker:
      failure_threshold: 5
      reset_timeout_ms: 60000

  - name: "IBTrACS"
    type: "REST"
    baseUrl: "https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs"
    authentication: "None"
    rateLimit: "10 requests/minute"
    timeout_ms: "30000"
    fallback: "Use cached historical data if available"


**[END OF USER REQUIREMENTS - DO NOT MODIFY BELOW THIS LINE]**

---

## 🏗️ SOLID ARCHITECTURE IMPLEMENTATION

### Perfect 3-Layer SOLID Architecture (Production-Grade Implementation)

The  MCP Server implements exemplary SOLID principles with complete separation of concerns:

```bash
Client (Cline) or AI Agent
    ↓ (MCP Protocol Messages)
server.ts (Transport Layer)
    ↓ (Clean Delegation)
[domainname(example:hurricane)]-mcp-server.ts (Protocol Layer)
    ↓ (Plain Business Requests)
[domainname(example:hurricane)]-service.ts (Business/External API Layer)
    ↓ (HTTP Requests)
External APIs
```

#### **server.ts** - Transport Layer & Application Entry Point
**Role**: Infrastructure Management & Transport Orchestration ✅
- **Primary Responsibilities**:
  - Serves as the main application entry point with command-line argument parsing
  - Manages transport selection and initialization (stdio for local AI assistants, Streamable HTTP for production)
  - Sets up **Fastify HTTP server** with multiple endpoints (/mcp for POST/GET/DELETE, /health for monitoring)
  - Implements session management for HTTP transport with unique session ID tracking
  - Handles graceful shutdown with proper resource cleanup and connection termination
  - Manages process-level error handling (uncaught exceptions, unhandled rejections)
  - Coordinates complete server lifecycle management (startup, health checks, shutdown)
  - **Perfect delegation pattern** - zero business logic, pure infrastructure concerns

**Implemented Features**:
- Dual transport support: stdio (4ms startup) for local development, Streamable HTTP (58ms startup) for production
- Fastify-powered HTTP transport with health monitoring endpoints
- Environment-based transport selection with fallback mechanisms
- Comprehensive error boundary protection
- **Zero protocol concerns** - delegates everything to protocol layer

---

#### **🌐[domainname(example:hurricane)]-mcp-server.ts** - Protocol Layer & MCP Compliance Engine
**Role**: MCP Protocol Implementation & Tool Orchestration ✅
- **Primary Responsibilities**:
  - Implements **complete Model Context Protocol (MCP) specification v2025-06-18**
  - Manages JSON-RPC 2.0 message handling with strict protocol compliance
  - Handles MCP lifecycle events (initialize, initialized, shutdown) with proper capability negotiation
  - **Registers all tools** with JSON Schema validation (not Zod objects)
  - Processes incoming tool calls and routes them to appropriate business layer methods
  - Implements protocol-level input validation and MCP-compliant error responses
  - Provides correlation ID tracking for distributed request tracing
  - Acts as the **pure protocol adapter** between MCP clients and business logic
  - **Perfect separation** - zero business logic, pure protocol concerns

**Implemented Features**:
- **JSON Schema format** for tool registration (corrected from Zod objects)
- All tools
- Protocol-level validation with detailed error messages and recovery hints
- Performance logging with correlation tracking for all tool executions
- **Clean delegation pattern** - calls business layer and formats responses for MCP compliance
- **Zero business concerns** - pure protocol implementation

---

#### **⚡ [domainname(example:hurricane)]-service.ts** - Business Layer & Domain Logic Engine
**Role**: Business and Domain Logic & External API Integration ✅
- **Primary Responsibilities**:
  - Encapsulates **pure business logic** without any protocol contamination
  - **Returns plain domain objects**: for all the tools
  - Manages integration with external APIs 
  - Implements comprehensive input validation using Zod schemas
  - Handles data processing, transformation, and response optimization
  - Provides intelligent caching strategies with TTL management
  - Implements resilience patterns (circuit breaker, retry logic, timeout management)
  - Manages correlation IDs for request tracing and performance monitoring
  - **Zero protocol concerns** - pure business domain focus

**Implemented Features**:
- **5 business methods** returning clean domain objects (no MCP `ToolResponse` types)
- Real-time data processing with mock implementations ready for API integration
- Comprehensive error handling with domain-specific exceptions (`NotFoundError`, `ValidationError`)
- Performance logging for all business operations
- **Perfect encapsulation** - protocol layer formats business objects into MCP responses
- **Zero transport/protocol concerns** - pure business and domain logic

---

### **🎯 SOLID Principles Compliance (Perfect Implementation)**

**✅ Single Responsibility Principle**:
- `server.ts`: Only handles transport and infrastructure
- `[domainname(example:hurricane)]-mcp-server.ts`: Only handles MCP protocol compliance
- `[domainname(example:hurricane)]-service.ts`: Only handles domain business logic

**✅ Open/Closed Principle**:
- Easy to add new tools without modifying existing code
- New transports can be added without changing protocol or business layers
- Business logic can be extended without affecting protocol implementation

**✅ Liskov Substitution Principle**:
- Any transport implementation can replace another
- Business layer can be completely replaced while maintaining protocol compatibility
- Protocol layer can evolve independently of business logic

**✅ Interface Segregation Principle**:
- Clean interfaces between all layers with minimal dependencies
- Business layer exposes only necessary methods to protocol layer
- Transport layer only needs to know about protocol message handling

**✅ Dependency Inversion Principle**:
- Protocol layer depends on business abstractions, not concrete implementations
- Transport layer depends on protocol abstractions
- High-level modules (protocol) don't depend on low-level modules (transport)

### **🔄 Perfect Request Flow (Zero Coupling)**

```
1. Client (Cline) sends MCP tool call
   ↓ (JSON-RPC 2.0 Message)
2. server.ts receives and delegates to protocol layer
   ↓ (Raw MCP Message)
3. [domainname(example:hurricane)]-mcp-server.ts validates and extracts business request
   ↓ (Plain Parameters: {stormId: "AL052024"})
4. [domainname(example:hurricane)]-service.ts processes business logic
   ↓ (Domain Object: StormCone)
5. [domainname(example:hurricane)]-mcp-server.ts formats domain object into MCP response
   ↓ (MCP ToolResponse)
6. server.ts transmits response to client
```

### **📊 Architecture Quality Metrics (Production-Grade)**

- **SOLID Compliance**: 100% - Perfect separation of concerns
- **Zero TypeScript Errors**: ✅ All layers compile cleanly
- **Layer Coupling**: 0% - No cross-layer contamination
- **Business Logic Purity**: 100% - Zero protocol concerns in business layer
- **Protocol Compliance**: 100% - Full MCP v2025-06-18 implementation
- **Error Handling**: Comprehensive with LLM-friendly messages at every layer
- **Performance**: Sub-second response times with correlation tracking

### **🏆 Architectural Excellence Achieved**

This implementation represents the **gold standard** for MCP server architecture:

1. **Perfect Layer Separation**: Each layer has exactly one responsibility
2. **Zero Business Logic Leakage**: Protocol concerns never contaminate business logic
3. **Protocol Purity**: MCP compliance handled exclusively in protocol layer
4. **Transport Independence**: Business logic completely independent of transport mechanism
5. **Type Safety**: Strict TypeScript typing throughout with zero `any` usage
6. **Error Excellence**: Comprehensive error handling with recovery hints at every layer
7. **Performance Optimization**: Correlation tracking and performance monitoring throughout
8. **Production Readiness**: Health checks, graceful shutdown, and monitoring capabilities

This architecture ensures **maximum maintainability, testability, and extensibility** while providing **perfect SOLID compliance** and **production-grade reliability**.

---

## �🎯 PROMPT INSTRUCTIONS FOR LLM

**You are an elite MCP (Model Context Protocol) server architect with perfect implementation skills. Your mission is to scaffold a COMPLETE, PRODUCTION-READY, LLM-OPTIMIZED MCP server with 100% accuracy based on the user requirements below.**

### ⚡ CRITICAL SUCCESS CRITERIA
1. **ZERO GAPS POLICY**: Every file, function, interface, and configuration must be complete, functional, and production-ready
2. **LLM OPTIMIZATION**: All tools must be designed for optimal LLM interaction with clear naming, focused functionality, and structured outputs
3. **FULL MCP COMPLIANCE**: Implement complete MCP specification including JSON-RPC 2.0, supported transports (stdio, HTTP Streamable), and all protocol messages
4. **REFERENCE ARCHITECTURE COMPLIANCE**: Follow the exact patterns from the mcp-weather-server reference implementation. Ask for user teh path for reference implementation
5. **TYPE SAFETY ENFORCEMENT**: All TypeScript code must use strict typing with zero `any` types (except where absolutely necessary)
6. **ERROR HANDLING EXCELLENCE**: Implement comprehensive error boundaries with meaningful, LLM-friendly messages and recovery strategies
7. **TEST COVERAGE MANDATE**: Provide complete .spec.ts files achieving >90% coverage including LLM interaction simulations
8. **PRODUCTION READINESS**: Include Docker, CI/CD, health checks, monitoring, logging, security hardening, and documentation
9. **SEQUENTIAL THINKING**: Apply step-by-step analysis during requirement parsing and implementation planning
10. **CONTEXT7 INTEGRATION**: **MANDATORY** - Use Context7 MCP for all framework/library API references and code samples

### 🏗️ ARCHITECTURAL PRINCIPLES
- **Module System**: ES Modules with "type": "module" and .js extensions in all imports
- **Protocol Compliance**: Full MCP specification with JSON-RPC 2.0 message format
- **Tool Design**: Single-purpose, clearly named tools with predictable outputs
- **Context Awareness**: Response size management for LLM context windows
- **Resilience First**: Complete implementation of Circuit Breaker, Retry, Rate Limiting, and Bulkhead patterns
- **Validation Everywhere**: Zod schemas for ALL inputs, configurations, and API responses with sanitization
- **Structured Logging**: Pino logger with correlation IDs, performance metrics, audit trails, and trace context
- **Transport Flexibility**: Support stdio (local) and modern HTTP/Streamable (production) transports
- **Graceful Operations**: Proper startup checks, health monitoring, and shutdown procedures
- **Security by Design**: Input sanitization, rate limiting per client, API key management, no sensitive data in errors

---

## 📋 USER REQUIREMENTS SECTION

### Project Identification
**Project Name**: `[REQUIRED: Your project name in kebab-case]`  
**Domain**: `[REQUIRED: Your domain/industry (e.g., Finance, Healthcare, IoT)]`  
**MCP Server Purpose**: `[REQUIRED: Clear description of what this server does]`  
**Version**: `1.0.0` (default, can be customized)

### Target Environment
**Deployment Target**: `[REQUIRED: Local/Cloud/Hybrid]`  
**Expected Load**: `[REQUIRED: Requests per second]`  
**Data Sensitivity**: `[REQUIRED: Public/Internal/Confidential]`  
**Compliance Requirements**: `[OPTIONAL: GDPR/HIPAA/SOC2/etc.]`
**LLM Context Limits**: `[REQUIRED: Target context window size (e.g., 4K, 16K, 100K tokens)]`

### Core Functionality
**Primary Use Cases**: 
```
[REQUIRED: List 3-5 specific use cases]
1. [Use case 1: e.g., Retrieve real-time sensor data]
2. [Use case 2: e.g., Process and analyze data streams]
3. [Use case 3: e.g., Generate insights and alerts]
```

**Data Sources**:
```
[REQUIRED: List your data sources]
- [Source 1: API/Database/File/Stream]
- [Source 2: Description and access method]
- [Source 3: Authentication requirements]
```

### MCP Tools Specification (LLM-Optimized Design)
```yaml
# [REQUIRED: Define 3-8 MCP tools following single-purpose principle]
tools:
  - name: "[tool_name_1]" # snake_case, action-oriented (e.g., get_weather, analyze_data)
    description: "[What this tool does, when to use it, and what it returns]"
    category: "[data_retrieval|data_processing|analysis|action]"
    llm_hints: "[Additional context for LLM on best usage patterns]"
    inputs:
      - name: "[param1]"
        type: "string|number|boolean|object|array"
        required: true|false
        description: "[Clear parameter description with examples]"
        validation: "[Validation rules]"
        example: "[Concrete example value]"
        constraints: "[Min/max values, regex patterns, enum values]"
    output:
      type: "[Response type]"
      schema: "[Response structure]"
      size_estimate: "[Typical response size in tokens]"
      streaming_supported: true|false
    errors:
      - code: "[ERROR_CODE]"
        description: "[When this error occurs]"
        user_message: "[LLM-friendly error message]"
        recovery_hint: "[How to fix or work around this error]"
    performance:
      typical_latency_ms: "[Expected response time]"
      timeout_ms: "[Maximum wait time]"
      cacheable: true|false
      cache_ttl_seconds: "[Cache duration if applicable]"

  # Add more tools following the same structure
```

### Integration Requirements
```yaml
# [REQUIRED: External services and APIs]
integrations:
  - name: "[Service name]"
    type: "REST|GraphQL|WebSocket|gRPC"
    baseUrl: "[API endpoint]"
    authentication: "API_KEY|OAuth2|Basic|None"
    rateLimit: "[Requests per minute]"
    timeout_ms: "[Connection and request timeouts]"
    retry_policy:
      max_attempts: 3
      backoff_strategy: "exponential|linear"
    circuit_breaker:
      failure_threshold: 5
      reset_timeout_ms: 60000
    fallback: "[Backup service or strategy]"
```

### Performance Requirements
```yaml
# [REQUIRED: Performance targets]
performance:
  responseTime: 
    p50: "[ms]"
    p95: "[ms]"
    p99: "[ms]"
  throughput: "[requests/second]"
  concurrency: "[max concurrent operations]"
  caching:
    strategy: "LRU|TTL|Hybrid"
    ttl: "[seconds]"
    maxSize: "[entries]"
    warmup_on_start: true|false
  pagination:
    default_page_size: "[items]"
    max_page_size: "[items]"
  streaming:
    chunk_size: "[bytes]"
    backpressure_threshold: "[bytes]"
```

### Security Requirements
```yaml
# [REQUIRED: Security configuration]
security:
  input_validation:
    max_request_size: "[bytes]"
    sanitize_html: true|false
    sql_injection_protection: true
  rate_limiting:
    strategy: "sliding_window|fixed_window|token_bucket"
    per_client_limit: "[requests per minute]"
    global_limit: "[total requests per minute]"
  authentication:
    required: true|false
    methods: ["api_key", "jwt", "oauth2"]
  audit_logging:
    enabled: true
    include_request_body: false
    include_response_body: false
```

---

## 🔧 TECHNICAL IMPLEMENTATION SPECIFICATIONS

### Dependency Management (EXACT VERSIONS - DO NOT MODIFY)

#### Core Dependencies
```json
{
  "@modelcontextprotocol/sdk": "~1.17.5",
  "dotenv": "~17.2.2",
  "fastify": "~5.6.0",
  "lru-cache": "~11.2.1",
  "pino": "~9.9.4",
  "undici": "~7.16.0",
  "uuid": "~13.0.0",
  "zod": "^3.23.8",
  "dompurify": "~3.2.0",
  "rate-limiter-flexible": "~5.0.3",
  "p-queue": "~8.0.1"
}
```

#### Development Dependencies
```json
{
  "@types/long": "~5.0.0",
  "@types/lru-cache": "~7.10.9",
  "@types/node": "~22.0.0",
  "@types/uuid": "~10.0.0",
  "@types/dompurify": "~3.2.0",
  "@typescript-eslint/eslint-plugin": "~8.43.0",
  "@typescript-eslint/parser": "~8.43.0",
  "@vitest/coverage-v8": "~3.2.4",
  "eslint": "~9.35.0",
  "pino-pretty": "~13.1.1",
  "tsx": "~4.20.5",
  "typescript": "~5.9.2",
  "vitest": "~3.2.4",
  "supertest": "~7.0.0"
}
```

### Package.json Configuration (MANDATORY)
```json
{
  "name": "[your-project-name]",
  "version": "1.0.0",
  "description": "[Your MCP server description]",
  "type": "module",
  "main": "dist/server.js",
  "engines": { 
    "node": ">=22.0.0" 
  },
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "tsx src/server.ts",
    "stdio": "MCP_TRANSPORT=stdio tsx src/server.ts",
    "http": "MCP_TRANSPORT=http tsx src/server.ts",
    "sse": "MCP_TRANSPORT=sse tsx src/server.ts",
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

### TypeScript Configuration (EXACT - NO MODIFICATIONS)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "isolatedModules": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "allowUnreachableCode": false,
    "allowUnusedLabels": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
```

### Project Structure (REFERENCE ARCHITECTURE)
```
[your-project-name]/
├── .env.example                    # Environment template
├── .env.production.example         # Production env template
├── .gitignore                      # Git ignore rules
├── .dockerignore                   # Docker ignore rules
├── docker-compose.yml              # Development Docker setup
├── docker-compose.prod.yml         # Production Docker setup
├── Dockerfile                      # Multi-stage Docker build
├── eslint.config.js               # ESLint flat config
├── package.json                    # Project manifest
├── tsconfig.json                   # TypeScript config
├── vitest.config.ts               # Unit test configuration
├── vitest.integration.config.ts   # Integration test config
├── vitest.llm.config.ts           # LLM interaction test config
├── README.md                       # Project documentation
├── CHANGELOG.md                    # Version history
├── SECURITY.md                     # Security policies
├── .github/
│   └── workflows/
│       ├── ci.yml                  # CI pipeline
│       ├── security.yml            # Security scanning
│       └── release.yml             # Release automation
├── docs/
│   ├── API.md                      # API documentation
│   ├── DEPLOYMENT.md               # Deployment guide
│   ├── DEVELOPMENT.md              # Development guide
│   ├── TROUBLESHOOTING.md          # Common issues
│   └── LLM_INTEGRATION.md          # LLM usage guide
└── src/
    ├── server.ts                   # Entry point
    ├── mcp-server.ts              # MCP implementation
    ├── [domain]-service.ts         # Domain logic
    ├── logger-pino.ts             # Logging setup
    ├── types.ts                    # TypeScript types
    ├── cache/
    │   ├── cache-manager.ts        # Cache orchestration
    │   ├── [domain]-cache.ts       # Domain caching
    │   └── cache-warmup.ts         # Cache preloading
    ├── config/
    │   ├── config.ts              # Configuration loader
    │   ├── validation.ts          # Config validation
    │   └── security-config.ts     # Security settings
    ├── context/
    │   ├── context-manager.ts     # LLM context management
    │   ├── pagination.ts          # Result pagination
    │   └── streaming.ts           # Streaming responses
    ├── errors/
    │   ├── base-errors.ts         # Base error classes
    │   ├── [domain]-errors.ts     # Domain errors
    │   └── error-codes.ts         # Error code registry
    ├── middleware/
    │   ├── validation.ts          # Request validation
    │   ├── sanitization.ts        # Input sanitization
    │   ├── auth.ts               # Authentication
    │   ├── rate-limit.ts         # Rate limiting
    │   └── audit.ts              # Audit logging
    ├── monitoring/
    │   ├── metrics.ts             # Metrics collection
    │   ├── health-check.ts        # Health endpoints
    │   ├── tracing.ts            # Distributed tracing
    │   └── alerts.ts             # Alert management
    ├── protocol/
    │   ├── json-rpc.ts           # JSON-RPC 2.0 impl
    │   ├── message-handler.ts    # Protocol messages
    │   └── schema-validator.ts   # Protocol validation
    ├── security/
    │   ├── input-validator.ts    # Security validation
    │   ├── api-key-manager.ts    # API key handling
    │   └── sanitizer.ts          # Data sanitization
    ├── transports/
    │   ├── stdio-transport.ts     # Standard I/O
    │   ├── http-transport.ts      # HTTP/Fastify
    │   ├── sse-transport.ts       # Server-Sent Events
    │   └── transport-factory.ts   # Transport selection
    ├── undici-resilience/         # HTTP resilience layer
    │   ├── index.ts
    │   ├── config/
    │   │   └── pool-config.ts
    │   ├── http/
    │   │   ├── pool-manager.ts
    │   │   └── connection-monitor.ts
    │   ├── monitoring/
    │   │   └── metrics.ts
    │   ├── resilience/
    │   │   ├── circuit-breaker.ts
    │   │   ├── rate-limiter.ts
    │   │   ├── retry-strategy.ts
    │   │   ├── bulkhead.ts
    │   │   └── timeout-manager.ts
    │   └── streaming/
    │       ├── backpressure-handler.ts
    │       └── streaming-metrics.ts
    └── utils/
        ├── version.ts             # Version utilities
        ├── helpers.ts             # Helper functions
        └── llm-helpers.ts         # LLM-specific utils
```

## 🛠️ IMPLEMENTATION PATTERNS

### Tool Implementation Pattern (LLM-Optimized)
```typescript
// EVERY TOOL MUST FOLLOW THIS LLM-OPTIMIZED PATTERN
interface LLMOptimizedToolDefinition {
  name: string;
  description: string;
  llmHints: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
    additionalProperties: false; // Strict validation
  };
  outputSchema: {
    type: 'object';
    properties: Record<string, any>;
  };
  contextSizeEstimate: number; // Expected tokens
}

// Tool Handler Implementation with LLM Optimization
class [Domain]Service {
  async handle[ToolName](args: z.infer<typeof [ToolName]Schema>): Promise<ToolResponse> {
    const startTime = Date.now();
    const correlationId = uuid();
    
    try {
      // 1. Validate and sanitize input
      const validated = [ToolName]Schema.parse(args);
      const sanitized = this.sanitizeInput(validated);
      
      // 2. Check request size for context limits
      if (this.estimateTokens(sanitized) > this.config.maxInputTokens) {
        throw new ValidationError('Input exceeds context limit', 'input_size', sanitized);
      }
      
      // 3. Check cache with context awareness
      const cacheKey = this.getCacheKey(sanitized);
      const cached = await this.cache.get(cacheKey);
      if (cached && this.isCacheValid(cached)) {
        logger.debug('Cache hit', { 
          tool: '[tool_name]', 
          correlationId,
          cacheAge: Date.now() - cached.timestamp 
        });
        return this.formatForLLM(cached.data);
      }
      
      // 4. Execute with resilience and timeouts
      const result = await this.executeWithResilience(async () => {
        return await this.callExternalAPI(sanitized, {
          timeout: this.config.timeouts.[tool_name],
          retries: this.config.retries.[tool_name]
        });
      }, correlationId);
      
      // 5. Transform and paginate if needed
      const transformed = this.transformResponse(result);
      const paginated = this.paginateIfNeeded(transformed, args.pageSize);
      
      // 6. Check response size and summarize if needed
      const finalResponse = this.optimizeForContext(paginated, args.summaryOnly);
      
      // 7. Cache with TTL
      await this.cache.set(cacheKey, {
        data: finalResponse,
        timestamp: Date.now()
      }, this.getCacheTTL());
      
      // 8. Audit log (no sensitive data)
      await this.auditLogger.log({
        tool: '[tool_name]',
        correlationId,
        userId: this.context.userId,
        success: true,
        duration: Date.now() - startTime,
        inputSize: this.estimateTokens(sanitized),
        outputSize: this.estimateTokens(finalResponse)
      });
      
      return finalResponse;
      
    } catch (error) {
      // 9. LLM-friendly error handling
      const structuredError = this.handleError(error, correlationId);
      
      await this.auditLogger.log({
        tool: '[tool_name]',
        correlationId,
        userId: this.context.userId,
        success: false,
        error: structuredError.code,
        duration: Date.now() - startTime
      });
      
      throw new MCPError({
        code: structuredError.code,
        message: structuredError.userMessage,
        details: {
          tool: '[tool_name]',
          hint: structuredError.recoveryHint,
          correlationId
        }
      });
    }
  }
  
  // Helper methods for LLM optimization
  private formatForLLM(data: any): ToolResponse {
    return {
      success: true,
      data: this.structureData(data),
      metadata: {
        timestamp: new Date().toISOString(),
        hasMore: this.hasMoreData(data),
        nextCursor: this.getNextCursor(data)
      }
    };
  }
  
  private optimizeForContext(data: any, summaryOnly: boolean): any {
    const tokenEstimate = this.estimateTokens(data);
    
    if (summaryOnly || tokenEstimate > this.config.maxOutputTokens) {
      return this.summarizeData(data);
    }
    
    return data;
  }
}
```

### Protocol Implementation Pattern
```typescript
// Full MCP Protocol Implementation
export class MCPProtocolHandler {
  private jsonRpc: JSONRPCHandler;
  private messageValidator: MessageValidator;
  
  async handleMessage(message: any): Promise<any> {
    // Validate JSON-RPC 2.0 format
    const validated = await this.messageValidator.validate(message);
    
    switch (validated.method) {
      case 'initialize':
        return this.handleInitialize(validated);
      case 'initialized':
        return this.handleInitialized(validated);
      case 'tools/list':
        return this.handleToolsList(validated);
      case 'tools/call':
        return this.handleToolsCall(validated);
      case 'resources/list':
        return this.handleResourcesList(validated);
      case 'resources/read':
        return this.handleResourcesRead(validated);
      case 'notifications/progress':
        return this.handleProgress(validated);
      case 'shutdown':
        return this.handleShutdown(validated);
      default:
        throw new MethodNotFoundError(validated.method);
    }
  }
  
  private async handleToolsCall(message: any): Promise<any> {
    const { toolName, arguments: args } = message.params;
    
    // Route to appropriate handler with context
    const context = {
      requestId: message.id,
      clientId: this.getClientId(message),
      sessionId: this.getSessionId(message)
    };
    
    const result = await this.toolRouter.route(toolName, args, context);
    
    return this.jsonRpc.success(message.id, result);
  }
}
```

### Configuration Pattern (Enhanced)
```typescript
// Zod-based configuration with LLM and security settings
const envSchema = z.object({
  // Server configuration
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MCP_TRANSPORT: z.enum(['stdio', 'http', 'sse']).default('stdio'),
  
  // Your domain-specific configuration
  [YOUR_API_KEY]: z.string().min(32).regex(/^[a-zA-Z0-9_-]+$/),
  [YOUR_API_URL]: z.string().url().default('https://api.example.com'),
  
  // LLM optimization settings
  MAX_INPUT_TOKENS: z.coerce.number().min(100).max(100000).default(4000),
  MAX_OUTPUT_TOKENS: z.coerce.number().min(100).max(100000).default(4000),
  DEFAULT_PAGE_SIZE: z.coerce.number().min(10).max(1000).default(100),
  ENABLE_RESPONSE_STREAMING: z.coerce.boolean().default(true),
  
  // Performance configuration
  CACHE_TTL: z.coerce.number().min(60).max(3600).default(600),
  MAX_RETRIES: z.coerce.number().min(0).max(5).default(3),
  REQUEST_TIMEOUT_MS: z.coerce.number().min(1000).max(300000).default(30000),
  
  // Security settings
  RATE_LIMIT_PER_CLIENT: z.coerce.number().min(1).max(10000).default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().min(1000).max(3600000).default(60000),
  MAX_REQUEST_SIZE_BYTES: z.coerce.number().min(1024).max(10485760).default(1048576),
  ENABLE_AUDIT_LOGGING: z.coerce.boolean().default(true),
  
  // Feature flags
  ENABLE_METRICS: z.coerce.boolean().default(true),
  ENABLE_CACHE: z.coerce.boolean().default(true),
  ENABLE_TRACING: z.coerce.boolean().default(true),
});

// Parse and validate at startup
export const config = envSchema.parse(process.env);
```

### Error Handling Pattern (LLM-Friendly)
```typescript
// LLM-optimized error hierarchy
export class MCPError extends Error {
  constructor(
    public readonly options: {
      code: string;
      message: string;
      statusCode?: number;
      details?: Record<string, any>;
      userMessage?: string;
      recoveryHint?: string;
    }
  ) {
    super(options.message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
  
  toJSON() {
    return {
      error: {
        code: this.options.code,
        message: this.options.userMessage || this.options.message,
        hint: this.options.recoveryHint,
        details: this.options.details,
        timestamp: new Date().toISOString()
      }
    };
  }
  
  toJSONRPC(id: string | number) {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: this.getJSONRPCCode(),
        message: this.options.userMessage || this.options.message,
        data: {
          hint: this.options.recoveryHint,
          details: this.options.details
        }
      }
    };
  }
  
  private getJSONRPCCode(): number {
    // Map to standard JSON-RPC error codes
    const codeMap: Record<string, number> = {
      'PARSE_ERROR': -32700,
      'INVALID_REQUEST': -32600,
      'METHOD_NOT_FOUND': -32601,
      'INVALID_PARAMS': -32602,
      'INTERNAL_ERROR': -32603,
    };
    
    return codeMap[this.options.code] || -32000; // Server error
  }
}

// Specific LLM-friendly error types
export class ValidationError extends MCPError {
  constructor(message: string, field?: string, value?: any) {
    super({
      code: 'VALIDATION_ERROR',
      message: `Validation failed: ${message}`,
      statusCode: 400,
      userMessage: `Invalid input: ${message}`,
      recoveryHint: `Please check the '${field}' parameter and ensure it meets the requirements`,
      details: { field, providedValue: value }
    });
  }
}

export class ContextLimitError extends MCPError {
  constructor(currentSize: number, maxSize: number) {
    super({
      code: 'CONTEXT_LIMIT_EXCEEDED',
      message: `Response size (${currentSize} tokens) exceeds limit (${maxSize} tokens)`,
      statusCode: 413,
      userMessage: 'Response too large for context window',
      recoveryHint: 'Try using pagination, filtering, or the summary option to reduce response size',
      details: { currentSize, maxSize }
    });
  }
}

export class RateLimitError extends MCPError {
  constructor(limit: number, window: number, retryAfter: number) {
    super({
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Rate limit exceeded: ${limit} requests per ${window}ms`,
      statusCode: 429,
      userMessage: 'Too many requests',
      recoveryHint: `Please wait ${retryAfter}ms before retrying`,
      details: { limit, window, retryAfter }
    });
  }
}
```

### Security Implementation Pattern
```typescript
// Input sanitization and validation
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

export class SecurityManager {
  private window: any;
  private sanitizer: any;
  
  constructor() {
    const dom = new JSDOM('');
    this.window = dom.window;
    this.sanitizer = DOMPurify(this.window);
  }
  
  sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      // Remove potential XSS
      const sanitized = this.sanitizer.sanitize(input, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: []
      });
      
      // SQL injection protection
      return this.escapeSql(sanitized);
    }
    
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }
    
    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[this.sanitizeInput(key)] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    
    return input;
  }
  
  private escapeSql(str: string): string {
    return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
      switch (char) {
        case "\0": return "\\0";
        case "\x08": return "\\b";
        case "\x09": return "\\t";
        case "\x1a": return "\\z";
        case "\n": return "\\n";
        case "\r": return "\\r";
        case "\"":
        case "'":
        case "\\":
        case "%":
          return "\\" + char;
        default:
          return char;
      }
    });
  }
  
  validateApiKey(key: string): boolean {
    // Validate format
    if (!/^[a-zA-Z0-9_-]{32,}$/.test(key)) {
      return false;
    }
    
    // Additional checks...
    return true;
  }
}
```

### Context Management Pattern
```typescript
// LLM context optimization
export class ContextManager {
  private tokenizer: TokenEstimator;
  
  constructor(private config: ContextConfig) {
    this.tokenizer = new TokenEstimator();
  }
  
  async optimizeResponse(data: any, options: OptimizationOptions): Promise<any> {
    const currentSize = this.tokenizer.estimate(data);
    
    // If within limits, return as-is
    if (currentSize <= options.maxTokens) {
      return data;
    }
    
    // Apply optimization strategies
    if (options.allowPagination && this.isPaginatable(data)) {
      return this.paginate(data, options);
    }
    
    if (options.allowSummary) {
      return this.summarize(data, options);
    }
    
    if (options.allowTruncation) {
      return this.truncate(data, options);
    }
    
    // If no optimization possible, throw error
    throw new ContextLimitError(currentSize, options.maxTokens);
  }
  
  private paginate(data: any[], options: OptimizationOptions): PaginatedResponse {
    const pageSize = this.calculateOptimalPageSize(data, options.maxTokens);
    const totalPages = Math.ceil(data.length / pageSize);
    
    return {
      data: data.slice(0, pageSize),
      pagination: {
        pageSize,
        currentPage: 1,
        totalPages,
        totalItems: data.length,
        hasNext: totalPages > 1,
        nextCursor: this.generateCursor(1, pageSize)
      }
    };
  }
  
  private summarize(data: any, options: OptimizationOptions): any {
    // Implement domain-specific summarization
    if (Array.isArray(data)) {
      return {
        summary: {
          totalItems: data.length,
          sample: data.slice(0, 3),
          aggregates: this.calculateAggregates(data)
        },
        _full_data_available: true
      };
    }
    
    // Object summarization
    return {
      summary: this.extractKeyFields(data),
      _full_data_available: true
    };
  }
}
```

## 🎯 STEP-BY-STEP IMPLEMENTATION GUIDE

### Phase 1: Foundation (Sequential Thinking Applied)
```bash
# Step 1: Project initialization
mkdir [your-project-name]
cd [your-project-name]
npm init -y

# Step 2: Install exact dependencies
npm install --save-exact @modelcontextprotocol/sdk@1.17.5 dotenv@17.2.2 fastify@5.6.0 lru-cache@11.2.1 pino@9.9.4 undici@7.16.0 uuid@13.0.0 zod@3.23.8 dompurify@3.2.0 rate-limiter-flexible@5.0.3 p-queue@8.0.1

# Step 3: Install dev dependencies
npm install --save-dev --save-exact @types/long@5.0.0 @types/lru-cache@7.10.9 @types/node@22.0.0 @types/uuid@10.0.0 @types/dompurify@3.2.0 @typescript-eslint/eslint-plugin@8.43.0 @typescript-eslint/parser@8.43.0 @vitest/coverage-v8@3.2.4 eslint@9.35.0 pino-pretty@13.1.1 tsx@4.20.5 typescript@5.9.2 vitest@3.2.4 supertest@7.0.0

# Step 4: Create configuration files
touch tsconfig.json eslint.config.js vitest.config.ts vitest.integration.config.ts vitest.llm.config.ts .gitignore .env.example SECURITY.md

# Step 5: Create source structure
mkdir -p src/{cache,config,context,errors,middleware,monitoring,protocol,security,transports,undici-resilience,utils}
mkdir -p src/undici-resilience/{config,http,monitoring,resilience,streaming}
mkdir -p docs .github/workflows
```

### Phase 2: Core Implementation Checklist

#### Protocol Implementation ✓
- [ ] Create `src/protocol/json-rpc.ts` with full JSON-RPC 2.0 support
- [ ] Implement `src/protocol/message-handler.ts` for all MCP messages
- [ ] Add `src/protocol/schema-validator.ts` for strict validation
- [ ] Support initialize, initialized, tools/*, resources/*, notifications/*
- [ ] Implement proper error responses per JSON-RPC spec

#### Configuration Module ✓
- [ ] Create `src/config/config.ts` with Zod validation
- [ ] Add `src/config/security-config.ts` for security settings
- [ ] Define all environment variables with defaults
- [ ] Implement configuration hot-reload capability
- [ ] Add configuration validation on startup
- [ ] Create `src/config/validation.ts` for runtime checks

#### Logging Module ✓
- [ ] Implement `src/logger-pino.ts` with structured logging
- [ ] Add correlation ID generation
- [ ] Create specialized logging methods for MCP events
- [ ] Implement performance logging utilities
- [ ] Add log sanitization for sensitive data
- [ ] Create audit logging for compliance

#### Security Module ✓
- [ ] Implement `src/security/input-validator.ts` with sanitization
- [ ] Create `src/security/api-key-manager.ts` for auth
- [ ] Add `src/security/sanitizer.ts` for XSS/SQL injection protection
- [ ] Implement rate limiting per client
- [ ] Add request size validation
- [ ] Create security audit trails

#### Error Handling ✓
- [ ] Create base error classes in `src/errors/base-errors.ts`
- [ ] Implement LLM-friendly error messages
- [ ] Add recovery hints for all errors
- [ ] Create error serialization for JSON-RPC
- [ ] Implement error reporting integration
- [ ] Add error correlation with requests

#### Type Definitions ✓
- [ ] Define all interfaces in `src/types.ts`
- [ ] Create strict types for all API responses
- [ ] Add validation schemas for all inputs
- [ ] Define MCP protocol types
- [ ] Create utility type helpers
- [ ] Add LLM-specific type definitions

### Phase 3: MCP Protocol Implementation

#### MCP Server Core ✓
```typescript
// src/mcp-server.ts implementation checklist
export class [YourDomain]MCPServer {
  // Required protocol implementations:
  - [ ] constructor with service injection
  - [ ] handleMessage(message: any): Promise<any>
  - [ ] handleInitialize(message: any): Promise<any>
  - [ ] handleInitialized(message: any): Promise<any>
  - [ ] handleToolsList(message: any): Promise<any>
  - [ ] handleToolsCall(message: any): Promise<any>
  - [ ] handleResourcesList(message: any): Promise<any>
  - [ ] handleResourcesRead(message: any): Promise<any>
  - [ ] handleNotificationProgress(message: any): Promise<any>
  - [ ] handleShutdown(message: any): Promise<any>
  - [ ] setupErrorHandling(): void
  - [ ] gracefulShutdown(): Promise<void>
  
  // Tool routing:
  - [ ] routeToolCall(toolName: string, args: any): Promise<any>
  - [ ] validateToolArgs(toolName: string, args: any): void
  
  // Context management:
  - [ ] getClientContext(message: any): ClientContext
  - [ ] trackSession(clientId: string): void
}
```

#### Transport Layer ✓
- [ ] Implement stdio transport (default) with proper buffering
- [ ] Implement HTTP transport with Fastify and streaming support
- [ ] Implement SSE transport for legacy/remote access
- [ ] Add transport switching logic based on config
- [ ] Implement health check endpoints for all transports
- [ ] Add graceful shutdown for all transports

### Phase 4: Service Layer Implementation

#### Domain Service ✓
```typescript
// src/[domain]-service.ts implementation checklist
export class [YourDomain]Service {
  // Core methods:
  - [ ] constructor with dependency injection
  - [ ] Initialize connections and pools with monitoring
  - [ ] Implement all tool handler methods with LLM optimization
  - [ ] Add input validation and sanitization for each method
  - [ ] Implement caching strategies with TTL
  - [ ] Add retry and circuit breaker logic
  - [ ] Implement timeout management
  
  // LLM optimization methods:
  - [ ] estimateTokens(data: any): number
  - [ ] optimizeForContext(data: any, limit: number): any
  - [ ] paginateResponse(data: any[], pageSize: number): PaginatedResponse
  - [ ] summarizeData(data: any): Summary
  
  // Integration methods:
  - [ ] callExternalAPI with full resilience
  - [ ] transformResponse with error handling
  - [ ] validateAPIResponse with schemas
  - [ ] handleAPIError with fallbacks
  - [ ] implementStreamingResponse(): AsyncGenerator
}
```

#### Context Management ✓
- [ ] Implement token counting/estimation
- [ ] Add response size optimization
- [ ] Create pagination utilities
- [ ] Implement summarization strategies
- [ ] Add streaming response support
- [ ] Create context window tracking

#### Cache Implementation ✓
- [ ] Implement LRU cache with configurable TTL
- [ ] Add cache warming strategies
- [ ] Implement cache invalidation logic
- [ ] Add cache metrics and monitoring
- [ ] Create cache key generation utilities
- [ ] Implement distributed cache support

### Phase 5: Resilience Layer

#### HTTP Client Resilience ✓
- [ ] Configure undici connection pools with monitoring
- [ ] Implement circuit breaker with configurable thresholds
- [ ] Add exponential backoff retry logic
- [ ] Implement token bucket rate limiting
- [ ] Add bulkhead isolation for resource protection
- [ ] Create health check monitors for dependencies
- [ ] Implement timeout management with cancellation

#### Monitoring & Metrics ✓
- [ ] Implement metrics collection (Prometheus format)
- [ ] Add performance tracking for all operations
- [ ] Create detailed health status endpoints
- [ ] Implement alerting thresholds and triggers
- [ ] Add distributed tracing support (OpenTelemetry)
- [ ] Create custom dashboards for monitoring

### Phase 6: Testing Strategy

#### Unit Tests ✓
```typescript
// Every component needs comprehensive tests
describe('[ComponentName]', () => {
  describe('Initialization', () => {
    - [ ] Test successful initialization
    - [ ] Test initialization with invalid config
    - [ ] Test dependency injection
    - [ ] Test security validation
  });
  
  describe('Core Functionality', () => {
    - [ ] Test happy path for each method
    - [ ] Test error scenarios
    - [ ] Test edge cases
    - [ ] Test timeout scenarios
    - [ ] Test context limit handling
  });
  
  describe('LLM Optimization', () => {
    - [ ] Test token estimation accuracy
    - [ ] Test pagination logic
    - [ ] Test summarization quality
    - [ ] Test streaming responses
  });
  
  describe('Security', () => {
    - [ ] Test input sanitization
    - [ ] Test rate limiting
    - [ ] Test authentication
    - [ ] Test audit logging
  });
  
  describe('Error Handling', () => {
    - [ ] Test each error type
    - [ ] Test error recovery
    - [ ] Test error propagation
    - [ ] Test LLM-friendly error messages
  });
});
```

#### Integration Tests ✓
- [ ] Test full MCP protocol compliance
- [ ] Test all transport layers
- [ ] Test external API integration
- [ ] Test end-to-end workflows
- [ ] Test graceful shutdown
- [ ] Test failover scenarios

#### LLM Interaction Tests ✓
```typescript
// vitest.llm.config.ts specific tests
describe('LLM Interaction Tests', () => {
  - [ ] Test tool discovery and description clarity
  - [ ] Test parameter validation messages
  - [ ] Test error message helpfulness
  - [ ] Test response size optimization
  - [ ] Test pagination cursor handling
  - [ ] Test streaming response chunks
  - [ ] Test context window management
  - [ ] Test recovery hint effectiveness
});
```

#### Performance Tests ✓
- [ ] Load testing with concurrent requests
- [ ] Stress testing with rate limits
- [ ] Memory leak detection
- [ ] Response time benchmarks
- [ ] Resource utilization monitoring
- [ ] Context window efficiency tests

### Phase 7: Documentation

#### API Documentation ✓
```markdown
# [Your Domain] MCP Server API

## Overview
[Brief description of the MCP server and its purpose]

## LLM Integration Guide
### Best Practices
- Use tool names that clearly indicate their function
- Always check response metadata for pagination
- Handle streaming responses appropriately
- Respect rate limits and retry hints

## Tools

### [tool_name_1]
**Description**: [What it does and when to use it]
**LLM Hints**: [Additional context for optimal usage]

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "param1": {
      "type": "string",
      "description": "...",
      "example": "example_value",
      "constraints": "min 1, max 100 chars"
    }
  },
  "required": ["param1"]
}
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "result": "..."
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00Z",
    "hasMore": false,
    "nextCursor": null
  }
}
```

**Error Responses**:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input: param1 must be a string",
    "hint": "Please provide a valid string value for param1",
    "details": {
      "field": "param1",
      "providedValue": 123
    }
  }
}
```

**Performance Characteristics**:
- Typical latency: 200-500ms
- Max response size: 4000 tokens
- Cache TTL: 600 seconds
- Rate limit: 100 requests/minute

**Usage Examples**:
```typescript
// Example 1: Basic usage
{
  "method": "tools/call",
  "params": {
    "toolName": "tool_name_1",
    "arguments": {
      "param1": "example"
    }
  }
}

// Example 2: With pagination
{
  "method": "tools/call",
  "params": {
    "toolName": "tool_name_1",
    "arguments": {
      "param1": "example",
      "pageSize": 50
    }
  }
}
```
```

#### Deployment Guide ✓
- [ ] Local development setup with all transports
- [ ] Docker deployment instructions
- [ ] Cloud deployment guides (AWS/GCP/Azure)
- [ ] Environment variable reference with security notes
- [ ] Monitoring setup guide with alerts
- [ ] Security hardening checklist

### Phase 8: Production Readiness

#### Docker Configuration ✓
```dockerfile
# Multi-stage Dockerfile with security hardening
FROM node:22-alpine AS builder

# Security: Run build as non-root
RUN addgroup -g 1001 -S build && adduser -S build -u 1001
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --audit-level=high
COPY --chown=build:build . .
USER build
RUN npm run build

FROM node:22-alpine AS production

# Security hardening
RUN apk add --no-cache dumb-init && \
    apk upgrade --no-cache && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S mcp -u 1001

WORKDIR /app

# Copy only necessary files
COPY package*.json ./
RUN npm ci --only=production --audit-level=high && \
    npm cache clean --force

COPY --from=builder --chown=mcp:nodejs /app/dist ./dist

# Security: Drop all capabilities
USER mcp

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/utils/health-check.js || exit 1

EXPOSE 8080

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
```

#### CI/CD Pipeline ✓
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline
on: 
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run security scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          severity: 'CRITICAL,HIGH'
      
      - name: Run npm audit
        run: |
          npm audit --audit-level=high
          
      - name: SAST scan
        uses: github/super-linter@v5
        env:
          DEFAULT_BRANCH: main
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [22.x]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run linting
        run: npm run lint
        
      - name: Run unit tests
        run: npm run test:coverage
        
      - name: Run integration tests
        run: npm run test:integration
        
      - name: Run LLM interaction tests
        run: npm run test:llm
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/coverage-final.json
          
      - name: Build
        run: npm run build
        
      - name: Performance test
        run: npm run test:performance

  deploy:
    needs: [security, test]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - name: Build Docker image
        run: |
          docker build -t ${{ secrets.REGISTRY }}/mcp-server:${{ github.sha }} .
          docker tag ${{ secrets.REGISTRY }}/mcp-server:${{ github.sha }} ${{ secrets.REGISTRY }}/mcp-server:latest
          
      - name: Scan Docker image
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ secrets.REGISTRY }}/mcp-server:${{ github.sha }}
          severity: 'CRITICAL,HIGH'
          
      - name: Push to registry
        run: |
          echo ${{ secrets.REGISTRY_TOKEN }} | docker login -u ${{ secrets.REGISTRY_USER }} --password-stdin ${{ secrets.REGISTRY }}
          docker push ${{ secrets.REGISTRY }}/mcp-server:${{ github.sha }}
          docker push ${{ secrets.REGISTRY }}/mcp-server:latest
```

## 🔍 QUALITY ASSURANCE CHECKLIST

### Code Quality Gates
- [ ] **Zero TypeScript Errors**: `npx tsc --noEmit` passes
- [ ] **Zero Lint Errors**: `npm run lint` passes
- [ ] **Test Coverage >90%**: All test suites meet threshold
- [ ] **No Security Vulnerabilities**: `npm audit --audit-level=high` shows 0
- [ ] **LLM Interaction Tests Pass**: All simulated interactions succeed
- [ ] **Bundle Size Optimized**: Production build <10MB
- [ ] **Memory Leak Free**: Heap usage stable over 24h test

### Performance Benchmarks
- [ ] **Startup Time**: <3 seconds to ready state
- [ ] **Tool Response Time**: p95 <500ms
- [ ] **Memory Usage**: <200MB under normal load
- [ ] **CPU Usage**: <50% with 100 concurrent requests
- [ ] **Cache Hit Rate**: >80% after warm-up
- [ ] **Context Window Efficiency**: >90% token utilization

### Security Checklist
- [ ] **Input Validation**: All inputs validated and sanitized
- [ ] **Error Messages**: No sensitive data exposed
- [ ] **Authentication**: API keys properly managed
- [ ] **Rate Limiting**: Implemented per client with proper headers
- [ ] **CORS**: Properly configured for HTTP transport
- [ ] **Dependency Scanning**: All CVEs addressed
- [ ] **Audit Logging**: Comprehensive without sensitive data

### LLM Optimization Checklist
- [ ] **Tool Naming**: Clear, action-oriented names
- [ ] **Error Messages**: Helpful with recovery hints
- [ ] **Response Sizing**: Automatic optimization for context
- [ ] **Pagination**: Implemented for large datasets
- [ ] **Streaming**: Available for long operations
- [ ] **Documentation**: Examples for every tool

### Production Readiness
- [ ] **Health Checks**: Detailed status for all components
- [ ] **Graceful Shutdown**: Clean termination of all connections
- [ ] **Log Aggregation**: Structured logs with correlation IDs
- [ ] **Monitoring**: Full observability stack configured
- [ ] **Alerts**: Critical path monitoring with escalation
- [ ] **Documentation**: Complete operational runbooks
- [ ] **Disaster Recovery**: Backup and restore procedures

## 🚨 COMMON PITFALLS TO AVOID

1. **Import Path Errors**: Always use `.js` extensions in imports
2. **Protocol Compliance**: Implement ALL MCP messages, not just tools
3. **Context Overflow**: Always estimate and limit response sizes
4. **Security Gaps**: Never trust user input, always sanitize
5. **Error Swallowing**: Log errors with context before re-throwing
6. **Cache Invalidation**: Implement proper cache key strategies
7. **Rate Limit Bypass**: Validate limits before processing
8. **Memory Leaks**: Clear all intervals/timeouts, close connections
9. **Type Safety**: Never use `any` without explicit justification
10. **LLM Confusion**: Provide clear, consistent error messages

## 🎯 FINAL EXECUTION INSTRUCTIONS

**LLM Implementation Process**:

1. **Requirements Analysis** (Sequential Thinking)
   - Parse user requirements section completely
   - Identify all custom domain elements
   - Map requirements to implementation patterns
   - Validate LLM optimization needs
   - Create implementation plan with dependencies

2. **Code Generation** (Context7 Integration - MANDATORY)
   - **🔗 ALWAYS USE CONTEXT7 MCP** for all framework/library documentation and API references
   - **NEVER use outdated documentation** - Context7 provides the latest API references
   - **Required Context7 queries for**:
     * `@modelcontextprotocol/sdk` - MCP SDK documentation and examples
     * `fastify` - Fastify 5.6.0 API reference and best practices  
     * `typescript` - TypeScript 5.9.2 features and patterns
     * `pino` - Pino 9.9.4 logging configuration and usage
     * `undici` - Undici 7.16.0 HTTP client and connection pooling
     * `zod` - Zod 3.23.8 validation schemas and parsing
     * `lru-cache` - LRU-Cache 11.2.1 configuration and methods
     * `eslint` - ESLint 9.35.0 flat config and rules
     * `vitest` - Vitest 3.2.4 testing patterns and configuration
     * `supertest` - Supertest 7.0.0 HTTP testing utilities
   - Generate complete, production-ready code using verified API patterns
   - Include all error handling and edge cases from official documentation
   - Add comprehensive inline documentation with accurate references
   - Ensure LLM-friendly interfaces throughout using best practices

3. **Security Implementation**
   - Apply input sanitization to all endpoints
   - Implement rate limiting with proper headers
   - Add audit logging without sensitive data
   - Validate all authentication mechanisms
   - Test for common vulnerabilities

4. **Quality Validation**
   - Verify zero gaps in implementation
   - Confirm all files are complete
   - Validate TypeScript compilation
   - Ensure test coverage targets
   - Run security scanning

5. **Documentation Creation**
   - Generate complete README.md
   - Create API documentation with examples
   - Include deployment guides
   - Add troubleshooting section
   - Write LLM integration guide

**SUCCESS CRITERIA**: A fully functional, secure, LLM-optimized MCP server that exceeds industry standards with zero implementation gaps, comprehensive security, and optimal LLM interaction patterns.

---

**⚡ THIS TEMPLATE GUARANTEES WORLD-CLASS, LLM-OPTIMIZED MCP SERVER IMPLEMENTATION ⚡**

*Version 3.0 - Enhanced with Full LLM Optimization, Security Hardening, and Production Excellence*
