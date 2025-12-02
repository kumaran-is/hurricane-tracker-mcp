# MCP Server Generator Template - Enhanced Production-Ready Reusable Prompt

## Version: 2.0.0
## Based on: hurricane-tracker-mcp v1.0.5
## Last Updated: 2024-12-20

---

# PROMPT: Generate Production-Ready MCP Server

## ⚠️ MANDATORY: Context7 MCP Server Integration

**BEFORE GENERATING ANY ARCHITECTURE OR CODE, YOU MUST:**

1. **USE Context7 MCP Server** to fetch up-to-date, version-specific documentation and architectural patterns
2. **VERIFY** all design patterns against current best practices
3. **INJECT** the fetched documentation into your architectural decisions
4. **UPDATE** any outdated patterns with modern alternatives

### Why Context7 is Mandatory:
- ✅ Ensures architectural patterns are current and production-ready
- ✅ Reduces technical debt by using latest best practices
- ✅ Improves compatibility with AI Code Assistants (Cline, Claude Code, GitHub Copilot)
- ✅ Minimizes debugging overhead through proven patterns
- ✅ Increases maintainability and trust in generated code

### Context7 Usage Pattern:
```javascript
// Before designing any architecture component:
const context7 = await mcp.tools.context7.fetch({
  topic: 'mcp-server-architecture',
  subtopics: ['3-layer-design', 'SOLID-principles', 'error-handling', 'testing-strategies'],
  version: 'latest'
});

// Apply fetched patterns to architecture
architectureDesign.patterns = context7.patterns;
architectureDesign.antiPatterns = context7.antiPatterns;
architectureDesign.bestPractices = context7.recommendations;
```

## ⚡ MANDATORY: Agent-First Design Principles

### The Hidden Cost of Tool Overload
**FUNDAMENTAL TRUTH**: AI agents are not human developers. They:
- Process EVERY tool's metadata on EVERY decision (massive token cost)
- Suffer from decision paralysis with too many similar options
- Cannot "discover once and ignore" like humans do
- Pay token tax and latency penalty for every round trip

**THE BRUTAL REALITY**: Your carefully crafted 50+ endpoint REST API becomes a cognitive burden that drowns agents in choices, burns tokens, and creates timeouts.

## 📋 MANDATORY: 5-Step Agent-First Pattern

**ALL ARCHITECTURAL DECISIONS MUST FOLLOW THIS PATTERN:**

### Step 1: Consolidate by Intent, Not Endpoints
**Stop mapping endpoints—start mapping intentions.**

```javascript
// ❌ WRONG: 6 separate tools (decision paralysis)
tools: ["createUser", "readUser", "updateUser", "deleteUser", "getUserById", "searchUsers"]

// ✅ RIGHT: 2 intent-based tools (clear purpose)
tools: ["manageUser", "searchUsers"]
```
**HARD LIMITS**:
- Target: 10-15 tools ideal
- Maximum: 20 tools absolute
- Result: 70% token reduction, 5x faster decisions

### Step 2: Make Responses Agent-Guiding, Not Just Informative
**Every response tells the agent what to do next. Be directive, not verbose.**

```javascript
// ✅ MANDATORY Response Structure
interface AgentResponse {
  success: boolean;
  data: any;                    // Only requested fields
  next_actions: string[];       // Machine-readable next steps
  suggestion: string;           // Human-readable guidance
  context?: any;               // State for chaining
}

// ✅ MANDATORY Error Structure
interface AgentError {
  error_code: string;
  message: string;
  suggestion: string;           // How to fix/retry
  retry_after: number;
  corrective_params?: object;   // Suggested parameter fixes
}
```

### Step 3: Optimize for Tokens and Latency (80%+ Reduction Possible)
**Every token costs money. Every millisecond adds latency. Optimize ruthlessly.**

- **Batch by default**: `getUsers({ ids: ["U123", "U456", "U789"] })`
- **Filter aggressively**: `fields: ["id", "name"]` reduces payload by 80%+
- **Cache intelligently**: LRU cache with versioned reference data
- **Paginate smartly**: Cursor-based (not offset) with reasonable limits

### Step 4: Build in Permission Guardrails
**Agents lack human judgment. Make dangerous operations explicit.**

```javascript
interface RiskyOperation {
  risky: true;                 // MANDATORY flag
  reason: string;               // MANDATORY audit trail
  confirm_token?: string;       // Optional double-confirmation
  ticket_id?: string;          // Link to change management
}

// Agent role-based permissions
interface AgentPermissions {
  role: 'read_only' | 'operator' | 'admin';
  allowed_tools: string[];
  forbidden_actions: string[];  // Explicitly blocked
  require_confirmation: string[]; // Need extra validation
}
```

### Step 5: Test with Real Agent Behavior & Track Success Metrics
```javascript
// MANDATORY metrics for optimization
interface MCPMetrics {
  tool_selection_frequency: Record<string, number>;  // Find unused tools
  error_rate_by_tool: Record<string, number>;       // Identify problem tools
  avg_response_time: Record<string, number>;        // Spot bottlenecks
  average_tools_per_task: number;                   // Measure efficiency
  abandon_rate: number;                              // Track failures
  token_usage_per_task: number;                     // Monitor costs
}

// Success Targets (MUST ACHIEVE)
const targets = {
  token_reduction: 0.70,        // 70% fewer tokens
  speed_improvement: 5,         // 5x faster completion
  timeout_reduction: 0.90,      // 90% fewer timeouts
  tool_selection_errors: 0.05   // <5% selection errors
}
```

## 🔙 STEP-BACK: Architectural Context & Problem Understanding

### Before designing ANY architecture, step back and analyze:

#### 📊 **Domain Complexity Analysis**
```markdown
STEP BACK - UNDERSTAND THE DOMAIN:
□ What is the core business domain?
□ What are the domain entities and their relationships?
□ What are the invariants that must be maintained?
□ What are the bounded contexts?
□ What are the aggregate roots?
```

#### 🧠 **Agent Interaction Patterns**
```markdown
STEP BACK - UNDERSTAND AGENT BEHAVIOR:
□ How do agents discover capabilities?
□ What mental models do agents form?
□ Where do agents typically get stuck?
□ What causes agent hallucinations?
□ How do agents handle ambiguity?
```

#### 🏗️ **System Design Principles**
```markdown
STEP BACK - ARCHITECTURAL FOUNDATIONS:
□ What are the non-functional requirements?
□ What are the quality attributes (performance, security, etc.)?
□ What are the architectural drivers?
□ What patterns fit this problem space?
□ What anti-patterns must we avoid?
```

### 🎯 Start with the Story, Not the Spec

**MINDSET SHIFT**: Don't ask "How do I expose my API?" Ask "What story should my agent tell?"

### The Agent Story Framework:
1. **Write the story**: "As an agent, given {context}, I use {tools} to achieve {outcome}"
2. **Map critical workflows**: What are the 3-5 most important user journeys?
3. **Build ONLY required tools**: Each tool must serve the story
4. **Test with real behavior**: Use MCP Inspector, not assumptions
5. **Iterate on metrics**: Remove unused tools, consolidate redundant ones

**Example Story**:
> "As an agent helping with e-commerce, given a customer inquiry, I use `searchProducts` to find items and `manageOrder` to handle purchases, returns, and status checks in a single tool."

This story needs 2 tools, not 15 separate CRUD endpoints.

### 📐 Architectural Step-Back Framework

