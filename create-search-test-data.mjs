/**
 * Create test data for search features #85, #86, #87
 */

const BASE_URL = 'http://localhost:3016';

async function createTestData() {
  console.log('=== Creating Search Test Data ===\n');

  // Login
  console.log('1. Logging in...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'feature49@example.com',
      password: 'Test1234!'
    })
  });

  if (!loginRes.ok) {
    console.error('❌ Login failed');
    process.exit(1);
  }

  // Get session cookie
  const setCookie = loginRes.headers.get('set-cookie');
  const cookie = setCookie ? setCookie.split(';')[0] : '';

  console.log('✅ Logged in');

  // Get the test canvas
  console.log('\n2. Getting canvas...');
  const canvasRes = await fetch(`${BASE_URL}/api/canvases`, {
    headers: { Cookie: cookie }
  });

  const canvasData = await canvasRes.json();
  const canvases = Array.isArray(canvasData) ? canvasData : canvasData.canvases || [];
  const testCanvas = canvases.find(c => c.name === 'Search Test Canvas');

  if (!testCanvas) {
    console.error('❌ Search Test Canvas not found');
    console.error('Available canvases:', canvases.map(c => c.name));
    process.exit(1);
  }

  console.log(`✅ Found canvas: ${testCanvas.id}`);

  // Create test notes
  console.log('\n3. Creating test notes...');

  const notes = [
    {
      title: 'SEARCH_TITLE_TEST_12345',
      content: 'This note has a unique title to test title-based search',
      positionX: 100,
      positionY: 100
    },
    {
      title: 'Generic Note Title',
      content: 'This note has SEARCH_BODY_TEST_67890 in its content',
      positionX: 300,
      positionY: 100
    },
    {
      title: 'The quick brown fox',
      content: 'A note with the quick brown fox phrase for testing highlighting',
      positionX: 500,
      positionY: 100
    },
    {
      title: 'JavaScript Programming Guide',
      content: 'Learn about JavaScript, functions, variables, and loops',
      positionX: 100,
      positionY: 300
    },
    {
      title: 'Python Tutorial',
      content: 'Python is a great programming language for beginners',
      positionX: 300,
      positionY: 300
    },
    {
      title: 'Web Development',
      content: 'HTML, CSS, and JavaScript are the core of web development',
      positionX: 500,
      positionY: 300
    }
  ];

  const createdNotes = [];

  for (const noteData of notes) {
    const createRes = await fetch(`${BASE_URL}/api/canvases/${testCanvas.id}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie
      },
      body: JSON.stringify(noteData)
    });

    if (createRes.ok) {
      const note = await createRes.json();
      createdNotes.push(note);
      console.log(`   ✅ Created: ${note.title}`);
    } else {
      console.log(`   ❌ Failed to create: ${noteData.title}`);
    }
  }

  console.log('\n=== Test Data Created Successfully ===');
  console.log(`\nCreated ${createdNotes.length} notes`);
  console.log('\nYou can now test search in the browser at:');
  console.log(`http://localhost:3016/canvas/${testCanvas.id}`);
  console.log('\nTest searches:');
  console.log('  - SEARCH_TITLE_TEST_12345 (title search)');
  console.log('  - SEARCH_BODY_TEST_67890 (body search)');
  console.log('  - quick brown (highlighting test)');
  console.log('  - JavaScript (content search)');
}

createTestData().catch(console.error);
