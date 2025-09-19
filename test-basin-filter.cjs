const http = require('http');

let sessionId = null;

async function makeRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id: Math.floor(Math.random() * 10000)
    });

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Content-Length': Buffer.byteLength(body)
    };

    if (sessionId) {
      headers['mcp-session-id'] = sessionId;
    }

    const options = {
      hostname: 'localhost',
      port: 8080,
      path: '/mcp',
      method: 'POST',
      headers
    };

    const req = http.request(options, (res) => {
      let data = '';

      // Capture session ID from response headers
      if (!sessionId && res.headers['mcp-session-id']) {
        sessionId = res.headers['mcp-session-id'];
      }

      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const lines = data.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              resolve(JSON.parse(line.substring(6)));
              return;
            }
          }
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function test() {
  // Initialize
  const init = await makeRequest('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: { sampling: {} },
    clientInfo: { name: 'test', version: '1.0.0' }
  });
  
  console.log('Testing basin filter...\n');

  // Test 1: Get all storms without filter
  console.log('1. Without filter:');
  const all = await makeRequest('tools/call', {
    name: 'get_active_storms',
    arguments: {}
  });
  const allData = JSON.parse(all.result.content[0].text);
  console.log(`   Found ${allData.count} storms`);
  if (allData.results.length > 0) {
    console.log('   First storm basin:', allData.results[0].basin);
    console.log('   Full storm:', JSON.stringify(allData.results[0], null, 2));
  }

  // Test 2: Filter by uppercase AL
  console.log('\n2. With filter basin="AL":');
  const upperCase = await makeRequest('tools/call', {
    name: 'get_active_storms',
    arguments: { basin: 'AL' }
  });
  const upperData = JSON.parse(upperCase.result.content[0].text);
  console.log(`   Found ${upperData.count} storms`);
  
  // Test 3: Filter by lowercase al
  console.log('\n3. With filter basin="al":');
  const lowerCase = await makeRequest('tools/call', {
    name: 'get_active_storms',
    arguments: { basin: 'al' }
  });
  const lowerData = JSON.parse(lowerCase.result.content[0].text);
  console.log(`   Found ${lowerData.count} storms`);

  // Test 4: Filter by EP (Eastern Pacific)
  console.log('\n4. With filter basin="EP":');
  const ep = await makeRequest('tools/call', {
    name: 'get_active_storms',
    arguments: { basin: 'EP' }
  });
  const epData = JSON.parse(ep.result.content[0].text);
  console.log(`   Found ${epData.count} storms`);
}

test().catch(console.error);
