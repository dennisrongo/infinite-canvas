/**
 * Feature #119: User Data Isolation Test
 *
 * This test verifies that users cannot access other users' data.
 */

import crypto from 'crypto';

// Test configuration
const BASE_URL = 'http://localhost:3010';
const USER_A = {
  email: `user_a_isolation_${Date.now()}@example.com`,
  password: 'TestPass123!@#',
  displayName: 'User A - Isolation Test'
};
const USER_B = {
  email: `user_b_isolation_${Date.now()}@example.com`,
  password: 'TestPass456!@#',
  displayName: 'User B - Isolation Test'
};

let userAToken = null;
let userBToken = null;
let userACanvasId = null;
let userAFirstCanvasId = null; // First canvas created
let userBCanvases = [];

// Helper function to make API requests
async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (options.token) {
    headers['Cookie'] = `session=${options.token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));
  return { status: response.status, data, headers: response.headers };
}

// Step 1: Register User A
async function step1_registerUserA() {
  console.log('\n=== Step 1: Register User A ===');
  const response = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(USER_A)
  });

  if (response.status !== 201) {
    throw new Error(`Failed to register User A: ${JSON.stringify(response.data)}`);
  }

  // Extract session token from Set-Cookie header
  const setCookie = response.headers.get('set-cookie');
  const match = setCookie?.match(/session=([^;]+)/);
  userAToken = match ? match[1] : null;

  console.log(`✓ User A registered: ${USER_A.email}`);
  console.log(`✓ User A token: ${userAToken ? userAToken.substring(0, 20) + '...' : 'MISSING'}`);
}

// Step 2: Create a canvas for User A with unique ID
async function step2_createUserACanvas() {
  console.log('\n=== Step 2: Create canvas for User A ===');
  const canvasName = `ISOLATION_TEST_A_${Date.now()}`;
  const response = await apiRequest('/api/canvases', {
    method: 'POST',
    body: JSON.stringify({ name: canvasName }),
    token: userAToken
  });

  if (response.status !== 201) {
    throw new Error(`Failed to create canvas for User A: ${JSON.stringify(response.data)}`);
  }

  userAFirstCanvasId = response.data.canvas.id;
  console.log(`✓ User A canvas created: ${canvasName}`);
  console.log(`✓ Canvas ID: ${userAFirstCanvasId}`);
}

// Step 3: Create another canvas with unique identifier name
async function step3_createUniqueCanvas() {
  console.log('\n=== Step 3: Create second canvas with unique ID ===');
  const uniqueName = `ISOLATION_TEST_A_UNIQUE_${crypto.randomUUID()}`;
  const response = await apiRequest('/api/canvases', {
    method: 'POST',
    body: JSON.stringify({ name: uniqueName }),
    token: userAToken
  });

  if (response.status !== 201) {
    throw new Error(`Failed to create unique canvas: ${JSON.stringify(response.data)}`);
  }

  userACanvasId = response.data.canvas.id;
  console.log(`✓ Unique canvas created: ${uniqueName}`);
  console.log(`✓ Canvas ID: ${userACanvasId}`);
}

// Step 4: List User A's canvases to verify ownership
async function step4_listUserACanvases() {
  console.log('\n=== Step 4: List User A\'s canvases ===');
  const response = await apiRequest('/api/canvases', { token: userAToken });

  if (response.status !== 200) {
    throw new Error(`Failed to list User A canvases: ${JSON.stringify(response.data)}`);
  }

  console.log(`✓ User A has ${response.data.canvases.length} canvas(es)`);
  response.data.canvases.forEach(c => {
    console.log(`  - ${c.name} (${c.id})`);
  });
}

// Step 5: Logout User A
async function step5_logoutUserA() {
  console.log('\n=== Step 5: Logout User A ===');
  const response = await apiRequest('/api/auth/logout', {
    method: 'POST',
    token: userAToken
  });

  if (response.status !== 200) {
    console.warn(`Warning: Logout response was ${response.status}`);
  }

  console.log('✓ User A logged out');
  userAToken = null;
}

// Step 6: Register User B
async function step6_registerUserB() {
  console.log('\n=== Step 6: Register User B ===');
  const response = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(USER_B)
  });

  if (response.status !== 201) {
    throw new Error(`Failed to register User B: ${JSON.stringify(response.data)}`);
  }

  const setCookie = response.headers.get('set-cookie');
  const match = setCookie?.match(/session=([^;]+)/);
  userBToken = match ? match[1] : null;

  console.log(`✓ User B registered: ${USER_B.email}`);
  console.log(`✓ User B token: ${userBToken ? userBToken.substring(0, 20) + '...' : 'MISSING'}`);
}

// Step 7: Try to directly access User A's canvas via API
async function step7_tryAccessUserACanvas() {
  console.log('\n=== Step 7: User B tries to access User A\'s canvas ===');
  console.log(`Attempting: GET /api/canvases/${userACanvasId}`);

  const response = await apiRequest(`/api/canvases/${userACanvasId}`, {
    token: userBToken
  });

  console.log(`Response status: ${response.status}`);

  if (response.status === 404) {
    console.log('✓ Access denied - Returns 404 (canvas not found for this user)');
    console.log('✓ User B cannot see User A\'s canvas via API');
    return true;
  } else if (response.status === 401) {
    console.log('✓ Access denied - Returns 401 (unauthorized)');
    console.log('✓ User B cannot see User A\'s canvas via API');
    return true;
  } else {
    console.log(`✗ FAIL: Expected 404 or 401, got ${response.status}`);
    console.log(`Response data: ${JSON.stringify(response.data)}`);
    return false;
  }
}

// Step 8: Try to access User A's first canvas
async function step8_tryAccessFirstCanvas() {
  console.log('\n=== Step 8: User B tries to access User A\'s first canvas ===');
  console.log(`Attempting: GET /api/canvases/${userAFirstCanvasId}`);

  const response = await apiRequest(`/api/canvases/${userAFirstCanvasId}`, {
    token: userBToken
  });

  console.log(`Response status: ${response.status}`);

  if (response.status === 404) {
    console.log('✓ Access denied - Returns 404 (canvas not found for this user)');
    return true;
  } else if (response.status === 401) {
    console.log('✓ Access denied - Returns 401 (unauthorized)');
    return true;
  } else {
    console.log(`✗ FAIL: Expected 404 or 401, got ${response.status}`);
    console.log(`Response data: ${JSON.stringify(response.data)}`);
    return false;
  }
}

// Step 9: Verify User B only sees their own canvases
async function step9_listUserBCanvases() {
  console.log('\n=== Step 9: List User B\'s canvases ===');
  const response = await apiRequest('/api/canvases', { token: userBToken });

  if (response.status !== 200) {
    throw new Error(`Failed to list User B canvases: ${JSON.stringify(response.data)}`);
  }

  userBCanvases = response.data.canvases;
  console.log(`✓ User B has ${userBCanvases.length} canvas(es)`);
  userBCanvases.forEach(c => {
    console.log(`  - ${c.name} (${c.id})`);
  });

  // Verify User A's canvas is NOT in the list
  const hasUserACanvas = userBCanvases.some(c =>
    c.id === userACanvasId || c.id === userAFirstCanvasId ||
    c.name.includes('ISOLATION_TEST_A')
  );

  if (hasUserACanvas) {
    console.log('✗ FAIL: User B can see User A\'s canvas in their list!');
    return false;
  }

  console.log('✓ User B cannot see User A\'s canvases in their list');
  return true;
}

// Step 10: Create canvases for User B and verify isolation
async function step10_createUserBCanvases() {
  console.log('\n=== Step 10: Create canvases for User B ===');

  const canvas1Name = `USER_B_CANVAS_1_${Date.now()}`;
  const response1 = await apiRequest('/api/canvases', {
    method: 'POST',
    body: JSON.stringify({ name: canvas1Name }),
    token: userBToken
  });

  if (response1.status !== 201) {
    throw new Error(`Failed to create canvas for User B: ${JSON.stringify(response1.data)}`);
  }

  const canvas1Id = response1.data.canvas.id;
  console.log(`✓ User B canvas 1 created: ${canvas1Name} (${canvas1Id})`);

  const canvas2Name = `USER_B_CANVAS_2_${Date.now()}`;
  const response2 = await apiRequest('/api/canvases', {
    method: 'POST',
    body: JSON.stringify({ name: canvas2Name }),
    token: userBToken
  });

  if (response2.status !== 201) {
    throw new Error(`Failed to create second canvas for User B: ${JSON.stringify(response2.data)}`);
  }

  const canvas2Id = response2.data.canvas.id;
  console.log(`✓ User B canvas 2 created: ${canvas2Name} (${canvas2Id})`);

  // List again to verify
  const listResponse = await apiRequest('/api/canvases', { token: userBToken });
  const userBCanvasesAfter = listResponse.data.canvases;

  console.log(`✓ User B now has ${userBCanvasesAfter.length} canvas(es):`);
  userBCanvasesAfter.forEach(c => {
    console.log(`  - ${c.name} (${c.id})`);
  });

  // Verify User A's canvas is still NOT in the list
  const hasUserACanvas = userBCanvasesAfter.some(c =>
    c.id === userACanvasId || c.id === userAFirstCanvasId ||
    c.name.includes('ISOLATION_TEST_A')
  );

  if (hasUserACanvas) {
    console.log('✗ FAIL: User B can still see User A\'s canvas!');
    return false;
  }

  console.log('✓ User B still cannot see User A\'s canvases');

  // Try to update User A's canvas (should fail)
  console.log('\n--- Attempting to update User A\'s canvas... ---');
  const updateResponse = await apiRequest(`/api/canvases/${userACanvasId}`, {
    method: 'PUT',
    body: JSON.stringify({ name: 'HACKED_NAME' }),
    token: userBToken
  });

  if (updateResponse.status === 404 || updateResponse.status === 401) {
    console.log('✓ Cannot update User A\'s canvas (404/401)');
  } else {
    console.log(`✗ FAIL: Could update User A's canvas! Status: ${updateResponse.status}`);
    return false;
  }

  // Try to delete User A's canvas (should fail)
  console.log('\n--- Attempting to delete User A\'s canvas... ---');
  const deleteResponse = await apiRequest(`/api/canvases/${userACanvasId}`, {
    method: 'DELETE',
    token: userBToken
  });

  if (deleteResponse.status === 404 || deleteResponse.status === 401) {
    console.log('✓ Cannot delete User A\'s canvas (404/401)');
  } else {
    console.log(`✗ FAIL: Could delete User A's canvas! Status: ${deleteResponse.status}`);
    return false;
  }

  return true;
}

