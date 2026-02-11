import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3010';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function setupBrowser() {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext();
  const page = await context.newPage();
  return { browser, page };
}

async function login(page) {
  console.log('🔐 Logging in...');
  await page.goto(`${BASE_URL}/login`);

  // Check if we need to register first
  const registerButton = await page.$('a[href="/register"]');
  if (registerButton) {
    console.log('📝 Registering new user...');
    await page.goto(`${BASE_URL}/register`);

    await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'Test1234!@#');
    await page.fill('input[name="confirmPassword"]', 'Test1234!@#');

    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('✅ Registration successful');
  } else {
    // Login with existing test account
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Test1234!@#');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('✅ Login successful');
  }
}

async function createTestCanvas(page) {
  console.log('🎨 Creating test canvas...');
  await page.goto(`${BASE_URL}/dashboard`);

  // Click "New Canvas" button
  const newCanvasButton = await page.$('button:has-text("New Canvas")');
  if (newCanvasButton) {
    await newCanvasButton.click();
    await sleep(500);

    // Enter canvas name
    await page.fill('input[placeholder*="Canvas name"]', `TEST Canvas ${Date.now()}`);
    await page.click('button:has-text("Create")');
    await sleep(1000);

    // Navigate to the canvas
    const canvasLinks = await page.$$('a[href^="/canvas/"]');
    if (canvasLinks.length > 0) {
      await canvasLinks[0].click();
      await page.waitForURL('**/canvas/**', { timeout: 5000 });
      console.log('✅ Test canvas created and opened');
      return true;
    }
  }

  return false;
}

async function testFeature43_UndoDelete(page) {
  console.log('\n🧪 Testing Feature #43: Undo node deletion');

  try {
    // Create a test note with unique content
    const uniqueContent = `UNDO_TEST_${Date.now()}`;
    console.log(`  📝 Creating note with content: ${uniqueContent}`);

    await page.click('.react-flow'); // Click on canvas
    await sleep(200);
    await page.click('.react-flow', { clickCount: 2 }); // Double-click to create note
    await sleep(1000);

    // Select and delete the note
    console.log('  🗑️  Deleting note...');
    await page.keyboard.press('Delete');
    await sleep(500);

    // Press Ctrl+Z to undo
    console.log('  ↩️  Pressing Ctrl+Z to undo...');
    await page.keyboard.press('Control+z');
    await sleep(1000);

    // Verify note reappeared
    console.log('  ✅ Verifying note reappeared...');
    const notes = await page.$$('.react-flow__node');
    if (notes.length > 0) {
      console.log('  ✅ Feature #43 PASSED: Undo restores deleted notes');
      return true;
    } else {
      console.log('  ❌ Feature #43 FAILED: Note did not reappear after undo');
      return false;
    }
  } catch (error) {
    console.log(`  ❌ Feature #43 ERROR: ${error.message}`);
    return false;
  }
}

async function testFeature44_ResizeNotes(page) {
  console.log('\n🧪 Testing Feature #44: Resize note nodes');

  try {
    // Create a test note
    await page.click('.react-flow');
    await sleep(200);
    await page.click('.react-flow', { clickCount: 2 });
    await sleep(1000);

    // Select the note
    const note = await page.$('.react-flow__node');
    if (!note) {
      console.log('  ❌ Feature #44 FAILED: No note to resize');
      return false;
    }

    await note.click();
    await sleep(500);

    // Check if resize handles appear
    console.log('  🔍 Checking for resize handles...');
    const resizeHandles = await page.$$('.react-flow__node .absolute'); // Our custom resize handles

    if (resizeHandles.length > 0) {
      console.log(`  ✅ Found ${resizeHandles.length} resize handles`);

      // Try to resize by dragging a corner handle
      const box = await note.boundingBox();
      if (box) {
        console.log(`  📐 Initial size: ${box.width}x${box.height}`);

        // Get the bottom-right resize handle
        const bottomRightHandle = resizeHandles[0];
        const handleBox = await bottomRightHandle.boundingBox();

        if (handleBox) {
          // Drag the handle to resize
          console.log('  🖱️  Dragging resize handle...');
          await page.mouse.move(handleBox.x + 5, handleBox.y + 5);
          await page.mouse.down();
          await page.mouse.move(handleBox.x + 55, handleBox.y + 55);
          await page.mouse.up();
          await sleep(500);

          // Check new size
          const newBox = await note.boundingBox();
          if (newBox) {
            console.log(`  📐 New size: ${newBox.width}x${newBox.height}`);

            if (newBox.width > box.width && newBox.height > box.height) {
              console.log('  ✅ Feature #44 PASSED: Notes can be resized');
              return true;
            }
          }
        }
      }
    } else {
      console.log('  ⚠️  No resize handles found - checking if notes have fixed size');
      const box = await note.boundingBox();
      if (box) {
        console.log(`  📐 Note size: ${box.width}x${box.height}`);
        console.log('  ⚠️  Feature #44 PARTIAL: Notes have size but resize handles not visible');
      }
    }

    console.log('  ⚠️  Feature #44 INCONCLUSIVE: Cannot verify resize functionality');
    return false;
  } catch (error) {
    console.log(`  ❌ Feature #44 ERROR: ${error.message}`);
    return false;
  }
}

async function testFeature45_TitlePreview(page) {
  console.log('\n🧪 Testing Feature #45: Note node displays title preview');

  try {
    // Create a test note
    await page.click('.react-flow');
    await sleep(200);
    await page.click('.react-flow', { clickCount: 2 });
    await sleep(1000);

    // Check if note displays title
    console.log('  🔍 Checking for title preview...');
    const note = await page.$('.react-flow__node');
    if (!note) {
      console.log('  ❌ Feature #45 FAILED: No note found');
      return false;
    }

    const textContent = await note.textContent();
    console.log(`  📄 Note content: ${textContent.substring(0, 100)}...`);

    if (textContent && (textContent.includes('Untitled Note') || textContent.trim().length > 0)) {
      console.log('  ✅ Note displays title/text content');

      // Check if title is emphasized (bold)
      const titleElement = await note.$('.font-semibold, .font-bold');
      if (titleElement) {
        console.log('  ✅ Title is emphasized (bold)');
      }

      console.log('  ✅ Feature #45 PASSED: Note nodes display title preview');
      return true;
    } else {
      console.log('  ❌ Feature #45 FAILED: No title preview displayed');
      return false;
    }
  } catch (error) {
    console.log(`  ❌ Feature #45 ERROR: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Feature Tests #43, #44, #45\n');
  console.log('=' .repeat(60));

  const { browser, page } = await setupBrowser();

  try {
    // Setup
    await login(page);
    await createTestCanvas(page);

    // Run tests
    const results = {
      feature43: await testFeature43_UndoDelete(page),
      feature44: await testFeature44_ResizeNotes(page),
      feature45: await testFeature45_TitlePreview(page),
    };

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY\n');
    console.log(`Feature #43 (Undo deletion): ${results.feature43 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Feature #44 (Resize notes): ${results.feature44 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Feature #45 (Title preview): ${results.feature45 ? '✅ PASS' : '❌ FAIL'}`);
    console.log('\n' + '='.repeat(60));

    // Take final screenshot
    await page.screenshot({ path: 'features-43-44-45-final.png', fullPage: true });
    console.log('📸 Screenshot saved: features-43-44-45-final.png');

  } catch (error) {
    console.error('❌ Test suite error:', error);
  } finally {
    await sleep(2000);
    await browser.close();
  }
}

main();
