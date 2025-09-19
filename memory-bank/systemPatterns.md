# System Patterns: Hurricane Tracker MCP

## Architecture Overview

### Enterprise-Grade MCP Server Architecture
```
┌─────────────────────────────────────┐
│             MCP Client              │
│     (Cline, Claude Desktop, etc.)   │
└─────────────────┬───────────────────┘
                  │ JSON-RPC 2.0 (Fixed stdout/stderr separation)
                  │
┌─────────────────▼───────────────────┐
│         Transport Layer             │
│  ┌─────────────┐ ┌─────────────────┐│
│  │    Stdio    │ │  Fastify HTTP   ││
│  │ Transport   │ │   Transport     ││
│  │  (stderr    │ │ (w/ CORS &      ││
│  │   logs)     │ │   Sessions)     ││
│  └─────────────┘ └─────────────────┘│
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│       Middleware Stack              │
│  ┌─────────────────────────────────┐│
│  │ • Authentication (API Keys)     ││
│  │ • Rate Limiting (Token Bucket)  ││
│  │ • Input Sanitization (DOMPurify)││
│  │ • Validation (Zod + Custom)     ││
│  │ • CORS & Session Management     ││
│  └─────────────────────────────────┘│
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│        Protocol Handler             │
│  ┌─────────────────────────────────┐│
│  │ • MCP Lifecycle Management      ││
│  │ • Tool Registration & Schemas   ││
│  │ • Error Response Formatting     ││
│  │ • Correlation ID Tracking       ││
│  │ • Performance Logging           ││
│  └─────────────────────────────────┘│
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│         Tool Handlers               │
│  ┌─────────────────────────────────┐│
│  │      5 Hurricane Tools          ││
│  │ • get_active_storms             ││
│  │ • get_storm_cone                ││
│  │ • get_storm_track               ││
│  │ • get_local_hurricane_alerts    ││
│  │ • search_historical_tracks      ││
│  └─────────────────────────────────┘│
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│         Business Layer              │
│  ┌─────────────────────────────────┐│
│  │      Hurricane Service          ││
│  │ • Pure Domain Logic             ││
│  │ • External API Integration      ││
│  │ • Data Processing & Caching     ││
│  │ • Business Rule Validation      ││
│  └─────────────────────────────────┘│
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│      Resilience Layer              │
│  ┌─────────────────────────────────┐│
│  │    Undici Resilience Module    ││
│  │ • Circuit Breakers              ││
│  │ • Connection Pooling            ││
│  │ • Retry Logic & Backoff         ││
│  │ • Streaming Metrics             ││
│  │ • Fault Tolerance Patterns      ││
│  └─────────────────────────────────┘│
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│        External APIs                │
│  ┌─────────────────────────────────┐│
│  │ • NOAA Hurricane Database       ││
│  │ • National Hurricane Center     ││
│  │ • NWS Alerts API                ││
│  │ • IBTrACS Historical Data       ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

## Key Design Patterns

### 1. Enterprise Middleware Architecture
- **Authentication Middleware**: Complete API key, session, and permission management
  - API key validation with hashing
  - Session creation and management with UUID
  - Role-based permission system
  - Bearer token support for HTTP transport
- **Rate Limiting Middleware**: Advanced algorithms for traffic management
  - Token bucket algorithm for burst traffic
  - Sliding window for sustained rate limiting
  - IP-based blocking for abuse prevention
  - Configurable limits per client/operation
- **Input Sanitization Middleware**: XSS and injection protection
  - DOMPurify integration for HTML sanitization
  - JSDOM for safe HTML processing
  - Hurricane-specific data sanitization
  - Response sanitization with sensitive data removal
- **Validation Middleware**: Multi-layer validation system
  - Zod schema validation for all inputs
  - Hurricane-specific parameter validation
  - JSON-RPC protocol validation
  - HTTP header validation for transport security

### 2. Undici Resilience Pattern System
- **Specialized Resilience Factories**: Domain-specific resilience patterns
  ```typescript
  HurricaneResilience.createNWSResilience()     // National Weather Service
  HurricaneResilience.createNHCResilience()     // National Hurricane Center  
  HurricaneResilience.createHistoricalResilience() // IBTrACS Historical Data
  ```
- **Circuit Breaker Pattern**: Prevent cascade failures
  - Open/closed/half-open states
  - Configurable failure thresholds
  - Automatic recovery mechanisms
  - Per-service circuit breaker isolation
- **Connection Pool Management**: Optimized HTTP client patterns
  - Undici-based connection pooling
  - Connection lifecycle management
  - Pool monitoring and metrics
  - Automatic connection cleanup
- **Retry Strategy**: Intelligent retry with backoff
  - Exponential backoff algorithms
  - Jitter for thundering herd prevention
  - Configurable retry limits per operation
  - Operation-specific retry policies

### 3. SOLID Architecture Implementation
- **Single Responsibility**: Perfect layer separation
  ```typescript
  server.ts              // Transport & Infrastructure Only
  hurricane-mcp-server.ts // Protocol & Tool Orchestration Only
  hurricane-service.ts    // Business Logic & Domain Only
  ```
- **Open/Closed Principle**: Extensible without modification
  - New tools via tool registration pattern
  - New transports via transport interface
  - New middleware via middleware stack
  - New resilience patterns via factory pattern
- **Liskov Substitution**: Interface compliance
  - Transport interfaces interchangeable
  - Service implementations swappable
  - Middleware components replaceable
- **Interface Segregation**: Minimal dependencies
  - Clean boundaries between layers
  - No forced dependencies on unused functionality
  - Focused interfaces for each concern
- **Dependency Inversion**: Abstraction dependencies
  - High-level modules independent of implementations
  - Service interfaces define contracts
  - Configuration-driven component selection

### 4. Comprehensive Testing Architecture
- **Vitest Framework**: Modern testing with multiple configurations
  ```typescript
  vitest.config.ts           // Unit tests
  vitest.integration.config.ts // Integration tests
  vitest.llm.config.ts       // LLM interaction tests
  ```
- **Coverage Strategy**: V8 coverage with >90% targets
- **Test Types**: Comprehensive test pyramid
  - Unit tests for individual components
  - Integration tests for layer interactions
  - LLM tests for AI assistant compatibility
  - Security tests for vulnerability assessment
- **Mock Strategy**: Realistic test data
  - Hurricane data mocks for development
  - API response mocks for testing
  - Error scenario simulation

### 5. Production Security Pattern
- **Input Security**: Multi-layer protection
  - Schema validation with Zod
  - XSS protection with DOMPurify
  - SQL injection prevention
  - Hurricane-specific validation rules
- **Transport Security**: Protocol-level protection
  - HTTPS enforcement for HTTP transport
  - Origin validation for CORS
  - Bearer token authentication
  - Session management with expiration
- **Audit Logging**: Comprehensive security logging
  - All authentication attempts
  - Rate limiting violations
  - Input validation failures
  - Correlation ID tracking throughout request lifecycle

## Component Relationships

### Core Components (Enterprise Implementation)
1. **Fastify HTTP Server**: High-performance HTTP transport with middleware
2. **MCP Protocol Handler**: Complete lifecycle and tool management
3. **Middleware Stack**: Authentication, rate limiting, sanitization, validation
4. **Hurricane Service**: Pure business logic with domain focus
5. **Undici Resilience**: Fault tolerance and connection management
6. **Configuration System**: Zod-based validation with 50+ environment variables
7. **Logging System**: Structured logging with conditional output (stderr/stdout)
8. **Testing Infrastructure**: Comprehensive test suites with coverage reporting

### Data Flow (Enterprise Pattern)
```
MCP Client Request
    ↓ (JSON-RPC 2.0)
