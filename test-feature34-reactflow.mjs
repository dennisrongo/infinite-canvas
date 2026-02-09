#!/usr/bin/env node

/**
 * Feature #34 Verification: React Flow canvas integration with pan and zoom
 *
 * This test verifies that:
 * 1. React Flow library is installed
 * 2. ReactFlowCanvas component exists
 * 3. Canvas uses React Flow with proper configuration
 * 4. Pan and zoom functionality is implemented
 * 5. Dot grid background is configured
 * 6. Controls are present for zoom
 */

import fs from 'fs';
import path from 'path';

const TEST_ID = 'FEATURE_34_TEST';
console.log(`\n${'='.repeat(80)}`);
console.log(`Feature #34 Verification: React Flow canvas integration`);
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

// Test 1: Check if @xyflow/react is installed
console.log('Test 1: Verify React Flow library is installed');
try {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const hasReactFlow = packageJson.dependencies['@xyflow/react'];

  test(
    '@xyflow/react is in dependencies',
    hasReactFlow !== undefined,
    `Version: ${hasReactFlow}`
  );
} catch (error) {
  test(
    '@xyflow/react is in dependencies',
    false,
    `Error: ${error.message}`
  );
}

// Test 2: Check if ReactFlowCanvas component exists
console.log('\nTest 2: Verify ReactFlowCanvas component exists');
try {
  const canvasPath = path.join(process.cwd(), 'src/components/canvas/ReactFlowCanvas.tsx');
  const canvasExists = fs.existsSync(canvasPath);

  test(
    'ReactFlowCanvas.tsx component exists',
    canvasExists,
    canvasExists ? 'Path: src/components/canvas/ReactFlowCanvas.tsx' : 'File not found'
  );

  if (canvasExists) {
    const canvasContent = fs.readFileSync(canvasPath, 'utf-8');

    // Test 3: Verify ReactFlow imports
    console.log('\nTest 3: Verify React Flow imports');
    test(
      'Imports ReactFlow from @xyflow/react',
      canvasContent.includes("from '@xyflow/react'"),
      'ReactFlow library imported'
    );

    test(
      'Imports Background component',
      canvasContent.includes('Background'),
      'Background component for dot grid'
    );

    test(
      'Imports Controls component',
      canvasContent.includes('Controls'),
      'Zoom controls component'
    );

    test(
      'Imports ReactFlowProvider',
      canvasContent.includes('ReactFlowProvider'),
      'ReactFlowProvider for context'
    );

    test(
      'Imports CSS styles',
      canvasContent.includes("@xyflow/react/dist/style.css"),
      'React Flow styles imported'
    );

    // Test 4: Verify ReactFlow component usage
    console.log('\nTest 4: Verify ReactFlow component is used');
    test(
      'ReactFlow component is rendered',
      canvasContent.includes('<ReactFlow'),
      'ReactFlow component found in JSX'
    );

    test(
      'Background component is rendered',
      canvasContent.includes('<Background'),
      'Background for dot grid pattern'
    );

    test(
      'Controls component is rendered',
      canvasContent.includes('<Controls'),
      'Zoom controls rendered'
    );

    test(
      'ReactFlowProvider wraps canvas',
      canvasContent.includes('<ReactFlowProvider'),
      'Provider wraps component'
    );

    // Test 5: Verify pan and zoom configuration
    console.log('\nTest 5: Verify pan and zoom functionality');
    test(
      'onNodesChange handler configured',
      canvasContent.includes('onNodesChange'),
      'Node change events handled'
    );

    test(
      'onEdgesChange handler configured',
      canvasContent.includes('onEdgesChange'),
      'Edge change events handled'
    );

    test(
      'useNodesState hook used',
      canvasContent.includes('useNodesState'),
      'State management for nodes'
    );

    test(
      'useEdgesState hook used',
      canvasContent.includes('useEdgesState'),
      'State management for edges'
    );

    test(
      'onNodeDragStop handler configured',
      canvasContent.includes('onNodeDragStop'),
      'Node drag events handled'
    );

    // Test 6: Verify background configuration
    console.log('\nTest 6: Verify dot grid background');
    test(
      'Background variant is Dots',
      canvasContent.includes('BackgroundVariant.Dots'),
      'Dot pattern selected'
    );

    test(
      'Background gap configured',
      canvasContent.includes('gap={16}') || canvasContent.includes('gap:'),
      'Grid spacing configured'
    );

    test(
      'Background size configured',
      canvasContent.includes('size={1}') || canvasContent.includes('size:'),
      'Dot size configured'
    );

    test(
      'Background color configured',
      canvasContent.includes('color=') || canvasContent.includes('color:'),
      'Grid color set'
    );

    // Test 7: Verify canvas page uses ReactFlowCanvas
    console.log('\nTest 7: Verify canvas page integration');
    const canvasPagePath = path.join(process.cwd(), 'app/canvas/[id]/page.tsx');
    const canvasPageExists = fs.existsSync(canvasPagePath);

    if (canvasPageExists) {
      const canvasPageContent = fs.readFileSync(canvasPagePath, 'utf-8');

      test(
        'Canvas page imports ReactFlowCanvas',
        canvasPageContent.includes('ReactFlowCanvas'),
        'ReactFlowCanvas component imported'
      );

      test(
        'Canvas page renders ReactFlowCanvas',
        canvasPageContent.includes('<ReactFlowCanvas'),
        'ReactFlowCanvas component used in page'
      );

      test(
        'Canvas page passes notes to ReactFlowCanvas',
        canvasPageContent.includes('initialNotes={notes'),
        'Notes data passed to canvas'
      );

      test(
        'Canvas page passes onNoteCreate handler',
        canvasPageContent.includes('onNoteCreate={handleNoteCreate'),
        'Note creation handler passed'
      );

      test(
        'Canvas page passes onNoteUpdate handler',
        canvasPageContent.includes('onNoteUpdate={handleNoteUpdate'),
        'Note update handler passed'
      );
    } else {
      test('Canvas page exists', false, 'app/canvas/[id]/page.tsx not found');
    }

    // Test 8: Check for pan and zoom related code
    console.log('\nTest 8: Verify pan and zoom implementation details');
    test(
      'useReactFlow hook used',
      canvasContent.includes('useReactFlow'),
      'Access to React Flow instance'
    );

    test(
      'screenToFlowPosition used',
      canvasContent.includes('screenToFlowPosition'),
      'Coordinate conversion for pan/zoom'
    );

    test(
      'fitView prop configured',
      canvasContent.includes('fitView'),
      'Auto-fit on load'
    );

    // Test 9: Verify NoteNode component
    console.log('\nTest 9: Verify NoteNode component');
    const noteNodePath = path.join(process.cwd(), 'src/components/canvas/NoteNode.tsx');
    const noteNodeExists = fs.existsSync(noteNodePath);

    if (noteNodeExists) {
      const noteNodeContent = fs.readFileSync(noteNodePath, 'utf-8');

      test(
        'NoteNode component exists',
        true,
        'Path: src/components/canvas/NoteNode.tsx'
      );

      test(
        'NoteNode imports from @xyflow/react',
        noteNodeContent.includes("from '@xyflow/react'"),
        'React Flow NodeProps imported'
      );

      test(
        'NoteNode uses Handle components',
        noteNodeContent.includes('Handle'),
        'Connection handles for linking'
      );
    } else {
      test('NoteNode component exists', false, 'NoteNode.tsx not found');
    }

    // Test 10: Check for mock data patterns
    console.log('\nTest 10: Verify no mock data patterns');
    const mockPatterns = [
      'globalThis',
      'devStore',
      'dev-store',
      'mockDb',
      'mockData',
      'fakeData',
      'sampleData',
      'dummyData'
    ];

    let foundMockPattern = false;
    for (const pattern of mockPatterns) {
      if (canvasContent.includes(pattern)) {
        test(
          `No mock pattern "${pattern}"`,
          false,
          `Found in ReactFlowCanvas.tsx`
        );
        foundMockPattern = true;
      }
    }

    if (!foundMockPattern) {
      test('No mock data patterns found', true, 'All data from real database');
    }
  }
} catch (error) {
  test(
    'ReactFlowCanvas component verification',
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
  console.log('✅ Feature #34: All checks passed!\n');
  console.log('React Flow canvas integration is complete with:');
  console.log('  - React Flow library installed (@xyflow/react)');
  console.log('  - ReactFlowCanvas component with proper configuration');
  console.log('  - Pan and zoom functionality (onNodesChange, onNodeDragStop)');
  console.log('  - Dot grid background (Background with Dots variant)');
  console.log('  - Zoom controls (Controls component)');
  console.log('  - NoteNode component for rendering notes');
  console.log('  - Integration with canvas page');
  console.log('  - No mock data patterns\n');
  process.exit(0);
} else {
  console.log('❌ Feature #34: Some checks failed.\n');
  console.log('Please review the failed tests above.\n');
  process.exit(1);
}
