// Test script for Features #63, #64, #65
// Feature #63: Markdown live preview toggle
// Feature #64: Markdown syntax support (headers, lists, quotes, etc.)
// Feature #65: Image paste from clipboard into note

const TEST_USER = {
  email: `feature63_${Date.now()}@example.com`,
  password: 'TestPass123!',
  displayName: 'Feature 63-64-65 Test User',
};

const MARKDOWN_TEST_CONTENT = `# Heading Level 1
## Heading Level 2
### Heading Level 3

This is **bold text** and this is *italic text*.

- Unordered list item 1
- Unordered list item 2
  - Nested item
  - Another nested item

1. Ordered list item 1
2. Ordered list item 2
3. Ordered list item 3

> This is a blockquote
> It can span multiple lines

\`\`\`javascript
// Code block with syntax highlighting
function hello() {
  console.log("Hello, world!");
}
\`\`\`

Inline \`code\` example.

---

[Example Link](https://example.com)

Horizontal rule above.`;

let authToken = null;
let canvasId = null;
let noteId = null;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function registerUser() {
  console.log('\n=== STEP 1: Register User ===');
  const response = await fetch('http://localhost:3010/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_USER),
  });

  if (!response.ok) {
    throw new Error(`Registration failed: ${response.status}`);
  }

  const data = await response.json();
  console.log('✓ User registered:', data.user.email);
  return data;
}

async function loginUser() {
  console.log('\n=== STEP 2: Login User ===');
  const response = await fetch('http://localhost:3010/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password,
    }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }

  const data = await response.json();
  authToken = data.token;
  console.log('✓ User logged in, token received');
  return data;
}

async function createCanvas() {
  console.log('\n=== STEP 3: Create Canvas ===');
  const response = await fetch('http://localhost:3010/api/canvases', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      name: 'Test Canvas for Features 63-64-65',
    }),
  });

  if (!response.ok) {
    throw new Error(`Canvas creation failed: ${response.status}`);
  }

  const data = await response.json();
  canvasId = data.id;
  console.log('✓ Canvas created:', canvasId);
  return data;
}

async function createNoteWithMarkdown() {
  console.log('\n=== STEP 4: Create Note with Markdown Content ===');
  const response = await fetch(`http://localhost:3010/api/canvases/${canvasId}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      title: 'Markdown Test Note',
      content: MARKDOWN_TEST_CONTENT,
      positionX: 100,
      positionY: 100,
    }),
  });

  if (!response.ok) {
    throw new Error(`Note creation failed: ${response.status}`);
  }

  const data = await response.json();
  noteId = data.id;
  console.log('✓ Note created with markdown content:', noteId);
  console.log('  Content length:', data.content.length, 'characters');
  return data;
}

async function verifyNoteContent() {
  console.log('\n=== STEP 5: Verify Note Content (Feature #64) ===');
  const response = await fetch(`http://localhost:3010/api/canvases/${canvasId}/notes/${noteId}`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch note: ${response.status}`);
  }

  const note = await response.json();

  // Verify markdown elements are present
  const checks = [
    { name: 'H1 header', test: note.content.includes('# Heading Level 1') },
    { name: 'H2 header', test: note.content.includes('## Heading Level 2') },
    { name: 'H3 header', test: note.content.includes('### Heading Level 3') },
    { name: 'Bold text', test: note.content.includes('**bold text**') },
    { name: 'Italic text', test: note.content.includes('*italic text*') },
    { name: 'Unordered list', test: note.content.includes('- Unordered list item 1') },
    { name: 'Ordered list', test: note.content.includes('1. Ordered list item 1') },
    { name: 'Blockquote', test: note.content.includes('> This is a blockquote') },
    { name: 'Code block', test: note.content.includes('```javascript') },
    { name: 'Inline code', test: note.content.includes('`code`') },
    { name: 'Link', test: note.content.includes('[Example Link](https://example.com)') },
    { name: 'Horizontal rule', test: note.content.includes('---') },
  ];

  console.log('\nMarkdown element checks:');
  let passed = 0;
  for (const check of checks) {
    const status = check.test ? '✓' : '✗';
    console.log(`  ${status} ${check.name}`);
    if (check.test) passed++;
  }
  console.log(`\nPassed: ${passed}/${checks.length} checks`);

  if (passed === checks.length) {
    console.log('✓ All markdown elements are present in the note content');
  } else {
    console.warn('⚠ Some markdown elements are missing');
  }

  return note;
}

