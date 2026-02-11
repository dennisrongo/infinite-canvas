/**
 * Feature #135: Desktop layout (1920px width)
 *
 * Test Steps:
 * 1. Resize browser to 1920px width
 * 2. Verify layout uses full width appropriately
 * 3. Verify sidebar is visible on left
 * 4. Verify canvas/content takes remaining space
 * 5. Verify header spans full width
 * 6. Verify no horizontal scroll appears
 * 7. Verify all elements are properly spaced
 * 8. Verify text is readable and not cramped
 */

import { chromium } from 'playwright';

const VIEWPORT_WIDTH = 1920;
const VIEWPORT_HEIGHT = 1080;

async function testFeature135() {
  console.log('='.repeat(60));
  console.log('Feature #135: Desktop layout (1920px width)');
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT }
  });
  const page = await context.newPage();

  let passedTests = 0;
  let failedTests = 0;

  try {
    // Step 1: Navigate to login page
    console.log('\n[Step 1] Navigating to login page...');
    await page.goto('http://localhost:3456/auth/login', { waitUntil: 'domcontentloaded' });

    // Get actual viewport size
    const viewportSize = page.viewportSize();
    console.log(`  Viewport size: ${viewportSize.width}x${viewportSize.height}`);
    if (viewportSize.width === VIEWPORT_WIDTH) {
      console.log('  ✓ PASS: Browser resized to 1920px width');
      passedTests++;
    } else {
      console.log(`  ✗ FAIL: Expected width ${VIEWPORT_WIDTH}, got ${viewportSize.width}`);
      failedTests++;
    }

    // Login
    console.log('\n[Login] Logging in as test user...');
    await page.fill('input[type="email"]', 'layout_test@example.com');
    await page.fill('input[type="password"]', 'LayoutTest123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    console.log('  ✓ Logged in successfully');

    // Wait for page to fully load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Step 2: Verify layout uses full width appropriately
    console.log('\n[Step 2] Verifying layout uses full width appropriately...');
    const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const bodyWidth = await page.evaluate(() => document.body.offsetWidth);
    console.log(`  Document width: ${documentWidth}px`);
    console.log(`  Body width: ${bodyWidth}px`);

    if (bodyWidth === VIEWPORT_WIDTH) {
      console.log('  ✓ PASS: Layout uses full width (1920px)');
      passedTests++;
    } else {
      console.log(`  ✗ FAIL: Expected width ${VIEWPORT_WIDTH}, got ${bodyWidth}`);
      failedTests++;
    }

    // Step 3: Verify sidebar is visible on left
    console.log('\n[Step 3] Verifying sidebar is visible on left...');
    const sidebarInfo = await page.evaluate(() => {
      const sidebar = document.querySelector('aside, [role="complementary"]');
      if (!sidebar) return { exists: false };

      const rect = sidebar.getBoundingClientRect();
      return {
        exists: true,
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        visible: rect.width > 0 && rect.height > 0
      };
    });

    console.log(`  Sidebar exists: ${sidebarInfo.exists}`);
    console.log(`  Sidebar position: left=${sidebarInfo.left}px, top=${sidebarInfo.top}px`);
    console.log(`  Sidebar size: ${sidebarInfo.width}x${sidebarInfo.height}px`);

    if (sidebarInfo.exists && sidebarInfo.visible && sidebarInfo.left === 0) {
      console.log('  ✓ PASS: Sidebar is visible on the left side');
      passedTests++;
    } else {
      console.log('  ✗ FAIL: Sidebar not visible or not positioned correctly');
      failedTests++;
    }

    // Step 4: Verify canvas/content takes remaining space
    console.log('\n[Step 4] Verifying content takes remaining space...');
    const contentInfo = await page.evaluate(() => {
      const main = document.querySelector('main, [role="main"]');
      if (!main) return { exists: false };

      const rect = main.getBoundingClientRect();
      return {
        exists: true,
        width: rect.width,
        height: rect.height,
        left: rect.left
      };
    });

    console.log(`  Main content exists: ${contentInfo.exists}`);
    console.log(`  Main content width: ${contentInfo.width}px`);
    console.log(`  Main content left: ${contentInfo.left}px`);

    // Content should start after sidebar and fill remaining width
    const expectedMinWidth = VIEWPORT_WIDTH - 400; // At least most of the width
    if (contentInfo.exists && contentInfo.width >= expectedMinWidth) {
      console.log(`  ✓ PASS: Content takes remaining space (${contentInfo.width}px)`);
      passedTests++;
    } else {
      console.log(`  ✗ FAIL: Content width ${contentInfo.width}px < expected ${expectedMinWidth}px`);
      failedTests++;
    }

    // Step 5: Verify header spans full width
    console.log('\n[Step 5] Verifying header spans full width...');
    const headerInfo = await page.evaluate(() => {
      const header = document.querySelector('header, banner');
      if (!header) return { exists: false };

      const rect = header.getBoundingClientRect();
      return {
        exists: true,
        width: rect.width,
        left: rect.left
      };
    });

    console.log(`  Header exists: ${headerInfo.exists}`);
    console.log(`  Header width: ${headerInfo.width}px`);
    console.log(`  Header left: ${headerInfo.left}px`);

    if (headerInfo.exists && headerInfo.width === VIEWPORT_WIDTH && headerInfo.left === 0) {
      console.log('  ✓ PASS: Header spans full width (1920px)');
      passedTests++;
    } else {
      console.log(`  ✗ FAIL: Header not spanning full width`);
      failedTests++;
    }

    // Step 6: Verify no horizontal scroll appears
    console.log('\n[Step 6] Verifying no horizontal scroll appears...');
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    console.log(`  Has horizontal scroll: ${hasHorizontalScroll}`);

    if (!hasHorizontalScroll) {
      console.log('  ✓ PASS: No horizontal scroll appears');
      passedTests++;
    } else {
      console.log('  ✗ FAIL: Horizontal scroll is present');
      failedTests++;
    }

    // Step 7: Verify all elements are properly spaced
    console.log('\n[Step 7] Verifying elements are properly spaced...');
    const spacingCheck = await page.evaluate(() => {
      const checks = {
        headerHasPadding: false,
        sidebarHasPadding: false,
        contentHasPadding: false,
        buttonSpacing: false
      };

      // Check header spacing
      const header = document.querySelector('header, banner');
      if (header) {
        const style = window.getComputedStyle(header);
        checks.headerHasPadding = parseFloat(style.paddingLeft) > 0 || parseFloat(style.paddingRight) > 0;
      }

      // Check sidebar spacing
      const sidebar = document.querySelector('aside, [role="complementary"]');
      if (sidebar) {
        const style = window.getComputedStyle(sidebar);
        checks.sidebarHasPadding = parseFloat(style.paddingLeft) > 0 || parseFloat(style.paddingRight) > 0;
      }

      // Check button spacing
      const buttons = document.querySelectorAll('button');
      if (buttons.length > 0) {
        const button = buttons[0];
        const rect = button.getBoundingClientRect();
        const nextElement = button.nextElementSibling;
        if (nextElement) {
          const nextRect = nextElement.getBoundingClientRect();
          checks.buttonSpacing = nextRect.left - rect.right > 4;
        }
      }

      return checks;
    });

    console.log(`  Header has padding: ${spacingCheck.headerHasPadding}`);
    console.log(`  Sidebar has padding: ${spacingCheck.sidebarHasPadding}`);
    console.log(`  Buttons have spacing: ${spacingCheck.buttonSpacing}`);

    if (spacingCheck.headerHasPadding || spacingCheck.sidebarHasPadding) {
      console.log('  ✓ PASS: Elements have proper spacing');
      passedTests++;
    } else {
      console.log('  ✗ FAIL: Elements lack proper spacing');
      failedTests++;
    }

    // Step 8: Verify text is readable and not cramped
    console.log('\n[Step 8] Verifying text is readable and not cramped...');
    const readabilityCheck = await page.evaluate(() => {
      const checks = {
        fontSizeAdequate: false,
        lineHeightAdequate: false,
        textContrastOK: false
      };

      const body = document.body;
      const style = window.getComputedStyle(body);

      // Check font size (should be at least 14px)
      const fontSize = parseFloat(style.fontSize);
      checks.fontSizeAdequate = fontSize >= 14;

      // Check line height (should be at least 1.2)
      const lineHeight = parseFloat(style.lineHeight);
      checks.lineHeightAdequate = lineHeight >= 1.2 || lineHeight >= fontSize * 1.2;

      // Get computed color for basic check
      checks.textContrastOK = style.color !== '';

      return {
        ...checks,
        fontSize: fontSize,
        lineHeight: lineHeight,
        color: style.color
      };
    });

    console.log(`  Font size: ${readabilityCheck.fontSize}px`);
    console.log(`  Line height: ${readabilityCheck.lineHeight}`);
    console.log(`  Text color: ${readabilityCheck.color}`);
    console.log(`  Font size adequate: ${readabilityCheck.fontSizeAdequate}`);
    console.log(`  Line height adequate: ${readabilityCheck.lineHeightAdequate}`);

    if (readabilityCheck.fontSizeAdequate && readabilityCheck.lineHeightAdequate) {
      console.log('  ✓ PASS: Text is readable and not cramped');
      passedTests++;
    } else {
      console.log('  ✗ FAIL: Text may be cramped or hard to read');
      failedTests++;
    }

    // Take screenshot for visual verification
    console.log('\n[Screenshot] Taking screenshot for visual verification...');
    await page.screenshot({
      path: 'feature135-desktop-layout-1920.png',
      fullPage: true
    });
    console.log('  Screenshot saved: feature135-desktop-layout-1920.png');

  } catch (error) {
    console.error('\n✗ ERROR during test:', error.message);
    failedTests++;
  } finally {
    await browser.close();
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${passedTests + failedTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);

  if (failedTests === 0) {
    console.log('\n✓ ALL TESTS PASSED - Feature #135 is PASSING\n');
    process.exit(0);
  } else {
    console.log(`\n✗ ${failedTests} TEST(S) FAILED - Feature #135 needs attention\n`);
    process.exit(1);
  }
}

testFeature135().catch(console.error);
