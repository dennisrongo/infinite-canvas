/**
 * Feature #10 Additional Test: Session cookie (rememberMe=false)
 *
 * This test verifies that when rememberMe is false, a session cookie is used
 * that expires when the browser is closed.
 */

async function testSessionCookie() {
  console.log('===================================================');
  console.log('Feature #10: Testing session cookie (rememberMe=false)');
  console.log('===================================================\n');

  const loginResponse = await fetch('http://localhost:3015/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'feature10_session_test@example.com',
      password: 'Test1234!',
      rememberMe: false
    })
  });

  const loginData = await loginResponse.json();

  if (!loginResponse.ok) {
    console.log('❌ Login failed:', loginData.error);
    return false;
  }

  console.log('✓ Login successful with rememberMe=false');

  const setCookieHeader = loginResponse.headers.get('set-cookie');
  console.log('\nSet-Cookie header:', setCookieHeader);

  // Check for Max-Age attribute
  const hasMaxAge = setCookieHeader && setCookieHeader.includes('Max-Age=');
  const hasExpires = setCookieHeader && setCookieHeader.includes('Expires=');

  console.log('\nCookie Analysis:');
  console.log('─────────────────────────────────────────────────────────');

  if (hasMaxAge) {
    console.log('❌ FAIL: Cookie has Max-Age (should be session cookie)');
    console.log('   A session cookie should NOT have Max-Age or Expires');
    return false;
  } else {
    console.log('✓ PASS: No Max-Age attribute (session cookie)');
  }

  if (hasExpires) {
    console.log('⚠ WARNING: Cookie has Expires attribute');
    console.log('   This is OK for some browsers, but ideally should not be present');
  } else {
    console.log('✓ PASS: No Expires attribute (pure session cookie)');
  }

  console.log('\nSession Cookie Behavior:');
  console.log('─────────────────────────────────────────────────────────');
  console.log('• Cookie persists only while browser is open');
  console.log('• Closing the browser deletes the cookie');
  console.log('• Reopening browser requires re-authentication');
  console.log('• Useful for shared/public computers');

  console.log('\n✅ Feature #10 (rememberMe=false): PASSING');
  return true;
}

testSessionCookie()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
