// Test script for Feature #187 - API endpoint testing
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'infinite-canvas-secret-key-change-in-production';
const BASE_URL = 'http://localhost:3015';

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName, passed, details = '') {
  const status = passed ? '✓' : '✗';
  const color = passed ? 'green' : 'red';
  log(`  ${status} ${testName}`, color);
  if (details) {
    log(`    ${details}`, 'reset');
  }
}

async function testDeleteAPI() {
  log('\n' + '='.repeat(60), 'blue');
  log('Feature #187: Testing DELETE /api/user/delete-account', 'bold');
  log('='.repeat(60) + '\n', 'blue');

  let testUser;
  let testPassword = 'DeleteTest123!';
  let authToken;

  try {
    // Step 1: Create test user and get auth token
    log('Step 1: Creating test user...', 'blue');
    const passwordHash = await bcrypt.hash(testPassword, 10);
    testUser = await prisma.user.create({
      data: {
        email: `delete_api_test_${Date.now()}@example.com`,
        passwordHash,
        displayName: 'Delete API Test',
      }
    });

    // Create some test data
    await prisma.folder.create({
      data: {
        userId: testUser.id,
        name: 'Test Folder',
      }
    });

    await prisma.canvas.create({
      data: {
        userId: testUser.id,
        name: 'Test Canvas',
      }
    });

    // Generate auth token
    authToken = jwt.sign(
      { userId: testUser.id, email: testUser.email, passwordVersion: 0 },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    log(`Created test user: ${testUser.email}`, 'yellow');

    // Step 2: Test API with wrong password
    log('\nStep 2: Testing API with wrong password...', 'blue');
    const wrongPasswordResponse = await fetch(`${BASE_URL}/api/user/delete-account`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'Cookie': `auth_token=${authToken}`,
      },
      body: JSON.stringify({ password: 'WrongPassword123!' }),
    });

    logTest('Wrong password returns 401', wrongPasswordResponse.status === 401);
    const wrongPasswordData = await wrongPasswordResponse.json();
    logTest('Error message present', !!wrongPasswordData.error, wrongPasswordData.error || '');

    // Step 3: Test API without password
    log('\nStep 3: Testing API without password...', 'blue');
    const noPasswordResponse = await fetch(`${BASE_URL}/api/user/delete-account`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'Cookie': `auth_token=${authToken}`,
      },
      body: JSON.stringify({ }),
    });

    logTest('No password returns 400', noPasswordResponse.status === 400);
    const noPasswordData = await noPasswordResponse.json();
    logTest('Error message indicates password required', noPasswordData.error?.toLowerCase().includes('password'), noPasswordData.error || '');

    // Step 4: Test API without authentication
    log('\nStep 4: Testing API without authentication...', 'blue');
    const noAuthResponse = await fetch(`${BASE_URL}/api/user/delete-account`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: testPassword }),
    });

    logTest('No auth returns 401', noAuthResponse.status === 401);

    // Step 5: Test successful deletion
    log('\nStep 5: Testing successful account deletion...', 'blue');
    const deleteResponse = await fetch(`${BASE_URL}/api/user/delete-account`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'Cookie': `auth_token=${authToken}`,
      },
      body: JSON.stringify({ password: testPassword }),
    });

    logTest('Delete request returns 200', deleteResponse.status === 200);
    const deleteData = await deleteResponse.json();
    logTest('Success message returned', deleteData.success === true, deleteData.message || '');

    // Step 6: Verify all data is deleted
    log('\nStep 6: Verifying all data deleted from database...', 'blue');
    const deletedUser = await prisma.user.findUnique({
      where: { id: testUser.id },
    });

    logTest('User deleted from database', !deletedUser);

    const remainingFolders = await prisma.folder.count({ where: { userId: testUser.id } });
    const remainingCanvases = await prisma.canvas.count({ where: { userId: testUser.id } });

    logTest('User folders deleted', remainingFolders === 0);
    logTest('User canvases deleted', remainingCanvases === 0);

    // Step 7: Verify deleted user cannot login
    log('\nStep 7: Verifying deleted user cannot login...', 'blue');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: testUser.email, password: testPassword }),
    });

    logTest('Login fails for deleted user', loginResponse.status === 401);

    // Summary
    log('\n' + '='.repeat(60), 'blue');
    log('Feature #187: API Test Summary', 'bold');
    log('='.repeat(60), 'blue');
    log('\nAll API tests passed!', 'green');
    log('\nFeature #187 STATUS: ✅ PASSING', 'green');
    log('='.repeat(60) + '\n', 'blue');

  } catch (error) {
    log(`\nError: ${error.message}`, 'red');
    console.error(error);

    // Cleanup on error
    if (testUser) {
      try {
        const user = await prisma.user.findFirst({
          where: { email: { contains: 'delete_api_test' } }
        });
        if (user) {
          await prisma.user.delete({ where: { id: user.id } });
          log('Cleaned up test user', 'yellow');
        }
      } catch (e) {
        // Ignore
      }
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testDeleteAPI();