```typescript
// COMPLETE THIS BEFORE ANY DESIGN DECISIONS:
interface ArchitecturalStepBack {
  // Problem Space Analysis
  problemSpace: {
    rootCause: string;           // What's the real problem?
    symptoms: string[];          // What are we observing?
    constraints: string[];       // What limits us?
    assumptions: string[];       // What are we assuming?
  };

  // Solution Space Exploration
  solutionSpace: {
    alternatives: string[];      // What other approaches exist?
    tradeoffs: TradeOff[];      // What are we trading?
    risks: Risk[];              // What could go wrong?
    mitigations: string[];      // How do we handle risks?
  };

  // Architecture Decisions
  decisions: {
    style: 'microservices' | 'monolith' | 'serverless';
    patterns: string[];         // Which patterns to use
    antiPatterns: string[];     // What to avoid
    rationale: string;          // Why these choices
  };

  // Success Metrics
  metrics: {
    leading: string[];          // Early indicators
    lagging: string[];          // Result indicators
    thresholds: Threshold[];    // Pass/fail criteria
  };
}
```

## ⏸️ ARCHITECTURAL PREREQUISITES

### Complete this checklist BEFORE designing:

```markdown
FOUNDATIONAL UNDERSTANDING:
□ Have you identified the 3 most critical quality attributes?
□ Have you mapped the failure modes and recovery strategies?
□ Have you identified the scaling bottlenecks?
□ Have you considered the deployment constraints?
□ Have you analyzed similar successful systems?

AGENT-SPECIFIC CONSIDERATIONS:
□ Have you minimized the cognitive load on agents?
□ Have you eliminated ambiguous tool boundaries?
□ Have you provided clear failure recovery paths?
□ Have you optimized for token efficiency?
□ Have you considered agent context limitations?

TECHNICAL DEBT PREVENTION:
□ Have you identified areas prone to technical debt?
□ Have you planned for evolution and change?
□ Have you considered backward compatibility?
□ Have you documented key decisions and rationale?
□ Have you identified monitoring and observability needs?
```

## Core Architecture Instructions

You are an expert software architect specializing in production-grade MCP servers optimized for AI agents. Generate a complete implementation based on agent-first principles:

## QUICK START - FLEXIBLE INPUT OPTIONS

### 🎯 Users Can Provide Requirements in ANY Format:

#### Option 1️⃣: Quick Form Input
```
QUICK SPECIFICATION:
□ Domain: _________________ (e.g., "Weather & Climate")
□ Service Name: _________________ (e.g., "Weather Analytics")
□ Number of Tools: _______________ (e.g., 5)
□ External API Name: _____________ (e.g., "OpenWeatherMap")
□ API Authentication: ____________ (e.g., "API Key")
□ Description: __________________ (Brief service description)
```

#### Option 2️⃣: OpenAPI 3.0 / Swagger Specification
```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Your API Title",
    "version": "1.0.0",
    "description": "API description"
  },
  "servers": [
    { "url": "https://api.example.com/v1" }
  ],
  "paths": {
    "/endpoint": {
      "get": {
        "operationId": "toolName",
        "summary": "Tool description",
        "parameters": [...],
        "responses": {...}
      }
    }
  },
  "components": {
    "securitySchemes": {
      "ApiKeyAuth": {
        "type": "apiKey",
        "in": "header",
        "name": "X-API-KEY"
      }
    }
  }
}
```

#### Option 3️⃣: Detailed Requirements (YAML/Markdown/Text)
```yaml
# Comprehensive Requirements Specification

project_name: "your-service-mcp"
domain: "Your Domain"
purpose: "Detailed purpose and value proposition"

# Functional Requirements
use_cases:
  - "Primary use case 1"
  - "Primary use case 2"
  - "Secondary use case 3"

# Data Sources & APIs
data_sources:
  - name: "Primary API"
    type: "REST API"
    base_url: "https://api.example.com"
    auth: "API Key / OAuth2 / Basic"
    rate_limit: "100 req/min"
    documentation: "https://docs.example.com"

  - name: "Secondary API"
    type: "GraphQL / REST / WebSocket"
    base_url: "https://api2.example.com"
    auth: "Bearer Token"

# Tool Definitions
tools:
  - name: "tool_one"
    description: "What this tool does"
    category: "data_retrieval / analysis / processing"
    inputs:
      - name: "param1"
        type: "string"
        required: true
        description: "Parameter description"
        validation: "regex pattern or rules"
      - name: "param2"
        type: "number"
        required: false
        default: 10
        min: 1
        max: 100
    output:
      type: "object"
      schema: "Detailed output structure"
    examples:
      - input: { "param1": "test" }
        output: { "result": "example" }
    error_cases:
      - "Invalid input handling"
      - "API failure scenarios"

# Technical Requirements
technical:
  performance:
    response_time: "< 500ms p95"
    throughput: "1000 req/sec"
    concurrent_users: 100

  caching:
    strategy: "LRU"
    ttl_seconds: 300
    max_size: 1000

  resilience:
    circuit_breaker: true
    retry_strategy: "exponential_backoff"
    max_retries: 3
    timeout_ms: 30000

  monitoring:
    metrics: true
    logging_level: "info"
    tracing: true
    health_checks: true

# Security Requirements
security:
  authentication: "API Key / OAuth2 / JWT"
  authorization: "RBAC / ACL"
  rate_limiting:
    enabled: true
    requests_per_minute: 100
    burst_size: 20
  data_protection:
    encryption_in_transit: true
    encryption_at_rest: false
    pii_handling: "anonymize / encrypt / exclude"
  audit_logging:
    enabled: true
    retention_days: 90

# Infrastructure Requirements
infrastructure:
  deployment: "Docker / Kubernetes / Serverless"
  environment: "AWS / GCP / Azure / On-premise"
  scaling:
    auto_scale: true
    min_instances: 1
    max_instances: 10
  database:
    type: "PostgreSQL / MongoDB / Redis"
    connection_pooling: true
    max_connections: 50

# Compliance & Standards
compliance:
  standards: ["GDPR", "HIPAA", "SOC2"]
  data_residency: "US / EU / APAC"
  audit_requirements: "quarterly / annual"
```

## PLACEHOLDER MAPPING TABLE

| Placeholder | Example Value | Used In | Format Rules |
|------------|---------------|---------|--------------|
| [SERVICE_NAME] | "Weather Analyzer" | Documentation, comments | Title case with spaces |
| [service-name] | "weather-analyzer" | File names, package.json | Kebab case |
| [service] | "weatherAnalyzer" | Variable names | Camel case |
| [SERVICE] | "WEATHER_ANALYZER" | Constants, env vars | Upper snake case |
| [SERVICE_PASCAL] | "WeatherAnalyzer" | Class names | Pascal case |
| [Domain] | "Weather" | Class prefixes | Pascal case |
| [DOMAIN] | "WEATHER" | Constant prefixes | Upper case |

### Dynamic Placeholder Calculation
For AI: Calculate these based on input:
- If service name = "Stock Market Analyzer"
  - [service-name] = "stock-market-analyzer"
  - [service] = "stockMarketAnalyzer"
  - [SERVICE] = "STOCK_MARKET_ANALYZER"
  - [SERVICE_PASCAL] = "StockMarketAnalyzer"

## MCP TOOLS REQUIRED - AGENT-FIRST DESIGN

### MANDATORY: Apply Intent-Based Consolidation

**Instead of creating separate CRUD tools, consolidate by intent:**

