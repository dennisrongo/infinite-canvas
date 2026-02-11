/**
 * Test script for Features #66, #67, #68
 * Feature #66: Image rendering in markdown preview
 * Feature #67: Code block creation with syntax highlighting
 * Feature #68: Code block language selection
 */

const BASE_URL = 'http://localhost:4002';
const TEST_USER = {
  email: 'features66@example.com',
  password: 'Test1234!@#$',
};

let testCanvasId = null;
let testNoteId = null;
let authToken = null;

async function login() {
  console.log('\n=== Logging in ===');
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_USER),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }

  const data = await response.json();
  authToken = data.token;
  console.log('✅ Logged in successfully');
  return data.token;
}

async function getOrCreateTestCanvas() {
  console.log('\n=== Getting/Creating test canvas ===');

  // Get all canvases
  const response = await fetch(`${BASE_URL}/api/canvases`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to get canvases: ${response.status}`);
  }

  const canvases = await response.json();

  // Look for existing test canvas
  const existingCanvas = canvases.find(c => c.name === 'Features 66-67-68 Test Canvas');

  if (existingCanvas) {
    testCanvasId = existingCanvas.id;
    console.log(`✅ Found existing test canvas: ${testCanvasId}`);
    return existingCanvas;
  }

  // Create new test canvas
  const createResponse = await fetch(`${BASE_URL}/api/canvases`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Features 66-67-68 Test Canvas',
      folderId: null,
    }),
  });

  if (!createResponse.ok) {
    throw new Error(`Failed to create canvas: ${createResponse.status}`);
  }

  const newCanvas = await createResponse.json();
  testCanvasId = newCanvas.id;
  console.log(`✅ Created new test canvas: ${testCanvasId}`);
  return newCanvas;
}

async function createTestNote() {
  console.log('\n=== Creating test note ===');

  const response = await fetch(`${BASE_URL}/api/canvases/${testCanvasId}/notes`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'Test Note for Features 66-67-68',
      content: '',
      positionX: 100,
      positionY: 100,
      width: 400,
      height: 300,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create note: ${response.status}`);
  }

  const note = await response.json();
  testNoteId = note.id;
  console.log(`✅ Created test note: ${testNoteId}`);
  return note;
}

async function testFeature66_ImageRendering() {
  console.log('\n========================================');
  console.log('TESTING FEATURE #66: Image Rendering');
  console.log('========================================');

  // Create a markdown content with image reference
  // Note: We can't actually upload images via API test, but we can verify
  // that the markdown structure supports image rendering

  const imageMarkdown = `# Image Test

This is a test note for image rendering.

![Sample Image](https://via.placeholder.com/300x200.png)

The image above should render correctly in preview mode.

## Multiple Images Test

![Image 1](https://via.placeholder.com/150x150.png)
![Image 2](https://via.placeholder.com/150x150.png)

## Image with Text

Here's some text after an image:
![Small Image](https://via.placeholder.com/100x50.png)

And here's some text after it.

## Image Size Test

![Large Image](https://via.placeholder.com/600x400.png)

This large image should be appropriately sized and not break the layout.
`;

  const response = await fetch(`${BASE_URL}/api/notes/${testNoteId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: imageMarkdown,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update note: ${response.status}`);
  }

  console.log('✅ Updated note with image markdown content');
  console.log('⚠️  Note: Actual image rendering must be verified via browser test');
  console.log('   - The markdown structure supports ![alt](url) syntax');
  console.log('   - ReactMarkdown will render these as <img> tags');
  console.log('   - Images should be sized via CSS max-width: 100%');
  return true;
}

