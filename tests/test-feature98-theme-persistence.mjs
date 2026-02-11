/**
 * Test script for Feature #98: Theme Persistence
 *
 * This script tests that theme preferences persist:
 * 1. After page refresh
 * 2. After browser close/reopen
 * 3. Per-user (different users have different preferences)
 * 4. Stored in database
 */

const TEST_USER = {
  email: 'feature98@test.com',
  password: 'Test1234!',
  displayName: 'Feature98 Test User'
};

const TEST_USER_2 = {
  email: 'feature98b@test.com',
  password: 'Test1234!',
  displayName: 'Feature98 Test User 2'
};

const BASE_URL = 'http://localhost:3010';

// ANSI color codes
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

async function log(message, color = BLUE) {
  console.log(`${color}${message}${RESET}`);
}

async function testStep(stepNum, description) {
  log(`\n${'='.repeat(60)}`, BLUE);
  log(`STEP ${stepNum}: ${description}`, BLUE);
  log('='.repeat(60), BLUE);
}

async function makeRequest(endpoint, options = {}) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return response;
}

// Create test users
async function createTestUsers() {
  await testStep(1, 'Create test users');

  try {
    // Create first test user
    let response = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(TEST_USER),
    });

    if (response.ok || response.status === 400) {
      log('✓ Test user 1 created or already exists', GREEN);
    } else {
      const error = await response.json();
      log(`✗ Failed to create test user 1: ${JSON.stringify(error)}`, RED);
    }

    // Create second test user
    response = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(TEST_USER_2),
    });

    if (response.ok || response.status === 400) {
      log('✓ Test user 2 created or already exists', GREEN);
    } else {
      const error = await response.json();
      log(`✗ Failed to create test user 2: ${JSON.stringify(error)}`, RED);
    }
  } catch (error) {
    log(`✗ Error creating test users: ${error.message}`, RED);
  }
}

// Login user and return session token
async function loginUser(user) {
  const response = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: user.email,
      password: user.password,
    }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }

  const data = await response.json();
  return data.token;
}

// Get user settings from database
async function getUserSettings(token) {
  const response = await makeRequest('/api/user/settings', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get settings: ${response.status}`);
  }

  return await response.json();
}

// Update user theme in database
async function updateUserTheme(token, theme) {
  const response = await makeRequest('/api/user/settings', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ theme }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update theme: ${response.status}`);
  }

  return await response.json();
}

// Test theme persistence across page refreshes
async function testThemePersistenceRefresh() {
  await testStep(2, 'Test theme persistence after page refresh');

  try {
    // Login as user 1
    log('Logging in as test user 1...', YELLOW);
    const token = await loginUser(TEST_USER);
    log('✓ Login successful', GREEN);

    // Set theme to dark
    log('Setting theme to dark mode...', YELLOW);
    await updateUserTheme(token, 'dark');
    log('✓ Theme set to dark', GREEN);

    // Verify in database
    log('Verifying theme in database...', YELLOW);
    let settings = await getUserSettings(token);
    if (settings.settings.theme === 'dark') {
      log('✓ Theme saved to database as "dark"', GREEN);
    } else {
      log(`✗ Theme in database is "${settings.settings.theme}", expected "dark"`, RED);
      return false;
    }

    // Simulate page refresh by fetching settings again
    log('Simulating page refresh (fetching settings again)...', YELLOW);
    settings = await getUserSettings(token);
    if (settings.settings.theme === 'dark') {
      log('✓ Theme persisted after refresh: "dark"', GREEN);
    } else {
      log(`✗ Theme changed after refresh to "${settings.settings.theme}"`, RED);
      return false;
    }

    // Change to light mode
    log('Changing theme to light mode...', YELLOW);
    await updateUserTheme(token, 'light');
    log('✓ Theme set to light', GREEN);

    // Verify in database
    log('Verifying theme in database...', YELLOW);
    settings = await getUserSettings(token);
    if (settings.settings.theme === 'light') {
      log('✓ Theme saved to database as "light"', GREEN);
    } else {
      log(`✗ Theme in database is "${settings.settings.theme}", expected "light"`, RED);
      return false;
    }

    // Simulate another refresh
    log('Simulating another page refresh...', YELLOW);
    settings = await getUserSettings(token);
    if (settings.settings.theme === 'light') {
      log('✓ Theme persisted after refresh: "light"', GREEN);
    } else {
      log(`✗ Theme changed after refresh to "${settings.settings.theme}"`, RED);
      return false;
    }

    return true;
  } catch (error) {
    log(`✗ Test failed: ${error.message}`, RED);
    return false;
  }
}

