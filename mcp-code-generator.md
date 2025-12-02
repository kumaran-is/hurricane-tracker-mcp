# Production-Grade MCP Server Generator Template v2.0
## AI-Optimized for Exact Code Replication

> **VERSION**: 2.0.0
> **BASE**: hurricane-tracker-mcp v1.0.5
> **PURPOSE**: Generate byte-for-byte identical MCP servers
> **COMPATIBILITY**: Claude 3+, GPT-4+, GitHub Copilot

---

# 🤖 AI ASSISTANT: READ THIS FIRST

## ⚠️ MANDATORY: Context7 MCP Server Integration

**BEFORE GENERATING ANY CODE, YOU MUST:**

1. **USE Context7 MCP Server** to fetch up-to-date, version-specific documentation and code examples for all libraries/frameworks
2. **INJECT** the fetched documentation into your generation prompts
3. **VERIFY** library versions and API signatures against latest documentation
4. **UPDATE** any deprecated patterns with current best practices

### Benefits of Context7 Integration:
- ✅ More accurate code generation by AI Code Assistants (Cline, Claude Code, GitHub Copilot)
- ✅ Reduced error & debugging overhead
- ✅ Improved trust and maintainability
- ✅ Always using latest library versions and patterns
- ✅ Automatic detection of breaking changes

### How to Use Context7:
```javascript
// Before generating code for any library:
const context7 = await mcp.tools.context7.fetch({
  library: 'axios', // or 'express', 'typescript', etc.
  version: 'latest',
  topics: ['authentication', 'error-handling', 'interceptors']
});

// Inject into generation context
generationContext.libraryDocs = context7.documentation;
generationContext.codeExamples = context7.examples;
generationContext.bestPractices = context7.patterns;
```

## ⚡ MANDATORY: Agent-First Design Principles

### The Hidden Cost of Tool Overload
**CRITICAL**: AI agents process EVERY tool's name, description, and parameters on EVERY decision. Each additional endpoint adds latency and token costs to EVERY interaction.

**Human developers vs AI agents:**
- Humans: Discover once, chain calls effortlessly, navigate 100s of endpoints
- AI agents: Pay token tax per endpoint, suffer decision paralysis, burn tokens on round trips

**THE BRUTAL REALITY**: Agentic iteration is expensive. Your carefully crafted REST API becomes a cognitive burden that drowns agents in choices.

## 📋 MANDATORY: 5-Step Agent-First Pattern

**ALL GENERATED MCP SERVERS MUST FOLLOW THIS PATTERN:**

### Step 1: Consolidate by Intent, Not Endpoints
**Stop mapping endpoints—start mapping intentions.**

- ❌ **WRONG**: 6 separate tools: `createUser`, `updateUser`, `deleteUser`, `getUserById`, `getUserByEmail`, `searchUsers`
- ✅ **RIGHT**: 2 intent-based tools: `manageUserProfile(action)`, `searchUsers(query)`
- **HARD LIMIT**: Maximum 15-20 tools total (prefer closer to 10-12)
- **70% TOKEN REDUCTION**: This approach reduces token costs by 70% and speeds decisions by 5x

### Step 2: Make Responses Agent-Guiding, Not Just Informative
**Every response should tell the agent what to do next. This isn't about being verbose—it's about being directive.**

✅ **MANDATORY Response Format:**
```javascript
{
  success: true,
  data: { /* only requested fields */ },
  next_actions: ["verify_email", "setup_profile"], // machine-readable
  suggestion: "User created. Next: call verify_email with user_id" // human-readable guidance
}
```

✅ **MANDATORY Error Format with Correction Hints:**
```javascript
{
  error_code: "EMAIL_INVALID",
  message: "Provided email address is not valid",
  suggestion: "Use a valid RFC5321-compliant email and retry", // correction hint
  retry_after: 1
}
```

### Step 3: Optimize for Tokens and Latency
**Every token counts. Every millisecond matters. This can reduce response sizes by 80%+**

- **Batch operations**: `getUsers({ ids: ["U123", "U456"] })` - Single call vs multiple
- **Field filtering**: `fields: ["id", "email"]` - Return only what's needed (80% size reduction)
- **Cache aggressively**: Version and cache static lookups with LRU strategy
- **Paginate smartly**: Use cursor-based pagination, not offset-based

### Step 4: Build in Permission Guardrails
**Agents don't have human judgment. Make dangerous operations explicit and require confirmation.**

```javascript
// MANDATORY: Separate risky operations with explicit flags
deleteUser.params = {
  user_id: "U123",
  risky: true,                         // explicit risk flag
  reason: "Cleanup inactive account",  // MANDATORY audit trail
  ticket_id: "JIRA-7891"               // optional tracking
}

// MANDATORY: Scope by agent role
agent.permissions = {
  role: "operator",  // read_only | operator | admin
  allowed_tools: ["read-users", "create-user", "update-user-profile"]
  // Note: delete operations explicitly excluded
}
```

### Step 5: Test with Real Agent Behavior & Track Critical Metrics
```bash
npx @modelcontextprotocol/inspector
```

**MANDATORY Metrics to Track:**
- **Tool selection frequency**: Which tools are actually used? (Unused = delete)
- **Error rates by tool**: Where are agents failing? (High error = redesign)
- **Average tools per task**: Too many hops = poor consolidation
- **Abandon rate**: How often do agents give up? (Target < 5%)
- **Token usage per task**: Are we optimizing enough? (Target 70% reduction)

**Expected Results After Implementation:**
- ✅ 70% reduction in token costs
- ✅ 5x faster task completion
- ✅ 90% reduction in agent timeouts
- ✅ Near-elimination of tool selection errors

## 🔙 STEP-BACK: Understanding the Problem Space First

### Before ANY code generation, step back and understand:

#### 1️⃣ **The Fundamental Problem**
```markdown
STEP BACK AND ANSWER:
□ What problem is this MCP server solving?
□ Who are the end users (humans using agents)?
□ What are the top 5 use cases?
□ What makes this different from a REST API?
□ Why do agents struggle with traditional APIs?
```

#### 2️⃣ **The Agent's Perspective**
```markdown
THINK LIKE AN AGENT:
□ How would an agent discover these tools?
□ What decisions must the agent make?
□ Where might the agent get confused?
□ What context does the agent lack?
□ How can we minimize agent cognitive load?
```

#### 3️⃣ **The System Architecture**
```markdown
ARCHITECTURAL CONTEXT:
□ What external systems are involved?
□ What are the performance constraints?
□ What are the security requirements?
□ What are the scaling considerations?
□ What are the failure modes?
```

### 🎯 Start with the Story, Not the Spec

**MINDSET SHIFT**: Don't ask "How do I expose my API to agents?" Ask "What story should my agent be able to tell?"

### Write the Agent Story First:
1. **Define the story**: "As an agent, given {context}, I use {tools} to achieve {outcome}"
2. **Build ONLY the tools required** for that story
3. **Test with real agent behavior**, not assumptions
4. **Iterate based on metrics**, not features

**Example Story**:
> "As an agent, given a user request for weather information, I use `queryWeather` to get all weather data (current/forecast/alerts) in one call, then use `subscribeAlerts` if the user wants notifications."

This story needs just 2 tools, not 10.

### 🔍 Step-Back Analysis Framework

```typescript
// BEFORE generating any code, complete this analysis:
interface StepBackAnalysis {
  // Domain Understanding
  problemDomain: {
    coreProblem: string;
    userNeeds: string[];
    currentPainPoints: string[];
    successCriteria: string[];
  };

  // Agent Workflow Analysis
  agentWorkflow: {
    entryPoints: string[];      // How agents start
    decisionPoints: string[];   // Where agents choose
    dataNeeds: string[];        // What agents need
    exitConditions: string[];   // How agents complete
  };

  // Tool Design Rationale
  toolDesign: {
    consolidationLogic: string; // Why these groupings?
    exclusions: string[];        // What we're NOT including
    tradeoffs: string[];        // What we're sacrificing
    optimizations: string[];     // What we're prioritizing
  };

  // Expected Outcomes
  expectations: {
    tokenReduction: number;      // Target %
    latencyImprovement: number;  // Target multiplier
    errorReduction: number;       // Target %
    userSatisfaction: string;    // How measured
  };
}
```

## ⏸️ BEFORE YOU CODE: Mandatory Step-Back Questions

### Answer these BEFORE writing ANY code:

```markdown
1. PROBLEM SPACE:
   - What business problem does this solve? _______________
   - What can't agents do today that this enables? ________
   - What's the #1 user frustration we're addressing? _____

2. AGENT PSYCHOLOGY:
   - What confuses agents about the current approach? ______
   - What decisions are hardest for agents? _______________
   - How do agents currently fail? ________________________

3. ARCHITECTURAL WISDOM:
   - What similar systems already exist? __________________
   - What patterns can we reuse? __________________________
   - What mistakes should we avoid? _______________________

4. SUCCESS DEFINITION:
   - How will we know this works? _________________________
   - What metrics prove success? __________________________
   - What would failure look like? ________________________
```

## Core Generation Instructions

You are about to generate a production-ready MCP server optimized for AI agents. Your job is to:

