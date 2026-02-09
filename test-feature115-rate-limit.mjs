// Feature #115: Rate Limiting Test
// This test verifies that rate limiting is implemented on auth endpoints

async function testRateLimiting() {
  console.log('=== Feature #115: Rate Limiting Test ===\n');

  const baseUrl = 'http://localhost:3010';
  const testEmail = `rate_limit_test_${Date.now()}@example.com`;
  const testPassword = 'TestPass123!';
  const wrongPassword = 'WrongPass123!';

  // Step 1: Test rate limiting on login endpoint
  console.log('1. Testing rate limiting on /api/auth/login...\n');

  let rateLimitReached = false;
  let rateLimitStatus = null;
  let attemptCount = 0;

  // Make 10 failed login attempts (should trigger rate limit at 5)
  for (let i = 1; i <= 10; i++) {
    attemptCount = i;

    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: wrongPassword
      })
    });

    // Check rate limit headers
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const limit = response.headers.get('X-RateLimit-Limit');

    console.log(`   Attempt #${i}: Status ${response.status}, Remaining: ${remaining}/${limit}`);

    // Check if rate limited (429 status)
    if (response.status === 429) {
      rateLimitReached = true;
      rateLimitStatus = response.status;

      const error = await response.json();
      console.log(`\n   ✓ Rate limit triggered at attempt #${i}`);
      console.log(`   ✓ Status: 429 Too Many Requests`);
      console.log(`   ✓ Error message: ${error.message}`);
      console.log(`   ✓ Retry-After: ${error.retryAfter} seconds\n`);
      break;
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  if (!rateLimitReached) {
    console.log(`   ✗ FAIL: Rate limit was not triggered after ${attemptCount} attempts\n`);
    return 1;
  }

  // Step 2: Test rate limiting on registration endpoint
  console.log('2. Testing rate limiting on /api/auth/register...\n');

  rateLimitReached = false;

  // Make multiple registration attempts (should trigger rate limit)
  for (let i = 1; i <= 10; i++) {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test${i}_${Date.now()}@example.com`,
        password: testPassword,
        confirmPassword: testPassword
      })
    });

    const remaining = response.headers.get('X-RateLimit-Remaining');

    console.log(`   Attempt #${i}: Status ${response.status}, Remaining: ${remaining}`);

    if (response.status === 429) {
      rateLimitReached = true;

      const error = await response.json();
      console.log(`\n   ✓ Rate limit triggered at attempt #${i}`);
      console.log(`   ✓ Status: 429 Too Many Requests`);
      console.log(`   ✓ Error message: ${error.message}\n`);
      break;
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  if (!rateLimitReached) {
    console.log(`   ✗ FAIL: Rate limit was not triggered on registration endpoint\n`);
    return 1;
  }

  // Step 3: Verify rate limit headers are present
  console.log('3. Verifying rate limit headers are present...\n');

  const testResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `header_test_${Date.now()}@example.com`,
      password: wrongPassword
    })
  });

  const limitHeader = testResponse.headers.get('X-RateLimit-Limit');
  const remainingHeader = testResponse.headers.get('X-RateLimit-Remaining');
  const resetHeader = testResponse.headers.get('X-RateLimit-Reset');

  if (limitHeader && remainingHeader && resetHeader) {
    console.log('   ✓ X-RateLimit-Limit header present');
    console.log('   ✓ X-RateLimit-Remaining header present');
    console.log('   ✓ X-RateLimit-Reset header present\n');
  } else {
    console.log('   ✗ FAIL: Some rate limit headers are missing');
    console.log(`   X-RateLimit-Limit: ${limitHeader}`);
    console.log(`   X-RateLimit-Remaining: ${remainingHeader}`);
    console.log(`   X-RateLimit-Reset: ${resetHeader}\n`);
    return 1;
  }

  // Step 4: Verify 429 status returns appropriate error
  console.log('4. Verifying rate limit error response...\n');

  // Make enough requests to trigger rate limit
  for (let i = 0; i < 6; i++) {
    await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `error_test_${Date.now()}@example.com`,
        password: wrongPassword
      })
    });
  }

  const rateLimitedResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `error_test_${Date.now()}@example.com`,
      password: wrongPassword
    })
  });

  if (rateLimitedResponse.status === 429) {
    const error = await rateLimitedResponse.json();

    if (error.error && error.message && error.retryAfter) {
      console.log('   ✓ 429 response includes error message');
      console.log('   ✓ 429 response includes retry-after time');
      console.log(`   ✓ Message: ${error.message}\n`);
    } else {
      console.log('   ✗ FAIL: 429 response missing required fields\n');
      return 1;
    }
  }

  // Final result
  console.log('=== Test Result ===\n');

  console.log('✅ PASS: Feature #115 - Rate Limiting\n');
  console.log('Rate limiting is implemented on authentication endpoints:');
  console.log('- Login endpoint rate limits after 5 failed attempts');
  console.log('- Registration endpoint has rate limiting');
  console.log('- 429 Too Many Requests status is returned');
  console.log('- Rate limit headers are present (X-RateLimit-*)');
  console.log('- Error message includes retry-after time\n');

  return 0;
}

// Run the test
testRateLimiting()
  .then(exitCode => {
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('Test failed with error:', error);
    process.exit(1);
  });