```javascript
// Example: User Management (Consolidated)
{
  name: "manageUser",
  description: "Unified user management (create/read/update/delete)",
  inputSchema: {
    action: "create | read | update | delete",
    userId?: "string (for read/update/delete)",
    data?: "object (for create/update)",
    fields?: "string[] (specify fields to return)",
    batch?: "array (for bulk operations)"
  },
  responseSchema: {
    success: boolean,
    data: object,
    next_actions: ["verifyEmail", "setupProfile"],
    suggestion: "User created. Next: call verifyEmail with userId"
  }
}

// Example: Search/Query (Optimized)
{
  name: "searchUsers",
  description: "Flexible user search with filters",
  inputSchema: {
    query?: "string",
    filters?: "object",
    fields?: "string[] (reduce token usage)",
    limit?: "number",
    cursor?: "string (for pagination)"
  },
  responseSchema: {
    success: boolean,
    results: array,
    cursor?: "string (next page)",
    next_actions: ["manageUser", "exportResults"],
    suggestion: "Found 25 users. Use cursor for next page"
  }
}

// Example: Risky Operations (Separated)
{
  name: "deleteUserData",
  description: "Permanently delete user data (DESTRUCTIVE)",
  inputSchema: {
    userId: "string",
    risky: true,  // Required flag
    reason: "string (required for audit)",
    ticketId?: "string (change management)",
    confirmToken?: "string"
  }
}
```

### Tool Count Rules:
- **Maximum**: 15-20 tools total
- **Consolidate**: Group CRUD operations by resource
- **Separate**: Only for risky/destructive operations
- **Optimize**: Use batch and field filtering

## EXTERNAL APIS/SERVICES

List any external APIs or services this MCP server needs to integrate with:

1. **API Name**: [API_1_NAME]
   - **Endpoint**: [API_1_ENDPOINT]
   - **Authentication**: [API_1_AUTH_METHOD]
   - **Rate Limits**: [API_1_RATE_LIMITS]

[Add more APIs as needed]

## AI ASSISTANT GENERATION INSTRUCTIONS

### 🤖 Universal Requirements Processing

#### Step 1: Accept Input in Any Format
```javascript
// AI: Process requirements regardless of input format

async function processUserRequirements(input) {
  let requirements = {
    domain: '',
    serviceName: '',
    tools: [],
    apis: [],
    auth: '',
    technical: {},
    security: {},
    context7Data: {} // Store Context7 fetched documentation
  };

  // Detect and parse input format
  if (isQuickForm(input)) {
    // Option 1: Parse form fields
    requirements = parseFormInput(input);
  }
  else if (isOpenAPISpec(input)) {
    // Option 2: Extract from OpenAPI
    requirements = parseOpenAPISpec(input);
  }
  else if (isYAMLRequirements(input)) {
    // Option 3: Parse comprehensive YAML
    requirements = parseYAMLRequirements(input);
  }
  else {
    // Fallback: Extract what's possible from free text
    requirements = parseFreetextRequirements(input);
  }

  // MANDATORY: Fetch Context7 architectural patterns and documentation
  requirements.context7Data = await fetchContext7Architecture(requirements);

  return requirements;
}

// MANDATORY: Fetch architectural patterns via Context7
async function fetchContext7Architecture(requirements) {
  const context7Data = {
    architecture: {},
    patterns: {},
    libraries: {},
    testing: {},
    deployment: {}
  };

  // Core architectural patterns
  context7Data.architecture.mcp = await context7.fetch({
    topic: 'mcp-server-patterns',
    subtopics: ['3-layer-architecture', 'transport-layer', 'protocol-layer', 'business-layer'],
    version: 'latest'
  });

  context7Data.architecture.solid = await context7.fetch({
    topic: 'SOLID-principles',
    subtopics: ['single-responsibility', 'dependency-injection', 'interface-segregation'],
    examples: 'typescript'
  });

  // Design patterns for the domain
  if (requirements.domain) {
    context7Data.patterns.domain = await context7.fetch({
      domain: requirements.domain,
      patterns: ['repository', 'factory', 'adapter', 'observer'],
      language: 'typescript'
    });
  }

  // Library-specific patterns
  context7Data.libraries.testing = await context7.fetch({
    libraries: ['jest', 'vitest', 'playwright'],
    topics: ['unit-testing', 'integration-testing', 'e2e-testing'],
    bestPractices: true
  });

  context7Data.libraries.monitoring = await context7.fetch({
    libraries: ['pino', 'prometheus', 'opentelemetry'],
    topics: ['structured-logging', 'metrics', 'tracing'],
    production: true
  });

  // Deployment strategies
  context7Data.deployment = await context7.fetch({
    topic: 'mcp-deployment',
    platforms: ['docker', 'kubernetes', 'serverless'],
    cicd: ['github-actions', 'gitlab-ci'],
    monitoring: true
  });

  return context7Data;
}

// Format detection functions
function isQuickForm(input) {
  return input.includes('□') ||
         input.includes('Service Name:') ||
         input.includes('Domain:');
}

function isOpenAPISpec(input) {
  return input.includes('"openapi"') ||
         input.includes('swagger') ||
         (typeof input === 'object' && input.openapi);
}

function isYAMLRequirements(input) {
  return input.includes('project_name:') ||
         input.includes('tools:') ||
         input.includes('data_sources:');
}
```

#### Step 2: Extract Core Information
```javascript
// Parse different input formats into unified structure

function parseFormInput(input) {
  return {
    domain: extractField(input, 'Domain'),
    serviceName: extractField(input, 'Service Name'),
    toolCount: parseInt(extractField(input, 'Number of Tools')) || 3,
    apiName: extractField(input, 'External API Name'),
    authMethod: extractField(input, 'API Authentication'),
    description: extractField(input, 'Description')
  };
}

function parseOpenAPISpec(spec) {
  const parsed = typeof spec === 'string' ? JSON.parse(spec) : spec;

  return {
    serviceName: parsed.info.title,
    description: parsed.info.description,
    tools: extractToolsFromPaths(parsed.paths),
    apis: [{
      name: parsed.info.title,
      baseUrl: parsed.servers?.[0]?.url,
      auth: extractAuthMethod(parsed.components?.securitySchemes)
    }],
    toolCount: Object.keys(parsed.paths || {}).length
  };
}

function parseYAMLRequirements(yaml) {
  const parsed = parseYAML(yaml);

  return {
    serviceName: parsed.project_name,
    domain: parsed.domain,
    purpose: parsed.purpose,
    tools: parsed.tools || [],
    apis: parsed.data_sources || [],
    technical: parsed.technical || {},
    security: parsed.security || {},
    infrastructure: parsed.infrastructure || {},
    compliance: parsed.compliance || {},
    useCases: parsed.use_cases || []
  };
}
```

#### Step 3: Apply Context7 Patterns & Generate Architecture

