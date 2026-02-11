// Feature #114: CSRF Protection Test
// This test verifies that CSRF protection is implemented

async function testCSRFProtection() {
  console.log('=== Feature #114: CSRF Protection Test ===\n');

  const baseUrl = 'http://localhost:3010';

  // Step 1: Create a test user and log in
  console.log('1. Creating test user and logging in...\n');

  const testEmail = `csrf_test_${Date.now()}@example.com`;
  const testPassword = 'TestPass123!';

  // Register
  const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      confirmPassword: testPassword
    })
  });

  if (!registerResponse.ok) {
    console.log('   ✗ FAIL: Registration failed');
    return 1;
  }

  console.log('   ✓ User registered successfully\n');

  // Get the auth token from cookies
  const setCookieHeader = registerResponse.headers.get('set-cookie');
  const authTokenMatch = setCookieHeader?.match(/auth_token=([^;]+)/);
  const authToken = authTokenMatch ? authTokenMatch[1] : null;

  if (!authToken) {
    console.log('   ✗ FAIL: No auth token received');
    return 1;
  }

  console.log('   ✓ Auth token received\n');

  // Step 2: Get CSRF token
  console.log('2. Getting CSRF token from /api/auth/csrf...\n');

  const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`, {
    headers: {
      'Cookie': `auth_token=${authToken}`
    }
  });

  if (!csrfResponse.ok) {
    console.log('   ✗ FAIL: Could not get CSRF token');
    return 1;
  }

  const { csrfToken, headerName } = await csrfResponse.json();

  console.log(`   ✓ CSRF token received: ${csrfToken.substring(0, 20)}...`);
  console.log(`   ✓ Header name: ${headerName}\n`);

  // Step 3: Test valid CSRF token
  console.log('3. Testing POST request with valid CSRF token...\n');

  const validResponse = await fetch(`${baseUrl}/api/canvases`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `auth_token=${authToken}`,
      'x-csrf-token': csrfToken
    },
    body: JSON.stringify({
      name: 'CSRF Test Canvas'
    })
  });

  if (validResponse.ok) {
    console.log('   ✓ Request with valid CSRF token succeeded\n');
  } else {
    console.log('   ✗ FAIL: Request with valid CSRF token failed');
    console.log(`   Status: ${validResponse.status}`);
    const error = await validResponse.json();
    console.log(`   Error: ${JSON.stringify(error)}\n`);
    return 1;
  }

  // Step 4: Test missing CSRF token
  console.log('4. Testing POST request without CSRF token (should fail)...\n');

  const missingResponse = await fetch(`${baseUrl}/api/canvases`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `auth_token=${authToken}`
    },
    body: JSON.stringify({
      name: 'Should Fail Canvas'
    })
  });

  if (missingResponse.status === 403) {
    const error = await missingResponse.json();
    console.log('   ✓ Request without CSRF token correctly rejected');
    console.log(`   ✓ Status: 403 Forbidden`);
    console.log(`   ✓ Error message: ${error.message || error.error}\n`);
  } else {
    console.log('   ✗ FAIL: Request without CSRF token was not rejected');
    console.log(`   Expected: 403, Got: ${missingResponse.status}\n`);
    return 1;
  }

  // Step 5: Test invalid CSRF token
  console.log('5. Testing POST request with invalid CSRF token (should fail)...\n');

  const invalidResponse = await fetch(`${baseUrl}/api/canvases`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `auth_token=${authToken}`,
      'x-csrf-token': 'invalid_token_12345'
    },
    body: JSON.stringify({
      name: 'Should Also Fail Canvas'
    })
  });

  if (invalidResponse.status === 403) {
    const error = await invalidResponse.json();
    console.log('   ✓ Request with invalid CSRF token correctly rejected');
    console.log(`   ✓ Status: 403 Forbidden`);
    console.log(`   ✓ Error message: ${error.message || error.error}\n`);
  } else {
    console.log('   ✗ FAIL: Request with invalid CSRF token was not rejected');
    console.log(`   Expected: 403, Got: ${invalidResponse.status}\n`);
    return 1;
  }

  // Step 6: Verify GET requests don't require CSRF
  console.log('6. Testing GET request without CSRF token (should succeed)...\n');

  const getResponse = await fetch(`${baseUrl}/api/canvases`, {
    method: 'GET',
    headers: {
      'Cookie': `auth_token=${authToken}`
    }
  });

  if (getResponse.ok) {
    console.log('   ✓ GET request without CSRF token succeeded');
    console.log('   ✓ (GET requests are stateless, no CSRF needed)\n');
  } else {
    console.log('   ⚠ Warning: GET request failed (unrelated to CSRF)\n');
  }

  // Step 7: Verify SameSite=strict cookie protection
  console.log('7. Verifying SameSite cookie protection...\n');

  if (setCookieHeader.includes('SameSite=Strict')) {
    console.log('   ✓ SameSite=Strict is set on cookies');
    console.log('   ✓ This prevents cross-site requests from including cookies\n');
  } else if (setCookieHeader.includes('SameSite=Lax')) {
    console.log('   ✓ SameSite=Lax is set on cookies');
    console.log('   ✓ This provides basic CSRF protection\n');
  } else {
    console.log('   ✗ FAIL: SameSite attribute not properly set');
    console.log(`   Cookie: ${setCookieHeader}\n`);
    return 1;
  }

  // Cleanup
  console.log('8. Cleaning up test data...\n');

  // Logout to clean up session
  await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: {
      'Cookie': `auth_token=${authToken}`,
      'x-csrf-token': csrfToken
    }
  });

  console.log('   ✓ Test user logged out\n');

  // Final result
  console.log('=== Test Result ===\n');

  console.log('✅ PASS: Feature #114 - CSRF Protection\n');
  console.log('CSRF protection is implemented:');
  console.log('- CSRF tokens are generated and validated');
  console.log('- Requests without tokens are rejected with 403');
  console.log('- Requests with invalid tokens are rejected with 403');
  console.log('- GET requests do not require CSRF tokens');
  console.log('- SameSite cookie protection is in place\n');

  return 0;
}

// Run the test
testCSRFProtection()
  .then(exitCode => {
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('Test failed with error:', error);
    process.exit(1);
  });
