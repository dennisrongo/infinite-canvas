// Test Feature #9: User logout with session cleanup
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const BASE_URL = 'http://localhost:3013';

async function testLogout() {
  console.log('=== Testing Feature #9: User logout with session cleanup ===\n');

  // Step 1: Create a test user
  console.log('Step 1: Creating test user...');
  const testEmail = 'feature9_logout_test@example.com';
  const testPassword = 'Password123!';

  const hashedPassword = await bcrypt.hash(testPassword, 12);

  // Delete user if exists
  await prisma.user.deleteMany({ where: { email: testEmail } });

  const user = await prisma.user.create({
    data: {
      email: testEmail,
      passwordHash: hashedPassword,
      displayName: 'Feature 9 Test User',
    },
  });

  console.log('✓ User created:', user.id);
  console.log('  Email:', user.email);

  // Step 2: Generate a valid session token
  console.log('\nStep 2: Generating session token...');
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  console.log('✓ Token generated');

  // Step 3: Test login API
  console.log('\nStep 3: Testing login API...');
  const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });

  if (loginResponse.ok) {
    const loginData = await loginResponse.json();
    console.log('✓ Login successful');
    console.log('  User ID:', loginData.user.id);

    // Get the session cookie from response
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    console.log('  Session cookie set:', setCookieHeader ? 'YES' : 'NO');
  } else {
    console.log('✗ Login failed:', loginResponse.status);
  }

  // Step 4: Test logout API
  console.log('\nStep 4: Testing logout API...');
  const logoutResponse = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `auth_token=${token}`,
    },
  });

  console.log('Logout response status:', logoutResponse.status);
  console.log('Logout response headers:', Object.fromEntries(logoutResponse.headers.entries()));

  if (logoutResponse.ok || logoutResponse.status === 307 || logoutResponse.status === 302) {
    console.log('✓ Logout successful');

    // Check if we're redirected
    const location = logoutResponse.headers.get('location');
    if (location) {
      console.log('  Redirected to:', location);
    }
  } else {
    console.log('✗ Logout failed');
    const errorData = await logoutResponse.text();
    console.log('  Error:', errorData);
  }

  // Step 5: Verify protected route is blocked after logout
  console.log('\nStep 5: Testing protected route access after logout...');
  const dashboardResponse = await fetch(`${BASE_URL}/dashboard`, {
    headers: {
      'Cookie': `auth_token=${token}`,
    },
  });

  if (dashboardResponse.status === 401 || dashboardResponse.status === 403) {
    console.log('✓ Protected route correctly blocked after logout');
  } else if (dashboardResponse.redirected) {
    console.log('✓ Protected route redirected (probably to login)');
    console.log('  Redirected to:', dashboardResponse.url);
  } else {
    console.log('⚠ Protected route still accessible (status:', dashboardResponse.status, ')');
  }

  // Step 6: Verify API returns 401 after logout
  console.log('\nStep 6: Testing API endpoint authentication...');
  const apiResponse = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: {
      'Cookie': `auth_token=${token}`,
    },
  });

  if (apiResponse.status === 401) {
    console.log('✓ API correctly returns 401 Unauthorized');
  } else {
    console.log('⚠ API response status:', apiResponse.status);
    const apiData = await apiResponse.json();
    console.log('  Response:', apiData);
  }

  // Cleanup
  console.log('\nCleaning up test data...');
  await prisma.user.delete({ where: { id: user.id } });
  console.log('✓ Test user deleted');

  console.log('\n=== Feature #9 Test Complete ===');

  await prisma.$disconnect();
}

testLogout().catch(console.error);