```javascript
// MANDATORY: Apply Context7 patterns before generating architecture
function applyContext7Patterns(requirements, context7Data) {
  const enhancedArchitecture = {
    layers: {},
    patterns: {},
    components: {},
    testing: {},
    deployment: {}
  };

  // Apply 3-layer architecture from Context7
  enhancedArchitecture.layers = {
    transport: context7Data.architecture.mcp.layers.transport,
    protocol: context7Data.architecture.mcp.layers.protocol,
    business: context7Data.architecture.mcp.layers.business
  };

  // Apply SOLID principles
  enhancedArchitecture.patterns = {
    singleResponsibility: context7Data.architecture.solid.patterns.sr,
    dependencyInversion: context7Data.architecture.solid.patterns.di,
    interfaceSegregation: context7Data.architecture.solid.patterns.is
  };

  // Apply domain-specific patterns
  if (context7Data.patterns.domain) {
    enhancedArchitecture.components = context7Data.patterns.domain.recommended;
  }

  // Apply testing strategies
  enhancedArchitecture.testing = {
    unit: context7Data.libraries.testing.strategies.unit,
    integration: context7Data.libraries.testing.strategies.integration,
    e2e: context7Data.libraries.testing.strategies.e2e
  };

  // Apply deployment best practices
  enhancedArchitecture.deployment = context7Data.deployment.bestPractices;

  return enhancedArchitecture;
}

// Generate placeholder values with Context7 enhancements
function generatePlaceholders(req) {
  const name = req.serviceName || 'Custom Service';

  // Use Context7 to validate naming conventions
  const namingConventions = req.context7Data?.patterns?.naming || {};

  return {
    '[SERVICE_NAME]': name,
    '[service-name]': toKebabCase(name),
    '[service]': toCamelCase(name),
    '[SERVICE]': toUpperSnakeCase(name),
    '[SERVICE_PASCAL]': toPascalCase(name),
    '[Domain]': toPascalCase(req.domain || 'General'),
    '[DOMAIN]': toUpperCase(req.domain || 'GENERAL'),
    '[TOOL_COUNT]': req.toolCount || req.tools.length || 3,
    '[EXTERNAL_API_NAME]': req.apiName || req.apis?.[0]?.name || 'External API',
    '[API_KEY_ENV_VAR]': generateApiKeyVar(req.apiName || req.apis?.[0]?.name),
    // Context7-enhanced placeholders
    '[LIBRARY_VERSIONS]': req.context7Data?.libraries?.versions || {},
    '[SECURITY_PATTERNS]': req.context7Data?.security?.patterns || {},
    '[ERROR_HANDLING]': req.context7Data?.patterns?.errorHandling || {}
  };
}

// Case conversion helpers
const toKebabCase = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const toCamelCase = (str) => str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
  index === 0 ? word.toLowerCase() : word.toUpperCase()).replace(/\s+/g, '');
const toUpperSnakeCase = (str) => str.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
const toPascalCase = (str) => str.replace(/(?:^\w|[A-Z]|\b\w)/g, word =>
  word.toUpperCase()).replace(/\s+/g, '');
```

### Pre-Generation Validation
```javascript
// Ensure minimum requirements are met
function validateRequirements(req) {
  const errors = [];

  if (!req.serviceName) {
    req.serviceName = req.domain ? `${req.domain} Service` : 'Custom MCP Service';
  }

  if (!req.tools || req.tools.length === 0) {
    // Generate default tools based on domain
    req.tools = generateDefaultTools(req.domain);
  }

  if (!req.apis || req.apis.length === 0) {
    req.apis = [{
      name: 'External API',
      type: 'REST',
      auth: 'API Key'
    }];
  }

  return { valid: errors.length === 0, errors, requirements: req };
}
```

### Generation Sequence
Generate files in this EXACT order to avoid dependency issues:

1. **Types and Interfaces** (`src/types.ts`)
   - Start with base types
   - Add domain-specific types
   - Export all types

2. **Configuration** (`src/config/config.ts`)
   - Environment schema first
   - Validation functions
   - Export config object

3. **Base Errors** (`src/errors/base-errors.ts`)
   - ServiceError base class
   - Domain-specific errors
   - LLM-friendly error messages

4. **Business Layer** (`src/[service]-service.ts`)
   - Import types and errors
   - Implement service methods
   - Add resilience patterns

5. **Protocol Layer** (`src/[service]-mcp-server.ts`)
   - Tool schemas with Zod
   - Tool handlers
   - MCP server setup

6. **Transport Layer** (`src/server.ts`)
   - Transport selection logic
   - Server initialization
   - Shutdown handlers

### File Creation Commands
For each file, use this pattern:
```
Create file: [filepath]
Purpose: [what this file does]
Dependencies: [files that must exist first]
Key exports: [what this file exports]
```

## GENERATION REQUIREMENTS

Generate a complete MCP server implementation following these strict requirements:

### 1. ARCHITECTURE (MANDATORY) - AGENT-FIRST DESIGN

Implement a **3-Layer SOLID Architecture** with **Agent-First Patterns**:

#### Transport Layer (`server.ts`)
- Support both stdio (for local AI assistants) and HTTP streamable transport (for production)
- Environment-based transport selection via `MCP_TRANSPORT` variable
- Session management for HTTP transport with UUID-based session IDs
- Health check endpoint at `/health`
- **Metrics endpoint** at `/metrics` for MCP Inspector integration
- Graceful shutdown handlers for SIGTERM and SIGINT
- Fastify for HTTP server with CORS support

#### Protocol Layer (`[service]-mcp-server.ts`)
- MCP protocol implementation using `@modelcontextprotocol/sdk`
- **Intent-based tool consolidation** (max 15-20 tools)
- Tool registration with Zod schema validation
- **Agent-guiding response format** with next_actions and suggestions
- Structured error responses with **correction hints**
- Performance logging and **metrics tracking** for each tool
- Protocol version: '2025-06-18'

#### Business Layer (`[service]-service.ts`)
- Core business logic separated from protocol handling
- **Batch operation support** for token optimization
- **Field filtering** to reduce response size
- **Risk validation** for dangerous operations
- Integration with external APIs/services
- Data transformation with **agent-optimized formatting**
- Business-specific error handling with **retry guidance**

#### Agent-First Implementation Pattern
```typescript
// Tool handler with agent-first design
async handleManageResource(params: ManageResourceParams) {
  const startTime = Date.now();

  try {
    // Step 3: Token optimization
    const fields = params.fields || ['*'];
    const batch = params.batch || [params];

    // Step 4: Risk validation
    if (params.action === 'delete' && !params.reason) {
      throw new AgentError('DELETE_REQUIRES_REASON',
        'Provide reason parameter for audit trail');
    }

    // Process with field filtering
    const results = await this.service.processManageResource(
      batch, fields, params.action
    );

    // Step 2: Agent-guiding response
    const nextActions = this.determineNextActions(params.action, results);

    // Step 5: Track metrics
    this.metrics.trackToolCall('manageResource',
      Date.now() - startTime, true);

    return {
      success: true,
      data: results,
      next_actions: nextActions,
      suggestion: `${params.action} completed. Consider: ${nextActions[0]}`
    };
  } catch (error) {
    // Track error metrics
    this.metrics.trackToolCall('manageResource',
      Date.now() - startTime, false);

    // Agent-friendly error response
    return {
      success: false,
      error_code: error.code,
      message: error.message,
      suggestion: this.getErrorRecoverySuggestion(error),
      retry_after: error.retryAfter || 1
    };
  }
}
```

### 2. FOLDER STRUCTURE (MANDATORY)

