#!/usr/bin/env node

/**
 * Test script for Feature #71: Note deletion with confirmation
 */

import http from 'http';

const BASE_URL = 'http://localhost:13579';
const TEST_USER = {
  email: 'autosave1770604588088@test.com',
  password: 'TestPassword123!'
};

let authCookie = '';

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
        ...headers,
      },
    };

    if (authCookie) {
      options.headers['Cookie'] = authCookie;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.headers['set-cookie']) {
          authCookie = res.headers['set-cookie'][0];
        }
        resolve({
          status: res.statusCode,
          body: body ? JSON.parse(body) : null
        });
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function login() {
  const res = await request('POST', '/api/auth/login', TEST_USER);
  if (res.status !== 200) {
    throw new Error(`Login failed: ${res.status}`);
  }
  return res.body;
}

async function getCanvas(canvasId) {
  const res = await request('GET', `/api/canvases/${canvasId}`);
  if (res.status !== 200) {
    throw new Error(`Failed to get canvas: ${res.status}`);
  }
  return res.body;
}

async function deleteNote(noteId) {
  const res = await request('DELETE', `/api/notes/${noteId}`);
  return res;
}

async function main() {
  try {
    console.log('\n========================================');
    console.log('FEATURE #71: Note Deletion Confirmation');
    console.log('========================================');

    await login();
    console.log('✅ Logged in');

    // Use the test canvas
    const canvasId = '6f393076-0030-4390-a8e9-e6b65d1a3d5b';
    const canvasData = await getCanvas(canvasId);

    console.log(`\nCanvas: ${canvasData.canvas.name}`);
    console.log(`Notes before: ${canvasData.canvas.notes.length}`);

    if (canvasData.canvas.notes.length === 0) {
      console.log('❌ No notes to test with');
      process.exit(1);
    }

    const noteToDelete = canvasData.canvas.notes[0];
    console.log(`\nNote to delete: ${noteToDelete.title} (${noteToDelete.id})`);

    console.log('\n⚠️  NOTE: This test verifies the API endpoint.');
    console.log('The confirmation modal is a UI component that requires browser testing.');
    console.log('\n--- API Level Test ---');

    // Test 1: Verify delete endpoint works
    console.log('\nTest 1: Delete note via API');
    const deleteRes = await deleteNote(noteToDelete.id);

    if (deleteRes.status === 200) {
      console.log('✅ DELETE request successful');

      // Test 2: Verify note was actually deleted
      console.log('\nTest 2: Verify deletion in database');
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for DB
      const checkCanvas = await getCanvas(canvasId);
      const deletedNote = checkCanvas.canvas.notes.find(n => n.id === noteToDelete.id);

      if (!deletedNote) {
        console.log('✅ Note successfully removed from database');
        console.log(`Notes after: ${checkCanvas.canvas.notes.length}`);
      } else {
        console.log('❌ Note still exists in database');
        process.exit(1);
      }
    } else {
      console.log(`❌ DELETE request failed: ${deleteRes.status}`);
      console.log('Response:', deleteRes.body);
      process.exit(1);
    }

    console.log('\n=== FEATURE #71: API TESTS PASSED ✅ ===');
    console.log('\n📋 Full verification requires browser testing:');
    console.log('   1. Select a note on the canvas');
    console.log('   2. Press Delete or Backspace key');
    console.log('   3. Verify confirmation modal appears with note title');
    console.log('   4. Click Cancel and verify note is NOT deleted');
    console.log('   5. Press Delete again, click Confirm');
    console.log('   6. Verify note is deleted from canvas');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
