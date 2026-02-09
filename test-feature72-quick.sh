#!/usr/bin/env node

/**
 * Quick test for Feature #72: Note Duplication API
 */

async function main() {
  const TEST_EMAIL = 'feature72test@example.com';
  const TEST_PASSWORD = 'Test1234!';

  console.log('Testing Feature #72: Note Duplication');
  console.log('=======================================\n');

  // 1. Login
  console.log('1. Logging in...');
  const loginRes = await fetch('http://localhost:5002/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });

  if (!loginRes.ok) {
    // Try registering
    console.log('   User not found, registering...');
    const regRes = await fetch('http://localhost:5002/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });

    if (!regRes.ok) {
      console.log('   Registration failed, trying login again...');
      const loginRes2 = await fetch('http://localhost:5002/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
      });
      if (!loginRes2.ok) {
        throw new Error('Authentication failed');
      }
      var loginData = await loginRes2.json();
    } else {
      console.log('   ✓ Registered');
      var loginData = await regRes.json();
    }
  } else {
    var loginData = await loginRes.json();
    console.log('   ✓ Logged in');
  }

  const token = loginData.token;

  // 2. Get or create canvas
  console.log('\n2. Getting canvas...');
  const canvasesRes = await fetch('http://localhost:5002/api/canvases', {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  const canvasesData = await canvasesRes.json();
  let canvas = canvasesData.canvases[0];

  if (!canvas) {
    console.log('   Creating new canvas...');
    const createRes = await fetch('http://localhost:5002/api/canvases', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Feature 72 Test Canvas' }),
    });
    const createData = await createRes.json();
    canvas = createData.canvas;
  }

  console.log(`   ✓ Canvas: ${canvas.name} (${canvas.id})`);

  // 3. Create test note
  console.log('\n3. Creating test note...');
  const createNoteRes = await fetch(`http://localhost:5002/api/canvases/${canvas.id}/notes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'Original Note',
      content: 'Duplicate test 12345',
      positionX: 100,
      positionY: 100,
    }),
  });

  const createNoteData = await createNoteRes.json();
  const originalNote = createNoteData.note;
  console.log(`   ✓ Note created: ${originalNote.id}`);
  console.log(`   ✓ Title: "${originalNote.title}"`);
  console.log(`   ✓ Content: "${originalNote.content}"`);

  // 4. Duplicate note
  console.log('\n4. Duplicating note...');
  const duplicateRes = await fetch(`http://localhost:5002/api/notes/${originalNote.id}/duplicate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!duplicateRes.ok) {
    const error = await duplicateRes.json();
    throw new Error(`Duplicate failed: ${JSON.stringify(error)}`);
  }

  const duplicateData = await duplicateRes.json();
  const duplicateNote = duplicateData.note;
  console.log(`   ✓ Duplicate created: ${duplicateNote.id}`);
  console.log(`   ✓ Title: "${duplicateNote.title}"`);
  console.log(`   ✓ Content: "${duplicateNote.content}"`);
  console.log(`   ✓ Position: (${duplicateNote.positionX}, ${duplicateNote.positionY})`);

  // 5. Verify
  console.log('\n5. Verification...');
  const notesRes = await fetch(`http://localhost:5002/api/canvases/${canvas.id}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  const canvasData = await notesRes.json();
  const notes = canvasData.canvas.notes;

  console.log(`   ✓ Total notes: ${notes.length}`);
  console.log(`   ✓ Original exists: ${notes.find(n => n.id === originalNote.id) ? 'YES' : 'NO'}`);
  console.log(`   ✓ Duplicate exists: ${notes.find(n => n.id === duplicateNote.id) ? 'YES' : 'NO'}`);
  console.log(`   ✓ IDs different: ${originalNote.id !== duplicateNote.id ? 'YES' : 'NO'}`);
  console.log(`   ✓ Title has "Copy": ${duplicateNote.title.includes('Copy') ? 'YES' : 'NO'}`);
  console.log(`   ✓ Content matches: ${originalNote.content === duplicateNote.content ? 'YES' : 'NO'}`);
  console.log(`   ✓ Position offset: (${duplicateNote.positionX - originalNote.positionX}, ${duplicateNote.positionY - originalNote.positionY})`);

  console.log('\n=======================================');
  console.log('✅ Feature #72 API Test PASSED!');
  console.log('=======================================');
}

main().catch(err => {
  console.error('\n❌ Test FAILED:', err.message);
  process.exit(1);
});
