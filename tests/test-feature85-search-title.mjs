/**
 * Test Feature #85: Search by note title
 * Verifies that search finds notes by matching title
 */

const testTitleSearch = async () => {
  console.log('=== Feature #85: Search by Note Title ===\n');

  const baseUrl = 'http://localhost:3016';

  // First, login to get session
  console.log('1. Logging in...');
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'feature49@example.com',
      password: 'Test1234!'
    })
  });

  if (!loginRes.ok) {
    console.error('❌ Login failed');
    return;
  }
  console.log('✅ Logged in successfully');

  // Get cookies from login
  const cookies = loginRes.headers.get('set-cookie');
  console.log('Cookies received:', cookies ? 'Yes' : 'No');

  // Create a test note with unique title
  const uniqueTitle = `SEARCH_TITLE_TEST_${Date.now()}`;
  console.log(`\n2. Creating note with title: ${uniqueTitle}`);

  // First get a canvas ID
  const canvasRes = await fetch(`${baseUrl}/api/canvases`, {
    headers: { Cookie: cookies }
  });
  const canvases = await canvasRes.json();
  const canvasId = canvases[0]?.id;

  if (!canvasId) {
    console.error('❌ No canvas found');
    return;
  }
  console.log(`✅ Using canvas: ${canvasId}`);

  // Create note with unique title
  const createRes = await fetch(`${baseUrl}/api/canvases/${canvasId}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookies
    },
    body: JSON.stringify({
      title: uniqueTitle,
      content: 'This is generic body content to test title search',
      positionX: 100,
      positionY: 100
    })
  });

  if (!createRes.ok) {
    console.error('❌ Failed to create note');
    return;
  }
  const createdNote = await createRes.json();
  console.log('✅ Created note:', createdNote.id);

  // Create another note with generic title
  console.log('\n3. Creating another note with generic title');
  const createRes2 = await fetch(`${baseUrl}/api/canvases/${canvasId}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookies
    },
    body: JSON.stringify({
      title: 'Generic Note Title',
      content: `This note has unique body content UNIQUE_BODY_${Date.now()}`,
      positionX: 200,
      positionY: 200
    })
  });

  if (!createRes2.ok) {
    console.error('❌ Failed to create second note');
    return;
  }
  console.log('✅ Created second note');

  // Test 1: Search for exact unique title
  console.log(`\n4. Test 1: Searching for exact title '${uniqueTitle}'`);
  const searchRes1 = await fetch(`${baseUrl}/api/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookies
    },
    body: JSON.stringify({ query: uniqueTitle })
  });

  if (!searchRes1.ok) {
    console.error('❌ Search failed');
    return;
  }

  const searchResults1 = await searchRes1.json();
  console.log(`   Found ${searchResults1.results.length} results`);

  const foundByTitle = searchResults1.results.find(r => r.id === createdNote.id);
  if (foundByTitle) {
    console.log('✅ PASS: Note found by exact title match');
    console.log(`   Title: ${foundByTitle.title}`);
  } else {
    console.log('❌ FAIL: Note NOT found by exact title match');
  }

  // Test 2: Search for partial title
  const partialTerm = uniqueTitle.substring(0, 15);
  console.log(`\n5. Test 2: Searching for partial title '${partialTerm}'`);

  const searchRes2 = await fetch(`${baseUrl}/api/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookies
    },
    body: JSON.stringify({ query: partialTerm })
  });

  const searchResults2 = await searchRes2.json();
  console.log(`   Found ${searchResults2.results.length} results`);

  const foundByPartial = searchResults2.results.find(r => r.id === createdNote.id);
  if (foundByPartial) {
    console.log('✅ PASS: Note found by partial title match');
  } else {
    console.log('❌ FAIL: Note NOT found by partial title match');
  }

  // Test 3: Case insensitivity
  console.log(`\n6. Test 3: Case insensitivity - searching for lowercase`);

  const searchRes3 = await fetch(`${baseUrl}/api/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookies
    },
    body: JSON.stringify({ query: uniqueTitle.toLowerCase() })
  });

  const searchResults3 = await searchRes3.json();
  console.log(`   Found ${searchResults3.results.length} results`);

  const foundByCase = searchResults3.results.find(r => r.id === createdNote.id);
  if (foundByCase) {
    console.log('✅ PASS: Case-insensitive search works');
  } else {
    console.log('❌ FAIL: Case-insensitive search does NOT work');
  }

  // Test 4: Verify searching for body content doesn't return title-only match
  console.log(`\n7. Test 4: Verify body search doesn't return title-only note`);

  const searchRes4 = await fetch(`${baseUrl}/api/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookies
    },
    body: JSON.stringify({ query: 'UNIQUE_BODY_' })
  });

  const searchResults4 = await searchRes4.json();
  const foundByBody = searchResults4.results.find(r => r.id === createdNote.id);

  if (!foundByBody) {
    console.log('✅ PASS: Title-only note not returned by body content search');
  } else {
    console.log('❌ FAIL: Title-only note incorrectly returned by body search');
  }

  console.log('\n=== Feature #85 Tests Complete ===\n');

  // Cleanup
  console.log('Cleaning up test notes...');
  await fetch(`${baseUrl}/api/notes/${createdNote.id}`, {
    method: 'DELETE',
    headers: { Cookie: cookies }
  });
  console.log('✅ Cleaned up test notes');
};

testTitleSearch().catch(console.error);
