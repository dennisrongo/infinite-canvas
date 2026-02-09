/**
 * Test script for Features #60, #61, #62
 * Rich text toolbar, font family selector, and font size adjustment
 */

const BASE_URL = 'http://localhost:40000';

// Test credentials
const testUser = {
  email: `test_${Date.now()}@example.com`,
  password: 'Test1234!@#',
  displayName: 'Font Test User'
};

let authToken;
let canvasId;
let noteId;

/**
 * Helper function to make API requests
 */
async function api(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
    ...options.headers
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  return {
    ok: response.ok,
    status: response.status,
    data: response.ok ? await response.json() : await response.text()
  };
}

/**
 * Step 1: Register and login
 */
async function setupUser() {
  console.log('\n=== Step 1: Register and Login ===');

  // Register
  const registerRes = await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      ...testUser,
      confirmPassword: testUser.password
    })
  });

  if (!registerRes.ok) {
    console.error('❌ Registration failed:', registerRes.data);
    return false;
  }
  console.log('✅ User registered');

  // Login
  const loginRes = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: testUser.email,
      password: testUser.password
    })
  });

  if (!loginRes.ok) {
    console.error('❌ Login failed:', loginRes.data);
    return false;
  }

  authToken = loginRes.data.token;
  console.log('✅ User logged in');
  return true;
}

/**
 * Step 2: Create a canvas
 */
async function createCanvas() {
  console.log('\n=== Step 2: Create Canvas ===');

  const res = await api('/api/canvases', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Font Test Canvas'
    })
  });

  if (!res.ok) {
    console.error('❌ Canvas creation failed:', res.data);
    return false;
  }

  canvasId = res.data.canvas.id;
  console.log('✅ Canvas created:', canvasId);
  return true;
}

/**
 * Step 3: Create a note
 */
async function createNote() {
  console.log('\n=== Step 3: Create Note ===');

  const res = await api(`/api/canvases/${canvasId}/notes`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'Font Test Note',
      content: 'This is a test note for font settings',
      positionX: 100,
      positionY: 100,
      width: 300,
      height: 200
    })
  });

  if (!res.ok) {
    console.error('❌ Note creation failed:', res.data);
    return false;
  }

  noteId = res.data.note.id;
  console.log('✅ Note created:', noteId);
  console.log('   Initial font family:', res.data.note.fontFamily || 'not set');
  console.log('   Initial font size:', res.data.note.fontSize || 'not set');
  return true;
}

/**
 * Feature #60: Test rich text toolbar (bold, italic, underline)
 */
async function testFeature60_RichTextToolbar() {
  console.log('\n=== Feature #60: Rich Text Toolbar ===');

  // Test: Update content with bold markdown
  const boldRes = await api(`/api/notes/${noteId}`, {
    method: 'PUT',
    body: JSON.stringify({
      content: 'This is **bold text** and this is normal'
    })
  });

  if (!boldRes.ok) {
    console.error('❌ Bold content update failed:', boldRes.data);
    return false;
  }
  console.log('✅ Bold markdown saved:', boldRes.data.note.content);

  // Test: Update content with italic markdown
  const italicRes = await api(`/api/notes/${noteId}`, {
    method: 'PUT',
    body: JSON.stringify({
      content: 'This is *italic text* and this is normal'
    })
  });

  if (!italicRes.ok) {
    console.error('❌ Italic content update failed:', italicRes.data);
    return false;
  }
  console.log('✅ Italic markdown saved:', italicRes.data.note.content);

  // Test: Update content with underline HTML
  const underlineRes = await api(`/api/notes/${noteId}`, {
    method: 'PUT',
    body: JSON.stringify({
      content: 'This is <u>underlined text</u> and this is normal'
    })
  });

  if (!underlineRes.ok) {
    console.error('❌ Underline content update failed:', underlineRes.data);
    return false;
  }
  console.log('✅ Underline HTML saved:', underlineRes.data.note.content);

  // Test: Combined formatting
  const combinedRes = await api(`/api/notes/${noteId}`, {
    method: 'PUT',
    body: JSON.stringify({
      content: 'This is **bold and *italic*** and <u>underlined</u>'
    })
  });

  if (!combinedRes.ok) {
    console.error('❌ Combined formatting failed:', combinedRes.data);
    return false;
  }
  console.log('✅ Combined formatting saved:', combinedRes.data.note.content);

  return true;
}