async function testFeature67_CodeBlockCreation() {
  console.log('\n========================================');
  console.log('TESTING FEATURE #67: Code Block Creation');
  console.log('========================================');

  const codeBlockMarkdown = `# Code Block Test

## JavaScript Code

\`\`\`javascript
function hello() {
  console.log('Hello, World!');
  return true;
}

const arr = [1, 2, 3];
arr.map(x => x * 2);
\`\`\`

## Python Code

\`\`\`python
def greet(name):
    return f"Hello, {name}!"

users = ['Alice', 'Bob']
for user in users:
    print(greet(user))
\`\`\`

## CSS Code

\`\`\`css
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(90deg, #ff0000, #00ff00);
}
\`\`\`

## Code with Indentation

\`\`\`javascript
const deeply = {
  nested: {
    object: {
      value: 123
    }
  }
};
\`\`\`

## Inline Markdown with Code

This is a paragraph with **bold** and *italic* text.

\`\`\`javascript
console.log('code block');
\`\`\`

More text after the code block.
`;

  const response = await fetch(`${BASE_URL}/api/notes/${testNoteId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: codeBlockMarkdown,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update note: ${response.status}`);
  }

  console.log('✅ Updated note with code block markdown');
  console.log('⚠️  Note: Actual syntax highlighting must be verified via browser test');
  console.log('   - rehype-highlight plugin should apply syntax highlighting');
  console.log('   - Code blocks should have distinct background');
  console.log('   - Keywords should be colored differently');
  return true;
}

async function testFeature68_LanguageSelection() {
  console.log('\n========================================');
  console.log('TESTING FEATURE #68: Language Selection');
  console.log('========================================');

  const languageTestMarkdown = `# Language Selection Test

## JavaScript (should highlight JS syntax)

\`\`\`javascript
const add = (a, b) => a + b;
class Person {
  constructor(name) {
    this.name = name;
  }
}
\`\`\`

## Python (should highlight Python syntax)

\`\`\`python
def calculate(x, y):
    return x ** y

class Animal:
    def __init__(self, name):
        self.name = name
\`\`\`

## HTML (should highlight HTML tags)

\`\`\`html
<!DOCTYPE html>
<html>
  <body>
    <h1>Hello World</h1>
    <p class="text">Paragraph</p>
  </body>
</html>
\`\`\`

## CSS (should highlight CSS properties)

\`\`\`css
.button {
  background-color: #3b82f6;
  padding: 10px 20px;
  border-radius: 5px;
}
\`\`\`

## No Language (should still render in monospace)

\`\`\`
This code has no language specified.
It should still be in a code block.
Monospace font should be applied.
\`\`\`

## Unsupported Language (should still work)

\`\`\`rust
fn main() {
    println!("Hello!");
}
\`\`\`
`;

  const response = await fetch(`${BASE_URL}/api/notes/${testNoteId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: languageTestMarkdown,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update note: ${response.status}`);
  }

  console.log('✅ Updated note with language-specific code blocks');
  console.log('⚠️  Note: Actual language-specific highlighting must be verified via browser');
  console.log('   - Different languages should have appropriate highlighting');
  console.log('   - JavaScript: keywords (const, function, class) highlighted');
  console.log('   - Python: keywords (def, class) highlighted');
  console.log('   - HTML/SS: tags and properties highlighted');
  console.log('   - No language: monospace font, no highlighting');
  return true;
}

async function runTests() {
  try {
    console.log('================================================');
    console.log('FEATURES #66, #67, #68 API TEST');
    console.log('================================================');

    await login();
    await getOrCreateTestCanvas();
    await createTestNote();

    await testFeature66_ImageRendering();
    await testFeature67_CodeBlockCreation();
    await testFeature68_LanguageSelection();

    console.log('\n========================================');
    console.log('✅ ALL API TESTS PASSED');
    console.log('========================================');
    console.log('\nNext Steps:');
    console.log('1. Open browser to http://localhost:4002');
    console.log('2. Login as feature49@example.com');
    console.log('3. Open canvas "Features 66-67-68 Test Canvas"');
    console.log('4. Double-click the test note to open editor');
    console.log('5. Click "Preview" button to see rendered content');
    console.log('6. Verify images render correctly');
    console.log('7. Verify code blocks have syntax highlighting');
    console.log('8. Verify different languages have appropriate highlighting');
    console.log('\nNote Details:');
    console.log(`- Canvas ID: ${testCanvasId}`);
    console.log(`- Note ID: ${testNoteId}`);

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    process.exit(1);
  }
}

runTests();
