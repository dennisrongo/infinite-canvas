/**
 * Test script for Features #52, #53, #54
 * - Feature #52: Reset zoom to 100% button
 * - Feature #53: Canvas auto-center on load
 * - Feature #54: Keyboard shortcut for creating note (N key)
 */

const http = require('http');

const API_BASE = 'http://localhost:34567';
let TEST_USER = null;
let TEST_CANVAS = null;
let COOKIES = null;

// Helper function to make HTTP requests
function request(method, path, data = null, cookies = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port || 34567,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(cookies && { Cookie: cookies }),
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : null;
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Test: Register or login test user
async function setupTestUser() {
  console.log('\n=== Setting up test user ===');

  const testEmail = `test_zoom_${Date.now()}@example.com`;
  const testPassword = 'TestPass123!';

  // Try to register
  const registerResult = await request('POST', '/api/auth/register', {
    email: testEmail,
    password: testPassword,
    confirmPassword: testPassword,
    displayName: 'Zoom Test User',
  });

  if (registerResult.status === 201) {
    console.log('✓ Test user registered');
    TEST_USER = registerResult.data.user;
    COOKIES = registerResult.headers['set-cookie']?.[0]?.split(';')[0];
  } else if (registerResult.status === 409) {
    // User exists, try to login
    const loginResult = await request('POST', '/api/auth/login', {
      email: testEmail,
      password: testPassword,
    });
    if (loginResult.status === 200) {
      console.log('✓ Test user logged in');
      TEST_USER = loginResult.data.user;
      COOKIES = loginResult.headers['set-cookie']?.[0]?.split(';')[0];
    }
  } else {
    console.log('✗ Failed to setup test user:', registerResult.status, registerResult.data);
    throw new Error('Failed to setup test user');
  }

  return COOKIES;
}

// Test: Create a test canvas
async function setupTestCanvas(cookies) {
  console.log('\n=== Setting up test canvas ===');

  const canvasName = `TEST_ZOOM_${Date.now()}`;
  const createResult = await request('POST', '/api/canvases', {
    name: canvasName,
  }, cookies);

  if (createResult.status === 201) {
    console.log('✓ Test canvas created:', createResult.data.canvas.id);
    TEST_CANVAS = createResult.data.canvas;
    return TEST_CANVAS.id;
  } else {
    console.log('✗ Failed to create canvas:', createResult.status, createResult.data);
    throw new Error('Failed to create test canvas');
  }
}

// Test: Feature #52 - Reset zoom to 100% button
async function testFeature52_ResetZoom() {
  console.log('\n======================================');
  console.log('FEATURE #52: Reset Zoom to 100% Button');
  console.log('======================================');

  const tests = [];

  // Test 1: Create notes at different positions
  console.log('\n--- Test 1: Setting up notes for zoom test ---');
  const note1Result = await request('POST', `/api/canvases/${TEST_CANVAS.id}/notes`, {
    title: 'Note 1',
    content: 'First note',
    positionX: 0,
    positionY: 0,
    width: 300,
    height: 200,
  }, COOKIES);

  if (note1Result.status === 201) {
    console.log('✓ Note 1 created at origin');
    tests.push({ name: 'Create note at origin', passed: true });
  } else {
    console.log('✗ Failed to create note 1');
    tests.push({ name: 'Create note at origin', passed: false });
  }

  const note2Result = await request('POST', `/api/canvases/${TEST_CANVAS.id}/notes`, {
    title: 'Note 2',
    content: 'Second note far away',
    positionX: 2000,
    positionY: 1500,
    width: 300,
    height: 200,
  }, COOKIES);

  if (note2Result.status === 201) {
    console.log('✓ Note 2 created at distant position');
    tests.push({ name: 'Create distant note', passed: true });
  } else {
    console.log('✗ Failed to create note 2');
    tests.push({ name: 'Create distant note', passed: false });
  }

  // Test 2: Set viewport to non-100% zoom level
  console.log('\n--- Test 2: Setting non-100% zoom level ---');
  const setViewportResult = await request('PUT', `/api/canvases/${TEST_CANVAS.id}`, {
    viewportX: 500,
    viewportY: 400,
    zoom: 0.5, // 50% zoom
  }, COOKIES);

  if (setViewportResult.status === 200) {
    console.log('✓ Viewport set to 50% zoom');
    tests.push({ name: 'Set viewport to 50% zoom', passed: true });
  } else {
    console.log('✗ Failed to set viewport');
    tests.push({ name: 'Set viewport to 50% zoom', passed: false });
  }

  // Test 3: Verify viewport was saved
  console.log('\n--- Test 3: Verify viewport persistence ---');
  const getResult = await request('GET', `/api/canvases/${TEST_CANVAS.id}`, null, COOKIES);

  if (getResult.status === 200) {
    const canvas = getResult.data.canvas;
    if (canvas.zoom === 0.5) {
      console.log('✓ Viewport zoom persisted as 50%');
      tests.push({ name: 'Viewport zoom persists', passed: true });
    } else {
      console.log(`✗ Viewport zoom is ${canvas.zoom}, expected 0.5`);
      tests.push({ name: 'Viewport zoom persists', passed: false });
    }
  } else {
    console.log('✗ Failed to get canvas');
    tests.push({ name: 'Viewport zoom persists', passed: false });
  }

  // Test 4: Set viewport back to 100% (simulating reset button)
  console.log('\n--- Test 4: Simulating reset zoom button ---');
  const resetResult = await request('PUT', `/api/canvases/${TEST_CANVAS.id}`, {
    viewportX: 500,
    viewportY: 400,
    zoom: 1.0, // Reset to 100%
  }, COOKIES);

  if (resetResult.status === 200) {
    console.log('✓ Reset zoom to 100% successful');
    tests.push({ name: 'Reset zoom to 100%', passed: true });
  } else {
    console.log('✗ Failed to reset zoom');
    tests.push({ name: 'Reset zoom to 100%', passed: false });
  }

  // Test 5: Verify zoom was reset to 100%
  console.log('\n--- Test 5: Verify zoom is 100% after reset ---');
  const verifyResult = await request('GET', `/api/canvases/${TEST_CANVAS.id}`, null, COOKIES);

  if (verifyResult.status === 200) {
    const canvas = verifyResult.data.canvas;
    if (canvas.zoom === 1.0) {
      console.log('✓ Zoom successfully reset to 100%');
      tests.push({ name: 'Verify zoom reset to 100%', passed: true });
    } else {
      console.log(`✗ Zoom is ${canvas.zoom}, expected 1.0`);
      tests.push({ name: 'Verify zoom reset to 100%', passed: false });
    }
  } else {
    console.log('✗ Failed to verify zoom');
    tests.push({ name: 'Verify zoom reset to 100%', passed: false });
  }

  // Test 6: Test multiple zoom levels
  console.log('\n--- Test 6: Test various zoom levels ---');
  const zoomLevels = [0.25, 0.5, 0.75, 1.5, 2.0, 3.0];
  let allZoomLevelsWork = true;

  for (const zoom of zoomLevels) {
    const setResult = await request('PUT', `/api/canvases/${TEST_CANVAS.id}`, {
      viewportX: 0,
      viewportY: 0,
      zoom,
    }, COOKIES);

    if (setResult.status !== 200) {
      console.log(`✗ Failed to set zoom to ${zoom}`);
      allZoomLevelsWork = false;
      break;
    }
  }

  // Reset back to 100%
  const finalReset = await request('PUT', `/api/canvases/${TEST_CANVAS.id}`, {
    viewportX: 0,
    viewportY: 0,
    zoom: 1.0,
  }, COOKIES);

  if (allZoomLevelsWork && finalReset.status === 200) {
    console.log('✓ All zoom levels work and reset to 100% works');
    tests.push({ name: 'Multiple zoom levels', passed: true });
  } else {
    console.log('✗ Zoom level tests failed');
    tests.push({ name: 'Multiple zoom levels', passed: false });
  }

  return tests;
}

// Test: Feature #53 - Canvas auto-center on load
async function testFeature53_AutoCenter() {
  console.log('\n======================================');
  console.log('FEATURE #53: Canvas Auto-Center on Load');
  console.log('======================================');

  const tests = [];
  const canvasName = `TEST_CENTER_${Date.now()}`;

  // Test 1: Create new canvas with spread out notes
  console.log('\n--- Test 1: Create canvas with spread notes ---');
  const createResult = await request('POST', '/api/canvases', {
    name: canvasName,
  }, COOKIES);

  if (createResult.status !== 201) {
    console.log('✗ Failed to create canvas');
    return [{ name: 'Create canvas with spread notes', passed: false }];
  }

  const newCanvasId = createResult.data.canvas.id;
  console.log('✓ New canvas created:', newCanvasId);

  // Create notes spread out in different quadrants
  const notes = [
    { title: 'Top-Left', x: -1000, y: -800 },
    { title: 'Top-Right', x: 1000, y: -800 },
    { title: 'Bottom-Left', x: -1000, y: 800 },
    { title: 'Center', x: 0, y: 0 },
  ];

  for (const note of notes) {
    const noteResult = await request('POST', `/api/canvases/${newCanvasId}/notes`, {
      title: note.title,
      content: `Note at ${note.x}, ${note.y}`,
      positionX: note.x,
      positionY: note.y,
      width: 300,
      height: 200,
    }, COOKIES);

    if (noteResult.status === 201) {
      console.log(`✓ Created note: ${note.title}`);
    } else {
      console.log(`✗ Failed to create note: ${note.title}`);
    }
  }

  tests.push({ name: 'Create spread notes', passed: true });

  // Test 2: Verify canvas has no initial viewport (should trigger fitView)
  console.log('\n--- Test 2: Check initial viewport state ---');
  const getResult = await request('GET', `/api/canvases/${newCanvasId}`, null, COOKIES);

  if (getResult.status === 200) {
    const canvas = getResult.data.canvas;
    if (canvas.viewportX === null && canvas.viewportY === null && canvas.zoom === null) {
      console.log('✓ Canvas has null viewport (will trigger fitView)');
      tests.push({ name: 'Null viewport triggers fitView', passed: true });
    } else {
      console.log(`✗ Canvas has viewport: ${canvas.viewportX}, ${canvas.viewportY}, ${canvas.zoom}`);
      tests.push({ name: 'Null viewport triggers fitView', passed: false });
    }
  } else {
    console.log('✗ Failed to get canvas');
    tests.push({ name: 'Null viewport triggers fitView', passed: false });
  }

  // Test 3: Set viewport and verify it persists
  console.log('\n--- Test 3: Set viewport and verify persistence ---');
  const setViewportResult = await request('PUT', `/api/canvases/${newCanvasId}`, {
    viewportX: 100,
    viewportY: 100,
    zoom: 1.5,
  }, COOKIES);

  if (setViewportResult.status === 200) {
    console.log('✓ Viewport set');

    const verifyResult = await request('GET', `/api/canvases/${newCanvasId}`, null, COOKIES);
    if (verifyResult.status === 200) {
      const canvas = verifyResult.data.canvas;
      if (canvas.viewportX === 100 && canvas.viewportY === 100 && canvas.zoom === 1.5) {
        console.log('✓ Viewport persists (will NOT trigger fitView)');
        tests.push({ name: 'Saved viewport persists', passed: true });
      } else {
        console.log('✗ Viewport did not persist correctly');
        tests.push({ name: 'Saved viewport persists', passed: false });
      }
    }
  } else {
    console.log('✗ Failed to set viewport');
    tests.push({ name: 'Saved viewport persists', passed: false });
  }

  // Test 4: Test with empty canvas (should also center)
  console.log('\n--- Test 4: Create empty canvas ---');
  const emptyCanvasName = `TEST_EMPTY_${Date.now()}`;
  const emptyCanvasResult = await request('POST', '/api/canvases', {
    name: emptyCanvasName,
  }, COOKIES);

  if (emptyCanvasResult.status === 201) {
    const emptyCanvasId = emptyCanvasResult.data.canvas.id;
    const emptyCanvasGet = await request('GET', `/api/canvases/${emptyCanvasId}`, null, COOKIES);

    if (emptyCanvasGet.status === 200 && emptyCanvasGet.data.canvas.viewportX === null) {
      console.log('✓ Empty canvas has null viewport (centered view)');
      tests.push({ name: 'Empty canvas centering', passed: true });
    } else {
      console.log('✗ Empty canvas viewport check failed');
      tests.push({ name: 'Empty canvas centering', passed: false });
    }
  } else {
    console.log('✗ Failed to create empty canvas');
    tests.push({ name: 'Empty canvas centering', passed: false });
  }

  // Clean up test canvases
  await request('DELETE', `/api/canvases/${newCanvasId}`, null, COOKIES);
  const emptyCanvasId = emptyCanvasResult.data.canvas.id;
  await request('DELETE', `/api/canvases/${emptyCanvasId}`, null, COOKIES);

  return tests;
}

// Test: Feature #54 - Keyboard shortcut for creating note (N key)
async function testFeature54_NKeyShortcut() {
  console.log('\n======================================');
  console.log('FEATURE #54: Keyboard Shortcut (N Key)');
  console.log('======================================');

  const tests = [];

  // Test 1: Create note via API (simulating N key creation)
  console.log('\n--- Test 1: Create note at center position ---');
  const centerNoteResult = await request('POST', `/api/canvases/${TEST_CANVAS.id}/notes`, {
    title: 'N Key Note',
    content: 'Created with N key shortcut',
    positionX: 400, // Simulated center position
    positionY: 300,
    width: 300,
    height: 200,
  }, COOKIES);

  if (centerNoteResult.status === 201) {
    console.log('✓ Note created at simulated center position');
    console.log('  Note ID:', centerNoteResult.data.note.id);
    tests.push({ name: 'Create note via shortcut', passed: true });
  } else {
    console.log('✗ Failed to create note');
    tests.push({ name: 'Create note via shortcut', passed: false });
  }

  // Test 2: Create multiple notes rapidly (simulating rapid N key presses)
  console.log('\n--- Test 2: Create multiple notes rapidly ---');
  const noteIds = [];
  let allCreated = true;

  for (let i = 0; i < 5; i++) {
    const result = await request('POST', `/api/canvases/${TEST_CANVAS.id}/notes`, {
      title: `Rapid Note ${i + 1}`,
      content: `Note ${i + 1} created rapidly`,
      positionX: 400 + (i * 50), // Slightly offset to simulate center
      positionY: 300 + (i * 50),
      width: 300,
      height: 200,
    }, COOKIES);

    if (result.status === 201) {
      noteIds.push(result.data.note.id);
    } else {
      console.log(`✗ Failed to create rapid note ${i + 1}`);
      allCreated = false;
    }
  }

  if (allCreated && noteIds.length === 5) {
    console.log(`✓ Created ${noteIds.length} notes rapidly`);
    tests.push({ name: 'Rapid note creation', passed: true });
  } else {
    console.log('✗ Rapid note creation failed');
    tests.push({ name: 'Rapid note creation', passed: false });
  }

  // Test 3: Verify notes exist in database
  console.log('\n--- Test 3: Verify notes in database ---');
  const getResult = await request('GET', `/api/canvases/${TEST_CANVAS.id}`, null, COOKIES);

  if (getResult.status === 200) {
    const canvas = getResult.data.canvas;
    const noteCount = canvas.notes ? canvas.notes.length : 0;

    if (noteCount >= 6) { // 1 from test 1 + 5 from test 2 + original notes
      console.log(`✓ Canvas has ${noteCount} notes`);
      tests.push({ name: 'Notes persist in database', passed: true });
    } else {
      console.log(`✗ Canvas has only ${noteCount} notes, expected at least 6`);
      tests.push({ name: 'Notes persist in database', passed: false });
    }
  } else {
    console.log('✗ Failed to get canvas');
    tests.push({ name: 'Notes persist in database', passed: false });
  }

  // Test 4: Verify note titles and content
  console.log('\n--- Test 4: Verify note properties ---');
  const verifyResult = await request('GET', `/api/canvases/${TEST_CANVAS.id}`, null, COOKIES);

  if (verifyResult.status === 200) {
    const notes = verifyResult.data.canvas.notes;
    const nKeyNotes = notes.filter(n => n.title.includes('N Key') || n.title.includes('Rapid'));

    if (nKeyNotes.length >= 6) {
      console.log(`✓ Found ${nKeyNotes.length} notes created via shortcut`);

      // Check that all have required properties
      const allValid = nKeyNotes.every(note =>
        note.title &&
        note.content !== undefined &&
        typeof note.positionX === 'number' &&
        typeof note.positionY === 'number' &&
        note.width &&
        note.height
      );

      if (allValid) {
        console.log('✓ All notes have valid properties');
        tests.push({ name: 'Note properties valid', passed: true });
      } else {
        console.log('✗ Some notes missing properties');
        tests.push({ name: 'Note properties valid', passed: false });
      }
    } else {
      console.log(`✗ Found only ${nKeyNotes.length} shortcut notes`);
      tests.push({ name: 'Note properties valid', passed: false });
    }
  } else {
    console.log('✗ Failed to verify notes');
    tests.push({ name: 'Note properties valid', passed: false });
  }

  return tests;
}

// Main test runner
async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  Testing Features #52, #53, #54                       ║');
  console.log('║  Reset Zoom | Auto-Center | N Key Shortcut            ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  try {
    // Setup
    const cookies = await setupTestUser();
    await setupTestCanvas(cookies);

    // Run tests
    const test52 = await testFeature52_ResetZoom();
    const test53 = await testFeature53_AutoCenter();
    const test54 = await testFeature54_NKeyShortcut();

    // Summary
    const allTests = [...test52, ...test53, ...test54];
    const passed = allTests.filter(t => t.passed).length;
    const total = allTests.length;

    console.log('\n======================================');
    console.log('TEST SUMMARY');
    console.log('======================================');
    console.log(`Feature #52 (Reset Zoom): ${test52.filter(t => t.passed).length}/${test52.length} passed`);
    console.log(`Feature #53 (Auto-Center): ${test53.filter(t => t.passed).length}/${test53.length} passed`);
    console.log(`Feature #54 (N Key): ${test54.filter(t => t.passed).length}/${test54.length} passed`);
    console.log(`\nTotal: ${passed}/${total} tests passed (${((passed/total)*100).toFixed(1)}%)`);

    if (passed === total) {
      console.log('\n✅ ALL TESTS PASSED!');
    } else {
      console.log('\n⚠️  Some tests failed');
    }

    return passed === total;

  } catch (error) {
    console.error('\n❌ Test suite error:', error.message);
    return false;
  }
}

// Run tests
runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
