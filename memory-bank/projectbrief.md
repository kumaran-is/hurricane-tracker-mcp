# Project Brief: Hurricane Tracker MCP

## Project Overview
Hurricane Tracker MCP is a Model Context Protocol (MCP) server designed to provide real-time hurricane tracking and weather-related information through standardized tools and resources.

## Core Requirements
- **MCP Server Implementation**: Build a compliant MCP server following revision 2025-06-18 specification
- **Hurricane Data Integration**: Provide tools for accessing hurricane tracking data, forecasts, and alerts
- **Real-time Updates**: Enable real-time hurricane position updates and forecast changes
- **Multi-transport Support**: Support stdio (for local AI assistants like Cline) and potentially Streamable HTTP
- **TypeScript/Node.js**: Implementation using TypeScript 5.8+ and Node.js 22.x with @modelcontextprotocol/sdk

## Primary Goals
1. Create production-grade MCP server exposing hurricane tracking tools
2. Ensure JSON-RPC 2.0 compliance and proper lifecycle management
3. Provide reliable, up-to-date hurricane information through standardized interface
4. Enable AI assistants to access hurricane data for user queries and analysis

## Success Criteria
- Functional MCP server with proper initialization and capability negotiation
- Tools for hurricane tracking (current position, forecasts, alerts)
- Comprehensive error handling and resilience
- Clear documentation and setup instructions
- Integration testing with MCP clients

## License
MIT License - Open source project allowing commercial and non-commercial use

## Repository
- GitHub: kumaran-is/hurricane-tracker-mcp
- Branch: develop (main)
- Current: initial-project-setup
