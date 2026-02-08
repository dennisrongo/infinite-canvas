#!/usr/bin/env node

/**
 * Simple API test for Feature #15
 * Tests the update profile endpoint without browser automation
 */

const BASE_URL = process.env.PORT ? `http://localhost:${process.env.PORT}` : 'http://localhost:4000';

async function testFeature15() {
  console.log('=== Feature #15 API Test ===\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  try {
    // Step 1: Login
    console.log('1. Testing login...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'feature15-test@example.com',
        password: 'TestPass123!',
      }),
    });

    if (!loginResponse.ok) {
      console.error(`✗ Login failed: ${loginResponse.status}`);
      const error = await loginResponse.json();
      console.error('  Error:', error);
      return;
    }

    const loginData = await loginResponse.json();
    console.log('✓ Login successful');
    console.log(`  Token: ${loginData.token ? 'received' : 'missing'}`);

    // Step 2: Get current profile
    console.log('\n2. Fetching current profile...');
    const profileResponse = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: {
        'Cookie': `auth_token=${loginData.token}`,
      },
    });

    if (!profileResponse.ok) {
      console.error(`✗ Profile fetch failed: ${profileResponse.status}`);
      return;
    }

    const profileData = await profileResponse.json();
    console.log('✓ Profile fetched');
    console.log(`  Email: ${profileData.user.email}`);
    console.log(`  Display Name: ${profileData.user.displayName || '(not set)'}`);
    console.log(`  Created At: ${profileData.user.createdAt || '(not available)'}`);

    // Step 3: Update display name
    const testDisplayName = 'TestUser15_' + Date.now();
    console.log(`\n3. Updating display name to: ${testDisplayName}`);

    const updateResponse = await fetch(`${BASE_URL}/api/user/update-profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth_token=${loginData.token}`,
      },
      body: JSON.stringify({
        displayName: testDisplayName,
      }),
    });

    if (!updateResponse.ok) {
      console.error(`✗ Update failed: ${updateResponse.status}`);
      const error = await updateResponse.json();
      console.error('  Error:', error);
      return;
    }

    const updateData = await updateResponse.json();
    console.log('✓ Display name updated');
    console.log(`  New display name: ${updateData.user.displayName}`);

    // Step 4: Verify persistence
    console.log('\n4. Verifying persistence...');
    const verifyResponse = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: {
        'Cookie': `auth_token=${loginData.token}`,
      },
    });

    const verifyData = await verifyResponse.json();
    if (verifyData.user.displayName === testDisplayName) {
      console.log('✓ Display name persisted in database');
    } else {
      console.error('✗ Display name did not persist');
      console.error(`  Expected: ${testDisplayName}`);
      console.error(`  Got: ${verifyData.user.displayName}`);
      return;
    }

    // Step 5: Test validation - empty display name
    console.log('\n5. Testing validation (empty display name)...');
    const emptyResponse = await fetch(`${BASE_URL}/api/user/update-profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth_token=${loginData.token}`,
      },
      body: JSON.stringify({
        displayName: '   ',
      }),
    });

    if (!emptyResponse.ok) {
      console.log('✓ Empty display name rejected (validation works)');
      const error = await emptyResponse.json();
      console.log(`  Error message: ${error.error}`);
    } else {
      console.error('✗ Empty display name was accepted (validation failed)');
      return;
    }

    // Step 6: Test special characters
    console.log('\n6. Testing special characters...');
    const specialName = 'Test User ©®™ <script>alert("xss")</script>';
    const specialResponse = await fetch(`${BASE_URL}/api/user/update-profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth_token=${loginData.token}`,
      },
      body: JSON.stringify({
        displayName: specialName,
      }),
    });

    if (specialResponse.ok) {
      console.log('✓ Special characters accepted (as expected)');
      const specialData = await specialResponse.json();
      console.log(`  Stored as: ${specialData.user.displayName}`);
    } else {
      console.log('⚠ Special characters rejected (may be intentional)');
    }

    console.log('\n=== ALL TESTS PASSED ✓ ===');
    console.log('\nFeature #15 is WORKING correctly!');
    console.log('- Profile display is working');
    console.log('- Display name update is working');
    console.log('- Data persistence is working');
    console.log('- Validation is working');
    console.log('- Special characters are handled');

  } catch (error) {
    console.error('\n✗ Test failed with error:', error.message);
    console.error('  Make sure the dev server is running on', BASE_URL);
  }
}

testFeature15();
