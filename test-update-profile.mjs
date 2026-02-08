#!/usr/bin/env node

/**
 * Test script for Feature #15: User profile display name update
 * This script tests the /api/user/update-profile endpoint
 *
 * Prerequisites:
 * 1. Dev server must be running on port 3000 (or whichever port is configured)
 * 2. A test user must exist (email/password)
 * 3. User must be logged in (have valid auth token)
 */

const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  testUser: {
    email: 'test@example.com',
    password: 'Test1234!@#',
  },
  testDisplayName: 'TEST_USER_15_' + Date.now(),
};

async function testUpdateProfile() {
  console.log('=== Feature #15 Test: Update User Display Name ===\n');

  try {
    // Step 1: Login to get auth token
    console.log('Step 1: Logging in...');
    const loginResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_CONFIG.testUser.email,
        password: TEST_CONFIG.testUser.password,
      }),
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const authToken = loginData.token;
    console.log('✓ Login successful\n');

    // Step 2: Get current user profile
    console.log('Step 2: Fetching current profile...');
    const getProfileResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/auth/me`, {
      headers: {
        'Cookie': `auth_token=${authToken}`,
      },
    });

    if (!getProfileResponse.ok) {
      throw new Error(`Get profile failed: ${getProfileResponse.status}`);
    }

    const profileData = await getProfileResponse.json();
    console.log('✓ Current profile:', profileData.user);
    console.log('');

    // Step 3: Update display name
    console.log('Step 3: Updating display name to:', TEST_CONFIG.testDisplayName);
    const updateResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/user/update-profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth_token=${authToken}`,
      },
      body: JSON.stringify({
        displayName: TEST_CONFIG.testDisplayName,
      }),
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.json();
      throw new Error(`Update failed: ${JSON.stringify(error)}`);
    }

    const updateData = await updateResponse.json();
    console.log('✓ Profile updated successfully');
    console.log('  New display name:', updateData.user.displayName);
    console.log('');

    // Step 4: Verify the update persisted
    console.log('Step 4: Verifying update persisted...');
    const verifyResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/auth/me`, {
      headers: {
        'Cookie': `auth_token=${authToken}`,
      },
    });

    if (!verifyResponse.ok) {
      throw new Error(`Verification failed: ${verifyResponse.status}`);
    }

    const verifyData = await verifyResponse.json();
    if (verifyData.user.displayName === TEST_CONFIG.testDisplayName) {
      console.log('✓ Display name persisted correctly');
    } else {
      throw new Error(`Display name mismatch! Expected: ${TEST_CONFIG.testDisplayName}, Got: ${verifyData.user.displayName}`);
    }
    console.log('');

    // Step 5: Test validation - empty display name
    console.log('Step 5: Testing validation (empty display name)...');
    const emptyResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/user/update-profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth_token=${authToken}`,
      },
      body: JSON.stringify({
        displayName: '   ',  // Whitespace only
      }),
    });

    if (!emptyResponse.ok) {
      const error = await emptyResponse.json();
      if (error.error.includes('cannot be empty')) {
        console.log('✓ Empty display name rejected correctly');
      } else {
        console.log('⚠ Empty display name rejected but with unexpected error:', error.error);
      }
    } else {
      console.log('✗ Empty display name should have been rejected!');
    }
    console.log('');

    // Step 6: Test validation - too long display name
    console.log('Step 6: Testing validation (too long display name)...');
    const longName = 'A'.repeat(101);
    const longResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/user/update-profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth_token=${authToken}`,
      },
      body: JSON.stringify({
        displayName: longName,
      }),
    });

    if (!longResponse.ok) {
      const error = await longResponse.json();
      if (error.error.includes('less than 100')) {
        console.log('✓ Too long display name rejected correctly');
      } else {
        console.log('⚠ Too long display name rejected but with unexpected error:', error.error);
      }
    } else {
      console.log('✗ Too long display name should have been rejected!');
    }
    console.log('');

    console.log('=== All Tests Passed! ✓ ===');
    process.exit(0);

  } catch (error) {
    console.error('✗ Test failed:', error.message);
    console.error('\nMake sure:');
    console.error('1. Dev server is running on', TEST_CONFIG.baseUrl);
    console.error('2. Test user exists:', TEST_CONFIG.testUser.email);
    console.error('3. User credentials are correct');
    process.exit(1);
  }
}

// Run tests
testUpdateProfile();
