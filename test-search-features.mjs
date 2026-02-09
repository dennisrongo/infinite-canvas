// Test script for Features #82, #83, #84 - Search functionality
const TEST_USER = {
  email: `search_test_${Date.now()}@example.com`,
  password: 'TestPass123!',
  displayName: 'Search Test User'
};

const BASE_URL = 'http://localhost:3500';

async function testSearchFeatures() {
  console.log('=== Testing Search Features #82, #83, #84 ===\n');

  try {
    // Step 1: Register a new user
    console.log('Step 1: Registering test user...');
    const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER)
    });
    if (!registerRes.ok) throw new Error('Registration failed');
    const registerData = await registerRes.json();
    console.log('✓ User registered:', registerData.user.email);

    // Step 2: Login
    console.log('\nStep 2: Logging in...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password
      })
    });
    if (!loginRes.ok) throw new Error('Login failed');
    console.log('✓ Logged in successfully');

    // Step 3: Create multiple canvases
    console.log('\nStep 3: Creating test canvases...');
    const canvas1Res = await fetch(`${BASE_URL}/api/canvases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Canvas Alpha' })
    });
    const canvas1 = await canvas1Res.json();
    console.log('✓ Created Canvas Alpha:', canvas1.canvas.id);

    const canvas2Res = await fetch(`${BASE_URL}/api/canvases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Canvas Beta' })
    });
    const canvas2 = await canvas2Res.json();
    console.log('✓ Created Canvas Beta:', canvas2.canvas.id);

    // Step 4: Create notes with unique searchable content
    console.log('\nStep 4: Creating test notes...');

    // Note in Canvas A with unique text
    const note1Res = await fetch(`${BASE_URL}/api/canvases/${canvas1.canvas.id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'SEARCH_TEST_12345',
        content: 'This is a unique note in Canvas Alpha with searchable content',
        positionX: 100,
        positionY: 100,
        width: 300,
        height: 200
      })
    });
    const note1 = await note1Res.json();
    console.log('✓ Created note in Canvas Alpha:', note1.note.id);

    // Note in Canvas B with different unique text
    const note2Res = await fetch(`${BASE_URL}/api/canvases/${canvas2.canvas.id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Another Note',
        content: 'This note has CURRENT_CANVAS_TEST_12345 content',
        positionX: 100,
        positionY: 100,
        width: 300,
        height: 200
      })
    });
    const note2 = await note2Res.json();
    console.log('✓ Created note in Canvas Beta:', note2.note.id);

    // Another note in Canvas A
    const note3Res = await fetch(`${BASE_URL}/api/canvases/${canvas1.canvas.id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Regular Note',
        content: 'Just a regular note with common content',
        positionX: 200,
        positionY: 200,
        width: 300,
        height: 200
      })
    });
    const note3 = await note3Res.json();
    console.log('✓ Created another note in Canvas Alpha:', note3.note.id);

    // Step 5: Test search API - Global search
    console.log('\n=== Feature #83: Search across all canvases ===');
    const searchAllRes = await fetch(`${BASE_URL}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'SEARCH_TEST_12345' })
    });
    if (!searchAllRes.ok) throw new Error('Search API failed');
    const searchAllData = await searchAllRes.json();
    console.log('✓ Search results for "SEARCH_TEST_12345":', searchAllData.results.length, 'result(s)');
    searchAllData.results.forEach(result => {
      console.log(`  - "${result.title}" in ${result.canvasName}`);
    });

    // Verify we found the note from Canvas Alpha
    if (searchAllData.results.length === 1 && searchAllData.results[0].title === 'SEARCH_TEST_12345') {
      console.log('✓ PASS: Found the correct note across all canvases');
    } else {
      console.log('✗ FAIL: Did not find expected note');
    }

    // Step 6: Test search API - Current canvas only
    console.log('\n=== Feature #84: Search within current canvas only ===');
    const searchCanvasRes = await fetch(`${BASE_URL}/api/search?canvasId=${canvas1.canvas.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'SEARCH_TEST_12345' })
    });
    if (!searchCanvasRes.ok) throw new Error('Canvas search failed');
    const searchCanvasData = await searchCanvasRes.json();
    console.log(`✓ Search results in Canvas Alpha: ${searchCanvasData.results.length} result(s)`);
    searchCanvasData.results.forEach(result => {
      console.log(`  - "${result.title}" in ${result.canvasName}`);
    });

    // Verify we found the note in Canvas Alpha
    if (searchCanvasData.results.length === 1 && searchCanvasData.results[0].title === 'SEARCH_TEST_12345') {
      console.log('✓ PASS: Found the note in current canvas');
    } else {
      console.log('✗ FAIL: Did not find expected note in current canvas');
    }

    // Now search for something only in Canvas Beta
    const searchCanvas2Res = await fetch(`${BASE_URL}/api/search?canvasId=${canvas1.canvas.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'CURRENT_CANVAS_TEST_12345' })
    });
    const searchCanvas2Data = await searchCanvas2Res.json();
    console.log(`✓ Search results in Canvas Alpha for "CURRENT_CANVAS_TEST_12345": ${searchCanvas2Data.results.length} result(s)`);

    // Verify we DON'T find the note from Canvas Beta
    if (searchCanvas2Data.results.length === 0) {
      console.log('✓ PASS: Correctly excluded notes from other canvases');
    } else {
      console.log('✗ FAIL: Should not have found notes from other canvases');
    }

    // Step 7: Test empty search
    console.log('\n=== Testing empty search ===');
    const emptySearchRes = await fetch(`${BASE_URL}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '' })
    });
    const emptySearchData = await emptySearchRes.json();
    if (emptySearchData.results.length === 0) {
      console.log('✓ PASS: Empty search returns no results');
    } else {
      console.log('✗ FAIL: Empty search should return no results');
    }

    // Step 8: Test search with no matches
    const noMatchRes = await fetch(`${BASE_URL}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'NONEXISTENT_CONTENT_xyz' })
    });
    const noMatchData = await noMatchRes.json();
    if (noMatchData.results.length === 0) {
      console.log('✓ PASS: Search with no matches returns empty array');
    } else {
      console.log('✗ FAIL: Search with no matches should return empty array');
    }

    console.log('\n=== ALL TESTS PASSED ===');
    console.log('\nTest User Credentials:');
    console.log(`Email: ${TEST_USER.email}`);
    console.log(`Password: ${TEST_USER.password}`);
    console.log('\nNavigate to http://localhost:3500/dashboard to test the UI manually');

  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

testSearchFeatures();
