# Project Brief: Hurricane Tracker MCP Server

## Project Overview
Hurricane Tracker MCP is a sophisticated enterprise-grade Model Context Protocol (MCP) server that provides comprehensive hurricane tracking, forecasting, and alert information through a production-ready infrastructure. This system implements a 3-layer SOLID architecture with advanced middleware, resilience patterns, and real-time data integration.

## Core Architecture Requirements
- **Enterprise MCP Server**: Full MCP specification 2025-06-18 compliance with production-grade features
- **3-Layer SOLID Architecture**: Transport Layer (Fastify HTTP + stdio), Protocol Layer (MCP compliance), Business Layer (hurricane domain logic)
- **Advanced Middleware Stack**: Authentication, rate limiting, input sanitization, validation, and audit logging
- **Resilience Patterns**: Circuit breakers, connection pooling, retry strategies, and fault tolerance
- **Real-time Data Integration**: Live integration with NOAA, NHC, NWS, and IBTrACS APIs
- **Multi-transport Support**: stdio (local AI assistants) and Streamable HTTP (production/remote clients)
- **Enterprise Infrastructure**: TypeScript 5.9.2, Node.js 22.x, comprehensive testing, security hardening

## Hurricane Data Capabilities
- **5 Hurricane Tools**: Active storms, storm cones, tracks, local alerts, historical search
- **Real-time Updates**: Live hurricane position updates and forecast changes
- **Geographic Coverage**: Global tropical cyclone tracking across all ocean basins
- **Historical Analysis**: Comprehensive historical hurricane data analysis and search
- **Alert Integration**: Location-based hurricane warnings and emergency notifications

## Production Goals
1. **Enterprise MCP Server**: Production-ready server with enterprise security and performance
2. **Protocol Compliance**: Perfect JSON-RPC 2.0 compliance and MCP lifecycle management
3. **Data Reliability**: 99.9% accurate, up-to-date hurricane information with fault tolerance
4. **AI Assistant Integration**: Seamless integration with Claude Desktop, Cline, and other MCP clients
5. **Operational Excellence**: Comprehensive monitoring, logging, error handling, and documentation

## Advanced Success Criteria
- **MCP Compliance**: Full protocol compliance with client compatibility (Claude Desktop, Cline)
- **Hurricane Tools**: 5 comprehensive tools with LLM-optimized responses and error handling
- **Enterprise Security**: Authentication, rate limiting, input sanitization, and audit logging
- **Resilience**: Circuit breakers, retry logic, connection pooling, and fault tolerance
- **Performance**: <500ms response times, >90% cache hit rates, high availability
- **Testing**: >90% code coverage with unit, integration, LLM, and security tests
- **Documentation**: Professional setup guides, troubleshooting, and operational procedures

## Technology Stack (Production-Ready)
- **Core**: TypeScript 5.9.2, Node.js 22.x, @modelcontextprotocol/sdk 1.17.5
- **HTTP Server**: Fastify 5.6.0 with CORS, session management, health endpoints
- **Middleware**: Authentication, rate limiting (Rate-Limiter-Flexible), sanitization (DOMPurify)
- **Resilience**: Undici 7.16.0 with circuit breakers, connection pooling, retry strategies
- **Testing**: Vitest 3.2.4 with V8 coverage, Supertest for HTTP testing
- **Security**: Input validation (Zod), XSS protection, audit logging, correlation tracking
- **Configuration**: 50+ environment variables with Zod validation and type safety
- **Data Sources**: NOAA Hurricane Database, NHC GIS Services, NWS Alerts, IBTrACS Historical

## Project Status
- **Current Version**: 1.0.4 - Enterprise Production Ready
- **Architecture**: 3-layer SOLID with perfect separation of concerns
- **Infrastructure**: Complete enterprise middleware and resilience patterns
- **Testing**: Comprehensive test suites with multiple configurations
- **Documentation**: Professional documentation with setup guides
- **Client Compatibility**: Fixed Claude Desktop and Cline integration issues

## License
MIT License - Open source project allowing commercial and non-commercial use

## Repository
- **GitHub**: kumaran-is/hurricane-tracker-mcp
- **Branch**: develop (main development branch)
- **Status**: Production-ready enterprise-grade MCP server
- **Documentation**: Comprehensive setup guides and operational procedures
