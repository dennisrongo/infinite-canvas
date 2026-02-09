/**
 * Feature #81: Browser-based XSS Protection Test
 * Tests that XSS payloads don't execute in the browser
 */

const BASE_URL = 'http://localhost:3010';

const XSS_TEST_CASES = [
  {
    name: 'Script tag',
    payload: '<script>alert("XSS")</script>',
    shouldExecute: false,
  },
  {
    name: 'Image onerror',
    payload: '<img src=x onerror=alert(1)>',
    shouldExecute: false,
  },
  {
    name: 'SVG onload',
    payload: '<svg onload=alert(1)>test</svg>',
    shouldExecute: false,
  },
  {
    name: 'Iframe',
    payload: '<iframe src="javascript:alert(1)"></iframe>',
    shouldExecute: false,
  },
  {
    name: 'Javascript href',
    payload: '<a href="javascript:alert(1)">click</a>',
    shouldExecute: false,
  },
  {
    name: 'Onclick attribute',
    payload: '<div onclick="alert(1)">click me</div>',
    shouldExecute: false,
  },
  {
    name: 'Style tag',
    payload: '<style>@import "javascript:alert(1)";</style>',
    shouldExecute: false,
  },
  {
    name: 'Mixed HTML and script',
    payload: 'Hello <b>world</b> <script>alert("XSS")</script>',
    shouldExecute: false,
  },
];

async function loginAndGetToken(page) {
  // Navigate to login page
  await page.goto(`${BASE_URL}/login`);

  // Fill in login form
  await page.fill('input[type="email"]', 'test_xss_user@example.com');
  await page.fill('input[type="password"]', 'Test1234!@#');

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for navigation to dashboard
  await page.waitForURL('**/dashboard', { timeout: 5000 });

  // Get token from localStorage
  const token = await page.evaluate(() => {
    return localStorage.getItem('token');
  });

  return token;
}

async function createNote(page, token, title, content) {
  // Create a canvas first if needed
  const response = await page.evaluate(async ({ BASE_URL, token }) => {
    const canvasesRes = await fetch(`${BASE_URL}/api/canvases`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!canvasesRes.ok) {
      return { error: 'Failed to fetch canvases' };
    }

    const canvasesData = await canvasesRes.json();
    let canvasId;

    if (canvasesData.canvases && canvasesData.canvases.length > 0) {
      canvasId = canvasesData.canvases[0].id;
    } else {
      // Create canvas
      const createRes = await fetch(`${BASE_URL}/api/canvases`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'XSS Test Canvas', folderId: null }),
      });

      if (!createRes.ok) {
        return { error: 'Failed to create canvas' };
      }

      const createData = await createRes.json();
      canvasId = createData.canvas.id;
    }

    // Create note
    const noteRes = await fetch(`${BASE_URL}/api/canvases/${canvasId}/notes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        content,
        positionX: 100,
        positionY: 100,
        width: 300,
        height: 200,
      }),
    });

    if (!noteRes.ok) {
      const errorData = await noteRes.json();
      return { error: errorData.error || 'Failed to create note' };
    }

    const noteData = await noteRes.json();
    return { success: true, note: noteData.note, canvasId };
  }, { BASE_URL, token });

  return response;
}

async function testXSSInBrowser(page, token) {
  console.log('\n=== Testing XSS Protection in Browser ===\n');

  let passed = 0;
  let failed = 0;

  for (const testCase of XSS_TEST_CASES) {
    console.log(`Testing: ${testCase.name}`);
    console.log(`  Payload: ${testCase.payload.substring(0, 60)}...`);

    // Create note with XSS payload
    const result = await createNote(
      page,
      token,
      `XSS Test - ${testCase.name}`,
      testCase.payload
    );

    if (!result.success) {
      console.error(`  ❌ Failed to create note: ${result.error}`);
      failed++;
      continue;
    }

    // Navigate to the canvas
    await page.goto(`${BASE_URL}/canvas/${result.canvasId}`);
    await page.waitForTimeout(2000); // Wait for canvas to load

    // Try to open the note editor
    const noteElement = await page.$(`text=${result.note.title}`);
    if (!noteElement) {
      console.error(`  ❌ Could not find note in canvas`);
      failed++;
      continue;
    }

    // Double-click to open editor
    await noteElement.dblclick();
    await page.waitForTimeout(1000);

    // Switch to preview mode
    const previewButton = await page.$('button:has-text("Preview")');
    if (previewButton) {
      await previewButton.click();
      await page.waitForTimeout(1000);
    }

    // Check for alerts (XSS execution)
    let alertTriggered = false;

    page.on('dialog', async (dialog) => {
      console.log(`  ⚠️  Alert triggered: ${dialog.message()}`);
      alertTriggered = true;
      await dialog.dismiss();
    });

    // Wait a bit to see if alert triggers
    await page.waitForTimeout(2000);

    // Close the editor
    const closeButton = await page.$('button[aria-label="Close"]');
    if (closeButton) {
      await closeButton.click();
    }

    if (alertTriggered) {
      console.error(`  ❌ XSS EXECUTED! Payload was not sanitized!`);
      failed++;
    } else {
      console.log(`  ✅ No alert triggered - XSS prevented`);
      passed++;
    }

    // Cleanup
    await page.evaluate(async ({ BASE_URL, token, noteId }) => {
      await fetch(`${BASE_URL}/api/notes/${noteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
    }, { BASE_URL, token, noteId: result.note.id });
  }

  console.log('\n=== Test Results ===');
  console.log(`✅ Passed: ${passed}/${XSS_TEST_CASES.length}`);
  console.log(`❌ Failed: ${failed}/${XSS_TEST_CASES.length}`);
  console.log(`Success Rate: ${((passed / XSS_TEST_CASES.length) * 100).toFixed(1)}%`);

  return { passed, failed };
}

async function runBrowserTest() {
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Login first
    console.log('Logging in...');
    const token = await loginAndGetToken(page);

    if (!token) {
      console.error('Failed to login');
      return;
    }

    console.log('Login successful');

    // Run XSS tests
    const results = await testXSSInBrowser(page, token);

    if (results.failed > 0) {
      console.error('\n⚠️  Some XSS payloads EXECUTED!');
      process.exit(1);
    } else {
      console.log('\n✅ All XSS payloads were prevented!');
      process.exit(0);
    }
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runBrowserTest();