1. **STEP BACK** and understand the problem domain completely
2. **UNDERSTAND** the agent story and intended workflow
3. **FETCH** latest documentation via Context7 MCP server
4. **APPLY** the 5-step agent-first pattern ruthlessly
5. **CONSOLIDATE** tools by intent (target 10-15 tools max)
6. **OPTIMIZE** every response for tokens and guidance
7. **TEST** with MCP Inspector and track metrics
8. **VERIFY** agent success metrics meet targets

## 🎯 QUICK START FOR AI ASSISTANTS

### Step 1: Collect Requirements From User (3 Flexible Options)

**AI: The user can provide requirements in ANY of these formats (or combination):**

#### 📝 Option A: Simple Form Input
```
REQUIRED INFORMATION:
□ Service Name: _________________ (e.g., "Weather Analyzer")
□ Number of Tools: _______________ (e.g., 5)
□ External API Name: _____________ (e.g., "OpenWeatherMap")
□ API Authentication: ____________ (e.g., "API Key")
```

#### 📄 Option B: OpenAPI 3.0 Specification
```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Weather Analytics API",
    "version": "1.0.0",
    "description": "Real-time weather data and analytics"
  },
  "servers": [
    { "url": "https://api.openweathermap.org/data/2.5" }
  ],
  "paths": {
    "/weather": {
      "get": {
        "operationId": "getCurrentWeather",
        "summary": "Get current weather data",
        "parameters": [
          {
            "name": "q",
            "in": "query",
            "required": true,
            "schema": { "type": "string" },
            "description": "City name"
          }
        ],
        "responses": {
          "200": { "description": "Weather data" }
        }
      }
    }
  },
  "security": [
    { "ApiKeyAuth": [] }
  ]
}
```

#### 📋 Option C: Requirements Description (YAML/Text)
```yaml
# User can provide free-form requirements:

project_name: "weather-analytics-mcp"
domain: "Weather & Climate"
purpose: "Provide real-time weather data and climate analytics through MCP"

environment:
  deployment: "Cloud (AWS/Azure/GCP)"
  expected_load: "1000 requests/second"
  data_sensitivity: "Public"
  compliance: "None"
  context_window: "16K tokens"

use_cases:
  - "Get current weather for any location"
  - "Analyze historical weather patterns"
  - "Generate weather forecasts"
  - "Climate trend analysis"
  - "Severe weather alerts"

data_sources:
  - name: "OpenWeather API"
    type: "REST API"
    auth: "API Key"
    base_url: "https://api.openweathermap.org/data/2.5"
    rate_limit: "60 calls/minute"

  - name: "NOAA Climate Data"
    type: "REST API"
    auth: "Token"
    base_url: "https://www.ncdc.noaa.gov/cdo-web/api/v2"
    rate_limit: "1000 calls/day"

tools:
  - name: "get_current_weather"
    description: "Get real-time weather data for a location"
    inputs:
      - name: "location"
        type: "string"
        required: true
        description: "City name or coordinates"
      - name: "units"
        type: "string"
        required: false
        description: "metric or imperial"
    output: "Current temperature, conditions, humidity, wind speed"

  - name: "get_forecast"
    description: "Get weather forecast for next N days"
    inputs:
      - name: "location"
        type: "string"
        required: true
      - name: "days"
        type: "number"
        required: false
        default: 5
    output: "Daily forecasts with temperatures, precipitation"

  - name: "analyze_weather_trend"
    description: "Analyze weather patterns over time"
    inputs:
      - name: "location"
        type: "string"
        required: true
      - name: "date_range"
        type: "object"
        required: true
        properties:
          start: "date"
          end: "date"
      - name: "metrics"
        type: "array"
        required: false
    output: "Trend analysis with statistics"

technical_requirements:
  cache_ttl: 300          # 5 minutes
  rate_limit: 100         # requests per minute per client
  timeout: 30000          # 30 seconds
  retry_attempts: 3
  circuit_breaker: true
  connection_pooling: true

security:
  authentication: "API Key"
  rate_limiting: true
  input_sanitization: true
  audit_logging: true
  encryption_at_rest: false
  encryption_in_transit: true

performance:
  target_response_time: "< 500ms"
  concurrent_requests: 50
  cache_strategy: "LRU"
  database_pooling: true
```

### Step 2: AI Processing Logic - Extract From Any Format

```javascript
// AI: Universal extraction logic for any input format

async function extractRequirements(userInput) {
  let requirements = {
    serviceName: null,
    toolCount: 0,
    apiName: null,
    authMethod: null,
    tools: [],
    dataSources: [],
    technicalSpecs: {},
    context7Data: {} // Store Context7 fetched documentation
  };

  // Detect input format
  if (typeof userInput === 'string') {
    // Option A: Simple form detection
    if (userInput.includes("Service Name:") || userInput.includes("□")) {
      requirements.serviceName = extractFormField(userInput, "Service Name:");
      requirements.toolCount = parseInt(extractFormField(userInput, "Number of Tools:")) || 0;
      requirements.apiName = extractFormField(userInput, "External API Name:");
      requirements.authMethod = extractFormField(userInput, "API Authentication:");
    }
    // Option C: YAML/Text requirements
    else if (userInput.includes("project_name:") || userInput.includes("tools:")) {
      const parsed = parseYAML(userInput);
      requirements.serviceName = parsed.project_name ||
                                parsed.domain ||
                                "Custom Service";
      requirements.tools = parsed.tools || [];
      requirements.toolCount = requirements.tools.length;
      requirements.dataSources = parsed.data_sources || [];
      requirements.apiName = requirements.dataSources[0]?.name || "External API";
      requirements.authMethod = requirements.dataSources[0]?.auth || "API Key";
      requirements.technicalSpecs = parsed.technical_requirements || {};
    }
  }
  // Option B: OpenAPI JSON detection
  else if (typeof userInput === 'object' || userInput.includes('"openapi"')) {
    const spec = typeof userInput === 'object' ? userInput : JSON.parse(userInput);
    requirements.serviceName = spec.info.title.replace(/API/gi, '').trim() || "API Service";

    // Extract tools from paths
    requirements.tools = [];
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        if (operation.operationId) {
          requirements.tools.push({
            name: operation.operationId,
            description: operation.summary || operation.description,
            parameters: operation.parameters || [],
            method: method.toUpperCase()
          });
        }
      }
    }
    requirements.toolCount = requirements.tools.length;

    // Extract API info
    requirements.apiName = spec.info.title || "External API";
    requirements.authMethod = spec.security?.[0] ?
                             Object.keys(spec.security[0])[0] :
                             "API Key";
  }

  // Fallback defaults if any field is missing
  requirements.serviceName = requirements.serviceName || "Custom MCP Service";
  requirements.toolCount = requirements.toolCount || 3;
  requirements.apiName = requirements.apiName || "External API";
  requirements.authMethod = requirements.authMethod || "None";

  // MANDATORY: Fetch Context7 documentation for all identified libraries
  requirements.context7Data = await fetchContext7Documentation(requirements);

  return requirements;
}

// MANDATORY: Fetch up-to-date documentation via Context7
async function fetchContext7Documentation(requirements) {
  const context7Data = {
    core: {},
    libraries: {},
    apis: {},
    bestPractices: {}
  };

  // Core MCP and TypeScript documentation
  context7Data.core.mcp = await context7.fetch({
    library: '@modelcontextprotocol/sdk',
    version: 'latest',
    topics: ['server-setup', 'tools', 'error-handling', 'transport']
  });

  context7Data.core.typescript = await context7.fetch({
    library: 'typescript',
    version: 'latest',
    topics: ['strict-mode', 'types', 'async-await', 'error-handling']
  });

  // Framework documentation
  context7Data.libraries.axios = await context7.fetch({
    library: 'axios',
    version: 'latest',
    topics: ['interceptors', 'error-handling', 'retries', 'auth-headers']
  });

  context7Data.libraries.zod = await context7.fetch({
    library: 'zod',
    version: 'latest',
    topics: ['schema-validation', 'error-messages', 'transforms']
  });

  // API-specific documentation if external API is identified
  if (requirements.apiName && requirements.apiName !== "External API") {
    context7Data.apis[requirements.apiName] = await context7.fetch({
      api: requirements.apiName,
      topics: ['authentication', 'rate-limiting', 'endpoints', 'error-codes']
    });
  }

  // Best practices for production code
  context7Data.bestPractices = await context7.fetch({
    topic: 'production-mcp-servers',
    subtopics: ['security', 'performance', 'monitoring', 'testing']
  });

  return context7Data;
}

// Calculate all placeholder values from extracted requirements
function calculatePlaceholders(requirements) {
  const serviceName = requirements.serviceName;

  // APPLY 5-STEP AGENT-FIRST PATTERN
  const consolidatedTools = consolidateToolsByIntent(requirements.tools);

  return {
    "[SERVICE_NAME]": serviceName,
    "[service-name]": serviceName.toLowerCase()
                                 .replace(/[^a-z0-9]+/g, '-')
                                 .replace(/^-|-$/g, ''),
    "[service]": serviceName.replace(/[^a-zA-Z0-9]/g, '')
                           .charAt(0).toLowerCase() +
                 serviceName.replace(/[^a-zA-Z0-9]/g, '')
                           .slice(1),
    "[SERVICE]": serviceName.toUpperCase()
                           .replace(/[^A-Z0-9]+/g, '_')
                           .replace(/^_|_$/g, ''),
    "[SERVICE_PASCAL]": serviceName.replace(/[^a-zA-Z0-9]/g, ''),
    "[SERVICE_UPPER]": serviceName.toUpperCase()
                                 .replace(/[^A-Z0-9]+/g, '_'),
    "[TOOL_COUNT]": consolidatedTools.length.toString(), // Use consolidated count
    "[EXTERNAL_API_NAME]": requirements.apiName,
    "[API_KEY_ENV_VAR]": requirements.apiName.toUpperCase()
                                             .replace(/[^A-Z0-9]+/g, '_') +
                         "_API_KEY",
    // Agent-first tool placeholders
    "[TOOL_SCHEMAS_PLACEHOLDER]": generateAgentFirstToolSchemas(consolidatedTools),
    "[TOOL_REGISTRATION_PLACEHOLDER]": generateToolRegistrations(consolidatedTools),
    "[TOOL_HANDLERS_PLACEHOLDER]": generateAgentFirstToolHandlers(consolidatedTools),
    "[SERVICE_METHODS_PLACEHOLDER]": generateServiceMethods(consolidatedTools),
  };
}

// STEP 1: Consolidate by intent
function consolidateToolsByIntent(tools) {
  const consolidated = [];
  const intentGroups = {};

  tools.forEach(tool => {
    const intent = extractIntent(tool.name); // e.g., "user" from "createUser"
    if (!intentGroups[intent]) {
      intentGroups[intent] = [];
    }
    intentGroups[intent].push(tool);
  });

  Object.entries(intentGroups).forEach(([intent, tools]) => {
    if (tools.length > 1) {
      // Consolidate CRUD operations
      consolidated.push({
        name: `manage${intent.charAt(0).toUpperCase() + intent.slice(1)}`,
        actions: tools.map(t => extractAction(t.name)),
        original: tools
      });
    } else {
      consolidated.push(tools[0]);
    }
  });

  // Ensure we have max 15-20 tools
  if (consolidated.length > 20) {
    console.warn("Warning: Tool count exceeds 20. Consider further consolidation.");
  }

  return consolidated;
}

// STEP 2: Generate agent-guiding schemas
function generateAgentFirstToolSchemas(tools) {
  return tools.map(tool => {
    const schema = {
      name: tool.name,
      description: tool.description,
      inputSchema: {
        type: "object",
        properties: {
          ...tool.properties,
          // Add agent-first properties
          fields: {
            type: "array",
            description: "Specific fields to return (reduces token usage)",
            items: { type: "string" }
          },
          batch: {
            type: "array",
            description: "Batch multiple operations",
            items: { type: "object" }
          }
        }
      },
      // Response shape with agent guidance
      responseShape: {
        success: "boolean",
        data: "object",
        next_actions: "array<string>",
        suggestion: "string"
      }
    };

    // Add risk bands for dangerous operations
    if (tool.name.includes("delete") || tool.name.includes("update")) {
      schema.inputSchema.properties.risky = {
        type: "boolean",
        description: "Marks operation as high risk"
      };
      schema.inputSchema.properties.reason = {
        type: "string",
        description: "Audit log reason (required for risky operations)"
      };
    }

    return schema;
  }).join('\n');
}

// STEP 3: Generate optimized handlers
function generateAgentFirstToolHandlers(tools) {
  return tools.map(tool => `
    async handle${tool.name}(params) {
      try {
        // Token optimization: filtered fields
        const fields = params.fields || ['*'];

        // Batch support where safe
        if (params.batch && params.batch.length > 0) {
          const results = await Promise.all(
            params.batch.map(item => this.process${tool.name}(item, fields))
          );
          return this.agentResponse(true, results, tool.name);
        }

        // Risk validation for dangerous operations
        ${tool.risky ? `
        if (!params.reason) {
          throw new Error("Reason required for risky operation");
        }
        await this.auditLog(tool.name, params.reason, params);
        ` : ''}

        // Execute operation
        const result = await this.process${tool.name}(params, fields);

        // STEP 2: Return agent-guiding response
        return this.agentResponse(true, result, tool.name);
      } catch (error) {
        return this.agentErrorResponse(error, tool.name);
      }
    }
  `).join('\n');
}

// Agent response helper
function agentResponse(success, data, toolName) {
  const nextActions = determineNextActions(toolName, data);
  return {
    success,
    data,
    next_actions: nextActions,
    suggestion: generateSuggestion(toolName, nextActions, data)
  };
}

// Error response with correction hints
function agentErrorResponse(error, toolName) {
  return {
    success: false,
    error_code: error.code || "UNKNOWN_ERROR",
    message: error.message,
    suggestion: generateErrorSuggestion(error, toolName),
    retry_after: error.retryAfter || 1
  };
}
```