```
mcp-[service-name]-server/
├── src/
│   ├── server.ts                    # Entry point with transport management
│   ├── [service]-mcp-server.ts      # MCP protocol implementation
│   ├── [service]-service.ts         # Business logic
│   ├── types.ts                     # TypeScript type definitions
│   ├── config/
│   │   ├── config.ts                # Environment configuration with Zod validation
│   │   └── auth-config.ts           # Authentication configuration
│   ├── cache/
│   │   └── [service]-cache.ts       # LRU caching with multi-tier TTLs
│   ├── errors/
│   │   └── base-errors.ts           # Custom error hierarchy
│   ├── logging/
│   │   └── logger-pino.ts           # Structured logging with Pino
│   ├── middleware/
│   │   ├── validation.ts            # Input validation middleware
│   │   ├── sanitization.ts          # Security sanitization
│   │   ├── rate-limit.ts            # Rate limiting implementation
│   │   └── auth.ts                  # Authentication middleware
│   ├── monitoring/                  # MANDATORY for Agent-First
│   │   ├── metrics.ts               # MCP metrics tracking
│   │   ├── inspector.ts             # MCP Inspector integration
│   │   └── performance.ts           # Performance monitoring
│   ├── security/
│   │   ├── sanitizer.ts             # Input sanitization and validation
│   │   └── security-monitor.ts      # Threat detection and monitoring
│   ├── audit/
│   │   └── audit-logger.ts          # Enterprise audit logging
│   ├── context/
│   │   └── context-manager.ts       # Request context management
│   ├── protocol/
│   │   └── json-rpc.ts              # JSON-RPC 2.0 utilities
│   ├── undici-resilience/           # HTTP resilience patterns
│   │   ├── config/
│   │   │   └── pool-config.ts       # Connection pool configuration
│   │   ├── http/
│   │   │   └── pool-manager.ts      # Optimized HTTP pool management
│   │   ├── monitoring/
│   │   │   ├── connection-monitor.ts # Connection health monitoring
│   │   │   └── metrics.ts           # Performance metrics collection
│   │   ├── resilience/
│   │   │   ├── circuit-breaker.ts   # Circuit breaker pattern
│   │   │   ├── bulkhead.ts          # Bulkhead isolation
│   │   │   ├── rate-limiter.ts      # API rate limiting
│   │   │   └── retry-strategy.ts    # Exponential backoff retry
│   │   ├── streaming/
│   │   │   ├── backpressure-handler.ts  # Stream backpressure management
│   │   │   ├── streaming-metrics.ts     # Stream performance metrics
│   │   │   └── streaming-pool-manager.ts # SSE connection management
│   │   └── index.ts                 # Package exports
│   └── utils/
│       └── version.ts                # Version management
├── docs/
│   ├── README.md                     # Project overview
│   ├── CLAUDE_DESKTOP_SETUP.md      # Claude Desktop integration guide
│   ├── CLINE_SETUP.md                # Cline VS Code integration guide
│   ├── MCP_INSPECTOR_TEST_GUIDE.md  # Testing with MCP Inspector
│   └── GITHUB_ACTIONS_SETUP.md      # CI/CD setup guide
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Continuous integration
│       ├── security.yml              # Security scanning
│       ├── docker.yml                # Container builds
│       ├── performance.yml           # Performance testing
│       └── release.yml               # Release automation
├── memory-bank/                      # Project knowledge base
│   ├── projectbrief.md              # Project overview and goals
│   ├── systemPatterns.md            # Architecture patterns
│   ├── techContext.md               # Technology decisions
│   └── progress.md                  # Development tracking
├── package.json                      # Dependencies and scripts
├── tsconfig.json                     # TypeScript configuration
├── eslint.config.js                  # ESLint flat config
├── vitest.config.ts                  # Test configuration
├── Dockerfile                        # Multi-stage container build
├── docker-compose.yml                # Container orchestration
├── .env.example                      # Environment variables template
├── CHANGELOG.md                      # Version history
└── LICENSE                           # License file
```

### 3. ENTERPRISE PATTERNS (MANDATORY)

#### Resilience Stack
Implement the following resilience patterns in order:
1. **Rate Limiter** → 2. **Bulkhead** → 3. **Circuit Breaker** → 4. **Retry Strategy** → 5. **Connection Pool**

```typescript
// Full resilience stack application
return await rateLimiter.execute(async () => {
  return await bulkhead.execute(async () => {
    return await circuitBreaker.execute(async () => {
      return await retryStrategy.execute(async () => {
        return await poolManager.request(options);
      });
    });
  });
});
```

#### Security Implementation
- Input sanitization using DOMPurify
- Attack pattern detection (SQL injection, XSS, path traversal)
- Security headers for HTTP transport
- Audit logging for all data access
- Threat monitoring and alerting

#### Caching Strategy
- Multi-tier LRU caching with different TTLs
- Cache key generation with consistent hashing
- Cache invalidation patterns
- Cache statistics and monitoring

#### Error Handling
```typescript
export class [Service]Error extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly timestamp: Date;
  public readonly correlationId?: string;
}
```

### 4. CODE PATTERN EXAMPLES

#### Tool Handler Pattern
```typescript
// PATTERN: Every tool handler MUST follow this structure
private async handle[ToolName](args: z.infer<typeof [ToolName]Schema>): Promise<ToolResponse> {
  const correlationId = generateCorrelationId();
  const startTime = Date.now();
  
  try {
    // 1. Validate inputs (already done by Zod)
    // 2. Call business layer
    const result = await this.service.[methodName](args);
    // 3. Format response
    return this.formatMcpResponse(result, correlationId, '[tool-name]');
  } catch (error) {
    // 4. Handle errors
    return this.handleToolError(error, '[tool-name]', correlationId, startTime);
  }
}
```

#### Error Class Pattern
```typescript
// PATTERN: Domain-specific errors MUST extend base error
export class [Domain]Error extends [Service]Error {
  constructor(message: string, code: string, statusCode?: number) {
    super(message, code, statusCode);
    this.name = '[Domain]Error';
  }
}
```

#### Correlation ID Pattern
```typescript
// ALWAYS generate correlation IDs for tracing
export function generateCorrelationId(): string {
  return `${process.pid}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
```

#### LLM-Friendly Response Pattern
```typescript
// ALWAYS structure responses for LLM comprehension
if (Array.isArray(data) && data.length === 0) {
  return {
    success: true,
    count: 0,
    results: [],
    message: 'No [items] found matching your criteria. Try adjusting your search parameters.',
    suggestions: ['suggestion1', 'suggestion2']
  };
}
```

### 5. CONFIGURATION (MANDATORY)

#### Environment Variables with Zod Validation
```typescript
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MCP_TRANSPORT: z.enum(['stdio', 'http']).default('stdio'),
  MCP_HTTP_PORT: z.coerce.number().min(1024).max(65535).default(8080),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  // Add domain-specific configuration
  [SERVICE_SPECIFIC_VARS]
});
```

## DOMAIN-SPECIFIC PATTERNS

### For API Integration Services
```typescript
// Additional configuration
API_BASE_URL: z.string().url(),
API_KEY: z.string().min(1),
API_TIMEOUT_MS: z.number().default(30000),
API_MAX_RETRIES: z.number().default(3),
```

### For Database Services
```typescript
// Additional configuration  
DB_CONNECTION_STRING: z.string(),
DB_POOL_SIZE: z.number().default(10),
DB_QUERY_TIMEOUT_MS: z.number().default(5000),
```

### For File Processing Services
```typescript
// Additional configuration
MAX_FILE_SIZE_MB: z.number().default(100),
ALLOWED_FILE_TYPES: z.string().transform(s => s.split(',')),
PROCESSING_TIMEOUT_MS: z.number().default(300000),
```

### 6. LOGGING AND MONITORING (MANDATORY)

#### Structured Logging with Pino
```typescript
class EnhancedLogger {
  logToolCall(toolName: string, params: any): void
  logPerformance(operation: string, startTime: number, metadata?: any): void
  logError(error: Error, context?: any): void
  logApiCall(endpoint: string, method: string, duration: number): void
}
```

#### Metrics Collection
- Request count and latency
- Cache hit/miss ratios
- Circuit breaker state changes
- Connection pool statistics
- Error rates by category

### 7. TYPE GENERATION PATTERNS

#### For API Responses
```typescript
// Base response type - ALWAYS include
export interface BaseApiResponse {
  success: boolean;
  timestamp: string;
  correlationId: string;
}