Transport Layer (stdio/HTTP with Fastify)
    ↓ (Raw Request)
Middleware Stack (Auth → Rate Limit → Sanitize → Validate)
    ↓ (Validated Request)
Protocol Handler (Tool Routing & Response Formatting)
    ↓ (Business Parameters)
Hurricane Service (Domain Logic & API Calls)
    ↓ (HTTP Requests)
Undici Resilience (Circuit Breaker → Pool → Retry)
    ↓ (Resilient HTTP Calls)
External APIs (NOAA/NHC/NWS/IBTrACS)
    ↓ (API Responses)
Response Flow (Reverse path with error handling at each layer)
```

## Critical Implementation Paths

### 1. Enhanced Initialization Sequence
1. Load and validate 50+ environment configuration variables with Zod
2. Initialize conditional logging (stderr for stdio, stdout for HTTP)
3. Start transport layer (stdio with clean JSON-RPC or Fastify HTTP)
4. Initialize middleware stack (auth, rate limiting, sanitization, validation)
5. Register 5 hurricane tools with proper JSON schemas
6. Configure undici resilience patterns for external APIs
7. Start MCP server lifecycle with capability negotiation
8. Begin accepting requests with full security and resilience

### 2. Enterprise Request Processing
1. Receive JSON-RPC request via transport (stdio or Fastify HTTP)
2. Apply middleware stack in sequence:
   - Authentication (API key/session validation)
   - Rate limiting (check token bucket/sliding window)
   - Input sanitization (DOMPurify/XSS protection)
   - Validation (Zod schemas + hurricane-specific rules)
3. Route to appropriate tool handler with correlation ID
4. Execute business logic via pure hurricane service
5. Apply resilience patterns for external API calls
6. Format response with LLM-optimized error messages
7. Return via transport with proper security headers

### 3. Advanced Error Handling Path
1. Catch errors at appropriate layer with correlation tracking
2. Apply layer-specific error handling:
   - Middleware: Authentication/rate limiting/validation errors
   - Protocol: MCP specification compliance errors
   - Business: Domain logic and external API errors
   - Resilience: Circuit breaker and connection errors
3. Map to standard JSON-RPC error codes with helpful hints
4. Log errors with structured logging and correlation IDs
5. Return LLM-friendly error responses with recovery suggestions
6. Ensure graceful degradation and system stability

## Enterprise Scalability Patterns

### High-Performance Infrastructure
- **Fastify Integration**: High-performance HTTP server with CORS and session management
- **Connection Pooling**: Undici-based connection reuse for external APIs
- **Advanced Caching**: LRU cache with TTL support, Redis-ready architecture
- **Queue Management**: P-Queue for request queuing and backpressure handling
- **Resource Management**: Proper cleanup of connections, timers, and resources

### Production Monitoring
- **Performance Metrics**: Response times, error rates, cache hit ratios
- **Connection Monitoring**: Pool utilization, connection lifecycle, failure rates  
- **Security Monitoring**: Authentication failures, rate limit violations, input attacks
- **Business Metrics**: Tool usage patterns, hurricane data freshness, API health

### Operational Excellence
- **Health Endpoints**: Complete system health with component status
- **Graceful Shutdown**: Proper cleanup of all resources and connections
- **Configuration Management**: Environment-based with validation and defaults
- **Documentation**: Comprehensive setup guides for both Cline and Claude Desktop
- **Testing**: >90% coverage with unit, integration, LLM, and security tests

## Architecture Evolution Timeline

### Version 1.0.4 (Current) - Enterprise Production Ready
- ✅ MCP client compatibility fixes (Claude Desktop, Cline)
- ✅ Advanced middleware stack (auth, rate limiting, sanitization, validation)
- ✅ Undici resilience patterns with circuit breakers and connection pooling
- ✅ Fastify HTTP server with enterprise features
- ✅ Comprehensive testing infrastructure with multiple configurations
- ✅ Production security features and audit logging
- ✅ Professional documentation and setup guides

### Future Roadmap
- **Phase 5**: Real API integration with live NOAA/NHC/NWS data
- **Phase 6**: Redis caching and distributed system support
- **Phase 7**: Advanced monitoring and alerting with metrics dashboards
- **Phase 8**: Docker containerization and cloud deployment guides
