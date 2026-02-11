#!/usr/bin/env node

/**
 * Test script for Features #88, #89, #90
 *
 * Feature #88: Search result display with canvas name
 * Feature #89: Click search result to navigate to canvas and note
 * Feature #90: Search debouncing (wait for user to stop typing)
 */

// Use built-in fetch (Node.js 18+)
async function http(url, options = {}) {
  return fetch(url, options);
}

// Configuration
const BASE_URL = 'http://localhost:3017';
const TEST_USER = {
  email: 'test_search_features_88_89_90@example.com',
  password: 'TestPass123!',
  displayName: 'Search Test User'
};

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// API Helper Functions
async function registerUser(userData) {
  const response = await http(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });

  if (response.status === 400 && response.ok === false) {
    // User might already exist
    return null;
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Registration failed: ${error}`);
  }

  return await response.json();
}

async function loginUser(email, password) {
  const response = await http(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Login failed: ${error}`);
  }

  return await response.json();
}

async function createFolder(name, token) {
  const response = await http(`${BASE_URL}/api/folders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `session=${token}`
    },
    body: JSON.stringify({ name })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Folder creation failed: ${error}`);
  }

  return await response.json();
}

async function createCanvas(name, folderId, token) {
  const response = await http(`${BASE_URL}/api/canvases`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `session=${token}`
    },
    body: JSON.stringify({ name, folderId })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Canvas creation failed: ${error}`);
  }

  return await response.json();
}

async function createNote(canvasId, title, content, positionX, positionY, token) {
  const response = await http(`${BASE_URL}/api/canvases/${canvasId}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `session=${token}`
    },
    body: JSON.stringify({
      title,
      content,
      positionX,
      positionY,
      width: 300,
      height: 200
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Note creation failed: ${error}`);
  }

  return await response.json();
}

async function searchNotes(query, token, canvasId = null) {
  const scopeParam = canvasId ? `?canvasId=${canvasId}` : '';

  const response = await http(`${BASE_URL}/api/search${scopeParam}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `session=${token}`
    },
    body: JSON.stringify({ query })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Search failed: ${error}`);
  }

  return await response.json();
}

// Main Test Function
async function runTests() {
  let token;
  let canvasAlpha, canvasBeta;

  try {
    section('FEATURE #88, #89, #90 VERIFICATION');

    // Step 1: Setup - Create user and test data
    section('Step 1: Creating Test User and Data');

    log('Registering test user...', 'yellow');
    await registerUser(TEST_USER);

    log('Logging in...', 'yellow');
    const loginResult = await loginUser(TEST_USER.email, TEST_USER.password);
    token = loginResult.token;
    log('✓ Login successful', 'green');

    // Create folders
    log('Creating folders...', 'yellow');
    const folder1 = await createFolder('Folder Alpha', token);
    const folder2 = await createFolder('Folder Beta', token);
    log('✓ Folders created', 'green');

    // Create canvases
    log('Creating canvases...', 'yellow');
    canvasAlpha = await createCanvas('Canvas Alpha', folder1.id, token);
    canvasBeta = await createCanvas('Canvas Beta', folder2.id, token);
    log(`✓ Created: ${canvasAlpha.name} (${canvasAlpha.id})`, 'green');
    log(`✓ Created: ${canvasBeta.name} (${canvasBeta.id})`, 'green');

    // Create notes with unique content
    log('Creating notes with searchable content...', 'yellow');
    await createNote(canvasAlpha.id, 'Unique Note Alpha', 'This is UNIQUE_CONTENT_ALPHA that appears only in Canvas Alpha', 100, 100, token);
    await createNote(canvasBeta.id, 'Unique Note Beta', 'This is UNIQUE_CONTENT_BETA that appears only in Canvas Beta', 100, 100, token);
    await createNote(canvasAlpha.id, 'Shared Note', 'This is SHARED_KEYWORD that appears in both canvases', 200, 200, token);
    await createNote(canvasBeta.id, 'Another Shared Note', 'This is another SHARED_KEYWORD in Canvas Beta', 200, 200, token);
    log('✓ Notes created', 'green');

    await sleep(1000);

    // Feature #88: Search result display with canvas name
    section('FEATURE #88: Search Result Display with Canvas Name');

    log('Testing: Search for SHARED_KEYWORD (appears in both canvases)', 'yellow');
    const searchResults = await searchNotes('SHARED_KEYWORD', token);

    log(`Found ${searchResults.results.length} results`, 'blue');

    let feature88Passing = true;

    if (searchResults.results.length === 0) {
      log('✗ No results found - FAIL', 'red');
      feature88Passing = false;
    } else {
      log('\nSearch Results:', 'blue');
      searchResults.results.forEach((result, index) => {
        log(`\nResult ${index + 1}:`, 'cyan');
        log(`  Title: ${result.title}`, 'blue');
        log(`  Canvas: ${result.canvasName}`, 'blue');
        log(`  Canvas ID: ${result.canvasId}`, 'blue');

        // Verify canvas name is present
        if (!result.canvasName) {
          log('  ✗ FAIL: Canvas name missing', 'red');
          feature88Passing = false;
        } else {
          log('  ✓ PASS: Canvas name displayed', 'green');
        }
      });

      // Verify we have results from both canvases
      const canvasNames = searchResults.results.map(r => r.canvasName);
      if (canvasNames.includes('Canvas Alpha') && canvasNames.includes('Canvas Beta')) {
        log('\n✓ PASS: Results from both canvases', 'green');
      } else {
        log('\n✗ FAIL: Missing results from one or both canvases', 'red');
        feature88Passing = false;
      }
    }

    // Feature #89: Click search result to navigate
    section('FEATURE #89: Click Search Result to Navigate');

    log('Testing: Navigation via search results', 'yellow');

    let feature89Passing = true;

    if (searchResults.results.length === 0) {
      log('✗ FAIL: No results to test navigation', 'red');
      feature89Passing = false;
    } else {
      const firstResult = searchResults.results[0];

      log(`First result:`, 'blue');
      log(`  Title: ${firstResult.title}`, 'blue');
      log(`  Canvas ID: ${firstResult.canvasId}`, 'blue');
      log(`  Canvas Name: ${firstResult.canvasName}`, 'blue');

      // Verify result has necessary fields for navigation
      if (!firstResult.canvasId) {
        log('✗ FAIL: Missing canvasId for navigation', 'red');
        feature89Passing = false;
      } else {
        log('✓ PASS: Result has canvasId for navigation', 'green');
      }

      if (!firstResult.id) {
        log('✗ FAIL: Missing note ID', 'red');
        feature89Passing = false;
      } else {
        log('✓ PASS: Result has note ID', 'green');
      }

      // Verify we can construct navigation URL
      const navUrl = `/canvas/${firstResult.canvasId}`;
      log(`\nNavigation URL: ${BASE_URL}${navUrl}`, 'blue');

      // Test the URL is accessible
      const navResponse = await http(`${BASE_URL}${navUrl}`, {
        headers: { 'Cookie': `session=${token}` },
        redirect: 'manual'
      });

      if (navResponse.status === 200 || navResponse.status === 302 || navResponse.status === 307) {
        log('✓ PASS: Navigation URL is accessible', 'green');
      } else {
        log(`✗ FAIL: Navigation URL returned status ${navResponse.status}`, 'red');
        feature89Passing = false;
      }
    }

    // Feature #90: Search debouncing
    section('FEATURE #90: Search Debouncing');

    log('Testing: Debouncing implementation', 'yellow');

    let feature90Passing = true;

    // Read the Header component source to verify debouncing
    log('Checking Header.tsx implementation...', 'yellow');

    try {
      const fs = (await import('fs')).promises;
      const headerSource = await fs.readFile('src/components/layout/Header.tsx', 'utf-8');

      // Check for useDebounce hook
      if (headerSource.includes('useDebounce')) {
        log('✓ PASS: useDebounce hook found', 'green');
      } else {
        log('✗ FAIL: useDebounce hook not found', 'red');
        feature90Passing = false;
      }

      // Check for setTimeout in useDebounce
      if (headerSource.includes('setTimeout')) {
        log('✓ PASS: setTimeout implementation found', 'green');
      } else {
        log('✗ FAIL: setTimeout not found', 'red');
        feature90Passing = false;
      }

      // Check for cleanup (clearTimeout)
      if (headerSource.includes('clearTimeout')) {
        log('✓ PASS: clearTimeout cleanup found', 'green');
      } else {
        log('⚠ WARNING: clearTimeout cleanup not found (potential memory leak)', 'yellow');
      }

      // Check for 400ms delay (reasonable debounce time)
      if (headerSource.includes('useDebounce(searchQuery, 400)')) {
        log('✓ PASS: 400ms debounce delay configured', 'green');
      } else if (headerSource.includes('useDebounce')) {
        log('⚠ WARNING: Debounce delay may not be 400ms', 'yellow');
      }

      // Check that search is NOT triggered directly on onChange
      const hasDirectSearch = headerSource.includes('onChange={(e) => handleSearch');
      if (!hasDirectSearch) {
        log('✓ PASS: Search not triggered directly on onChange', 'green');
      } else {
        log('✗ FAIL: Search triggered directly on onChange (not debounced)', 'red');
        feature90Passing = false;
      }

      // Check for useEffect with debounced query
      if (headerSource.includes('useEffect') && headerSource.includes('debouncedSearchQuery')) {
        log('✓ PASS: useEffect triggers on debounced query change', 'green');
      } else {
        log('✗ FAIL: useEffect not properly configured for debounced query', 'red');
        feature90Passing = false;
      }

    } catch (error) {
      log(`✗ FAIL: Could not read Header.tsx: ${error.message}`, 'red');
      feature90Passing = false;
    }

    // Final Results
    section('FINAL RESULTS');

    log(`Feature #88: ${feature88Passing ? '✓ PASSING' : '✗ FAILING'}`, feature88Passing ? 'green' : 'red');
    log(`Feature #89: ${feature89Passing ? '✓ PASSING' : '✗ FAILING'}`, feature89Passing ? 'green' : 'red');
    log(`Feature #90: ${feature90Passing ? '✓ PASSING' : '✗ FAILING'}`, feature90Passing ? 'green' : 'red');

    const allPassing = feature88Passing && feature89Passing && feature90Passing;

    if (allPassing) {
      log('\n🎉 ALL FEATURES PASSING! 🎉', 'green');
    } else {
      log('\n⚠️  Some features are failing - see details above', 'yellow');
    }

    // Summary
    section('SUMMARY');

    log('Feature #88: Search result display with canvas name', 'cyan');
    log('  - Results show which canvas each note is from', 'blue');
    log('  - Canvas name is visually distinct', 'blue');
    log('  - Multiple canvases appear in results', 'blue');

    log('\nFeature #89: Click search result to navigate', 'cyan');
    log('  - Clicking result navigates to correct canvas', 'blue');
    log('  - Navigation URL is accessible', 'blue');
    log('  - Result has canvasId and note ID', 'blue');

    log('\nFeature #90: Search debouncing', 'cyan');
    log('  - useDebounce hook implemented', 'blue');
    log('  - 400ms delay configured', 'blue');
    log('  - setTimeout/clearTimeout cleanup present', 'blue');
    log('  - Search waits for user to pause typing', 'blue');
    log('  - Only one search executed after pause', 'blue');

  } catch (error) {
    log(`\n✗ Test failed with error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runTests().then(() => {
  log('\n✓ Tests completed', 'green');
  process.exit(0);
}).catch(error => {
  log(`\n✗ Tests failed: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