// Domain response - extend base
export interface [Domain]Response extends BaseApiResponse {
  data: [Domain]Data;
  metadata?: {
    source: string;
    cached: boolean;
    ttl?: number;
  };
}
```

#### For Tool Arguments
```typescript
// Pattern: [ToolName]Args
export interface [ToolName]Args {
  // Required fields first
  required1: string;
  required2: number;
  
  // Optional fields last
  optional1?: string;
  optional2?: boolean;
}
```

### 8. TESTING (MANDATORY) - AGENT-FIRST TESTING

#### MCP Inspector Testing
```bash
# MANDATORY: Test with MCP Inspector
npx @modelcontextprotocol/inspector

# Verify:
# 1. Tool count is under 20
# 2. All tools return agent-guiding responses
# 3. Error responses include suggestions
# 4. Batch operations work correctly
# 5. Field filtering reduces payload size
```

#### Agent-First Test Structure
```typescript
// Test agent-guiding responses
describe('Agent-First Tool Responses', () => {
  it('should include next_actions in all responses', async () => {
    const response = await tool.handle({ action: 'create' });
    expect(response).toHaveProperty('next_actions');
    expect(response.next_actions).toBeInstanceOf(Array);
    expect(response).toHaveProperty('suggestion');
  });

  it('should handle batch operations', async () => {
    const response = await tool.handle({
      batch: [{ id: '1' }, { id: '2' }]
    });
    expect(response.data).toHaveLength(2);
  });

  it('should respect field filtering', async () => {
    const response = await tool.handle({
      fields: ['id', 'name']
    });
    expect(Object.keys(response.data)).toEqual(['id', 'name']);
  });

  it('should validate risky operations', async () => {
    await expect(tool.handle({
      action: 'delete',
      // Missing reason
    })).rejects.toThrow('reason required');
  });
});

// Test metrics tracking
describe('Metrics Tracking', () => {
  it('should track tool selection frequency', async () => {
    await tool.handle({ action: 'read' });
    const metrics = await getMetrics();
    expect(metrics.tool_selection_frequency['manageTool']).toBe(1);
  });

  it('should track error rates', async () => {
    await tool.handle({ invalid: true }).catch(() => {});
    const metrics = await getMetrics();
    expect(metrics.error_rate_by_tool['manageTool']).toBeGreaterThan(0);
  });
});
```

#### Test Generation Pattern
```typescript
describe('[ComponentName]', () => {
  let component: [ComponentName];
  let mockDependency: MockType;
  
  beforeEach(() => {
    mockDependency = createMock();
    component = new [ComponentName](mockDependency);
  });
  
  describe('[methodName]', () => {
    it('should handle valid input', async () => {
      // Arrange
      const input = { /* valid data */ };
      
      // Act
      const result = await component.[methodName](input);
      
      // Assert
      expect(result).toMatchObject({
        success: true,
        data: expect.any(Object)
      });
    });
    
    it('should handle errors gracefully', async () => {
      // Test error scenarios
    });
  });
});
```

### 9. DOCKER DEPLOYMENT (MANDATORY)

#### Multi-Stage Dockerfile
```dockerfile
# Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine AS production
RUN apk add --no-cache dumb-init
RUN addgroup -g 1001 -S nodejs && adduser -S mcp -u 1001
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER mcp
EXPOSE 8080
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
```

### 10. DOCUMENTATION (MANDATORY)

Generate comprehensive documentation including:
- README.md with badges, features, architecture overview
- API documentation for each MCP tool
- Setup guides for Claude Desktop and Cline
- Docker deployment instructions
- Environment variable reference
- Troubleshooting guide

### 11. GITHUB ACTIONS WORKFLOWS (MANDATORY)

Create the following workflows in `.github/workflows/`:

#### CI Pipeline (`ci.yml`)
```yaml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  workflow_dispatch:

env:
  NODE_VERSION: '22.x'
  SKIP_UNIT_TESTS: true  # Temporary until tests implemented

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  build:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build-artifacts
          path: dist/

  test-unit:
    runs-on: ubuntu-latest
    needs: build
    if: env.SKIP_UNIT_TESTS != 'true'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm test

  test-mcp-protocol:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - name: Test MCP Protocol
        run: |
          # Test stdio transport
          timeout 3s npm run stdio < /dev/null || true

          # Test HTTP transport
          npm run http &
          sleep 2
          curl -f http://localhost:8080/health
          pkill -f "node dist/server.js" || true
```

#### Security Scanning (`security.yml`)
```yaml
name: Security Scanning

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 1'  # Weekly on Monday

env:
  SKIP_CODEQL: false

jobs:
  dependency-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run npm audit
        run: |
          npm audit --audit-level=moderate || true

  codeql:
    runs-on: ubuntu-latest
    if: github.event_name != 'pull_request' || github.event.pull_request.head.repo.full_name == github.repository
    permissions:
      actions: read
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - name: Initialize CodeQL
        if: env.SKIP_CODEQL != 'true'
        uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
      - name: Perform CodeQL Analysis
        if: env.SKIP_CODEQL != 'true'
        uses: github/codeql-action/analyze@v3

  secrets-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run GitLeaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

#### Docker Build (`docker.yml`)
```yaml
name: Docker Build and Push

on:
  push:
    branches: [main]
    tags: ['v*']
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' || github.event_name == 'workflow_dispatch'
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

#### Performance Testing (`performance.yml`)
```yaml
name: Performance Testing

on:
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * 1'  # Weekly on Monday at 2 AM

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: 'npm'
      - run: npm ci
      - run: npm run build

      - name: Run Performance Tests
        run: |
          # Start server
          npm run http &
          SERVER_PID=$!
          sleep 3

          # Run benchmarks
          npx autocannon -c 10 -d 30 -p 10 http://localhost:8080/health

          # Cleanup
          kill $SERVER_PID || true

      - name: Memory Usage Analysis
        run: |
          npm run http &
          SERVER_PID=$!
          sleep 3

          # Monitor memory for 60 seconds
          for i in {1..12}; do
            ps aux | grep "node dist/server.js" | grep -v grep | awk '{print $6}' >> memory.log
            sleep 5
          done

          kill $SERVER_PID || true

          # Analyze results
          echo "Memory usage over time:"
          cat memory.log
```

#### Integration Tests (`integration-tests.yml`)
```yaml
name: Integration Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test-transports:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        transport: [stdio, http]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: 'npm'
      - run: npm ci
      - run: npm run build

      - name: Test ${{ matrix.transport }} transport
        env:
          MCP_TRANSPORT: ${{ matrix.transport }}
        run: |
          if [ "${{ matrix.transport }}" = "stdio" ]; then
            timeout 3s npm run stdio < /dev/null || [ $? -eq 124 ]
          else
            npm run http &
            sleep 3
            curl -f http://localhost:8080/health
            pkill -f "node dist/server.js" || true
          fi

  test-docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker image
        run: docker build -t mcp-test .
      - name: Test Docker container
        run: |
          docker run -d -p 8080:8080 --name mcp-test mcp-test
          sleep 5
          curl -f http://localhost:8080/health
          docker stop mcp-test
```

#### Documentation (`docs.yml`)
```yaml
name: Documentation

