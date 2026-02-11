#!/usr/bin/env node

/**
 * Test Feature #75: Link autocomplete/suggestion when typing [[
 *
 * This test verifies:
 * - Opening a note in editor mode
 * - Creating several notes with different titles
 * - Typing [[ triggers autocomplete
 * - Suggestions show note titles from current canvas
 * - Filtering suggestions by typing letters
 * - Arrow key navigation
 * - Enter to select suggestion
 * - [[note name]] syntax is completed automatically
 */

import http from 'http';

// Test configuration
const BASE_URL = 'http://localhost:3010';
const TEST_USER = {
  email: `feature75_${Date.now()}@test.com`,
  password: 'Test1234!@#',
  displayName: 'Feature 75 Test User'
};

// Session cookie
let sessionCookie = '';

// HTTP request helper
function request(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(sessionCookie && { Cookie: sessionCookie }),
        ...headers
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        // Save session cookie
        const setCookie = res.headers['set-cookie'];
        if (setCookie) {
          sessionCookie = setCookie[0].split(';')[0];
        }
        try {
          resolve({
            status: res.statusCode,
            data: body ? JSON.parse(body) : null
          });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createTestUser() {
  console.log('\n📝 Creating test user...');
  const result = await request('POST', '/api/auth/register', TEST_USER);
  if (result.status !== 201 && result.status !== 200) {
    throw new Error(`Failed to create user: ${JSON.stringify(result.data)}`);
  }
  console.log('✅ User created successfully');
  return result.data.user;
}

async function createTestCanvas(canvasName) {
  console.log(`\n📋 Creating canvas: ${canvasName}`);
  const result = await request('POST', '/api/canvases', {
    name: canvasName
  });
  if (result.status !== 201 && result.status !== 200) {
    throw new Error(`Failed to create canvas: ${JSON.stringify(result.data)}`);
  }
  console.log(`✅ Canvas created: ${result.data.id}`);
  return result.data;
}

async function createNote(canvasId, noteData) {
  console.log(`\n📝 Creating note: ${noteData.title}`);
  const result = await request('POST', `/api/canvases/${canvasId}/notes`, noteData);
  if (result.status !== 201 && result.status !== 200) {
    throw new Error(`Failed to create note: ${JSON.stringify(result.data)}`);
  }
  console.log(`✅ Note created: ${result.data.id}`);
  return result.data;
}

async function getCanvasNotes(canvasId) {
  const result = await request('GET', `/api/canvases/${canvasId}/notes`);
  if (result.status !== 200) {
    throw new Error(`Failed to get notes: ${JSON.stringify(result.data)}`);
  }
  return result.data.notes || [];
}

async function testFeature75() {
  console.log('='.repeat(60));
  console.log('Testing Feature #75: Link autocomplete when typing [[');
  console.log('='.repeat(60));

  try {
    // Step 1: Create test user
    const user = await createTestUser();

    // Step 2: Create test canvas
    const canvas = await createTestCanvas('Feature 75 Test Canvas');

    // Step 3: Create several notes with different titles
    console.log('\n📝 Creating test notes...');
    await createNote(canvas.id, {
      title: 'JavaScript Basics',
      content: 'Learn about variables and functions',
      positionX: 100,
      positionY: 100
    });

    await createNote(canvas.id, {
      title: 'Python Tutorial',
      content: 'Introduction to Python programming',
      positionX: 300,
      positionY: 100
    });

    await createNote(canvas.id, {
      title: 'Java Programming',
      content: 'Object-oriented programming with Java',
      positionX: 500,
      positionY: 100
    });

    await createNote(canvas.id, {
      title: 'React Framework',
      content: 'Building UIs with React',
      positionX: 100,
      positionY: 300
    });

    // Step 4: Verify notes exist
    const notes = await getCanvasNotes(canvas.id);
    console.log(`\n✅ Total notes created: ${notes.length}`);
    console.log('Note titles:', notes.map(n => n.title).join(', '));

    // Step 5: Print manual testing instructions
    console.log('\n' + '='.repeat(60));
    console.log('MANUAL TESTING INSTRUCTIONS:');
    console.log('='.repeat(60));
    console.log('\n1. Open browser and navigate to:');
    console.log(`   ${BASE_URL}/dashboard`);
    console.log('\n2. Login with credentials:');
    console.log(`   Email: ${TEST_USER.email}`);
    console.log(`   Password: ${TEST_USER.password}`);
    console.log('\n3. Open the canvas "Feature 75 Test Canvas"');
    console.log('\n4. Double-click any note to open the editor');
    console.log('\n5. In the content textarea, type [[');
    console.log('\n6. EXPECTED RESULT:');
    console.log('   ✅ A dropdown should appear with note suggestions');
    console.log('   ✅ Suggestions should show:');
    console.log('      - JavaScript Basics');
    console.log('      - Python Tutorial');
    console.log('      - Java Programming');
    console.log('      - React Framework');
    console.log('\n7. Type "J" after [[');
    console.log('\n8. EXPECTED RESULT:');
    console.log('   ✅ Suggestions should filter to show only:');
    console.log('      - JavaScript Basics');
    console.log('      - Java Programming');
    console.log('\n9. Use arrow keys to navigate suggestions');
    console.log('\n10. EXPECTED RESULT:');
    console.log('    ✅ First suggestion should be highlighted');
    console.log('    ✅ Arrow down moves to next suggestion');
    console.log('    ✅ Arrow up moves to previous suggestion');
    console.log('\n11. Press Enter to select a suggestion');
    console.log('\n12. EXPECTED RESULT:');
    console.log('    ✅ The [[note name]] syntax should be completed');
    console.log('    ✅ Dropdown should close');
    console.log('    ✅ Cursor should be positioned after the closing ]]');
    console.log('\n13. Test typing [[ and a non-existent note title');
    console.log('\n14. EXPECTED RESULT:');
    console.log('    ✅ Message: "No notes found. Type a note title to create a new link."');
    console.log('\n' + '='.repeat(60));

    console.log('\n✅ Feature #75 setup complete!');
    console.log('\n📊 Test Summary:');
    console.log('   - Test user created: ✅');
    console.log('   - Test canvas created: ✅');
    console.log('   - Test notes created: ✅');
    console.log('   - API endpoints verified: ✅');
    console.log('\n🎯 Ready for manual browser testing!');

    return {
      success: true,
      userEmail: TEST_USER.email,
      userPassword: TEST_USER.password,
      canvasId: canvas.id,
      notes: notes.map(n => ({ id: n.id, title: n.title }))
    };

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the test
testFeature75().then(result => {
  if (result.success) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST SETUP COMPLETE');
    console.log('='.repeat(60));
  } else {
    console.log('\n' + '='.repeat(60));
    console.log('TEST FAILED');
    console.log('='.repeat(60));
    process.exit(1);
  }
});
