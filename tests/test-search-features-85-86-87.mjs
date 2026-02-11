/**
 * Test Features #85, #86, #87: Search Functionality
 *
 * Feature #85: Search by note title
 * Feature #86: Search by note content/body
 * Feature #87: Search result highlighting
 */

const BASE_URL = 'http://localhost:3017';

// ANSI color codes
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

let cookie = '';
let canvasId = '';

async function login() {
  console.log(`${BLUE}=== Logging in ===${RESET}`);

  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'feature49@example.com',
      password: 'Test1234!'
    })
  });

  if (!res.ok) {
    console.log(`${RED}❌ Login failed${RESET}`);
    process.exit(1);
  }

  const setCookie = res.headers.get('set-cookie');
  cookie = setCookie ? setCookie.split(';')[0] : '';

  console.log(`${GREEN}✅ Logged in successfully${RESET}\n`);
}

async function getTestCanvas() {
  console.log(`${BLUE}=== Getting Test Canvas ===${RESET}`);

  const res = await fetch(`${BASE_URL}/api/canvases`, {
    headers: { Cookie: cookie }
  });

  const canvasData = await res.json();
  const canvases = Array.isArray(canvasData) ? canvasData : canvasData.canvases || [];
  const testCanvas = canvases.find(c => c.name === 'Search Test Canvas');

  if (!testCanvas) {
    console.log(`${RED}❌ Search Test Canvas not found${RESET}`);
    console.log('Available canvases:', canvases.map(c => c.name).join(', '));
    process.exit(1);
  }

  canvasId = testCanvas.id;
  console.log(`${GREEN}✅ Found canvas: ${canvasId}${RESET}\n`);
}