### Step 3: Context7-Enhanced Code Generation

```javascript
// MANDATORY: Use Context7 data during code generation
function generateCodeWithContext7(template, placeholders, context7Data) {
  let enhancedCode = template;

  // 1. Update library versions to latest
  enhancedCode = enhancedCode.replace(
    /"axios": ".*"/g,
    `"axios": "${context7Data.libraries.axios.latestVersion}"`
  );

  // 2. Replace deprecated patterns with current best practices
  if (context7Data.libraries.axios.deprecations) {
    context7Data.libraries.axios.deprecations.forEach(dep => {
      enhancedCode = enhancedCode.replace(dep.old, dep.new);
    });
  }

  // 3. Inject proper error handling patterns
  if (enhancedCode.includes('try {')) {
    const errorPattern = context7Data.core.typescript.patterns.errorHandling;
    // Apply TypeScript best practices for error handling
    enhancedCode = applyErrorHandlingPattern(enhancedCode, errorPattern);
  }

  // 4. Apply security best practices
  if (context7Data.bestPractices.security) {
    enhancedCode = applySecurity(enhancedCode, context7Data.bestPractices.security);
  }

  // 5. Standard placeholder replacement
  Object.entries(placeholders).forEach(([key, value]) => {
    enhancedCode = enhancedCode.replace(new RegExp(key, 'g'), value);
  });

  return enhancedCode;
}
```

### Step 4: File Generation Order
```yaml
MANDATORY SEQUENCE:
1. package.json (with Context7-verified dependencies)
2. tsconfig.json (with latest TypeScript config)
3. eslint.config.js (with current linting rules)
4. src/types.ts (with proper type definitions)
5. src/utils/version.ts
6. src/errors/base-errors.ts (with best practice error handling)
7. src/config/config.ts (with security patterns)
8. src/logging/logger-pino.ts
9. src/[service]-service.ts (with API-specific patterns)
10. src/[service]-mcp-server.ts (with MCP best practices)
11. src/server.ts (with production optimizations)
[Continue with remaining files...]
```

---

## 📋 PLACEHOLDER REFERENCE TABLE

| Placeholder | Example Input | Calculated Value | Usage Context |
|------------|---------------|------------------|---------------|
| `[SERVICE_NAME]` | "Stock Analyzer" | "Stock Analyzer" | Human-readable in docs/comments |
| `[service-name]` | "Stock Analyzer" | "stock-analyzer" | File names, URLs, kebab-case |
| `[service]` | "Stock Analyzer" | "stockAnalyzer" | Variable names, camelCase |
| `[SERVICE]` | "Stock Analyzer" | "STOCK_ANALYZER" | Constants, env vars, UPPER_CASE |
| `[SERVICE_PASCAL]` | "Stock Analyzer" | "StockAnalyzer" | Class names, PascalCase |
| `[SERVICE_UPPER]` | "Stock Analyzer" | "STOCK_ANALYZER" | Logging contexts, UPPER_CASE |
| `[TOOL_COUNT]` | User specifies | "5" | Number of tools |
| `[EXTERNAL_API_NAME]` | "Alpha Vantage" | "Alpha Vantage" | API documentation |
| `[API_KEY_ENV_VAR]` | Based on API | "ALPHA_VANTAGE_API_KEY" | Environment variable |

---

## 📊 MANDATORY: Monitoring & Metrics

### STEP 5: MCP Inspector Integration
Every generated server MUST include:

```javascript
// src/monitoring/metrics.ts
export class MCPMetrics {
  private metrics = {
    tool_selection_frequency: {},
    error_rate_by_tool: {},
    avg_response_time: {},
    average_tools_per_task: 0,
    abandon_rate: 0
  };

  trackToolCall(toolName: string, duration: number, success: boolean) {
    // Track frequency
    this.metrics.tool_selection_frequency[toolName] =
      (this.metrics.tool_selection_frequency[toolName] || 0) + 1;

    // Track response time
    if (!this.metrics.avg_response_time[toolName]) {
      this.metrics.avg_response_time[toolName] = [];
    }
    this.metrics.avg_response_time[toolName].push(duration);

    // Track errors
    if (!success) {
      this.metrics.error_rate_by_tool[toolName] =
        (this.metrics.error_rate_by_tool[toolName] || 0) + 1;
    }
  }

  getMetrics() {
    // Calculate averages and rates
    const report = {
      ...this.metrics,
      avg_response_time: Object.entries(this.metrics.avg_response_time)
        .reduce((acc, [tool, times]) => {
          acc[tool] = times.reduce((a, b) => a + b, 0) / times.length;
          return acc;
        }, {})
    };

    // Identify optimization opportunities
    if (Object.keys(report.tool_selection_frequency).length > 20) {
      report.warning = "Tool count exceeds 20 - consider consolidation";
    }

    return report;
  }
}
```

