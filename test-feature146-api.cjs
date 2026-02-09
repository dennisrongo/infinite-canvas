// Test Feature #146 via API calls
const http = require('http');

const API_BASE = 'http://localhost:3000';

// Test user credentials
const TEST_USER = {
  email: 'test-edge-cases-146@example.com',
  password: 'TestPass123!',
  displayName: 'Edge Case Test User 146'
};

let sessionCookie = '';

function makeRequest(path, method, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : null;
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function login() {
  console.log('Logging in test user...');
  const res = await makeRequest('/api/auth/login', 'POST', TEST_USER);

  if (res.status === 200 || res.status === 201) {
    const setCookie = res.headers['set-cookie'];
    if (setCookie) {
      sessionCookie = setCookie[0].split(';')[0];
      console.log('✅ Login successful');
      return true;
    }
  }

  // Try registering if login fails
  console.log('Login failed, trying to register...');
  const regRes = await makeRequest('/api/auth/register', 'POST', TEST_USER);
  if (regRes.status === 200 || regRes.status === 201) {
    const setCookie = regRes.headers['set-cookie'];
    if (setCookie) {
      sessionCookie = setCookie[0].split(';')[0];
      console.log('✅ Registration successful');
      return true;
    }
  }

  return false;
}

async function testEmptySearch() {
  console.log('\n=== Feature #146: Empty Search Query Handling (API Test) ===\n');

  const loggedIn = await login();
  if (!loggedIn) {
    console.error('❌ Failed to authenticate');
    return;
  }

  const headers = { 'Cookie': sessionCookie };
  let testsPassed = 0;
  let testsTotal = 0;

  // Test 1: Empty string query
  console.log('Test 1: Empty string query ""');
  testsTotal++;
  try {
    const res = await makeRequest('/api/search', 'POST', { query: '' }, headers);
    if (res.status === 200 && res.body && Array.isArray(res.body.results) && res.body.results.length === 0) {
      console.log('  ✅ PASS: Returns { results: [] } with status 200\n');
      testsPassed++;
    } else {
      console.log(`  ❌ FAIL: Status ${res.status}, body:`, res.body);
    }
  } catch (e) {
    console.log('  ❌ FAIL: Error:', e.message);
  }

  // Test 2: Spaces only
  console.log('Test 2: Spaces-only query "   "');
  testsTotal++;
  try {
    const res = await makeRequest('/api/search', 'POST', { query: '   ' }, headers);
    if (res.status === 200 && res.body && Array.isArray(res.body.results) && res.body.results.length === 0) {
      console.log('  ✅ PASS: Spaces trimmed, returns { results: [] }\n');
      testsPassed++;
    } else {
      console.log(`  ❌ FAIL: Status ${res.status}, body:`, res.body);
    }
  } catch (e) {
    console.log('  ❌ FAIL: Error:', e.message);
  }

  // Test 3: Tab and spaces
  console.log('Test 3: Tab and spaces "\\t  \\t"');
  testsTotal++;
  try {
    const res = await makeRequest('/api/search', 'POST', { query: '\t  \t' }, headers);
    if (res.status === 200 && res.body && Array.isArray(res.body.results) && res.body.results.length === 0) {
      console.log('  ✅ PASS: Tabs trimmed, returns { results: [] }\n');
      testsPassed++;
    } else {
      console.log(`  ❌ FAIL: Status ${res.status}, body:`, res.body);
    }
  } catch (e) {
    console.log('  ❌ FAIL: Error:', e.message);
  }

  // Test 4: Multiple spaces
  console.log('Test 4: Multiple spaces "        "');
  testsTotal++;
  try {
    const res = await makeRequest('/api/search', 'POST', { query: '        ' }, headers);
    if (res.status === 200 && res.body && Array.isArray(res.body.results) && res.body.results.length === 0) {
      console.log('  ✅ PASS: Multiple spaces trimmed, returns { results: [] }\n');
      testsPassed++;
    } else {
      console.log(`  ❌ FAIL: Status ${res.status}, body:`, res.body);
    }
  } catch (e) {
    console.log('  ❌ FAIL: Error:', e.message);
  }

  // Test 5: Newline characters
  console.log('Test 5: Newline characters "\\n"');
  testsTotal++;
  try {
    const res = await makeRequest('/api/search', 'POST', { query: '\n' }, headers);
    if (res.status === 200 && res.body && Array.isArray(res.body.results) && res.body.results.length === 0) {
      console.log('  ✅ PASS: Newline trimmed, returns { results: [] }\n');
      testsPassed++;
    } else {
      console.log(`  ❌ FAIL: Status ${res.status}, body:`, res.body);
    }
  } catch (e) {
    console.log('  ❌ FAIL: Error:', e.message);
  }

  // Test 6: Mixed whitespace
  console.log('Test 6: Mixed whitespace " \\n\\t  "');
  testsTotal++;
  try {
    const res = await makeRequest('/api/search', 'POST', { query: ' \n\t  ' }, headers);
    if (res.status === 200 && res.body && Array.isArray(res.body.results) && res.body.results.length === 0) {
      console.log('  ✅ PASS: All whitespace trimmed, returns { results: [] }\n');
      testsPassed++;
    } else {
      console.log(`  ❌ FAIL: Status ${res.status}, body:`, res.body);
    }
  } catch (e) {
    console.log('  ❌ FAIL: Error:', e.message);
  }

  console.log('=== Test Summary ===');
  console.log(`Tests Passed: ${testsPassed}/${testsTotal}`);

  if (testsPassed === testsTotal) {
    console.log('\n✅ Feature #146: PASSING - Empty search query handling verified via API');
  } else {
    console.log('\n❌ Feature #146: FAILING - Some tests failed');
  }
}

testEmptySearch().catch(console.error);