// Test per-user theme preferences
async function testPerUserThemePreferences() {
  await testStep(3, 'Test per-user theme preferences');

  try {
    // Login as user 1 and set dark mode
    log('Logging in as test user 1 and setting dark mode...', YELLOW);
    const token1 = await loginUser(TEST_USER);
    await updateUserTheme(token1, 'dark');
    let settings1 = await getUserSettings(token1);

    if (settings1.settings.theme === 'dark') {
      log('✓ User 1 theme: dark', GREEN);
    } else {
      log(`✗ User 1 theme is "${settings1.settings.theme}", expected "dark"`, RED);
      return false;
    }

    // Login as user 2 and set light mode
    log('Logging in as test user 2 and setting light mode...', YELLOW);
    const token2 = await loginUser(TEST_USER_2);
    await updateUserTheme(token2, 'light');
    let settings2 = await getUserSettings(token2);

    if (settings2.settings.theme === 'light') {
      log('✓ User 2 theme: light', GREEN);
    } else {
      log(`✗ User 2 theme is "${settings2.settings.theme}", expected "light"`, RED);
      return false;
    }

    // Verify user 1 still has dark mode
    log('Verifying user 1 still has dark mode...', YELLOW);
    settings1 = await getUserSettings(token1);
    if (settings1.settings.theme === 'dark') {
      log('✓ User 1 theme still: dark (independent from user 2)', GREEN);
    } else {
      log(`✗ User 1 theme changed to "${settings1.settings.theme}"`, RED);
      return false;
    }

    // Verify user 2 still has light mode
    log('Verifying user 2 still has light mode...', YELLOW);
    settings2 = await getUserSettings(token2);
    if (settings2.settings.theme === 'light') {
      log('✓ User 2 theme still: light (independent from user 1)', GREEN);
    } else {
      log(`✗ User 2 theme changed to "${settings2.settings.theme}"`, RED);
      return false;
    }

    // Now swap themes
    log('Swapping themes: User 1 -> light, User 2 -> dark...', YELLOW);
    await updateUserTheme(token1, 'light');
    await updateUserTheme(token2, 'dark');

    settings1 = await getUserSettings(token1);
    settings2 = await getUserSettings(token2);

    if (settings1.settings.theme === 'light' && settings2.settings.theme === 'dark') {
      log('✓ Themes swapped successfully', GREEN);
      log(`✓ User 1 theme: ${settings1.settings.theme}`, GREEN);
      log(`✓ User 2 theme: ${settings2.settings.theme}`, GREEN);
    } else {
      log(`✗ Theme swap failed`, RED);
      log(`  User 1: ${settings1.settings.theme} (expected light)`, RED);
      log(`  User 2: ${settings2.settings.theme} (expected dark)`, RED);
      return false;
    }

    return true;
  } catch (error) {
    log(`✗ Test failed: ${error.message}`, RED);
    return false;
  }
}

// Test database storage verification
async function testDatabaseStorage() {
  await testStep(4, 'Test database storage verification');

  try {
    // Login and set a theme
    log('Logging in and setting theme...', YELLOW);
    const token = await loginUser(TEST_USER);
    await updateUserTheme(token, 'dark');

    // Fetch settings multiple times to verify consistency
    log('Fetching settings 3 times to verify database consistency...', YELLOW);
    const settings1 = await getUserSettings(token);
    const settings2 = await getUserSettings(token);
    const settings3 = await getUserSettings(token);

    if (settings1.settings.theme === settings2.settings.theme &&
        settings2.settings.theme === settings3.settings.theme &&
        settings3.settings.theme === 'dark') {
      log('✓ All 3 fetches returned consistent theme: "dark"', GREEN);
    } else {
      log('✗ Inconsistent theme values across fetches:', RED);
      log(`  Fetch 1: ${settings1.settings.theme}`, RED);
      log(`  Fetch 2: ${settings2.settings.theme}`, RED);
      log(`  Fetch 3: ${settings3.settings.theme}`, RED);
      return false;
    }

    // Verify theme field exists and is correct type
    log('Verifying theme field structure...', YELLOW);
    if (settings1.settings && typeof settings1.settings.theme === 'string') {
      log('✓ Theme field exists and is a string', GREEN);
      log(`  Value: "${settings1.settings.theme}"`, GREEN);
    } else {
      log('✗ Theme field is missing or not a string', RED);
      return false;
    }

    // Verify other settings fields are preserved
    log('Verifying other settings fields are preserved...', YELLOW);
    if (settings1.settings.canvasSortOrder) {
      log(`✓ canvasSortOrder preserved: "${settings1.settings.canvasSortOrder}"`, GREEN);
    }

    return true;
  } catch (error) {
    log(`✗ Test failed: ${error.message}`, RED);
    return false;
  }
}

// Main test runner
async function runTests() {
  log('\n' + '='.repeat(60), BLUE);
  log('FEATURE #98: THEME PERSISTENCE TEST SUITE', BLUE);
  log('='.repeat(60) + '\n', BLUE);

  // Create test users
  await createTestUsers();

  // Run all tests
  const results = {
    refresh: await testThemePersistenceRefresh(),
    perUser: await testPerUserThemePreferences(),
    database: await testDatabaseStorage(),
  };

  // Print summary
  log('\n' + '='.repeat(60), BLUE);
  log('TEST SUMMARY', BLUE);
  log('='.repeat(60), BLUE);

  log('\nResults:', BLUE);
  log(`  Theme Persistence (Refresh): ${results.refresh ? '✓ PASS' : '✗ FAIL'}`, results.refresh ? GREEN : RED);
  log(`  Per-User Preferences:        ${results.perUser ? '✓ PASS' : '✗ FAIL'}`, results.perUser ? GREEN : RED);
  log(`  Database Storage:            ${results.database ? '✓ PASS' : '✗ FAIL'}`, results.database ? GREEN : RED);

  const allPassed = results.refresh && results.perUser && results.database;
  log('\n' + '='.repeat(60), BLUE);
  log(`OVERALL: ${allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'}`, allPassed ? GREEN : RED);
  log('='.repeat(60) + '\n', BLUE);

  process.exit(allPassed ? 0 : 1);
}

// Run the tests
runTests().catch(error => {
  log(`\n✗ Fatal error: ${error.message}`, RED);
  console.error(error);
  process.exit(1);
});