### Testing Command
```bash
# MANDATORY: Test with MCP Inspector
npx @modelcontextprotocol/inspector
```

## 🚨 CRITICAL RULES - AGENT-FIRST ENFORCEMENT

### MUST DO ✅ (Non-Negotiable)
- **Start with the agent story**, not the API spec
- **Consolidate ruthlessly**: Target 10-15 tools (HARD MAX: 20)
- **Every response MUST include** `next_actions` and `suggestion`
- **Every error MUST include** correction hints
- **Batch by default**: Accept arrays for bulk operations
- **Filter by default**: Always support `fields` parameter
- **Separate risky operations** with explicit `risky` flag
- **Track ALL metrics**: Tool frequency, errors, latency, abandonment
- **Test with real agents** using MCP Inspector

### NEVER DO ❌ (Instant Failure)
- **NEVER** map REST endpoints 1:1 to MCP tools
- **NEVER** create separate tools for CRUD (create/read/update/delete)
- **NEVER** return full objects when fields are specified
- **NEVER** allow destructive operations without audit reason
- **NEVER** exceed 20 tools (this confuses agents)
- **NEVER** omit next_actions from responses
- **NEVER** design without considering token costs

### The Bottom Line
**Your existing REST API wasn't designed for AI consumption—and that's okay. But cramming it wholesale into MCP is a recipe for failure.**

Remember: In the world of AI agents, **less is more**, **intent beats granularity**, and **every token counts**.

## 🔍 MANDATORY SELF-CRITIQUE CHECKLIST

### After generating EACH file, verify:

#### ✅ Agent-First Design Validation
```markdown
□ Tool count is between 10-15 (NEVER exceed 20)
□ Each tool serves a clear intent (not just CRUD)
□ All responses include next_actions array
□ All responses include suggestion string
□ Error responses have correction hints
□ Batch operations are supported where logical
□ Field filtering is implemented (fields parameter)
□ Risky operations have explicit flags
```

#### ✅ Code Quality Self-Review
```markdown
□ Code matches exact structure from template
□ All placeholders properly replaced
□ No missing imports or dependencies
□ TypeScript strict mode compliance
□ Error handling follows pattern
□ Logging includes correlation IDs
□ Security sanitization in place
□ Rate limiting implemented
```

#### ✅ Performance & Optimization Audit
```markdown
□ Response payloads minimized (field filtering works)
□ Caching strategy implemented (LRU)
□ Connection pooling configured
□ Retry logic with exponential backoff
□ Circuit breaker patterns in place
□ Streaming for large responses
□ Metrics tracking enabled
□ Token usage optimized (< 30% of REST equivalent)
```

#### ✅ Testing & Documentation Check
```markdown
□ Unit tests cover all tools
□ Integration tests for external APIs
□ MCP Inspector validation passes
□ README includes clear setup instructions
□ API documentation generated
□ Environment variables documented
□ Docker setup works
□ CI/CD pipelines configured
```

### 🔄 SELF-REFINEMENT PROTOCOL

**After EACH major section, execute this refinement:**

1. **Review generated code against checklist**
2. **Identify any deviations or improvements needed**
3. **Refactor to fix issues BEFORE proceeding**
4. **Re-validate against success metrics**

```javascript
// Example self-critique in action
function selfCritique(generatedCode) {
  const issues = [];

  // Check tool count
  if (toolCount > 20) {
    issues.push("CRITICAL: Too many tools. Consolidate by intent.");
    // AUTO-FIX: Merge similar tools
  }

  // Check response format
  if (!hasNextActions(response)) {
    issues.push("ERROR: Missing next_actions in response");
    // AUTO-FIX: Add next_actions based on context
  }

  // Check token optimization
  if (!hasFieldFiltering) {
    issues.push("WARNING: No field filtering implemented");
    // AUTO-FIX: Add fields parameter to all tools
  }

  return issues.length === 0 ? "PASSED" : `FAILED: ${issues.join(", ")}`;
}
```

### 📊 Success Metrics Self-Validation
```javascript
const SUCCESS_CRITERIA = {
  toolCount: { min: 10, max: 20, actual: null },
  tokenReduction: { target: 0.70, actual: null },
  responseTime: { target: 500, actual: null },
  errorRate: { target: 0.05, actual: null },
  abandonRate: { target: 0.05, actual: null }
};

// MUST validate before considering complete
function validateSuccess(metrics) {
  return Object.entries(SUCCESS_CRITERIA).every(([key, criteria]) => {
    if (criteria.min && criteria.actual < criteria.min) return false;
    if (criteria.max && criteria.actual > criteria.max) return false;
    if (criteria.target && criteria.actual > criteria.target) return false;
    return true;
  });
}
```

---

# PHASE 1: EXACT PROJECT STRUCTURE

## AI INSTRUCTION: Create this EXACT folder structure

```bash
# AI: Execute these commands in order
mkdir -p [service-name]-mcp
cd [service-name]-mcp

# Create all directories first
mkdir -p src/{config,cache,errors,logging,middleware,security,audit,context,protocol,utils}
mkdir -p src/undici-resilience/{config,http,monitoring,resilience,streaming}
mkdir -p .github/workflows
mkdir -p docs/media
mkdir -p memory-bank
mkdir -p scripts

# List to verify
find . -type d | sort
```

## Complete File List (Create ALL 60+ files)

```
[service-name]-mcp/
├── .github/
│   └── workflows/
│       ├── ci.yml                           # CI/CD pipeline
│       ├── security.yml                     # Security scanning
│       ├── release.yml                      # Release automation
│       ├── docker.yml                       # Container builds
│       ├── docs.yml                         # Documentation checks
│       ├── dependency-update.yml            # Dependency updates
│       ├── integration-tests.yml            # Integration testing
│       └── performance.yml                  # Performance testing
├── docs/
│   ├── CLAUDE_DESKTOP_SETUP.md             # Claude Desktop setup
│   ├── CLINE_SETUP.md                      # Cline VS Code setup
│   ├── GITHUB_ACTIONS_GUIDE.md             # CI/CD guide
│   ├── GITHUB_ACTIONS_SETUP.md             # Actions setup
│   ├── MCP_INSPECTOR_TEST_GUIDE.md         # Testing guide
│   └── media/                              # Images/screenshots
├── memory-bank/
│   ├── activeContext.md                    # Current context
│   ├── productContext.md                   # Product context
│   ├── progress.md                         # Progress tracking
│   ├── projectbrief.md                     # Project brief
│   ├── systemPatterns.md                   # System patterns
│   └── techContext.md                      # Tech context
├── scripts/                                # Utility scripts
├── src/
│   ├── server.ts                           # EXACT CODE PROVIDED
│   ├── [service]-mcp-server.ts             # EXACT CODE PROVIDED
│   ├── [service]-service.ts                # PARTIAL CODE PROVIDED
│   ├── types.ts                            # EXACT STRUCTURE PROVIDED
│   ├── audit/
│   │   └── audit-logger.ts                 # Copy from hurricane-tracker
│   ├── cache/
│   │   └── [service]-cache.ts              # Adapt from hurricane-cache.ts
│   ├── config/
│   │   ├── config.ts                       # EXACT CODE PROVIDED
│   │   └── auth-config.ts                  # Copy from hurricane-tracker
│   ├── context/
│   │   └── context-manager.ts              # Copy from hurricane-tracker
│   ├── errors/
│   │   └── base-errors.ts                  # Copy from hurricane-tracker
│   ├── logging/
│   │   └── logger-pino.ts                  # Copy from hurricane-tracker
│   ├── middleware/
│   │   ├── auth.ts                         # Copy from hurricane-tracker
│   │   ├── rate-limit.ts                   # Copy from hurricane-tracker
│   │   ├── sanitization.ts                 # Copy from hurricane-tracker
│   │   └── validation.ts                   # Copy from hurricane-tracker
│   ├── protocol/
│   │   └── json-rpc.ts                     # Copy from hurricane-tracker
│   ├── security/
│   │   ├── sanitizer.ts                    # Copy from hurricane-tracker
│   │   └── security-monitor.ts             # Copy from hurricane-tracker
│   ├── undici-resilience/                  # COPY ENTIRE FOLDER
│   │   ├── index.ts
│   │   ├── logger.ts
│   │   ├── config/
│   │   │   └── pool-config.ts
│   │   ├── http/
│   │   │   └── pool-manager.ts
│   │   ├── monitoring/
│   │   │   ├── connection-monitor.ts
│   │   │   └── metrics.ts
│   │   ├── resilience/
│   │   │   ├── bulkhead.ts
│   │   │   ├── circuit-breaker.ts
│   │   │   ├── rate-limiter.ts
│   │   │   └── retry-strategy.ts
│   │   └── streaming/
│   │       ├── backpressure-handler.ts
│   │       ├── streaming-metrics.ts
│   │       └── streaming-pool-manager.ts
│   └── utils/
│       └── version.ts                      # EXACT CODE PROVIDED
├── package.json                            # EXACT CODE PROVIDED
├── tsconfig.json                           # EXACT CODE PROVIDED
├── eslint.config.js                        # EXACT CODE PROVIDED
├── docker-compose.yml                      # EXACT CODE PROVIDED
├── Dockerfile                              # EXACT CODE PROVIDED
├── .env.example                            # TEMPLATE PROVIDED
├── .gitignore                              # EXACT CODE PROVIDED
├── CHANGELOG.md                            # TEMPLATE PROVIDED
├── LICENSE                                 # MIT LICENSE
└── README.md                               # TEMPLATE PROVIDED
```

