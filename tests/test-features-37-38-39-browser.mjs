/**
 * Comprehensive Browser Automation Test for Features #37, #38, #39
 *
 * This script uses Playwright to verify:
 * - Feature #37: Click and drag to pan canvas
 * - Feature #38: Create note by double-clicking
 * - Feature #39: Drag note nodes to reposition
 */

const { chromium } = require('playwright');

async function testCanvasFeatures() {
  console.log('🎨 Starting Browser Automation Test for Features #37, #38, #39\n');

  let browser;
  let page;
  let allPassed = true;

  try {
    // Launch browser
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    page = await context.newPage();

    // Test credentials
    const testEmail = `feature37-38-39-${Date.now()}@example.com`;
    const testPassword = 'TestPass123!';

    // Step 1: Register and login
    console.log('Step 1: Registering test user...');
    await page.goto('http://localhost:3000/register');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Step 2: Create a test canvas
    console.log('\nStep 2: Creating test canvas...');
    const canvasName = `Canvas_Features_37-38-39_${Date.now()}`;
    await page.click('button:has-text("New Canvas")');
    await page.fill('input[placeholder*="Canvas name"]', canvasName);
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(1000);

    // Navigate to the canvas
    const canvasLink = await page.locator(`a:has-text("${canvasName}")`).first();
    await canvasLink.click();
    await page.waitForURL('**/canvas/**');
    await page.waitForTimeout(2000); // Wait for ReactFlow to initialize

    console.log('✅ Navigated to canvas');

    // FEATURE #37: Test panning
    console.log('\n' + '='.repeat(60));
    console.log('FEATURE #37: Click and drag to pan canvas');
    console.log('='.repeat(60));

    console.log('\nTest: Pan canvas by dragging...');

    // Get initial viewport state
    const initialViewport = await page.evaluate(() => {
      const reactFlowWrapper = document.querySelector('.react-flow');
      if (reactFlowWrapper) {
        const transform = reactFlowWrapper.style.transform;
        return transform;
      }
      return null;
    });

    // Find the canvas pane (background)
    const canvasPane = page.locator('.react-flow__pane').first();

    // Drag to pan (click and drag on empty space)
    await canvasPane.click({ position: { x: 400, y: 300 } });
    await page.mouse.down();
    await page.mouse.move(300, 200);
    await page.waitForTimeout(500);
    await page.mouse.up();

    await page.waitForTimeout(1000);

    // Check if canvas panned
    const pannedViewport = await page.evaluate(() => {
      const reactFlowWrapper = document.querySelector('.react-flow');
      if (reactFlowWrapper) {
        return reactFlowWrapper.style.transform;
      }
      return null;
    });

    if (pannedViewport && pannedViewport !== initialViewport) {
      console.log('✅ Canvas panned successfully');
      console.log(`   Initial: ${initialViewport}`);
      console.log(`   After pan: ${pannedViewport}`);
    } else {
      console.log('❌ Canvas did not pan');
      allPassed = false;
    }

    // FEATURE #38: Test double-click to create note
    console.log('\n' + '='.repeat(60));
    console.log('FEATURE #38: Create note by double-clicking');
    console.log('='.repeat(60));

    console.log('\nTest: Double-click to create note...');

    // Count initial notes
    const initialNoteCount = await page.locator('.react-flow__node').count();
    console.log(`   Initial note count: ${initialNoteCount}`);

    // Double-click on canvas to create note
    await canvasPane.dblclick({ position: { x: 500, y: 400 } });
    await page.waitForTimeout(2000); // Wait for note to be created and rendered

    // Check if new note appeared
    const newNoteCount = await page.locator('.react-flow__node').count();
    console.log(`   After double-click note count: ${newNoteCount}`);

    if (newNoteCount === initialNoteCount + 1) {
      console.log('✅ Note created by double-click');

      // Check note title
      const noteTitle = await page.locator('.react-flow__node').first().locator('text=/Untitled/i').count();
      if (noteTitle > 0) {
        console.log('✅ Note has default title "Untitled Note"');
      }

    } else {
      console.log('❌ Note not created by double-click');
      allPassed = false;
    }

    // FEATURE #39: Test dragging note
    console.log('\n' + '='.repeat(60));
    console.log('FEATURE #39: Drag note nodes to reposition');
    console.log('='.repeat(60));

    console.log('\nTest: Drag note to new position...');

    // Get a note element
    const note = page.locator('.react-flow__node').first();

    // Get initial position
    const initialPosition = await note.boundingBox();
    console.log(`   Initial position: x=${Math.round(initialPosition.x)}, y=${Math.round(initialPosition.y)}`);

    // Drag the note
    await note.dragTo(page.locator('.react-flow__pane'), {
      targetPosition: { x: 600, y: 500 }
    });

    await page.waitForTimeout(1500);

    // Get new position
    const newPosition = await note.boundingBox();
    console.log(`   After drag position: x=${Math.round(newPosition.x)}, y=${Math.round(newPosition.y)}`);

    if (Math.abs(newPosition.x - initialPosition.x) > 10 ||
        Math.abs(newPosition.y - initialPosition.y) > 10) {
      console.log('✅ Note moved to new position');
      console.log(`   Moved: x=${Math.round(newPosition.x - initialPosition.x)}, y=${Math.round(newPosition.y - initialPosition.y)}`);
    } else {
      console.log('❌ Note did not move');
      allPassed = false;
    }

    // Test persistence - refresh page
    console.log('\nTest: Verify position persistence after refresh...');
    const positionBeforeRefresh = { ...newPosition };

    await page.reload();
    await page.waitForTimeout(2000);

    const noteAfterRefresh = page.locator('.react-flow__node').first();
    const positionAfterRefresh = await noteAfterRefresh.boundingBox();

    if (Math.abs(positionAfterRefresh.x - positionBeforeRefresh.x) < 5 &&
        Math.abs(positionAfterRefresh.y - positionBeforeRefresh.y) < 5) {
      console.log('✅ Note position persisted after refresh');
    } else {
      console.log('⚠️  Note position changed after refresh');
      console.log(`   Before: x=${Math.round(positionBeforeRefresh.x)}, y=${Math.round(positionBeforeRefresh.y)}`);
      console.log(`   After: x=${Math.round(positionAfterRefresh.x)}, y=${Math.round(positionAfterRefresh.y)}`);
    }

    // Test pan at different zoom levels
    console.log('\nTest: Pan at different zoom levels...');

    // Zoom in using controls
    await page.click('.react-flow__controls-zoomin');
    await page.waitForTimeout(500);

    const zoomedInViewport = await page.evaluate(() => {
      const reactFlowWrapper = document.querySelector('.react-flow');
      return reactFlowWrapper ? reactFlowWrapper.style.transform : null;
    });

    // Try panning while zoomed
    await canvasPane.click({ position: { x: 400, y: 300 } });
    await page.mouse.down();
    await page.mouse.move(250, 150);
    await page.waitForTimeout(500);
    await page.mouse.up();
    await page.waitForTimeout(1000);

    const zoomedInPanned = await page.evaluate(() => {
      const reactFlowWrapper = document.querySelector('.react-flow');
      return reactFlowWrapper ? reactFlowWrapper.style.transform : null;
    });

    if (zoomedInPanned !== zoomedInViewport) {
      console.log('✅ Canvas panned while zoomed in');
    } else {
      console.log('⚠️  Canvas may not pan correctly when zoomed');
    }

    // Final Summary
    console.log('\n' + '='.repeat(60));
    console.log('BROWSER AUTOMATION TEST SUMMARY');
    console.log('='.repeat(60));

    if (allPassed) {
      console.log('✅ ALL TESTS PASSED\n');
      console.log('Feature #37 (Pan canvas): ✅ WORKING');
      console.log('Feature #38 (Double-click to create): ✅ WORKING');
      console.log('Feature #39 (Drag to reposition): ✅ WORKING');
      console.log('\nAll canvas interaction features are verified!');
    } else {
      console.log('❌ SOME TESTS FAILED\n');
      console.log('Please review the test output above.');
    }

    console.log('='.repeat(60));

    // Take screenshot
    await page.screenshot({
      path: `features-37-38-39-verification-${Date.now()}.png`,
      fullPage: true
    });
    console.log('\n📸 Screenshot saved');

  } catch (error) {
    console.error('❌ Test error:', error.message);
    allPassed = false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  process.exit(allPassed ? 0 : 1);
}

// Run the test
testCanvasFeatures().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
