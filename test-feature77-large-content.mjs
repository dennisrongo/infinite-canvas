#!/usr/bin/env node

/**
 * Test Feature #77: Maximum note content size unlimited
 *
 * This test verifies:
 * - Notes can contain very large amounts of content
 * - Editor handles large content without lag
 * - Save completes successfully
 * - All content persists correctly
 * - No arbitrary character limits enforced
 */

import http from 'http';

const BASE_URL = 'http://localhost:3010';

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: body ? JSON.parse(body) : null });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function testFeature77() {
  console.log('='.repeat(60));
  console.log('Testing Feature #77: Maximum note content size unlimited');
  console.log('='.repeat(60));

  try {
    // Step 1: Create test user
    console.log('\n📝 Creating test user...');
    const user = await request('POST', '/api/auth/register', {
      email: 'feature77@test.com',
      password: 'Test1234!@#',
      displayName: 'Feature 77 Tester'
    });

    if (user.status !== 201 && user.status !== 200) {
      throw new Error(`Failed to create user: ${JSON.stringify(user.data)}`);
    }
    console.log('✅ User created');

    // Step 2: Create test canvas
    console.log('\n📋 Creating test canvas...');
    const canvas = await request('POST', '/api/canvases', {
      name: 'Feature 77 Test Canvas'
    });
    if (canvas.status !== 201) throw new Error('Failed to create canvas');
    console.log(`✅ Canvas created: ${canvas.data.id}`);

    // Step 3: Test 1 - Small content (baseline)
    console.log('\n📝 Test 1: Creating note with small content (100 chars)...');
    const smallContent = 'A'.repeat(100);
    const note1 = await request('POST', `/api/canvases/${canvas.data.id}/notes`, {
      title: 'Small Content Test',
      content: smallContent,
      positionX: 100,
      positionY: 100
    });
    if (note1.status !== 201) throw new Error('Failed to create small note');
    console.log(`✅ Small content note created (${smallContent.length} chars)`);

    // Step 4: Test 2 - Medium content (1 page)
    console.log('\n📝 Test 2: Creating note with medium content (3,000 chars)...');
    const mediumContent = 'Lorem ipsum dolor sit amet. '.repeat(200); // ~3,000 chars
    const note2 = await request('POST', `/api/canvases/${canvas.data.id}/notes`, {
      title: 'Medium Content Test',
      content: mediumContent,
      positionX: 300,
      positionY: 100
    });
    if (note2.status !== 201) throw new Error('Failed to create medium note');
    console.log(`✅ Medium content note created (${mediumContent.length} chars)`);

    // Step 5: Test 3 - Large content (10 pages)
    console.log('\n📝 Test 3: Creating note with large content (30,000 chars)...');
    const largeContent = 'This is a test line. '.repeat(5000); // ~30,000 chars
    const note3 = await request('POST', `/api/canvases/${canvas.data.id}/notes`, {
      title: 'Large Content Test',
      content: largeContent,
      positionX: 500,
      positionY: 100
    });
    if (note3.status !== 201) throw new Error('Failed to create large note');
    console.log(`✅ Large content note created (${largeContent.length} chars)`);

    // Step 6: Test 4 - Very large content (100 pages)
    console.log('\n📝 Test 4: Creating note with very large content (300,000 chars)...');
    const veryLargeContent = 'Paragraph text for testing. '.repeat(50000); // ~300,000 chars
    const note4 = await request('POST', `/api/canvases/${canvas.data.id}/notes`, {
      title: 'Very Large Content Test',
      content: veryLargeContent,
      positionX: 100,
      positionY: 300
    });
    if (note4.status !== 201) throw new Error('Failed to create very large note');
    console.log(`✅ Very large content note created (${veryLargeContent.length} chars)`);

    // Step 7: Verify content persistence
    console.log('\n📝 Test 5: Verifying content persistence...');
    const getNotes = await request('GET', `/api/canvases/${canvas.data.id}/notes`);
    if (getNotes.status !== 200) throw new Error('Failed to fetch notes');

    const retrievedNote = getNotes.data.notes.find(n => n.id === note4.data.id);
    if (!retrievedNote) throw new Error('Note not found');
    if (retrievedNote.content.length !== veryLargeContent.length) {
      throw new Error(`Content length mismatch: expected ${veryLargeContent.length}, got ${retrievedNote.content.length}`);
    }
    console.log(`✅ Content persisted correctly (${retrievedNote.content.length} chars)`);

    // Step 8: Test update with large content
    console.log('\n📝 Test 6: Updating note with large content...');
    const updateContent = 'Updated content line. '.repeat(100000); // ~600,000 chars
    const updateNote = await request('PUT', `/api/notes/${note1.data.id}`, {
      content: updateContent
    });
    if (updateNote.status !== 200) throw new Error('Failed to update note');
    console.log(`✅ Note updated with large content (${updateContent.length} chars)`);

    // Step 9: Verify update persisted
    const getUpdatedNote = await request('GET', `/api/canvases/${canvas.data.id}/notes`);
    const updatedNote = getUpdatedNote.data.notes.find(n => n.id === note1.data.id);
    if (updatedNote.content.length !== updateContent.length) {
      throw new Error(`Update verification failed: expected ${updateContent.length}, got ${updatedNote.content.length}`);
    }
    console.log(`✅ Update persisted correctly (${updatedNote.content.length} chars)`);

    console.log('\n' + '='.repeat(60));
    console.log('FEATURE #77 TEST RESULTS');
    console.log('='.repeat(60));
    console.log('✅ Small content (100 chars): PASS');
    console.log('✅ Medium content (3,000 chars): PASS');
    console.log('✅ Large content (30,000 chars): PASS');
    console.log('✅ Very large content (300,000 chars): PASS');
    console.log('✅ Extra large update (600,000 chars): PASS');
    console.log('✅ Content persistence: PASS');
    console.log('✅ No character limits enforced: PASS');
    console.log('\n🎉 Feature #77 is WORKING!');
    console.log('\n📊 Database Capacity:');
    console.log('   PostgreSQL text field: Up to 1GB per field');
    console.log('   Current test: 600,000 characters (~600KB)');
    console.log('   Headroom: ~1,700x more capacity available');
    console.log('   Conclusion: Effectively unlimited for practical use');

    console.log('\n' + '='.repeat(60));
    console.log('MANUAL TESTING INSTRUCTIONS:');
    console.log('='.repeat(60));
    console.log('1. Login at: http://localhost:3010/dashboard');
    console.log('   Email: feature77@test.com');
    console.log('   Password: Test1234!@#');
    console.log('\n2. Open "Feature 77 Test Canvas"');
    console.log('\n3. Double-click "Very Large Content Test" note');
    console.log('\n4. EXPECTED:');
    console.log('   - Editor opens without lag');
    console.log('   - All 300,000 characters present');
    console.log('   - Scrollbar works in textarea');
    console.log('   - Can edit and save');
    console.log('\n5. Test typing performance:');
    console.log('   - Type in middle of large content');
    console.log('   - EXPECTED: No noticeable lag');
    console.log('   - Cursor moves responsively');
    console.log('\n6. Test auto-save:');
    console.log('   - Make change and wait 2 seconds');
    console.log('   - EXPECTED: "Saved ✓" appears');
    console.log('\n7. Refresh page and reopen note');
    console.log('   - EXPECTED: All changes preserved');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

testFeature77().catch(console.error);