on:
  push:
    paths:
      - 'docs/**'
      - 'README.md'
      - 'CHANGELOG.md'
  pull_request:
    paths:
      - 'docs/**'
      - 'README.md'

jobs:
  check-links:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check markdown links
        uses: gaurav-nelson/github-action-markdown-link-check@v1
        with:
          use-quiet-mode: 'yes'
          config-file: '.github/markdown-link-check.json'

  validate-markdown:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate Markdown files
        run: |
          npm install -g markdownlint-cli
          markdownlint '**/*.md' --ignore node_modules
```

#### Dependency Updates (`dependency-update.yml`)
```yaml
name: Dependency Updates

on:
  schedule:
    - cron: '0 3 * * 1'  # Weekly on Monday at 3 AM
  workflow_dispatch:

jobs:
  update-dependencies:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22.x'

      - name: Update dependencies
        run: |
          npx npm-check-updates -u --target minor
          npm install
          npm audit fix || true

      - name: Test updated dependencies
        run: |
          npm run lint
          npm run build

      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v5
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: 'chore: update dependencies'
          title: 'Automated dependency updates'
          body: |
            Automated dependency updates for security and bug fixes.

            - Updates dependencies to latest minor versions
            - Runs npm audit fix for security patches
            - All tests have passed with updated dependencies
          branch: deps/automated-updates
```

#### Release Automation (`release.yml`)
```yaml
name: Release

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to release (e.g., 1.0.0)'
        required: true

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      packages: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: 'npm'

      - name: Build release
        run: |
          npm ci
          npm run build

      - name: Create release archive
        run: |
          tar -czf mcp-server-${{ github.ref_name }}.tar.gz dist/ package.json

      - name: Generate changelog
        id: changelog
        run: |
          git log --pretty=format:"- %s" $(git describe --tags --abbrev=0 HEAD^)..HEAD > RELEASE_NOTES.md

      - name: Create GitHub Release
        uses: ncipollo/release-action@v1
        with:
          artifacts: "mcp-server-*.tar.gz"
          bodyFile: "RELEASE_NOTES.md"
          draft: false
          prerelease: false

      - name: Build and push Docker image
        run: |
          docker build -t ghcr.io/${{ github.repository }}:${{ github.ref_name }} .
          echo ${{ secrets.GITHUB_TOKEN }} | docker login ghcr.io -u ${{ github.actor }} --password-stdin
          docker push ghcr.io/${{ github.repository }}:${{ github.ref_name }}
```

#### Workflow Configuration Files

##### `.github/markdown-link-check.json`
```json
{
  "ignorePatterns": [
    {
      "pattern": "^http://localhost"
    },
    {
      "pattern": "^https://github.com/.*/blob/"
    }
  ],
  "timeout": "20s",
  "retryOn429": true,
  "retryCount": 5
}
```

##### `.github/dependabot.yml`
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5

  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"
```

### 12. CODE STANDARDS (MANDATORY)

#### Naming Conventions
- Files: kebab-case (e.g., `audit-logger.ts`)
- Classes: PascalCase (e.g., `AuditLogger`)
- Functions/Variables: camelCase (e.g., `logDataAccess`)
- Constants: UPPER_SNAKE_CASE (e.g., `DEFAULT_TIMEOUT`)
- Interfaces: PascalCase with 'I' prefix optional (e.g., `IServiceConfig` or `ServiceConfig`)

#### TypeScript Standards
- Strict mode enabled
- No implicit any
- Explicit return types for functions
- Comprehensive JSDoc comments
- Type-only imports where applicable

#### Code Organization
- One class/interface per file
- Barrel exports for clean module interfaces
- Dependency injection over direct imports
- Separation of concerns (SOLID principles)

## AI USAGE EXAMPLES

### Example 1: Weather Service Generation (Agent-First)

**Human**: Generate an MCP server for weather data with these tools:
- get_current_weather(location: string)
- get_forecast(location: string, days: number)
- get_alerts(location: string)

**AI**: I'll generate a complete MCP server using the 5-step agent-first pattern:

Step 1: Consolidating tools by intent:
- Instead of 3 separate tools, creating 2 consolidated tools:
  - `manageWeather(action: current|forecast|alerts, location, params)`
  - `searchWeatherData(query, filters, fields)`

Step 2: Agent-guiding responses:
```javascript
return {
  success: true,
  data: weatherData,
  next_actions: ["getForecast", "checkAlerts"],
  suggestion: "Current weather fetched. Consider checking alerts for this location"
}
```

Mapping placeholders:
- [SERVICE_NAME] = "Weather Data"
- [service-name] = "weather-data"
- [service] = "weatherData"

Creating folder structure with monitoring...
[Generates complete implementation with metrics tracking]

### Example 2: Database Query Service

**Human**: Create an MCP server for PostgreSQL queries with connection pooling

**AI**: I'll create a production-grade PostgreSQL MCP server. Here's my approach:

1. Using database-specific patterns
2. Implementing connection pooling with pg-pool
3. Adding query timeout protection
[Continues generation]

## AI SELF-VALIDATION COMMANDS

After generation, validate your output:

### 1. Structure Validation
```bash
# Verify all required files exist
find src -type f -name "*.ts" | wc -l  # Should be at least 25 files

# Check folder structure
tree -d -L 3 src  # Should match the template structure
```

### 2. Import Validation
```bash
# No circular dependencies
npx madge --circular src

# All imports resolve
npx tsc --noEmit
```

### 3. Pattern Validation
```bash
# All tools have correlation IDs
grep -r "correlationId" src/[service]-mcp-server.ts | wc -l  # Should equal tool count

# All errors extend base error
grep -r "extends.*Error" src/errors/*.ts
```

## VALIDATION CHECKLIST

Ensure the generated code meets ALL these criteria:

### Architecture & Design
- [ ] Implements 3-layer SOLID architecture
- [ ] Clear separation between transport, protocol, and business layers
- [ ] Follows dependency inversion principle
- [ ] Implements all required resilience patterns
- [ ] Uses dependency injection for testability

### Security & Compliance
- [ ] Input sanitization on all user inputs
- [ ] Attack pattern detection implemented
- [ ] Audit logging for data access
- [ ] Security headers for HTTP transport
- [ ] No hardcoded secrets or credentials

### Code Quality
- [ ] TypeScript strict mode enabled
- [ ] Comprehensive error handling
- [ ] Proper logging at all levels
- [ ] Performance monitoring implemented
- [ ] Memory leak prevention

### Testing & Documentation
- [ ] Unit tests for core functionality
- [ ] Integration tests for external APIs
- [ ] Comprehensive README
- [ ] API documentation for all tools
- [ ] Setup guides for AI assistants

### Deployment & Operations
- [ ] Multi-stage Docker build
- [ ] Health check endpoint
- [ ] Graceful shutdown handling
- [ ] Environment-based configuration
- [ ] CI/CD pipelines configured

### Performance & Scalability
- [ ] Connection pooling implemented
- [ ] Caching strategy in place
- [ ] Rate limiting configured
- [ ] Backpressure handling for streams
- [ ] Resource cleanup on shutdown

## QUICK START (Minimal Implementation)

For a basic MCP server, implement only:
1. Transport layer (stdio only)
2. Protocol layer (basic tool registration)
3. Business layer (core functionality)

<details>
<summary>Click to expand full enterprise features</summary>

### ENTERPRISE FEATURES (Optional)

#### Advanced Resilience
Full resilience stack implementation with circuit breakers, bulkheads, and retry strategies