---

# PHASE 2: EXACT DEPENDENCIES

## AI: Create package.json with EXACT dependencies

```json
{
  "name": "[service-name]-mcp",
  "version": "1.0.0",
  "description": "Production-grade MCP server providing [SERVICE_DESCRIPTION] through LLM-optimized tools",
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
  },
  "dependencies": {
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
  },
  "devDependencies": {
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
}
```

---

# PHASE 3: EXACT TYPESCRIPT CONFIGURATION

## AI: Create tsconfig.json EXACTLY as shown

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

---

# PHASE 4: EXACT ESLINT CONFIGURATION

## AI: Create eslint.config.js EXACTLY as shown

```javascript
import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
      'arrow-spacing': 'error',
      'no-duplicate-imports': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'brace-style': ['error', '1tbs'],
      'comma-dangle': ['error', 'always-multiline'],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'semi': ['error', 'always'],
      'indent': ['error', 2],
      'max-len': ['error', { code: 120, ignoreUrls: true, ignoreStrings: true }],
      'no-trailing-spaces': 'error',
      'eol-last': 'error',
    },
  },
  {
    files: ['src/**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    ignores: [
      'dist/',
      'node_modules/',
      'coverage/',
      '*.js',
      '*.d.ts',
      'src/__tests__/',
      'src/**/*.spec.ts',
      '**/*.spec.ts',
    ],
  },
];
```

---

# PHASE 5: COMPLETE 3-LAYER SOLID ARCHITECTURE

## Layer 1: Transport Layer - src/server.ts

### AI INSTRUCTION: Copy this EXACTLY, only replace placeholders

```typescript
/**
 * [SERVICE_NAME] MCP Server - Transport Layer & Infrastructure Management
 * SOLID Architecture: Single Responsibility - Application Entry Point & Transport Orchestration
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import fastify from 'fastify';
import { randomUUID } from 'node:crypto';
import { config, getConfigSummary } from './config/config.js';
import { logger, healthLogger } from './logging/logger-pino.js';
import { [service]McpServer } from './[service]-mcp-server.js';
import { VERSION } from './utils/version.js';

// =============================================================================
// TRANSPORT LAYER - Infrastructure and Transport Management
// =============================================================================

const startTime = Date.now();

/**
 * Transport Layer Responsibilities (SOLID: Single Responsibility Principle):
 * - Application entry point and command-line argument parsing
 * - Environment configuration loading and validation
 * - Transport selection and initialization (stdio, Streamable HTTP)
 * - Fastify HTTP server setup with multiple endpoints (/mcp for POST/GET/DELETE, /health)
 * - Session management for HTTP transport with session ID tracking
 * - Graceful shutdown with proper resource cleanup
 * - Process-level error handling (uncaught exceptions, unhandled rejections)
 * - Server lifecycle management (start, stop, error handling)
 */

async function main() {
  try {
    // Log startup with configuration summary
    logger.info(
      {
        config: getConfigSummary(),
        version: VERSION,
        nodeVersion: process.version,
        transport: config.transport.type
      },
      `Starting [SERVICE_NAME] MCP Server v${VERSION} - SOLID Architecture`
    );

    // Create and start transport based on configuration
    const transport = await createTransport(config.transport.type);

    const startupTime = Date.now() - startTime;

    healthLogger.lifecycle({
      event: 'ready',
      component: '[service-name]-mcp',
      duration: startupTime,
      version: VERSION,
      config: {
        transport: config.transport.type,
        tools: [TOOL_COUNT],
        mcpCompliance: '2025-06-18'
      }
    });

    logger.info(
      {
        startupTimeMs: startupTime,
        transport: config.transport.type,
        toolCount: [TOOL_COUNT],
        mcpVersion: '2025-06-18'
      },
      `[SERVICE_NAME] MCP Server ready - SOLID 3-Layer Architecture v${VERSION}`
    );

    // Setup graceful shutdown handlers
    setupShutdownHandlers(transport);

  } catch (error) {
    logger.error({ error }, 'Failed to start [SERVICE_NAME] MCP Server');
    process.exit(1);
  }
}

/**
 * Create Transport Layer based on Configuration
 * Follows SOLID: Open/Closed Principle - Easy to extend with new transports
 * Delegates MCP protocol handling to [service]-mcp-server.ts
 */
async function createTransport(transportType: string) {
  switch (transportType) {
    case 'stdio':
      return await createStdioTransport();
    case 'http':
      return await createHttpTransport();
    default:
      logger.warn(`Unknown transport type: ${transportType}, using stdio`);
      return await createStdioTransport();
  }
}

/**
 * Create Stdio Transport for Local AI Assistants (Cline, Claude Desktop)
 * Delegates to Protocol Layer ([service]-mcp-server.ts)
 */
async function createStdioTransport() {
  const transport = new StdioServerTransport();

  // Connect protocol layer to transport
  await [service]McpServer.getMcpServer().connect(transport);

  logger.info({ transport: 'stdio' }, 'Connected [SERVICE_NAME] MCP Server via Stdio transport');

  return {
    type: 'stdio' as const,
    transport,
    stop: async () => {
      logger.info('Stopping stdio transport');
      await [service]McpServer.shutdown();
    }
  };
}

/**
 * Create HTTP Transport for Production/Remote Access with Session Management
 * Uses Fastify for high-performance HTTP handling
 */
async function createHttpTransport() {
  const app = fastify({ logger: false });

  // Register CORS plugin for browser-based clients
  await app.register(import('@fastify/cors'), {
    origin: '*', // Configure appropriately for production
    exposedHeaders: ['Mcp-Session-Id'],
    allowedHeaders: ['Content-Type', 'mcp-session-id'],
  });

  // Session management for stateful MCP communication
  const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

  // Handle POST requests for client-to-server communication
  app.post('/mcp', async (request, reply) => {
    try {
      const sessionId = request.headers['mcp-session-id'] as string | undefined;
      let transport: StreamableHTTPServerTransport;

      if (sessionId && transports[sessionId]) {
        // Reuse existing transport for session continuity
        transport = transports[sessionId];
      } else if (!sessionId) {
        // New initialization request - create new transport
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sessionId) => {
            transports[sessionId] = transport;
            logger.debug({ sessionId }, 'New MCP session initialized');
          },
          enableDnsRebindingProtection: false,  // Disabled for Docker
          allowedHosts: ['127.0.0.1', 'localhost', '0.0.0.0'],
        });

        // Clean up transport when closed
        transport.onclose = () => {
          if (transport.sessionId) {
            delete transports[transport.sessionId];
            logger.debug({ sessionId: transport.sessionId }, 'MCP session closed');
          }
        };

        // Connect protocol layer to the new transport
        await [service]McpServer.getMcpServer().connect(transport);
      } else {
        // Invalid request
        reply.code(400).send({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided',
          },
          id: null,
        });
        return;
      }

      // Handle the MCP request through transport
      await transport.handleRequest(request.raw, reply.raw, request.body);
    } catch (error) {
      logger.error({ error }, 'Error handling MCP request');
      if (!reply.sent) {
        reply.code(500).send({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  });

  // Handle GET requests for server-to-client notifications via SSE
  app.get('/mcp', async (request, reply) => {
    const sessionId = request.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      reply.code(400).send('Invalid or missing session ID');
      return;
    }

    const transport = transports[sessionId];
    await transport.handleRequest(request.raw, reply.raw);
  });

  // Handle DELETE requests for session termination
  app.delete('/mcp', async (request, reply) => {
    const sessionId = request.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      reply.code(400).send('Invalid or missing session ID');
      return;
    }

    const transport = transports[sessionId];
    await transport.handleRequest(request.raw, reply.raw);
  });

  // Health check endpoint - Critical for production monitoring
  app.get('/health', async (_, reply) => {
    reply.send({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: VERSION,
      uptime: Date.now() - startTime,
      transport: 'http',
      sessions: Object.keys(transports).length,
      architecture: '3-layer-solid',
      layers: {
        transport: 'server.ts',
        protocol: '[service]-mcp-server.ts',
        business: '[service]-service.ts'
      }
    });
  });

  const port = config.transport.httpPort || 8080;
  const host = config.transport.httpHost || '0.0.0.0';
  await app.listen({ port, host });

  logger.info({ port, transport: 'http' }, '[SERVICE_NAME] MCP Server HTTP transport listening on Fastify');

  return {
    type: 'http' as const,
    app,
    transports,
    stop: async () => {
      logger.info('Stopping HTTP transport');
      await app.close();
      await [service]McpServer.shutdown();
      logger.info('HTTP transport stopped');
    }
  };
}

/**
 * Setup graceful shutdown handlers for clean resource cleanup
 * Critical for production deployments to avoid resource leaks
 */
function setupShutdownHandlers(transport: any) {
  const gracefulShutdown = async (signal: string) => {
    logger.info({ signal }, 'Received shutdown signal');

    try {
      await transport.stop();

      healthLogger.lifecycle({
        event: 'shutdown',
        component: '[service-name]-mcp',
      });

      logger.info('[SERVICE_NAME] MCP Server shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Error during graceful shutdown');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  process.on('uncaughtException', (error) => {
    logger.error({ error }, 'Uncaught exception');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason, promise }, 'Unhandled promise rejection');
    process.exit(1);
  });
}

// Entry point - Only run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error({ error }, 'Unhandled error in main');
    process.exit(1);
  });
}

export { main };
```