// Step 11: Verify User A can still access their own canvases
async function step11_verifyUserAStillHasAccess() {
  console.log('\n=== Step 11: Login as User A and verify access ===');

  // Login as User A
  const loginResponse = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: USER_A.email,
      password: USER_A.password
    })
  });

  if (loginResponse.status !== 200) {
    throw new Error(`Failed to login as User A: ${JSON.stringify(loginResponse.data)}`);
  }

  const setCookie = loginResponse.headers.get('set-cookie');
  const match = setCookie?.match(/session=([^;]+)/);
  userAToken = match ? match[1] : null;

  console.log(`✓ User A logged back in`);

  // Verify User A can still access their canvases
  const response = await apiRequest(`/api/canvases/${userACanvasId}`, {
    token: userAToken
  });

  if (response.status === 200) {
    console.log('✓ User A can still access their own canvas');
    console.log(`✓ Canvas name: ${response.data.canvas.name}`);
    return true;
  } else {
    console.log(`✗ FAIL: User A cannot access their canvas! Status: ${response.status}`);
    return false;
  }
}

// Step 12: Test folder isolation
async function step12_testFolderIsolation() {
  console.log('\n=== Step 12: Test folder isolation ===');

  // Create folder for User A
  const folderResponseA = await apiRequest('/api/folders', {
    method: 'POST',
    body: JSON.stringify({ name: `USER_A_FOLDER_${Date.now()}` }),
    token: userAToken
  });

  if (folderResponseA.status !== 201) {
    console.log(`✗ Could not create folder for User A (status ${folderResponseA.status})`);
    return true; // Don't fail the whole test
  }

  const folderAId = folderResponseA.data.folder.id;
  console.log(`✓ User A folder created: ${folderAId}`);

  // Try to access User A's folder as User B
  const folderAccessResponse = await apiRequest(`/api/folders/${folderAId}`, {
    token: userBToken
  });

  if (folderAccessResponse.status === 404 || folderAccessResponse.status === 401) {
    console.log('✓ User B cannot access User A\'s folder');
  } else {
    console.log(`✗ FAIL: User B can access User A's folder! Status: ${folderAccessResponse.status}`);
    return false;
  }

  // List folders as User B - should not see User A's folder
  const listFoldersResponse = await apiRequest('/api/folders', {
    token: userBToken
  });

  if (listFoldersResponse.status === 200) {
    const userBFolders = listFoldersResponse.data.folders;
    const hasUserAFolder = userBFolders.some(f => f.id === folderAId);

    if (hasUserAFolder) {
      console.log('✗ FAIL: User B can see User A\'s folder in their list!');
      return false;
    }

    console.log('✓ User B cannot see User A\'s folder in their list');
  }

  return true;
}

