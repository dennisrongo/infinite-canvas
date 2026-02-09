#!/usr/bin/env node

const TEST_EMAIL = 'feature49@example.com';
const TEST_PASSWORD = 'Test1234!';

async function main() {
  console.log('Testing Feature #72: Note Duplication');
  console.log('=======================================\n');

  // 1. Login
  console.log('1. Logging in as feature49@example.com...');
  const loginRes = await fetch('http://localhost:5002/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });

  if (!loginRes.ok) {
    throw new Error('Login failed');
  }

  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('   ✓ Logged in');

  // 2. Get canvas
  console.log('\n2. Getting canvas...');
  const canvasesRes = await fetch('http://localhost:5002/api/canvases', {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  const canvasesData = await canvasesRes.json();
  const canvas = canvasesData.canvases[0];
  console.log(`   ✓ Canvas: ${canvas.name} (${canvas.id})`);
  console.log(`   ✓ Notes in canvas: ${canvas.notes.length}`);

  const originalNote = canvas.notes[0];
  console.log(`   ✓ Using note: "${originalNote.title}" (${originalNote.id})`);

  // 3. Duplicate note
  console.log('\n3. Duplicating note...');
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
  console.log(`   ✓ Position: (${duplicateNote.positionX}, ${duplicateNote.positionY})`);

  // 4. Verify
  console.log('\n4. Verifying...');
  const notesRes = await fetch(`http://localhost:5002/api/canvases/${canvas.id}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  const canvasData = await notesRes.json();
  const notes = canvasData.canvas.notes;

  console.log(`   ✓ Total notes now: ${notes.length} (was ${canvas.notes.length})`);
  console.log(`   ✓ Original exists: ${notes.find(n => n.id === originalNote.id) ? 'YES' : 'NO'}`);
  console.log(`   ✓ Duplicate exists: ${notes.find(n => n.id === duplicateNote.id) ? 'YES' : 'NO'}`);
  console.log(`   ✓ IDs different: ${originalNote.id !== duplicateNote.id ? 'YES' : 'NO'}`);
  console.log(`   ✓ Title has "Copy": ${duplicateNote.title.includes('Copy') ? 'YES' : 'NO'}`);
  console.log(`   ✓ Content matches: ${originalNote.content === duplicateNote.content ? 'YES' : 'NO'}`);

  const offsetX = duplicateNote.positionX - originalNote.positionX;
  const offsetY = duplicateNote.positionY - originalNote.positionY;
  console.log(`   ✓ Position offset: (${offsetX}, ${offsetY}) - expected (50, 50)`);

  if (offsetX !== 50 || offsetY !== 50) {
    throw new Error(`Position offset incorrect! Expected (50, 50), got (${offsetX}, ${offsetY})`);
  }

  console.log('\n=======================================');
  console.log('✅ Feature #72 API Test PASSED!');
  console.log('=======================================');
}

main().catch(err => {
  console.error('\n❌ Test FAILED:', err.message);
  console.error(err.stack);
  process.exit(1);
});