#### Security Hardening
Complete security implementation with DOMPurify, attack detection, and audit logging

#### Performance Optimization
Caching, connection pooling, streaming optimization, and comprehensive monitoring

</details>

## EXAMPLE OUTPUT STRUCTURE

When generating the MCP server, provide:

1. **Complete source code files** with full implementations
2. **Configuration files** (package.json, tsconfig.json, etc.)
3. **Docker files** (Dockerfile, docker-compose.yml)
4. **Documentation** (README.md, setup guides)
5. **GitHub Actions workflows**
6. **Environment configuration** (.env.example)

## ADDITIONAL NOTES

### ⚠️ MANDATORY Context7 Integration Checklist

Before generating ANY code:
- ✅ **FETCH** latest library versions via Context7
- ✅ **VERIFY** all design patterns against current best practices
- ✅ **UPDATE** deprecated code patterns with modern alternatives
- ✅ **APPLY** security best practices from Context7
- ✅ **INJECT** performance optimizations from Context7

### Technical Requirements
- Use Node.js 22.x as the runtime (verify latest LTS via Context7)
- Use latest versions of dependencies (fetched from Context7)
- Include comprehensive error messages with hints for troubleshooting
- Add correlation IDs for request tracing
- Implement health checks for all external dependencies
- Use structured logging for better observability
- Follow 12-factor app principles
- Ensure zero-downtime deployments
- Implement proper secret management
- Add OpenTelemetry hooks for future observability

### Context7 Benefits for AI Code Assistants
When this template is used with Context7 integration:
- **Cline**: Will generate more accurate code with fewer iterations
- **Claude Code**: Will produce production-ready code on first attempt
- **GitHub Copilot**: Will suggest current patterns instead of outdated ones
- **Cursor**: Will have better context awareness for refactoring
- **Any AI Assistant**: Will reduce debugging time by 70%+

### 🎯 The Bottom Line for Agent-First MCP Servers

**Your existing REST API wasn't designed for AI consumption—and that's okay.**

But cramming it wholesale into MCP is a recipe for failure. Agents need:
- **Fewer, smarter tools** with clear intentions (10-15 max)
- **Helpful guidance** in every response (next_actions, suggestions)
- **Token optimization** at every level (batching, filtering, caching)
- **Explicit safety** for dangerous operations

**Stop converting your APIs. Start curating them for agents.**

Remember: In the world of AI agents:
- **Less is more** (fewer tools = faster decisions)
- **Intent beats granularity** (consolidated tools > atomic endpoints)
- **Every token counts** (optimize ruthlessly)
- **Guidance prevents failure** (help agents succeed)

Build with these principles, and watch your agents transform from confused API browsers into capable digital assistants achieving:
- ✅ 70% reduction in token costs
- ✅ 5x faster task completion
- ✅ 90% reduction in timeouts
- ✅ Near-elimination of selection errors

## 🔍 MANDATORY SELF-CRITIQUE & REFINEMENT CHECKLIST

### Architecture Self-Validation (Check BEFORE Implementation)

#### ✅ Agent-First Architecture Review
```markdown
□ Tool consolidation strategy defined (target 10-15 tools)
□ Intent-based grouping documented
□ Response format standardized across all tools
□ Error handling patterns consistent
□ Token optimization strategy clear
□ Risk bands properly separated
□ Metrics collection points identified
□ Agent story clearly articulated
```

#### ✅ Technical Architecture Audit
```markdown
□ 3-layer architecture properly separated (Transport/Protocol/Business)
□ SOLID principles applied throughout
□ Dependency injection used consistently
□ Error hierarchy well-defined
□ Logging strategy comprehensive
□ Security layers implemented
□ Caching strategy optimized
□ Connection pooling configured
```

#### ✅ Implementation Quality Gates
```markdown
□ TypeScript strict mode enforced
□ No implicit any types
□ All async operations properly handled
□ Circuit breakers in place
□ Rate limiting implemented
□ Input sanitization complete
□ Correlation IDs throughout
□ Graceful degradation patterns
```

### 🔄 CONTINUOUS REFINEMENT PROTOCOL

**Execute after EACH architectural decision:**

```typescript
interface ArchitectureReview {
  checkpoints: {
    toolCount: () => boolean;           // Verify < 20 tools
    responseFormat: () => boolean;      // All have next_actions
    tokenOptimization: () => boolean;   // Fields, batching enabled
    errorHandling: () => boolean;       // Suggestions included
    performance: () => boolean;         // Meets latency targets
  };

  refine(architecture: MCP): MCP {
    const issues = this.analyze(architecture);

    if (issues.toolCount > 20) {
      architecture = this.consolidateTools(architecture);
    }

    if (!issues.hasNextActions) {
      architecture = this.addAgentGuidance(architecture);
    }

    if (issues.tokenUsage > TARGET) {
      architecture = this.optimizePayloads(architecture);
    }

    return this.validate(architecture) ?
      architecture :
      this.refine(architecture); // Recursive refinement
  }
}
```

### 📊 Architecture Success Metrics

```typescript
class ArchitectureValidator {
  private criteria = {
    tools: { min: 10, max: 20 },
    responseTime: { p95: 500, p99: 1000 },
    tokenReduction: { target: 0.70 },
    errorRate: { max: 0.05 },
    codeQuality: {
      testCoverage: 0.80,
      cyclomaticComplexity: 10,
      duplicateCode: 0.05
    }
  };

  validateArchitecture(): ValidationReport {
    return {
      toolDesign: this.checkToolCount(),
      performance: this.checkPerformanceTargets(),
      quality: this.checkCodeQuality(),
      agentFirst: this.checkAgentPatterns(),
      overall: this.computeOverallScore()
    };
  }

  autoCorrect(issues: Issue[]): Architecture {
    // Automatically fix common architecture issues
    issues.forEach(issue => {
      switch(issue.type) {
        case 'TOO_MANY_TOOLS':
          this.consolidateByIntent();
          break;
        case 'MISSING_GUIDANCE':
          this.addNextActions();
          break;
        case 'LARGE_PAYLOADS':
          this.implementFieldFiltering();
          break;
      }
    });
    return this.revalidate();
  }
}
```

### 🎯 Final Quality Gate

**BEFORE considering the architecture complete:**

```markdown
FINAL CHECKLIST:
□ Agent can complete top 5 user stories with < 3 tool calls each
□ Token usage reduced by at least 70% vs REST equivalent
□ All tools have clear, non-overlapping intents
□ Every response guides the agent to next action
□ Performance metrics meet all targets
□ Security review passed
□ Documentation complete
□ MCP Inspector validation successful

SELF-CRITIQUE QUESTIONS:
1. Would a new developer understand the tool consolidation logic?
2. Can an agent distinguish between similar tools easily?
3. Are error messages actionable for agents?
4. Is token optimization visible in every response?
5. Would this scale to 100x current load?
```

## TEMPLATE METADATA

### Template Version: 2.0.0
### Based on: hurricane-tracker-mcp v1.0.5
### Last Updated: 2024-12-20
### Compatibility: MCP Protocol 2025-06-18

### Version History
- 2.0.0 (2024-12-20): Enhanced with AI-friendly features, code patterns, validation
- 1.0.0 (2024-12-15): Initial template based on hurricane-tracker-mcp

---

## Template Support

For questions or improvements to this template:
- Create an issue in the template repository
- Submit PRs with enhancements
- Join the MCP community discussions

Remember: This template is designed to generate production-ready MCP servers with enterprise features. Adapt as needed for your specific use case while maintaining the core architectural principles.