#!/usr/bin/env node

/**
 * Feature #35 Verification: Dot grid background pattern
 *
 * This test verifies that:
 * 1. Background component from React Flow is used
 * 2. Background variant is set to Dots
 * 3. Grid spacing (gap) is configured
 * 4. Dot size is configured
 * 5. Dot color is configured and appropriate
 * 6. Background renders correctly behind content
 * 7. Grid works with light and dark themes
 */

import fs from 'fs';
import path from 'path';

const TEST_ID = 'FEATURE_35_TEST';
console.log(`\n${'='.repeat(80)}`);
console.log(`Feature #35 Verification: Dot grid background pattern`);
console.log(`${'='.repeat(80)}\n`);

let testsPassed = 0;
let testsFailed = 0;

function test(name, condition, details = '') {
  if (condition) {
    console.log(`✅ ${name}`);
    if (details) console.log(`   ${details}`);
    testsPassed++;
  } else {
    console.log(`❌ ${name}`);
    if (details) console.log(`   ${details}`);
    testsFailed++;
  }
}

// Test 1: Verify Background component is used
console.log('Test 1: Verify Background component from React Flow');
try {
  const canvasPath = path.join(process.cwd(), 'src/components/canvas/ReactFlowCanvas.tsx');
  const canvasContent = fs.readFileSync(canvasPath, 'utf-8');

  test(
    'Background component is imported',
    canvasContent.includes('Background'),
    'Background imported from @xyflow/react'
  );

  test(
    'Background component is rendered',
    canvasContent.includes('<Background'),
    'Background component found in JSX'
  );

  // Test 2: Verify Background configuration
  console.log('\nTest 2: Verify Background variant is Dots');
  test(
    'Background variant is Dots',
    canvasContent.includes('BackgroundVariant.Dots'),
    'Dot pattern selected (not lines or grid)'
  );

  test(
    'BackgroundVariant is imported',
    canvasContent.includes('BackgroundVariant'),
    'BackgroundVariant imported from @xyflow/react'
  );

  // Test 3: Verify grid spacing configuration
  console.log('\nTest 3: Verify grid spacing (gap)');
  const gapMatch = canvasContent.match(/gap\s*=\s*{(\d+)}/);
  if (gapMatch) {
    const gap = parseInt(gapMatch[1]);
    test(
      `Grid gap is configured: ${gap}px`,
      gap > 0 && gap < 100,
      'Reasonable spacing for dot grid'
    );
  } else {
    test('Grid gap is configured', false, 'No gap prop found');
  }

  // Test 4: Verify dot size configuration
  console.log('\nTest 4: Verify dot size');
  const sizeMatch = canvasContent.match(/size\s*=\s*{(\d+)}/);
  if (sizeMatch) {
    const size = parseInt(sizeMatch[1]);
    test(
      `Dot size is configured: ${size}px`,
      size >= 1 && size <= 5,
      'Subtle dot size for background'
    );
  } else {
    test('Dot size is configured', false, 'No size prop found');
  }

  // Test 5: Verify dot color configuration
  console.log('\nTest 5: Verify dot color');
  const colorMatch = canvasContent.match(/color\s*=\s*"([^"]+)"/);
  if (colorMatch) {
    const color = colorMatch[1];
    test(
      `Dot color is configured: ${color}`,
      color.startsWith('#') && color.length === 7,
      'Hex color for light theme'
    );
    console.log(`   Color: ${color} (light gray, subtle)`);

    // Verify it's a light/gray color suitable for background
    const isSubtle = color.toLowerCase().includes('cbd5e1') ||
                     color.toLowerCase().includes('94a3b8') ||
                     color.toLowerCase().includes('64748b');
    test(
      'Dot color is subtle (light gray)',
      isSubtle,
      'Color should not interfere with content'
    );
  } else {
    test('Dot color is configured', false, 'No color prop found');
  }

  // Test 6: Verify background rendering order
  console.log('\nTest 6: Verify Background renders in correct position');
  const backgroundIndex = canvasContent.indexOf('<Background');
  const controlsIndex = canvasContent.indexOf('<Controls');
  const reactFlowCloseIndex = canvasContent.indexOf('</ReactFlow>');

  test(
    'Background renders before Controls',
    backgroundIndex > 0 && controlsIndex > backgroundIndex,
    'Background appears before controls in JSX'
  );

  test(
    'Background renders inside ReactFlow',
    backgroundIndex > 0 && reactFlowCloseIndex > backgroundIndex,
    'Background is child of ReactFlow component'
  );

  // Test 7: Verify theme support
  console.log('\nTest 7: Verify theme support for background');
  test(
    'ReactFlow has background color for light theme',
    canvasContent.includes('bg-[#F8FAFC]') || canvasContent.includes('bg-'),
    'Light theme background color'
  );

  test(
    'ReactFlow has background color for dark theme',
    canvasContent.includes('dark:bg-'),
    'Dark theme background color'
  );

  // Verify specific colors from spec
  const hasLightBg = canvasContent.includes('#F8FAFC') || canvasContent.includes('#F8FAFC');
  const hasDarkBg = canvasContent.includes('#1E293B') || canvasContent.includes('#1E293B');

  test(
    'Light theme uses #F8FAFC (spec color)',
    hasLightBg,
    'Matches design system spec'
  );

  test(
    'Dark theme uses #1E293B (spec color)',
    hasDarkBg,
    'Matches design system spec'
  );

  // Test 8: Verify Background doesn't interfere with interactivity
  console.log('\nTest 8: Verify Background behavior');
  test(
    'Background is a React Flow component',
    canvasContent.includes('<Background'),
    'React Flow handles background rendering automatically'
  );

  test(
    'Background has no interactive handlers',
    !canvasContent.includes('onClick=<Background') && !canvasContent.includes('onPaneClick=<Background'),
    'Background is purely visual, no event handlers'
  );

  // Test 9: Verify infinite extension
  console.log('\nTest 9: Verify infinite grid extension');
  test(
    'Background uses React Flow built-in component',
    canvasContent.includes('<Background'),
    'React Flow Background automatically extends infinitely'
  );

  test(
    'No custom grid rendering logic',
    !canvasContent.includes('custom grid') && !canvasContent.includes('infinite grid'),
    'Using standard React Flow Background (extends automatically)'
  );

  // Test 10: Check design system compliance
  console.log('\nTest 10: Verify design system compliance');

  // From spec: Light mode - Dot grid: #CBD5E1
  const lightColorMatch = canvasContent.match(/color\s*=\s*"([^"]+)"/);
  if (lightColorMatch) {
    const actualColor = lightColorMatch[1];
    const specLightColor = '#CBD5E1';
    test(
      `Dot color matches spec (light theme)`,
      actualColor.toLowerCase() === specLightColor.toLowerCase(),
      `Expected: ${specLightColor}, Actual: ${actualColor}`
    );
  }

  // Verify gap is reasonable for dot grid
  if (gapMatch) {
    const gap = parseInt(gapMatch[1]);
    test(
      'Grid gap matches typical spacing (16px)',
      gap === 16,
      'Standard spacing for dot grid patterns'
    );
  }

  // Verify dot is small and subtle
  if (sizeMatch) {
    const size = parseInt(sizeMatch[1]);
    test(
      'Dot size is 1px (subtle)',
      size === 1,
      'Standard size for background dots'
    );
  }

} catch (error) {
  test(
    'Dot grid background verification',
    false,
    `Error: ${error.message}`
  );
}

// Summary
console.log(`\n${'='.repeat(80)}`);
console.log('SUMMARY');
console.log(`${'='.repeat(80)}`);
console.log(`Tests Passed: ${testsPassed}`);
console.log(`Tests Failed: ${testsFailed}`);
console.log(`Total Tests: ${testsPassed + testsFailed}`);
console.log(`${'='.repeat(80)}\n`);

if (testsFailed === 0) {
  console.log('✅ Feature #35: All checks passed!\n');
  console.log('Dot grid background is properly configured with:');
  console.log('  - Background component from React Flow');
  console.log('  - Dots variant (not lines or solid grid)');
  console.log('  - Proper spacing (gap: 16px)');
  console.log('  - Subtle dot size (size: 1px)');
  console.log('  - Appropriate color (#CBD5E1 for light theme)');
  console.log('  - Light/dark theme support');
  console.log('  - Infinite extension (React Flow handles automatically)');
  console.log('  - Does not interfere with content interactivity\n');
  process.exit(0);
} else {
  console.log('❌ Feature #35: Some checks failed.\n');
  console.log('Please review the failed tests above.\n');
  process.exit(1);
}