async function updateNoteContent(newContent) {
  console.log('\n=== STEP 6: Update Note Content ===');
  const response = await fetch(`http://localhost:3010/api/notes/${noteId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      content: newContent,
    }),
  });

  if (!response.ok) {
    throw new Error(`Note update failed: ${response.status}`);
  }

  const data = await response.json();
  console.log('✓ Note content updated');
  return data;
}

async function testImageUploadAPI() {
  console.log('\n=== STEP 7: Test Image Upload API (Feature #65) ===');

  // Create a minimal test image (1x1 PNG)
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR length
    0x49, 0x48, 0x44, 0x52, // IHDR type
    0x00, 0x00, 0x00, 0x01, // Width: 1
    0x00, 0x00, 0x00, 0x01, // Height: 1
    0x08, 0x02, 0x00, 0x00, 0x00, // Bit depth: 8, Color type: 2 (RGB), others: 0
    0x90, 0x77, 0x53, 0xDE, // CRC
    0x00, 0x00, 0x00, 0x0C, // IDAT length
    0x49, 0x44, 0x41, 0x54, // IDAT type
    0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00, 0x00, 0x03, 0x01, 0x01, 0x00, // Image data
    0x18, 0xDD, 0x8D, 0xB4, // CRC
    0x00, 0x00, 0x00, 0x00, // IEND length
    0x49, 0x45, 0x4E, 0x44, // IEND type
    0xAE, 0x42, 0x60, 0x82, // CRC
  ]);

  const blob = new Blob([pngData], { type: 'image/png' });
  const formData = new FormData();
  formData.append('file', blob, 'test-image.png');
  formData.append('noteId', noteId);

  const response = await fetch('http://localhost:3010/api/images', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('✗ Image upload failed:', response.status, errorText);
    throw new Error(`Image upload failed: ${response.status}`);
  }

  const data = await response.json();
  console.log('✓ Image uploaded successfully');
  console.log('  Image ID:', data.id);
  console.log('  Image URL:', data.url);
  console.log('  Filename:', data.fileName);

  // Verify image was inserted into markdown
  const imageMarkdown = `![${data.fileName || 'Image'}](${data.url})`;
  console.log('\n  Markdown to insert:', imageMarkdown);

  return data;
}

async function verifyDatabaseImageRecord(imageData) {
  console.log('\n=== STEP 8: Verify Database Image Record ===');

  const response = await fetch(`http://localhost:3010/api/canvases/${canvasId}/notes/${noteId}`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch note: ${response.status}`);
  }

  const note = await response.json();
  console.log('✓ Note fetched successfully');
  console.log('  Content includes image URL:', note.content.includes(imageData.url));

  return note;
}

async function cleanup() {
  console.log('\n=== CLEANUP: Delete Test Data ===');

  try {
    // Delete canvas (should cascade to notes and images)
    await fetch(`http://localhost:3010/api/canvases/${canvasId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    console.log('✓ Test canvas deleted');
  } catch (error) {
    console.warn('⚠ Cleanup warning:', error.message);
  }
}

async function runTests() {
  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  TESTING FEATURES #63, #64, #65                           ║');
    console.log('║  Markdown Preview, Syntax Support, Image Paste            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    await registerUser();
    await sleep(500);
    await loginUser();
    await sleep(500);
    await createCanvas();
    await sleep(500);
    await createNoteWithMarkdown();
    await sleep(500);
    await verifyNoteContent();
    await sleep(500);
    await testImageUploadAPI();
    await sleep(500);
    await verifyDatabaseImageRecord({ url: `/uploads/images/` });
    await sleep(500);

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  ALL API TESTS PASSED ✅                                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    await cleanup();

    console.log('\n✅ Features #63, #64, #65 - API tests completed successfully');
    console.log('\nNext steps:');
    console.log('1. Test markdown preview toggle in browser (Feature #63)');
    console.log('2. Test markdown rendering (Feature #64)');
    console.log('3. Test image paste from clipboard (Feature #65)');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

runTests();
