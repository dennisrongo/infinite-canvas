/**
 * Comprehensive Test for Features #40, #41, #42
 * Note Selection and Deletion
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function testNoteSelectionAndDeletion() {
  console.log('='.repeat(80));
  console.log('Testing Features #40, #41, #42: Note Selection and Deletion');
  console.log('='.repeat(80));

  // Test 1: Verify React Flow is installed
  console.log('\n✓ Test 1: Verify @xyflow/react is installed');
  try {
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    if (packageJson.dependencies && packageJson.dependencies['@xyflow/react']) {
      console.log('  ✓ @xyflow/react is installed');
    } else {
      console.log('  ✗ @xyflow/react NOT found - features cannot work');
      return false;
    }
  } catch (e) {
    console.log('  ✗ Error checking package.json:', e.message);
    return false;
  }

  // Test 2: Verify NoteNode component accepts selected prop
  console.log('\n✓ Test 2: Verify NoteNode component has selection styling');
  try {
    const noteNodeCode = fs.readFileSync('./src/components/canvas/NoteNode.tsx', 'utf8');

    if (noteNodeCode.includes('selected')) {
      console.log('  ✓ NoteNode accepts "selected" prop');
      if (noteNodeCode.includes('border-[#3B82F6]')) {
        console.log('  ✓ Selected state has blue border styling');
      } else {
        console.log('  ✗ Missing blue border for selected state');
      }
      if (noteNodeCode.includes('ring-2')) {
        console.log('  ✓ Selected state has ring indicator');
      } else {
        console.log('  ⚠ Missing ring indicator (optional enhancement)');
      }
    } else {
      console.log('  ✗ NoteNode does not handle selection state');
      return false;
    }
  } catch (e) {
    console.log('  ✗ Error reading NoteNode:', e.message);
    return false;
  }

  // Test 3: Verify ReactFlowCanvas component
  console.log('\n✓ Test 3: Verify ReactFlowCanvas component setup');
  try {
    const canvasCode = fs.readFileSync('./src/components/canvas/ReactFlowCanvas.tsx', 'utf8');

    if (canvasCode.includes('useNodesState')) {
      console.log('  ✓ Uses useNodesState for node management');
    } else {
      console.log('  ✗ Missing useNodesState hook');
      return false;
    }

    if (canvasCode.includes('onNodesChange')) {
      console.log('  ✓ Has onNodesChange handler for selection updates');
    } else {
      console.log('  ✗ Missing onNodesChange handler');
      return false;
    }

    if (canvasCode.includes('ReactFlow')) {
      console.log('  ✓ ReactFlow component is rendered');
    } else {
      console.log('  ✗ ReactFlow component not found');
      return false;
    }
  } catch (e) {
    console.log('  ✗ Error reading ReactFlowCanvas:', e.message);
    return false;
  }

  // Test 4: Verify database has notes for testing
  console.log('\n✓ Test 4: Check for test data in database');
  try {
    const canvases = await prisma.canvas.findMany({
      include: {
        notes: true,
      },
      take: 1,
    });

    if (canvases.length > 0 && canvases[0].notes.length > 0) {
      console.log(`  ✓ Found canvas with ${canvases[0].notes.length} notes for testing`);
    } else {
      console.log('  ⚠ No notes found in database - will test via browser automation');
    }
  } catch (e) {
    console.log('  ✗ Error querying database:', e.message);
    return false;
  }

  // Test 5: Check for delete key handler (Feature #42)
  console.log('\n✓ Test 5: Check for delete key handling implementation');
  try {
    const canvasCode = fs.readFileSync('./src/components/canvas/ReactFlowCanvas.tsx', 'utf8');

    if (canvasCode.includes('onDelete') || canvasCode.includes('delete')) {
      console.log('  ⚠ Delete handler mentioned in code');
      console.log('  Note: React Flow has built-in delete key support');
      console.log('  Need to verify if onNodesChange handles node deletion');
    } else {
      console.log('  ℹ No custom delete handler found');
      console.log('  ℹ React Flow will handle delete key automatically');
      console.log('  ℹ Need to add API call to delete from database');
    }
  } catch (e) {
    console.log('  ✗ Error checking for delete handler:', e.message);
  }

  // Test 6: Verify delete API endpoint exists
  console.log('\n✓ Test 6: Verify DELETE /api/notes/:id endpoint exists');
  try {
    const apiPath = './app/api/notes/[id]/route.ts';

    try {
      const apiCode = fs.readFileSync(apiPath, 'utf8');

      if (apiCode.includes('DELETE')) {
        console.log('  ✓ DELETE method handler exists');
        if (apiCode.includes('prisma.note.delete')) {
          console.log('  ✓ Deletes note from database');
        } else {
          console.log('  ⚠ Missing database deletion logic');
        }
      } else {
        console.log('  ✗ DELETE method not implemented');
        return false;
      }
    } catch (fsError) {
      console.log('  ✗ API endpoint file not found:', apiPath);
      return false;
    }
  } catch (e) {
    console.log('  ✗ Error checking API endpoint:', e.message);
    return false;
  }

  // Test 7: STEP 5.6 Mock Data Detection
  console.log('\n✓ Test 7: STEP 5.6 - Mock Data Detection');
  try {
    const grepPatterns = ['globalThis', 'devStore', 'dev-store', 'mockDb', 'mockData'];
    let foundMocks = false;

    for (const pattern of grepPatterns) {
      try {
        const result = execSync(`grep -r "${pattern}" src/ app/ 2>/dev/null || true`, {
          encoding: 'utf8',
          cwd: process.cwd()
        });
        if (result.trim()) {
          console.log(`  ✗ Found mock pattern: ${pattern}`);
          foundMocks = true;
        }
      } catch (e) {
        // No matches is good
      }
    }

    if (!foundMocks) {
      console.log('  ✓ No mock data patterns detected in src/ or app/');
    } else {
      console.log('  ✗ Mock data patterns found - must be removed');
      return false;
    }
  } catch (e) {
    console.log('  ⚠ Could not perform mock data check:', e.message);
  }

  console.log('\n' + '='.repeat(80));
  console.log('STATIC ANALYSIS COMPLETE');
  console.log('='.repeat(80));
  console.log('\nNext Steps:');
  console.log('1. Use browser automation to test interactive features');
  console.log('2. Test single note selection by clicking (Feature #40)');
  console.log('3. Test multi-note selection by dragging (Feature #41)');
  console.log('4. Test delete key removes selected notes (Feature #42)');
  console.log('5. Verify database updates after deletion');

  await prisma.$disconnect();
  return true;
}

testNoteSelectionAndDeletion()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });
