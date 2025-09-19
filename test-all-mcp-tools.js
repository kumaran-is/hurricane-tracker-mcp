const http = require('http');

class MCPTester {
  constructor(host = 'localhost', port = 8080) {
    this.host = host;
    this.port = port;
    this.sessionId = null;
  }

  async initialize() {
    console.log('🚀 Initializing MCP connection...');
    const response = await this.makeRequest('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: { sampling: {} },
      clientInfo: { name: 'mcp-tester', version: 'v1.0.0' }
    });
    
    this.sessionId = response.sessionId;
    if (response.data && response.data.result) {
      console.log(`✅ Connected to ${response.data.result.serverInfo.name} v${response.data.result.serverInfo.version}`);
      console.log(`   Session ID: ${this.sessionId}\n`);
      return true;
    }
    return false;
  }

  async testTool(name, args, description) {
    console.log(`📍 Testing: ${name}`);
    console.log(`   ${description}`);
    console.log(`   Arguments: ${JSON.stringify(args)}`);
    
    try {
      const response = await this.makeRequest('tools/call', {
        name: name,
        arguments: args
      }, true);
      
      if (response.data && response.data.result) {
        const content = response.data.result.content[0].text;
        let preview = content;
        
        try {
          const parsed = JSON.parse(content);
          if (parsed.error) {
            console.log(`   ⚠️  Result: Error - ${parsed.error.message}`);
          } else if (Array.isArray(parsed)) {
            console.log(`   ✅ Result: Array with ${parsed.length} items`);
            if (parsed.length > 0) {
              console.log(`   Sample: ${JSON.stringify(parsed[0]).substring(0, 100)}...`);
            }
          } else if (typeof parsed === 'object') {
            console.log(`   ✅ Result: Object with keys: ${Object.keys(parsed).join(', ')}`);
          } else {
            console.log(`   ✅ Result: ${preview.substring(0, 100)}...`);
          }
        } catch (e) {
          console.log(`   ✅ Result: ${preview.substring(0, 100)}...`);
        }
        return true;
      } else if (response.data && response.data.error) {
        console.log(`   ❌ Error: ${response.data.error.message}`);
        return false;
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      return false;
    }
    console.log('');
  }

  makeRequest(method, params, useSession = false) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        jsonrpc: '2.0',
        method: method,
        params: params,
        id: Math.floor(Math.random() * 10000)
      });

      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Content-Length': Buffer.byteLength(postData)
      };

      if (useSession && this.sessionId) {
        headers['mcp-session-id'] = this.sessionId;
      }

      const options = {
        hostname: this.host,
        port: this.port,
        path: '/mcp',
        method: 'POST',
        headers: headers
      };

      const req = http.request(options, (res) => {
        let data = '';
        const sessionId = res.headers['mcp-session-id'];

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            // Handle SSE format
            const lines = data.split('\\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonStr = line.substring(6);
                const parsed = JSON.parse(jsonStr);
                resolve({ data: parsed, sessionId: sessionId });
                return;
              }
            }
            resolve({ data: null, sessionId: sessionId });
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }
}

async function runAllTests() {
  console.log('====================================');
  console.log('Hurricane Tracker MCP Tools Test');
  console.log('====================================\\n');

  const tester = new MCPTester();
  
  // Initialize connection
  if (!await tester.initialize()) {
    console.log('❌ Failed to initialize connection');
    return;
  }

  let passCount = 0;
  let totalTests = 0;

  // Test 1: Get active storms
  totalTests++;
  if (await tester.testTool(
    'get_active_storms',
    {},
    'Get all active tropical cyclones globally'
  )) passCount++;

  // Test 2: Get active storms with basin filter
  totalTests++;
  if (await tester.testTool(
    'get_active_storms',
    { basin: 'AL' },
    'Get active storms in Atlantic basin'
  )) passCount++;

  // Test 3: Get storm cone (will fail for inactive storm, but tests schema)
  totalTests++;
  if (await tester.testTool(
    'get_storm_cone',
    { stormId: 'AL052024' },
    'Get cone of uncertainty for a specific storm'
  )) passCount++;

  // Test 4: Get storm track
  totalTests++;
  if (await tester.testTool(
    'get_storm_track',
    { stormId: 'AL052024' },
    'Get historical track for a storm'
  )) passCount++;

  // Test 5: Get local hurricane alerts - Miami
  totalTests++;
  if (await tester.testTool(
    'get_local_hurricane_alerts',
    { lat: 25.7617, lon: -80.1918 },
    'Get hurricane alerts for Miami, FL'
  )) passCount++;

  // Test 6: Get local hurricane alerts - New Orleans
  totalTests++;
  if (await tester.testTool(
    'get_local_hurricane_alerts',
    { lat: 29.9511, lon: -90.0715 },
    'Get hurricane alerts for New Orleans, LA'
  )) passCount++;

  // Test 7: Search historical tracks
  totalTests++;
  if (await tester.testTool(
    'search_historical_tracks',
    {
      aoi: {
        type: 'Polygon',
        coordinates: [[
          [-100, 20],
          [-80, 20],
          [-80, 30],
          [-100, 30],
          [-100, 20]
        ]]
      },
      start: '2024-06-01',
      end: '2024-11-30',
      basin: 'AL'
    },
    'Search historical tracks in Gulf of Mexico region for 2024 hurricane season'
  )) passCount++;

  // Test 8: Search historical tracks without basin filter
  totalTests++;
  if (await tester.testTool(
    'search_historical_tracks',
    {
      aoi: {
        type: 'Polygon',
        coordinates: [[
          [-80, 10],
          [-60, 10],
          [-60, 25],
          [-80, 25],
          [-80, 10]
        ]]
      },
      start: '2023-01-01',
      end: '2023-12-31'
    },
    'Search all historical tracks in Caribbean for 2023'
  )) passCount++;

  console.log('\\n====================================');
  console.log(`Test Results: ${passCount}/${totalTests} passed`);
  console.log('====================================');
  
  if (passCount === totalTests) {
    console.log('🎉 All tools validated successfully!');
  } else {
    console.log(`⚠️  ${totalTests - passCount} tests need attention`);
  }
}

runAllTests().catch(console.error);