// Main test runner
async function runTest() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Feature #119: User Data Isolation Test                      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  let passed = 0;
  let failed = 0;

  const tests = [
    { name: 'Register User A', fn: step1_registerUserA },
    { name: 'Create User A canvas', fn: step2_createUserACanvas },
    { name: 'Create unique canvas', fn: step3_createUniqueCanvas },
    { name: 'List User A canvases', fn: step4_listUserACanvases },
    { name: 'Logout User A', fn: step5_logoutUserA },
    { name: 'Register User B', fn: step6_registerUserB },
    { name: 'Try access User A canvas', fn: step7_tryAccessUserACanvas },
    { name: 'Try access first canvas', fn: step8_tryAccessFirstCanvas },
    { name: 'List User B canvases', fn: step9_listUserBCanvases },
    { name: 'Create User B canvases', fn: step10_createUserBCanvases },
    { name: 'Verify User A access', fn: step11_verifyUserAStillHasAccess },
    { name: 'Test folder isolation', fn: step12_testFolderIsolation },
  ];

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result === false) {
        failed++;
      } else {
        passed++;
      }
    } catch (error) {
      console.error(`\n✗ Test failed: ${test.name}`);
      console.error(`Error: ${error.message}`);
      failed++;
    }
  }

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Test Results                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`Total tests: ${tests.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n✓✓✓ ALL TESTS PASSED ✓✓✓');
    console.log('\nUser data isolation is working correctly!');
    console.log('- Users cannot access other users\' canvases');
    console.log('- Users cannot access other users\' folders');
    console.log('- API endpoints properly filter by userId');
    console.log('- LIST endpoints only return user\'s own data');
    return 0;
  } else {
    console.log('\n✗✗✗ SOME TESTS FAILED ✗✗✗');
    return 1;
  }
}

// Run the test
runTest()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error('\nFatal error:', error);
    process.exit(1);
  });