## Layer 2: Protocol Layer - src/[service]-mcp-server.ts

### AI INSTRUCTION: Replace placeholders, keep structure EXACT

```typescript
/**
 * [SERVICE_NAME] MCP Server - Protocol Layer & Tool Registration
 * SOLID Architecture: Single Responsibility - MCP Protocol Implementation & Tool Orchestration
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { logger, performanceLogger, generateCorrelationId } from './logging/logger-pino.js';
import { [service]Service } from './[service]-service.js';
import {
  NotFoundError,
  UpstreamTimeoutError
} from './errors/base-errors.js';
import type { ToolResponse } from './types.js';
import { VERSION } from './utils/version.js';

// =============================================================================
// MCP TOOL SCHEMAS (Protocol Layer)
// =============================================================================

// AI: ADD YOUR TOOL SCHEMAS HERE
// Example pattern for each tool:
/*
export const get[ToolName]Schema = z.object({
  param1: z.string().describe('Description of param1'),
  param2: z.number().optional().describe('Optional param2'),
});
*/

[TOOL_SCHEMAS_PLACEHOLDER]

// =============================================================================
// MCP PROTOCOL HANDLER CLASS
// =============================================================================

export class [SERVICE_PASCAL]McpServer {
  private mcpServer: McpServer;
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
    this.mcpServer = new McpServer({
      name: '[service-name]-mcp',
      version: VERSION,
    });

    this.setupToolHandlers();
    this.setupProtocolHandlers();
  }

  /**
   * Setup MCP protocol event handlers for lifecycle management
   */
  private setupProtocolHandlers(): void {
    // MCP server handles errors through transport layer
    // No direct error handler needed here

    logger.info({
      serverName: '[service-name]-mcp',
      version: VERSION,
      toolCount: [TOOL_COUNT],
    }, 'MCP Protocol handlers configured');
  }

  /**
   * Setup tool handlers with proper MCP registration and validation
   */
  private setupToolHandlers(): void {
    // AI: REGISTER YOUR TOOLS HERE
    // Follow this EXACT pattern for each tool:
    /*
    this.mcpServer.registerTool(
      'tool_name',
      {
        title: 'Tool Title',
        description: 'Tool description for LLMs',
        inputSchema: {
          field1: z.string().describe('Field 1 description'),
          field2: z.number().optional().describe('Optional field 2')
        } as any,
      },
      async (params, _extra) => this.handleToolName(params)
    );
    */

    [TOOL_REGISTRATION_PLACEHOLDER]

    logger.info({ toolCount: [TOOL_COUNT] }, '[SERVICE_NAME] tools registered with MCP server');
  }

  // ==========================================================================
  // TOOL HANDLERS (Protocol Layer - Orchestration & Validation)
  // ==========================================================================

  // AI: ADD YOUR TOOL HANDLERS HERE
  // Follow this EXACT pattern for each handler:
  /*
  private async handleToolName(args: any): Promise<any> {
    const correlationId = generateCorrelationId();
    const startTime = Date.now();

    try {
      // Protocol-level input validation
      const validated = getToolNameSchema.parse(args);

      logger.info({
        correlationId,
        tool: 'tool_name',
        params: validated
      }, 'MCP tool call: tool_name');

      // Delegate to business layer
      const result = await [service]Service.methodName(validated);

      // Protocol-level response formatting and logging
      const duration = Date.now() - startTime;
      performanceLogger.apiCall({
        correlationId,
        api: '[service]-service',
        endpoint: 'tool_name',
        method: 'TOOL_CALL',
        duration,
        cached: false,
      });

      return this.formatMcpResponse(result, correlationId, 'tool_name');

    } catch (error) {
      return this.handleToolError(error, 'tool_name', correlationId, startTime);
    }
  }
  */

  [TOOL_HANDLERS_PLACEHOLDER]

  // ==========================================================================
  // MCP PROTOCOL UTILITIES
  // ==========================================================================

  /**
   * Format response according to MCP protocol standards with LLM-friendly messages
   */
  private formatMcpResponse(data: any, correlationId: string, toolName?: string): ToolResponse {
    let responseData = data;

    // Make empty arrays more LLM-friendly
    if (Array.isArray(data) && data.length === 0) {
      // Customize message based on tool
      let message = '';
      switch (toolName) {
        // AI: ADD CUSTOM EMPTY MESSAGES FOR YOUR TOOLS
        /*
        case 'tool_name':
          message = 'No results found. Try adjusting your search parameters.';
          break;
        */
        [EMPTY_RESPONSE_MESSAGES_PLACEHOLDER]
        default:
          message = 'No data found for the specified query.';
      }

      responseData = {
        success: true,
        count: 0,
        results: [],
        message: message
      };
    }
    // Make single results more descriptive
    else if (Array.isArray(data) && data.length > 0) {
      responseData = {
        success: true,
        count: data.length,
        results: data,
        message: `Found ${data.length} ${data.length === 1 ? 'result' : 'results'}`
      };
    }
    // For non-array successful responses, ensure they have a success flag
    else if (typeof data === 'object' && data !== null && !data.error) {
      responseData = {
        success: true,
        ...data
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: typeof responseData === 'string' ? responseData : JSON.stringify(responseData, null, 2),
        },
      ],
      _meta: {
        timestamp: new Date().toISOString(),
        correlationId,
        protocolVersion: '2025-06-18',
      },
    };
  }

  /**
   * Handle tool errors with proper MCP error formatting
   */
  private handleToolError(
    error: any,
    toolName: string,
    correlationId: string,
    startTime: number
  ): ToolResponse {
    const duration = Date.now() - startTime;

    // Log error with correlation context
    logger.error({
      error: error.message,
      correlationId,
      tool: toolName,
      duration
    }, `MCP tool error: ${toolName}`);

    // Track error metrics
    performanceLogger.apiCall({
      correlationId,
      api: '[service]-service',
      endpoint: toolName,
      method: 'TOOL_CALL',
      duration,
      cached: false,
      error: error.message,
    });

    // Convert to MCP-compliant error response
    let mcpError: ToolResponse;

    if (error instanceof z.ZodError) {
      mcpError = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid input parameters',
                details: error.errors,
                hint: 'Please check the input parameters and ensure they meet the schema requirements',
              },
            }, null, 2),
          },
        ],
        _meta: {
          timestamp: new Date().toISOString(),
          correlationId,
          error: true,
        },
      };
    } else if (error instanceof NotFoundError) {
      mcpError = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: {
                code: 'NOT_FOUND',
                message: error.message,
                hint: 'Check the identifier format or use appropriate tool to find valid IDs',
              },
            }, null, 2),
          },
        ],
        _meta: {
          timestamp: new Date().toISOString(),
          correlationId,
          error: true,
        },
      };
    } else if (error instanceof UpstreamTimeoutError) {
      mcpError = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: {
                code: 'UPSTREAM_TIMEOUT',
                message: 'Service timeout occurred',
                hint: 'Try again in a few seconds. The external [EXTERNAL_API_NAME] service may be temporarily unavailable',
              },
            }, null, 2),
          },
        ],
        _meta: {
          timestamp: new Date().toISOString(),
          correlationId,
          error: true,
        },
      };
    } else {
      mcpError = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: {
                code: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred',
                hint: 'Please try again. If the problem persists, check the server logs',
              },
            }, null, 2),
          },
        ],
        _meta: {
          timestamp: new Date().toISOString(),
          correlationId,
          error: true,
        },
      };
    }

    return mcpError;
  }

  // ==========================================================================
  // SERVER LIFECYCLE MANAGEMENT
  // ==========================================================================

  /**
   * Get the configured MCP server instance for transport connection
   */
  getMcpServer(): McpServer {
    return this.mcpServer;
  }

  /**
   * Get server statistics for monitoring
   */
  getServerStats() {
    const uptime = Date.now() - this.startTime;
    return {
      name: '[service-name]-mcp',
      version: VERSION,
      uptime,
      toolCount: [TOOL_COUNT],
      protocolVersion: '2025-06-18',
      capabilities: {
        tools: true,
        logging: true,
        completion: false,
        resources: false,
      },
    };
  }

  /**
   * Shutdown the MCP server gracefully
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down [SERVICE_NAME] MCP server');

    try {
      // The MCP server will handle its own cleanup through transport disconnection
      logger.info('[SERVICE_NAME] MCP server shutdown complete');
    } catch (error) {
      logger.error({ error }, 'Error during MCP server shutdown');
      throw error;
    }
  }
}

// Export singleton instance for use by transport layer
export const [service]McpServer = new [SERVICE_PASCAL]McpServer();
```