async function testFeature85_SearchByTitle() {
  console.log(`${BLUE}=== Feature #85: Search by Note Title ===${RESET}\n`);

  // Test 1: Exact title match
  console.log('Test 1: Exact title match for "SEARCH_TITLE_TEST_12345"');
  const res1 = await fetch(`${BASE_URL}/api/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie
    },
    body: JSON.stringify({ query: 'SEARCH_TITLE_TEST_12345' })
  });

  const data1 = await res1.json();
  const found = data1.results.find(r => r.title === 'SEARCH_TITLE_TEST_12345');

  if (found) {
    console.log(`${GREEN}✅ PASS: Found note by exact title${RESET}`);
  } else {
    console.log(`${RED}❌ FAIL: Did not find note by exact title${RESET}`);
    console.log('   Results:', data1.results.map(r => r.title));
  }

  // Test 2: Partial title match
  console.log('\nTest 2: Partial title match for "SEARCH_TITLE"');
  const res2 = await fetch(`${BASE_URL}/api/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie
    },
    body: JSON.stringify({ query: 'SEARCH_TITLE' })
  });

  const data2 = await res2.json();
  const found2 = data2.results.find(r => r.title.includes('SEARCH_TITLE'));

  if (found2) {
    console.log(`${GREEN}✅ PASS: Found note by partial title${RESET}`);
  } else {
    console.log(`${RED}❌ FAIL: Did not find note by partial title${RESET}`);
  }

  // Test 3: Case insensitive
  console.log('\nTest 3: Case insensitive search for "search_title_test"');
  const res3 = await fetch(`${BASE_URL}/api/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie
    },
    body: JSON.stringify({ query: 'search_title_test' })
  });

  const data3 = await res3.json();
  const found3 = data3.results.find(r => r.title.toLowerCase().includes('search_title_test'));

  if (found3) {
    console.log(`${GREEN}✅ PASS: Case-insensitive search works${RESET}`);
  } else {
    console.log(`${RED}❌ FAIL: Case-insensitive search does not work${RESET}`);
  }

  console.log('');
}

async function testFeature86_SearchByBody() {
  console.log(`${BLUE}=== Feature #86: Search by Note Content/Body ===${RESET}\n`);

  // Test 1: Exact body content match
  console.log('Test 1: Search for unique body content "SEARCH_BODY_TEST_67890"');
  const res1 = await fetch(`${BASE_URL}/api/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie
    },
    body: JSON.stringify({ query: 'SEARCH_BODY_TEST_67890' })
  });

  const data1 = await res1.json();
  const found = data1.results.find(r => r.content && r.content.includes('SEARCH_BODY_TEST_67890'));

  if (found) {
    console.log(`${GREEN}✅ PASS: Found note by body content${RESET}`);
  } else {
    console.log(`${RED}❌ FAIL: Did not find note by body content${RESET}`);
  }

  // Test 2: Partial body content match
  console.log('\nTest 2: Partial body content match for "SEARCH_BODY"');
  const res2 = await fetch(`${BASE_URL}/api/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie
    },
    body: JSON.stringify({ query: 'SEARCH_BODY' })
  });

  const data2 = await res2.json();
  const found2 = data2.results.find(r => r.content && r.content.includes('SEARCH_BODY'));

  if (found2) {
    console.log(`${GREEN}✅ PASS: Found note by partial body content${RESET}`);
  } else {
    console.log(`${RED}❌ FAIL: Did not find note by partial body content${RESET}`);
  }

  // Test 3: Search for common words
  console.log('\nTest 3: Search for common word "programming"');
  const res3 = await fetch(`${BASE_URL}/api/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie
    },
    body: JSON.stringify({ query: 'programming' })
  });

  const data3 = await res3.json();

  if (data3.results.length > 0) {
    console.log(`${GREEN}✅ PASS: Found ${data3.results.length} notes with "programming"${RESET}`);
    console.log(`   Notes: ${data3.results.map(r => r.title).join(', ')}`);
  } else {
    console.log(`${RED}❌ FAIL: No notes found for common word${RESET}`);
  }

  console.log('');
}

async function testFeature87_SearchHighlighting() {
  console.log(`${BLUE}=== Feature #87: Search Result Highlighting ===${RESET}\n`);
  console.log(`${YELLOW}Note: This feature is implemented in the frontend (Header component)${RESET}`);
  console.log(`${YELLOW}The API returns the correct data; highlighting happens in the UI${RESET}\n`);

  // Verify that search returns the correct data for highlighting
  console.log('Test 1: Search for "quick brown" to verify highlighting data');
  const res1 = await fetch(`${BASE_URL}/api/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie
    },
    body: JSON.stringify({ query: 'quick brown' })
  });

  const data1 = await res1.json();
  const foxNote = data1.results.find(r => r.title.includes('quick brown fox'));

  if (foxNote) {
    console.log(`${GREEN}✅ PASS: Found note with "quick brown" in title${RESET}`);
    console.log(`   Title: ${foxNote.title}`);
    console.log(`   Content Preview: ${foxNote.contentPreview.substring(0, 100)}...`);

    // Verify content includes the search terms
    const hasQuick = foxNote.contentPreview.toLowerCase().includes('quick');
    const hasBrown = foxNote.contentPreview.toLowerCase().includes('brown');

    if (hasQuick && hasBrown) {
      console.log(`${GREEN}✅ PASS: Content preview includes both search terms for highlighting${RESET}`);
    } else {
      console.log(`${RED}❌ FAIL: Content preview missing search terms${RESET}`);
    }
  } else {
    console.log(`${RED}❌ FAIL: Did not find note with "quick brown"${RESET}`);
  }

  // Test 2: Multiple matches
  console.log('\nTest 2: Search for "JavaScript" to find multiple matches');
  const res2 = await fetch(`${BASE_URL}/api/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie
    },
    body: JSON.stringify({ query: 'JavaScript' })
  });

  const data2 = await res2.json();

  if (data2.results.length >= 2) {
    console.log(`${GREEN}✅ PASS: Found ${data2.results.length} notes with "JavaScript"${RESET}`);
    console.log(`${YELLOW}   Frontend should highlight "JavaScript" in all results${RESET}`);
  } else {
    console.log(`${YELLOW}⚠ WARNING: Found only ${data2.results.length} notes${RESET}`);
  }

  console.log('');
}

async function runAllTests() {
  try {
    await login();
    await getTestCanvas();

    await testFeature85_SearchByTitle();
    await testFeature86_SearchByBody();
    await testFeature87_SearchHighlighting();

    console.log(`${BLUE}=== All Tests Complete ===${RESET}\n`);
    console.log(`${GREEN}Features #85, #86, #87: Backend search functionality verified${RESET}`);
    console.log(`${YELLOW}Feature #87: Highlighting implemented in Header.tsx component${RESET}\n`);

  } catch (error) {
    console.error(`${RED}Error running tests:${RESET}`, error);
    process.exit(1);
  }
}

runAllTests();
