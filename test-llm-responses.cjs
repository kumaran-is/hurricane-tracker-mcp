const http = require('http');

class LLMResponseTester {
  constructor() {
    this.sessionId = null;
  }

  async init() {
    const res = await this.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'llm-response-tester', version: 'v1.0' }
    });
    this.sessionId = res.sessionId;
    console.log('Session initialized:', this.sessionId);
    return res.sessionId;
  }

  async request(method, params, useSession = true) {
    return new Promise((resolve) => {
      const body = JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
        id: Math.floor(Math.random() * 1000)
      });

      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      };

      if (useSession && this.sessionId) {
        headers['mcp-session-id'] = this.sessionId;
      }

      const req = http.request({
        hostname: 'localhost',
        port: 8080,
        path: '/mcp',
        method: 'POST',
        headers
      }, (res) => {
        let data = '';
        const sid = res.headers['mcp-session-id'];
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const lines = data.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const parsed = JSON.parse(line.substring(6));
              resolve({ data: parsed, sessionId: sid });
              return;
            }
          }
        });
      });
      req.write(body);
      req.end();
    });
  }

  async testTool(name, args, description) {
    console.log(`\n🔍 Test: ${description}`);
    console.log(`   Tool: ${name}`);

    const res = await this.request('tools/call', { name, arguments: args });

    if (res.data.result && res.data.result.content) {
      const content = res.data.result.content[0].text;

      try {
        const parsed = JSON.parse(content);

        // Display the response in a readable format
        if (parsed.error) {
          console.log('   ❌ ERROR RESPONSE:');
          console.log(`      Code: ${parsed.error.code}`);
          console.log(`      Message: ${parsed.error.message}`);
          console.log(`      Hint: ${parsed.error.hint}`);
        } else if (typeof parsed.success !== 'undefined') {
          console.log('   ✅ SUCCESS RESPONSE:');
          console.log(`      Success: ${parsed.success}`);
          console.log(`      Count: ${typeof parsed.count !== 'undefined' ? parsed.count : 'N/A'}`);
          console.log(`      Message: ${parsed.message || 'N/A'}`);
          if (parsed.results && Array.isArray(parsed.results)) {
            console.log(`      Results: ${parsed.results.length} items`);
            if (parsed.results.length > 0 && parsed.results[0]) {
              console.log(`      Sample keys: ${Object.keys(parsed.results[0]).slice(0, 5).join(', ')}`);
            }
          }
        } else {
          console.log('   ⚠️  LEGACY FORMAT (needs update):');
          console.log(`      Response: ${JSON.stringify(parsed).substring(0, 100)}...`);
        }

      } catch (e) {
        console.log('   ⚠️  Non-JSON Response:', content.substring(0, 100));
      }
    }
  }

  async runTests() {
    await this.init();
    console.log('\n=== LLM-FRIENDLY RESPONSE FORMAT TESTS ===');
    console.log('Testing all tools for consistent, clear responses...');

    // Test 1: Empty results - should have helpful message
    await this.testTool(
      'get_active_storms',
      { basin: 'WP' },
      'Empty result - Western Pacific (should have helpful message)'
    );

    // Test 2: Success with results
    await this.testTool(
      'get_active_storms',
      {},
      'Success with results - All active storms'
    );

    // Test 3: No alerts (empty array)
    await this.testTool(
      'get_local_hurricane_alerts',
      { lat: 40.7128, lon: -74.0060 },  // New York
      'No alerts - New York City'
    );

    // Test 4: Error - Not Found
    await this.testTool(
      'get_storm_cone',
      { stormId: 'AL999999' },
      'Error - Storm not found'
    );

    // Test 5: Error - Validation
    await this.testTool(
      'get_storm_cone',
      { stormId: 'INVALID' },
      'Error - Invalid storm ID format'
    );

    // Test 6: Historical search with results
    await this.testTool(
      'search_historical_tracks',
      {
        aoi: {
          type: 'Polygon',
          coordinates: [[[-100,20],[-80,20],[-80,30],[-100,30],[-100,20]]]
        },
        start: '2024-06-01',
        end: '2024-11-30'
      },
      'Historical tracks - Gulf of Mexico 2024 season'
    );

    // Test 7: Historical search - empty
    await this.testTool(
      'search_historical_tracks',
      {
        aoi: {
          type: 'Polygon',
          coordinates: [[[-10,70],[-5,70],[-5,75],[-10,75],[-10,70]]]  // Arctic Ocean
        },
        start: '2024-01-01',
        end: '2024-12-31'
      },
      'Historical tracks - Arctic (should be empty with message)'
    );

    console.log('\n=== SUMMARY ===');
    console.log('✅ All success responses should have: {success, count, results, message}');
    console.log('✅ All error responses should have: {error: {code, message, hint}}');
    console.log('✅ Empty results should provide helpful context messages');
    console.log('✅ All responses should be valid JSON for LLM parsing');
  }
}

const tester = new LLMResponseTester();
tester.runTests().catch(console.error);