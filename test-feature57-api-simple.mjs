/**
 * Test Feature #57: Note creation with title and body fields - API Test
 *
 * Simple API test to verify:
 * 1. Note creation works
 * 2. Note can be updated with title and content
 * 3. Note persists with correct title and content
 */

import http from 'http';

const TEST_CONFIG = {
  host: 'localhost',
  port: 3000,
  testUser: {
    email: `test-feature57-${Date.now()}@example.com`,
    password: 'TestPass123!',
    displayName: 'Feature 57 Test User'
  },
  canvasName: `Feature 57 Test Canvas`,
  testData: {
    title: 'Test Note Title 12345',
    content: 'This is the test body content for Feature 57.'
  }
};

function makeRequest(path, method, data, cookies = []) {
  return new Promise((resolve, reject) => {
    const options = {
      host: TEST_CONFIG.host,
      port: TEST_CONFIG.port,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies.join('; ')
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null,
            cookies: cookies
          };

          // Extract new cookies
          const setCookies = res.headers['set-cookie'];
          if (setCookies) {
            response.cookies = [...cookies, ...setCookies.map(cookie => cookie.split(';')[0])];
          }

          resolve(response);
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body,
            cookies: cookies
          });
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

async function testFeature57API() {
  console.log('='.repeat(80));
  console.log('FEATURE #57 API TEST: Note creation with title and body fields');
  console.log('='.repeat(80));

  let cookies = [];
  let userId, canvasId, noteId;

  try {
    // Step 1: Register user
    console.log('\n[Step 1] Registering test user...');
    const registerRes = await makeRequest('/api/auth/register', 'POST', TEST_CONFIG.testUser);

    if (registerRes.statusCode !== 200 && registerRes.statusCode !== 201) {
      throw new Error(`Registration failed: ${registerRes.statusCode}`);
    }

    cookies = registerRes.cookies;
    userId = registerRes.body.user.id;
    console.log(`✓ User registered: ${userId}`);

    // Step 2: Create canvas
    console.log('\n[Step 2] Creating test canvas...');
    const canvasRes = await makeRequest('/api/canvases', 'POST', { name: TEST_CONFIG.canvasName }, cookies);

    if (canvasRes.statusCode !== 200 && canvasRes.statusCode !== 201) {
      throw new Error(`Canvas creation failed: ${canvasRes.statusCode}`);
    }

    canvasId = canvasRes.body.canvas.id;
    console.log(`✓ Canvas created: ${canvasId}`);

    // Step 3: Create note
    console.log('\n[Step 3] Creating note...');
    const noteRes = await makeRequest(`/api/canvases/${canvasId}/notes`, 'POST', {
      title: 'Untitled Note',
      content: '',
      positionX: 100,
      positionY: 100,
      width: 300,
      height: 200
    }, cookies);

    if (noteRes.statusCode !== 200 && noteRes.statusCode !== 201) {
      throw new Error(`Note creation failed: ${noteRes.statusCode}`);
    }

    noteId = noteRes.body.note.id;
    console.log(`✓ Note created: ${noteId}`);

    // Step 4: Update note with title and content
    console.log('\n[Step 4] Updating note with title and content...');
    console.log(`  Title: "${TEST_CONFIG.testData.title}"`);
    console.log(`  Content: "${TEST_CONFIG.testData.content}"`);

    const updateRes = await makeRequest(`/api/notes/${noteId}`, 'PUT', {
      title: TEST_CONFIG.testData.title,
      content: TEST_CONFIG.testData.content
    }, cookies);

    if (updateRes.statusCode !== 200) {
      throw new Error(`Note update failed: ${updateRes.statusCode}`);
    }

    console.log('✓ Note updated successfully');

    // Step 5: Verify updated note
    console.log('\n[Step 5] Verifying updated note...');
    const getNoteRes = await makeRequest(`/api/notes/${noteId}`, 'GET', null, cookies);

    if (getNoteRes.statusCode !== 200) {
      throw new Error(`GET note failed: ${getNoteRes.statusCode}`);
    }

    const note = getNoteRes.body.note;

    if (note.title !== TEST_CONFIG.testData.title) {
      throw new Error(`Title mismatch: expected "${TEST_CONFIG.testData.title}", got "${note.title}"`);
    }
    console.log(`✓ Title verified: "${note.title}"`);

    if (note.content !== TEST_CONFIG.testData.content) {
      throw new Error(`Content mismatch: expected "${TEST_CONFIG.testData.content}", got "${note.content}"`);
    }
    console.log(`✓ Content verified: "${note.content}"`);

    // Step 6: Verify note in canvas
    console.log('\n[Step 6] Verifying note in canvas...');
    const canvasRes2 = await makeRequest(`/api/canvases/${canvasId}`, 'GET', null, cookies);

    if (canvasRes2.statusCode !== 200) {
      throw new Error(`GET canvas failed: ${canvasRes2.statusCode}`);
    }

    const canvasNotes = canvasRes2.body.canvas.notes || [];
    const targetNote = canvasNotes.find(n => n.id === noteId);

    if (!targetNote) {
      throw new Error(`Note ${noteId} not found in canvas`);
    }
    console.log(`✓ Note found in canvas`);

    if (targetNote.title !== TEST_CONFIG.testData.title) {
      throw new Error(`Canvas note title incorrect: "${targetNote.title}"`);
    }
    console.log(`✓ Canvas note has correct title`);

    if (targetNote.content !== TEST_CONFIG.testData.content) {
      throw new Error(`Canvas note content incorrect`);
    }
    console.log(`✓ Canvas note has correct content`);

    // TEST SUMMARY
    console.log('\n' + '='.repeat(80));
    console.log('FEATURE #57 API TEST: ✅ PASSED');
    console.log('='.repeat(80));
    console.log('\nVerified:');
    console.log('  ✓ Note creation API works');
    console.log('  ✓ Note update API accepts title and content');
    console.log('  ✓ Note title field persists');
    console.log('  ✓ Note content field persists');
    console.log('  ✓ Note appears in canvas with correct data');
    console.log('  ✓ Database Note record has title and content');
    console.log('\nTest Data:');
    console.log(`  User ID: ${userId}`);
    console.log(`  Canvas ID: ${canvasId}`);
    console.log(`  Note ID: ${noteId}`);
    console.log(`  Title: "${TEST_CONFIG.testData.title}"`);
    console.log(`  Content: "${TEST_CONFIG.testData.content}"`);
    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('\n' + '='.repeat(80));
    console.error('FEATURE #57 API TEST: ❌ FAILED');
    console.error('='.repeat(80));
    console.error(`\nError: ${error.message}`);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testFeature57API().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