## Layer 3: Business Layer - src/[service]-service.ts

### AI INSTRUCTION: This is the template for your business logic

```typescript
/**
 * [SERVICE_NAME] MCP Server - Business Logic Layer
 * SOLID Architecture: Single Responsibility - Core Business Logic & External API Integration
 */

import { z } from 'zod';
import { logger, performanceLogger } from './logging/logger-pino.js';
import { generateCorrelationId } from './logging/logger-pino.js';
import {
  ValidationError,
  NotFoundError,
  [SERVICE_PASCAL]ServiceError
} from './errors/base-errors.js';
import type {
  // AI: Import your domain types here
  [DOMAIN_TYPES_PLACEHOLDER]
} from './types.js';

// Import cache if needed
import { [service]Cache } from './cache/[service]-cache.js';

// Import resilience patterns if using external APIs
import { poolManager } from './undici-resilience/http/pool-manager.js';
import { circuitBreaker } from './undici-resilience/resilience/circuit-breaker.js';
import { retryStrategy } from './undici-resilience/resilience/retry-strategy.js';

// =============================================================================
// INPUT VALIDATION SCHEMAS
// =============================================================================

// AI: Add your validation schemas here
[INPUT_VALIDATION_SCHEMAS_PLACEHOLDER]

// =============================================================================
// [SERVICE_UPPER] SERVICE CLASS
// =============================================================================

export class [SERVICE_PASCAL]Service {
  private cache: typeof [service]Cache;

  constructor() {
    this.cache = [service]Cache;
  }

  // AI: Implement your service methods here
  // Follow this pattern for each method:
  /*
  async methodName(params: ParamType): Promise<ReturnType> {
    const correlationId = generateCorrelationId();
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = `method_${params.id}`;
      const cached = this.cache.get(cacheKey);
      if (cached) {
        logger.debug({ correlationId, cacheKey }, 'Cache hit');
        return cached;
      }

      // Call external API with resilience patterns
      const result = await this.fetchFromExternalAPI(params);

      // Cache the result
      this.cache.set(cacheKey, result);

      // Log performance
      performanceLogger.apiCall({
        correlationId,
        api: '[EXTERNAL_API_NAME]',
        endpoint: 'methodName',
        method: 'GET',
        duration: Date.now() - startTime,
        cached: false,
      });

      return result;

    } catch (error) {
      logger.error({
        error,
        correlationId,
        method: 'methodName',
        params
      }, 'Service method failed');

      throw new [SERVICE_PASCAL]ServiceError(
        'Failed to execute methodName',
        'SERVICE_ERROR',
        500
      );
    }
  }
  */

  [SERVICE_METHODS_PLACEHOLDER]

  // =============================================================================
  // PRIVATE UTILITY METHODS
  // =============================================================================

  // AI: Add your utility methods here
  [UTILITY_METHODS_PLACEHOLDER]
}

// Export singleton instance
export const [service]Service = new [SERVICE_PASCAL]Service();
```

---

# PHASE 6: CONFIGURATION WITH 50+ ENVIRONMENT VARIABLES

## AI: Create src/config/config.ts with EXACT structure

```typescript
/**
 * [SERVICE_NAME] MCP Server - Configuration Management
 * Production-grade configuration with Zod validation and environment-based setup
 */

import { z } from 'zod';
import { config as dotenvConfig } from 'dotenv';
import type { [SERVICE_PASCAL]Config } from '../types.js';

// Load environment variables from .env file
// Suppress all dotenv output to avoid interfering with MCP protocol
const originalLog = console.log;
console.log = () => {}; // Temporarily disable console.log
dotenvConfig({ debug: false });
console.log = originalLog; // Restore console.log

// =============================================================================
// ENVIRONMENT SCHEMA VALIDATION
// =============================================================================

const envSchema = z.object({
  // Environment & Node Configuration
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Transport Configuration
  MCP_TRANSPORT: z.enum(['stdio', 'http']).default('stdio'),
  HTTP_PORT: z.coerce.number().min(1).max(65535).default(8080),
  HTTP_HOST: z.string().default('localhost'),

  // AI: Add your API configuration here
  // Example:
  // [API_NAME]_API_KEY: z.string().min(1),
  // [API_NAME]_BASE_URL: z.string().url().default('https://api.example.com'),
  [API_CONFIG_PLACEHOLDER],

  // LLM Optimization Settings
  MAX_INPUT_TOKENS: z.coerce.number().min(100).max(100000).default(16000),
  MAX_OUTPUT_TOKENS: z.coerce.number().min(100).max(100000).default(16000),
  DEFAULT_PAGE_SIZE: z.coerce.number().min(10).max(1000).default(100),
  ENABLE_RESPONSE_STREAMING: z.coerce.boolean().default(true),
  CONTEXT_WINDOW_TARGET: z.coerce.number().min(1000).max(200000).default(16000),

  // Performance Configuration
  CACHE_TTL_SECONDS: z.coerce.number().min(60).max(3600).default(300),
  CACHE_MAX_SIZE: z.coerce.number().min(100).max(10000).default(1000),
  MAX_RETRIES: z.coerce.number().min(0).max(10).default(3),
  REQUEST_TIMEOUT_MS: z.coerce.number().min(1000).max(300000).default(30000),
  CONNECTION_TIMEOUT_MS: z.coerce.number().min(1000).max(60000).default(10000),

  // Authentication & Security Settings
  AUTH_ENABLED: z.coerce.boolean().default(false),
  MCP_SERVER_API_KEYS: z.string().optional().transform(val => val?.split(',') || []),
  SESSION_TIMEOUT: z.coerce.number().min(60000).default(3600000),
  ALLOWED_ORIGINS: z.string().default('*'),
  RATE_LIMIT_PER_CLIENT: z.coerce.number().min(1).max(10000).default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().min(1000).max(3600000).default(60000),
  RATE_LIMIT_ENABLED: z.coerce.boolean().default(true),
  RATE_LIMIT_BURST: z.coerce.number().min(1).max(1000).default(10),
  RATE_LIMIT_BLOCK_DURATION: z.coerce.number().min(1000).default(300000),
  RATE_LIMIT_WHITELIST: z.string().optional().transform(val => val?.split(',') || []),
  MAX_REQUEST_SIZE_BYTES: z.coerce.number().min(1024).max(10485760).default(1048576),
  ENABLE_AUDIT_LOGGING: z.coerce.boolean().default(true),
  ENABLE_INPUT_SANITIZATION: z.coerce.boolean().default(true),

  // Resilience Patterns
  CIRCUIT_BREAKER_FAILURE_THRESHOLD: z.coerce.number().min(1).max(100).default(5),
  CIRCUIT_BREAKER_RESET_TIMEOUT_MS: z.coerce.number().min(1000).max(300000).default(60000),
  CIRCUIT_BREAKER_MONITORING_PERIOD_MS: z.coerce.number().min(1000).max(60000).default(10000),

  RETRY_BASE_DELAY_MS: z.coerce.number().min(100).max(10000).default(1000),
  RETRY_MAX_DELAY_MS: z.coerce.number().min(1000).max(60000).default(10000),
  RETRY_EXPONENTIAL_FACTOR: z.coerce.number().min(1).max(10).default(2),

  MAX_CONCURRENT_REQUESTS: z.coerce.number().min(1).max(1000).default(50),
  QUEUE_SIZE_LIMIT: z.coerce.number().min(10).max(10000).default(200),

  // Monitoring & Observability
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
  ENABLE_METRICS: z.coerce.boolean().default(true),
  ENABLE_HEALTH_CHECKS: z.coerce.boolean().default(true),
  ENABLE_TRACING: z.coerce.boolean().default(false),

  METRICS_PORT: z.coerce.number().min(1).max(65535).default(9090),
  METRICS_PATH: z.string().default('/metrics'),

  HEALTH_CHECK_INTERVAL_MS: z.coerce.number().min(1000).max(300000).default(30000),
  HEALTH_CHECK_TIMEOUT_MS: z.coerce.number().min(1000).max(60000).default(5000),

  // Development Settings
  DEBUG_MODE: z.coerce.boolean().default(false),
  PRETTY_LOGS: z.coerce.boolean().default(false),

  // AI: Add feature flags specific to your service
  [FEATURE_FLAGS_PLACEHOLDER],
});

// =============================================================================
// CONFIGURATION VALIDATION AND EXPORT
// =============================================================================

function validateEnvironment() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(
        (err) => `${err.path.join('.')}: ${err.message}`,
      );
      throw new Error(
        `Invalid environment configuration:\n${errorMessages.join('\n')}`,
      );
    }
    throw error;
  }
}

const env = validateEnvironment();

export const config: [SERVICE_PASCAL]Config = {
  transport: {
    type: env.MCP_TRANSPORT,
    port: env.HTTP_PORT,
    host: env.HTTP_HOST,
    httpPort: env.HTTP_PORT,
    httpHost: env.HTTP_HOST,
    httpCors: {
      allowedOrigins: ['http://localhost:3000', 'http://localhost:8080'],
    },
  },
  dataSources: {
    // AI: Configure your API endpoints here
    [DATA_SOURCES_CONFIG_PLACEHOLDER]
  },
  llm: {
    maxInputTokens: env.MAX_INPUT_TOKENS,
    maxOutputTokens: env.MAX_OUTPUT_TOKENS,
    defaultPageSize: env.DEFAULT_PAGE_SIZE,
    enableStreaming: env.ENABLE_RESPONSE_STREAMING,
    contextWindowTarget: env.CONTEXT_WINDOW_TARGET,
  },
  performance: {
    cacheTtlSeconds: env.CACHE_TTL_SECONDS,
    cacheMaxSize: env.CACHE_MAX_SIZE,
    maxRetries: env.MAX_RETRIES,
    requestTimeoutMs: env.REQUEST_TIMEOUT_MS,
    connectionTimeoutMs: env.CONNECTION_TIMEOUT_MS,
  },
  security: {
    authEnabled: env.AUTH_ENABLED,
    apiKeys: env.MCP_SERVER_API_KEYS,
    sessionTimeout: env.SESSION_TIMEOUT,
    allowedOrigins: env.ALLOWED_ORIGINS,
    rateLimitPerClient: env.RATE_LIMIT_PER_CLIENT,
    rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
    rateLimitEnabled: env.RATE_LIMIT_ENABLED,
    rateLimitBurst: env.RATE_LIMIT_BURST,
    rateLimitBlockDuration: env.RATE_LIMIT_BLOCK_DURATION,
    rateLimitWhitelist: env.RATE_LIMIT_WHITELIST,
    maxRequestSizeBytes: env.MAX_REQUEST_SIZE_BYTES,
    enableAuditLogging: env.ENABLE_AUDIT_LOGGING,
    enableInputSanitization: env.ENABLE_INPUT_SANITIZATION,
  },
  resilience: {
    circuitBreaker: {
      failureThreshold: env.CIRCUIT_BREAKER_FAILURE_THRESHOLD,
      resetTimeoutMs: env.CIRCUIT_BREAKER_RESET_TIMEOUT_MS,
      monitoringPeriodMs: env.CIRCUIT_BREAKER_MONITORING_PERIOD_MS,
    },
    retry: {
      baseDelayMs: env.RETRY_BASE_DELAY_MS,
      maxDelayMs: env.RETRY_MAX_DELAY_MS,
      exponentialFactor: env.RETRY_EXPONENTIAL_FACTOR,
    },
    bulkhead: {
      maxConcurrentRequests: env.MAX_CONCURRENT_REQUESTS,
      queueSizeLimit: env.QUEUE_SIZE_LIMIT,
    },
  },
  monitoring: {
    logLevel: env.LOG_LEVEL,
    logFormat: env.LOG_FORMAT,
    enableMetrics: env.ENABLE_METRICS,
    enableHealthChecks: env.ENABLE_HEALTH_CHECKS,
    enableTracing: env.ENABLE_TRACING,
  },
};

// =============================================================================
// CONFIGURATION UTILITIES
// =============================================================================

export function getConfigSummary() {
  return {
    transport: config.transport.type,
    logLevel: config.monitoring.logLevel,
    environment: env.NODE_ENV,
    features: {
      metrics: config.monitoring.enableMetrics,
      healthChecks: config.monitoring.enableHealthChecks,
      tracing: config.monitoring.enableTracing,
      streaming: config.llm.enableStreaming,
      auditLogging: config.security.enableAuditLogging,
    },
    limits: {
      maxInputTokens: config.llm.maxInputTokens,
      maxOutputTokens: config.llm.maxOutputTokens,
      rateLimitPerClient: config.security.rateLimitPerClient,
      maxConcurrentRequests: config.resilience.bulkhead.maxConcurrentRequests,
    },
  };
}

export function isProduction(): boolean {
  return env.NODE_ENV === 'production';
}

export function isDevelopment(): boolean {
  return env.NODE_ENV === 'development';
}

export function isTest(): boolean {
  return env.NODE_ENV === 'test';
}

export { envSchema };
```

