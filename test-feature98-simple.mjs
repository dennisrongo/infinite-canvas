/**
 * Simple test for Feature #98: Theme Persistence API
 */

const BASE_URL = 'http://localhost:3010';

async function test() {
  console.log('Testing /api/user/settings endpoint...');

  try {
    // Try GET without auth (should fail with 401)
    console.log('\n1. Testing GET without authentication...');
    let response = await fetch(`${BASE_URL}/api/user/settings`);
    console.log(`   Status: ${response.status}`);
    if (response.status === 401) {
      console.log('   ✓ Correctly returns 401 for unauthenticated request');
    } else {
      console.log('   ✗ Expected 401, got', response.status);
    }

    // Register a test user
    console.log('\n2. Registering test user...');
    response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'feature98@test.com',
        password: 'Test1234!',
        displayName: 'Feature98 Test',
      }),
    });
    console.log(`   Status: ${response.status}`);

    // Login
    console.log('\n3. Logging in...');
    response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'feature98@test.com',
        password: 'Test1234!',
      }),
    });
    const loginData = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Token: ${loginData.token ? 'received' : 'missing'}`);

    if (!loginData.token) {
      throw new Error('No token received');
    }

    // Get settings (should create default settings)
    console.log('\n4. Getting user settings (should create defaults)...');
    response = await fetch(`${BASE_URL}/api/user/settings`, {
      headers: { 'Authorization': `Bearer ${loginData.token}` },
    });
    const getSettings = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Theme: ${getSettings.settings?.theme || 'missing'}`);
    console.log(`   Sort Order: ${getSettings.settings?.canvasSortOrder || 'missing'}`);

    if (getSettings.settings?.theme !== 'light') {
      console.log('   ✗ Expected default theme to be "light"');
    } else {
      console.log('   ✓ Default theme is "light"');
    }

    // Update theme to dark
    console.log('\n5. Updating theme to dark...');
    response = await fetch(`${BASE_URL}/api/user/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.token}`,
      },
      body: JSON.stringify({ theme: 'dark' }),
    });
    const putSettings = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Theme: ${putSettings.settings?.theme || 'missing'}`);

    if (putSettings.settings?.theme !== 'dark') {
      console.log('   ✗ Failed to update theme to "dark"');
    } else {
      console.log('   ✓ Theme updated to "dark"');
    }

    // Get settings again to verify persistence
    console.log('\n6. Getting settings again to verify persistence...');
    response = await fetch(`${BASE_URL}/api/user/settings`, {
      headers: { 'Authorization': `Bearer ${loginData.token}` },
    });
    const verifySettings = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Theme: ${verifySettings.settings?.theme || 'missing'}`);

    if (verifySettings.settings?.theme !== 'dark') {
      console.log('   ✗ Theme did not persist in database');
    } else {
      console.log('   ✓ Theme persisted in database as "dark"');
    }

    // Update theme back to light
    console.log('\n7. Updating theme back to light...');
    response = await fetch(`${BASE_URL}/api/user/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.token}`,
      },
      body: JSON.stringify({ theme: 'light' }),
    });
    const finalSettings = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Theme: ${finalSettings.settings?.theme || 'missing'}`);

    if (finalSettings.settings?.theme !== 'light') {
      console.log('   ✗ Failed to update theme to "light"');
    } else {
      console.log('   ✓ Theme updated to "light"');
    }

    // Final verification
    console.log('\n8. Final verification...');
    response = await fetch(`${BASE_URL}/api/user/settings`, {
      headers: { 'Authorization': `Bearer ${loginData.token}` },
    });
    const finalVerify = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Theme: ${finalVerify.settings?.theme || 'missing'}`);

    if (finalVerify.settings?.theme === 'light') {
      console.log('   ✓ Theme persisted correctly');
      console.log('\n✓ ALL TESTS PASSED');
      process.exit(0);
    } else {
      console.log('   ✗ Theme did not persist');
      console.log('\n✗ TESTS FAILED');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    process.exit(1);
  }
}

test();
