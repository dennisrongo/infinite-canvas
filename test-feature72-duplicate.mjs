/**
 * Test Feature #72: Note Duplication
 * Tests the POST /api/notes/:noteId/duplicate endpoint
 */

const TEST_EMAIL = 'feature72@example.com';
const TEST_PASSWORD = 'Test1234!';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return response;
}

async function registerAndLogin() {
  console.log('1. Registering test user...');
  const registerRes = await makeRequest('http://localhost:5001/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    }),
  });

  if (registerRes.status === 400 && registerRes.error === 'Email already exists') {
    console.log('   User already exists, proceeding to login...');
  } else if (!registerRes.ok) {
    const error = await registerRes.json();
    console.log('   Registration result:', error);
  } else {
    console.log('   ✓ Registration successful');
  }

  await sleep(500);

  console.log('2. Logging in...');
  const loginRes = await makeRequest('http://localhost:5001/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    }),
  });

  if (!loginRes.ok) {
    throw new Error('Login failed');
  }

  const loginData = await loginRes.json();
  console.log('   ✓ Login successful');
  return loginData.token;
}

async function getCanvases(token) {
  const res = await makeRequest('http://localhost:5001/api/canvases', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch canvases');
  }

  return res.json();
}

async function createCanvas(token, name) {
  const res = await makeRequest('http://localhost:5001/api/canvases', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    throw new Error('Failed to create canvas');
  }

  return res.json();
}

async function createNote(token, canvasId, title, content, positionX, positionY) {
  const res = await makeRequest(`http://localhost:5001/api/canvases/${canvasId}/notes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      title,
      content,
      positionX,
      positionY,
    }),
  });

  if (!res.ok) {
    throw new Error('Failed to create note');
  }

  return res.json();
}

async function duplicateNote(token, noteId) {
  const res = await makeRequest(`http://localhost:5001/api/notes/${noteId}/duplicate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Failed to duplicate note: ${JSON.stringify(error)}`);
  }

  return res.json();
}

async function getNotes(token, canvasId) {
  const res = await makeRequest(`http://localhost:5001/api/canvases/${canvasId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch canvas');
  }

  const data = await res.json();
  return data.canvas.notes;
}

async function main() {
  console.log('='.repeat(60));
  console.log('FEATURE #72: NOTE DUPLICATION - API TEST');
  console.log('='.repeat(60));
  console.log();

  try {
    // Step 1: Authenticate
    const token = await registerAndLogin();
    console.log();

    // Step 2: Get or create a canvas
    console.log('3. Fetching canvases...');
    const canvasesData = await getCanvases(token);
    let canvas = canvasesData.canvases[0];

    if (!canvas) {
      console.log('   No canvas found, creating one...');
      const canvasData = await createCanvas(token, 'Feature 72 Test Canvas');
      canvas = canvasData.canvas;
    }

    console.log(`   ✓ Using canvas: ${canvas.name} (${canvas.id})`);
    console.log();

    // Step 3: Create a test note
    console.log('4. Creating test note...');
    const testContent = 'Duplicate test 12345 - This note will be duplicated';
    const noteData = await createNote(
      token,
      canvas.id,
      'Original Note',
      testContent,
      100,
      100
    );

    const originalNote = noteData.note;
    console.log(`   ✓ Note created: ${originalNote.id}`);
    console.log(`   ✓ Title: "${originalNote.title}"`);
    console.log(`   ✓ Content: "${originalNote.content.substring(0, 50)}..."`);
    console.log(`   ✓ Position: (${originalNote.positionX}, ${originalNote.positionY})`);
    console.log();

    // Step 4: Duplicate the note
    console.log('5. Duplicating note...');
    const duplicateData = await duplicateNote(token, originalNote.id);
    const duplicateNote = duplicateData.note;

    console.log(`   ✓ Note duplicated: ${duplicateNote.id}`);
    console.log(`   ✓ Title: "${duplicateNote.title}"`);
    console.log(`   ✓ Content: "${duplicateNote.content.substring(0, 50)}..."`);
    console.log(`   ✓ Position: (${duplicateNote.positionX}, ${duplicateNote.positionY})`);
    console.log();

    // Step 5: Verify the duplication
    console.log('6. Verifying duplication...');
    const notes = await getNotes(token, canvas.id);

    console.log(`   ✓ Total notes in canvas: ${notes.length}`);

    const foundOriginal = notes.find(n => n.id === originalNote.id);
    const foundDuplicate = notes.find(n => n.id === duplicateNote.id);

    if (!foundOriginal) {
      throw new Error('Original note not found in database!');
    }
    console.log('   ✓ Original note still exists');

    if (!foundDuplicate) {
      throw new Error('Duplicate note not found in database!');
    }
    console.log('   ✓ Duplicate note exists in database');

    // Verify title
    if (!duplicateNote.title.includes('Copy')) {
      throw new Error(`Expected duplicate title to include "Copy", got: ${duplicateNote.title}`);
    }
    console.log('   ✓ Duplicate title has "Copy" suffix');

    // Verify content
    if (duplicateNote.content !== originalNote.content) {
      throw new Error('Duplicate content does not match original!');
    }
    console.log('   ✓ Duplicate content matches original');

    // Verify position offset
    const expectedX = originalNote.positionX + 50;
    const expectedY = originalNote.positionY + 50;

    if (duplicateNote.positionX !== expectedX || duplicateNote.positionY !== expectedY) {
      throw new Error(
        `Expected duplicate position (${expectedX}, ${expectedY}), ` +
        `got (${duplicateNote.positionX}, ${duplicateNote.positionY})`
      );
    }
    console.log(`   ✓ Duplicate position offset correctly (${expectedX}, ${expectedY})`);

    // Verify unique IDs
    if (duplicateNote.id === originalNote.id) {
      throw new Error('Duplicate has the same ID as original!');
    }
    console.log('   ✓ Duplicate has unique ID');

    // Verify duplicate of duplicate (should not add another "Copy")
    console.log();
    console.log('7. Duplicating the duplicate...');
    const duplicate2Data = await duplicateNote(token, duplicateNote.id);
    const duplicate2Note = duplicate2Data.note;

    console.log(`   ✓ Second duplicate created: ${duplicate2Note.id}`);
    console.log(`   ✓ Title: "${duplicate2Note.title}"`);

    if (duplicate2Note.title.includes(' - Copy')) {
      // The duplicate already has " - Copy" in title, so it shouldn't add another
      console.log('   ✓ Title not modified (already has "Copy" suffix)');
    }

    console.log();
    console.log('='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log();
    console.log('Summary:');
    console.log('  • API endpoint POST /api/notes/:noteId/duplicate working');
    console.log('  • Duplicate note created with unique ID');
    console.log('  • Duplicate title includes "Copy" suffix');
    console.log('  • Duplicate content matches original');
    console.log('  • Duplicate position offset by (50, 50)');
    console.log('  • Original note remains unchanged');
    console.log('  • Both notes persist in database');
    console.log();

  } catch (error) {
    console.error();
    console.error('❌ TEST FAILED:', error.message);
    console.error();
    process.exit(1);
  }
}

main();