---

# PHASE 7: UTILITY FILES

## Create src/utils/version.ts EXACTLY

```typescript
/**
 * Version management utility
 * Provides centralized version information for the MCP server
 */

export const VERSION = '1.0.0';
export const NAME = '[service-name]-mcp';
```

## Create src/types.ts with your domain types

```typescript
/**
 * [SERVICE_NAME] MCP Server - TypeScript Type Definitions
 * Central type definitions for the entire application
 */

// =============================================================================
// MCP PROTOCOL TYPES
// =============================================================================

export interface ToolResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  _meta?: {
    timestamp: string;
    correlationId: string;
    protocolVersion?: string;
    error?: boolean;
  };
}

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

export interface [SERVICE_PASCAL]Config {
  transport: TransportConfig;
  dataSources: DataSourceConfig;
  llm: LLMConfig;
  performance: PerformanceConfig;
  security: SecurityConfig;
  resilience: ResilienceConfig;
  monitoring: MonitoringConfig;
}

export interface TransportConfig {
  type: 'stdio' | 'http';
  port?: number;
  host?: string;
  httpPort?: number;
  httpHost?: string;
  httpCors?: {
    allowedOrigins: string[];
  };
}

export interface DataSourceConfig {
  // AI: Add your API configuration types
  [API_CONFIG_TYPES_PLACEHOLDER]
}

export interface LLMConfig {
  maxInputTokens: number;
  maxOutputTokens: number;
  defaultPageSize: number;
  enableStreaming: boolean;
  contextWindowTarget: number;
}

export interface PerformanceConfig {
  cacheTtlSeconds: number;
  cacheMaxSize: number;
  maxRetries: number;
  requestTimeoutMs: number;
  connectionTimeoutMs: number;
}

export interface SecurityConfig {
  authEnabled: boolean;
  apiKeys: string[];
  sessionTimeout: number;
  allowedOrigins: string;
  rateLimitPerClient: number;
  rateLimitWindowMs: number;
  rateLimitEnabled: boolean;
  rateLimitBurst: number;
  rateLimitBlockDuration: number;
  rateLimitWhitelist: string[];
  maxRequestSizeBytes: number;
  enableAuditLogging: boolean;
  enableInputSanitization: boolean;
}

export interface ResilienceConfig {
  circuitBreaker: {
    failureThreshold: number;
    resetTimeoutMs: number;
    monitoringPeriodMs: number;
  };
  retry: {
    baseDelayMs: number;
    maxDelayMs: number;
    exponentialFactor: number;
  };
  bulkhead: {
    maxConcurrentRequests: number;
    queueSizeLimit: number;
  };
}

export interface MonitoringConfig {
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logFormat: 'json' | 'pretty';
  enableMetrics: boolean;
  enableHealthChecks: boolean;
  enableTracing: boolean;
}

// =============================================================================
// DOMAIN-SPECIFIC TYPES
// =============================================================================

// AI: Add your domain-specific types here
[DOMAIN_TYPES_PLACEHOLDER]

// =============================================================================
// ERROR TYPES
// =============================================================================

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    hint?: string;
  };
}

// =============================================================================
// CACHE TYPES
// =============================================================================

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}
```

---

# AI VERIFICATION CHECKLIST

## Before submitting the generated code, verify:

### Structure ✓
- [ ] All 60+ files created
- [ ] Exact folder structure matches template
- [ ] All placeholders replaced consistently

### Code Quality ✓
- [ ] No placeholder strings remain (except in designated areas)
- [ ] All imports use .js extensions
- [ ] Consistent naming across all files
- [ ] No TypeScript errors

### Functionality ✓
- [ ] npm install completes successfully
- [ ] npm run build produces dist/ folder
- [ ] npm run stdio starts without errors
- [ ] npm run http starts server on port 8080

### Testing ✓
```bash
# Quick validation commands
npm run lint        # Should pass
npm run build       # Should compile
npm run stdio       # Should start
curl http://localhost:8080/health  # Should return healthy
```

---

# COMMON PLACEHOLDER REPLACEMENTS

## AI: Use these examples to understand the pattern

| User Says | You Calculate |
|-----------|--------------|
| "Weather Service" | [SERVICE_NAME]="Weather Service", [service-name]="weather-service", [service]="weatherService", [SERVICE_PASCAL]="WeatherService" |
| "Stock Market Analyzer" | [SERVICE_NAME]="Stock Market Analyzer", [service-name]="stock-market-analyzer", [service]="stockMarketAnalyzer", [SERVICE_PASCAL]="StockMarketAnalyzer" |
| "Document Processor" | [SERVICE_NAME]="Document Processor", [service-name]="document-processor", [service]="documentProcessor", [SERVICE_PASCAL]="DocumentProcessor" |

---

# FINAL AI INSTRUCTION

Generate the complete MCP server by:
1. Collecting required information from user
2. Calculating all placeholder values
3. Creating files in exact order specified
4. Copying code EXACTLY as shown (only replacing placeholders)
5. Verifying no placeholders remain
6. Running validation commands

The generated server will be IDENTICAL to hurricane-tracker-mcp in quality and structure!