/**
 * Feature #61: Test font family selector
 */
async function testFeature61_FontFamily() {
  console.log('\n=== Feature #61: Font Family Selector ===');

  const fontFamilies = [
    'Inter',
    'Arial, sans-serif',
    'Georgia, serif',
    'Courier New, monospace'
  ];

  for (const font of fontFamilies) {
    const res = await api(`/api/notes/${noteId}`, {
      method: 'PUT',
      body: JSON.stringify({
        fontFamily: font
      })
    });

    if (!res.ok) {
      console.error(`❌ Font family update failed for ${font}:`, res.data);
      return false;
    }

    console.log(`✅ Font family set to: ${res.data.note.fontFamily}`);
  }

  // Verify persistence
  const getRes = await api(`/api/canvases/${canvasId}`);

  if (!getRes.ok) {
    console.error('❌ Canvas fetch failed:', getRes.data);
    return false;
  }

  const note = getRes.data.canvas.notes.find(n => n.id === noteId);
  if (!note || note.fontFamily !== 'Courier New, monospace') {
    console.error('❌ Font family not persisted correctly');
    console.error('   Expected: Courier New, monospace');
    console.error('   Got:', note?.fontFamily);
    return false;
  }

  console.log('✅ Font family persisted correctly:', note.fontFamily);
  return true;
}

/**
 * Feature #62: Test font size adjustment
 */
async function testFeature62_FontSize() {
  console.log('\n=== Feature #62: Font Size Adjustment ===');

  const fontSizes = [12, 14, 16, 18, 20, 24, 28, 32];

  for (const size of fontSizes) {
    const res = await api(`/api/notes/${noteId}`, {
      method: 'PUT',
      body: JSON.stringify({
        fontSize: size
      })
    });

    if (!res.ok) {
      console.error(`❌ Font size update failed for ${size}px:`, res.data);
      return false;
    }

    console.log(`✅ Font size set to: ${res.data.note.fontSize}px`);
  }

  // Verify persistence
  const getRes = await api(`/api/canvases/${canvasId}`);

  if (!getRes.ok) {
    console.error('❌ Canvas fetch failed:', getRes.data);
    return false;
  }

  const note = getRes.data.canvas.notes.find(n => n.id === noteId);
  if (!note || note.fontSize !== 32) {
    console.error('❌ Font size not persisted correctly');
    console.error('   Expected: 32');
    console.error('   Got:', note?.fontSize);
    return false;
  }

  console.log('✅ Font size persisted correctly:', note.fontSize, 'px');
  return true;
}

/**
 * Test combined font settings
 */
async function testCombinedSettings() {
  console.log('\n=== Test Combined Font Settings ===');

  const res = await api(`/api/notes/${noteId}`, {
    method: 'PUT',
    body: JSON.stringify({
      content: 'Combined test: **bold**, *italic*, <u>underline</u>',
      fontFamily: 'Georgia, serif',
      fontSize: 18
    })
  });

  if (!res.ok) {
    console.error('❌ Combined settings update failed:', res.data);
    return false;
  }

  console.log('✅ All settings saved together:');
  console.log('   Content:', res.data.note.content);
  console.log('   Font family:', res.data.note.fontFamily);
  console.log('   Font size:', res.data.note.fontSize, 'px');

  return true;
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Testing Features #60, #61, #62                            ║');
  console.log('║  Rich Text Toolbar, Font Family, Font Size                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // Setup
    if (!await setupUser()) return;
    if (!await createCanvas()) return;
    if (!await createNote()) return;

    // Test features
    const f60 = await testFeature60_RichTextToolbar();
    const f61 = await testFeature61_FontFamily();
    const f62 = await testFeature62_FontSize();
    const combined = await testCombinedSettings();

    // Summary
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  TEST SUMMARY                                              ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`Feature #60 (Rich Text Toolbar):  ${f60 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Feature #61 (Font Family):        ${f61 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Feature #62 (Font Size):          ${f62 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Combined Settings:                ${combined ? '✅ PASS' : '❌ FAIL'}`);
    console.log('╔════════════════════════════════════════════════════════════╗');

    if (f60 && f61 && f62 && combined) {
      console.log('║  ✅ ALL TESTS PASSED!                                      ║');
    } else {
      console.log('║  ❌ SOME TESTS FAILED                                      ║');
    }
    console.log('╚════════════════════════════════════════════════════════════╝');

  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
  }
}

// Run tests
runTests();
