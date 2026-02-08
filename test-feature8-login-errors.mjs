/**
 * Test Feature #8: User login with incorrect credentials fails gracefully
 *
 * This test verifies:
 * 1. Login with non-existent email returns generic error
 * 2. Login with correct email but wrong password returns generic error
 * 3. Error messages do not reveal whether email exists
 * 4. User is not logged in after failed attempts
 * 5. No sensitive information leaked in error responses
 */

const API_BASE = 'http://localhost:3010';

async function testFeature8() {
  console.log('='.repeat(80));
  console.log('TESTING FEATURE #8: User login with incorrect credentials fails gracefully');
  console.log('='.repeat(80));
  console.log();

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Login with non-existent email
  console.log('Test 1: Login with non-existent email');
  console.log('-'.repeat(80));
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent-test-email-xyz123@example.com',
        password: 'SomePassword123!'
      })
    });

    const data = await response.json();

    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));

    if (response.status === 401) {
      console.log('✅ Correctly returned 401 Unauthorized');
      testsPassed++;
    } else {
      console.log(`❌ Expected 401, got ${response.status}`);
      testsFailed++;
    }

    if (data.error === 'Invalid email or password') {
      console.log('✅ Generic error message returned (does not reveal if email exists)');
      testsPassed++;
    } else {
      console.log(`❌ Expected generic error, got: ${data.error}`);
      testsFailed++;
    }

    if (!data.user) {
      console.log('✅ No user data returned (user not logged in)');
      testsPassed++;
    } else {
      console.log('❌ User data returned when it should not be');
      testsFailed++;
    }

    // Check that error doesn't reveal email existence
    if (data.error.toLowerCase().includes('email') && data.error.toLowerCase().includes('not')) {
      console.log('❌ Error message might reveal email existence');
      testsFailed++;
    } else if (data.error.toLowerCase().includes('user') && data.error.toLowerCase().includes('not')) {
      console.log('❌ Error message might reveal user existence');
      testsFailed++;
    } else {
      console.log('✅ Error message does not reveal email/user existence');
      testsPassed++;
    }

  } catch (error) {
    console.log(`❌ Test failed with error:`, error.message);
    testsFailed++;
  }
  console.log();

  // Test 2: Login with correct email format but invalid format
  console.log('Test 2: Login with invalid email format');
  console.log('-'.repeat(80));
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'not-an-email',
        password: 'SomePassword123!'
      })
    });

    const data = await response.json();

    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));

    if (response.status === 401) {
      console.log('✅ Correctly returned 401 Unauthorized');
      testsPassed++;
    } else {
      console.log(`❌ Expected 401, got ${response.status}`);
      testsFailed++;
    }

    if (data.error === 'Invalid email or password') {
      console.log('✅ Generic error message returned');
      testsPassed++;
    } else {
      console.log(`❌ Expected generic error, got: ${data.error}`);
      testsFailed++;
    }

  } catch (error) {
    console.log(`❌ Test failed with error:`, error.message);
    testsFailed++;
  }
  console.log();

  // Test 3: Login with registered email but incorrect password
  console.log('Test 3: Login with registered email but incorrect password');
  console.log('-'.repeat(80));
  console.log('Note: This test uses feature6-test@example.com which was registered in Feature #6');

  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'feature6-test@example.com',
        password: 'WrongPassword123!'
      })
    });

    const data = await response.json();

    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));

    if (response.status === 401) {
      console.log('✅ Correctly returned 401 Unauthorized');
      testsPassed++;
    } else {
      console.log(`❌ Expected 401, got ${response.status}`);
      testsFailed++;
    }

    if (data.error === 'Invalid email or password') {
      console.log('✅ Generic error message returned (same as non-existent email)');
      testsPassed++;
    } else {
      console.log(`❌ Expected generic error, got: ${data.error}`);
      testsFailed++;
    }

    if (!data.user) {
      console.log('✅ No user data returned (user not logged in)');
      testsPassed++;
    } else {
      console.log('❌ User data returned when it should not be');
      testsFailed++;
    }

    // Verify no session cookie was set
    const setCookieHeader = response.headers.get('set-cookie');
    if (!setCookieHeader) {
      console.log('✅ No session cookie set');
      testsPassed++;
    } else {
      console.log('❌ Session cookie was set for failed login');
      testsFailed++;
    }

  } catch (error) {
    console.log(`❌ Test failed with error:`, error.message);
    testsFailed++;
  }
  console.log();

  // Test 4: Empty email field
  console.log('Test 4: Login with empty email field');
  console.log('-'.repeat(80));
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: '',
        password: 'SomePassword123!'
      })
    });

    const data = await response.json();

    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));

    if (response.status === 401) {
      console.log('✅ Correctly returned 401 Unauthorized');
      testsPassed++;
    } else {
      console.log(`❌ Expected 401, got ${response.status}`);
      testsFailed++;
    }

  } catch (error) {
    console.log(`❌ Test failed with error:`, error.message);
    testsFailed++;
  }
  console.log();

  // Test 5: Empty password field
  console.log('Test 5: Login with empty password field');
  console.log('-'.repeat(80));
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'feature6-test@example.com',
        password: ''
      })
    });

    const data = await response.json();

    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));

    if (response.status === 401) {
      console.log('✅ Correctly returned 401 Unauthorized');
      testsPassed++;
    } else {
      console.log(`❌ Expected 401, got ${response.status}`);
      testsFailed++;
    }

  } catch (error) {
    console.log(`❌ Test failed with error:`, error.message);
    testsFailed++;
  }
  console.log();

  // Test 6: Missing fields
  console.log('Test 6: Login with missing fields');
  console.log('-'.repeat(80));
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const data = await response.json();

    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));

    if (response.status === 401) {
      console.log('✅ Correctly returned 401 Unauthorized');
      testsPassed++;
    } else {
      console.log(`❌ Expected 401, got ${response.status}`);
      testsFailed++;
    }

  } catch (error) {
    console.log(`❌ Test failed with error:`, error.message);
    testsFailed++;
  }
  console.log();

  // Summary
  console.log('='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests Passed: ${testsPassed}`);
  console.log(`Total Tests Failed: ${testsFailed}`);
  console.log();

  if (testsFailed === 0) {
    console.log('✅ ALL TESTS PASSED! Feature #8 is working correctly.');
    console.log();
    console.log('Security Requirements Met:');
    console.log('  ✓ Generic error messages do not reveal email existence');
    console.log('  ✓ Same error for non-existent email and wrong password');
    console.log('  ✓ No user data returned on failed login');
    console.log('  ✓ No session created on failed login');
    console.log('  ✓ All validation errors return appropriate status codes');
  } else {
    console.log('❌ SOME TESTS FAILED. Review results above.');
  }

  console.log('='.repeat(80));

  return testsFailed === 0;
}

// Run the tests
testFeature8()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
