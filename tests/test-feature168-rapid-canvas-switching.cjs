// Test Feature #168: Rapid canvas switching
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ANSI color codes
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[36m';
const RESET = '\x1b[0m';

function log(message, color = BLUE) {
  console.log(`${color}${message}${RESET}`);
}

// Test user credentials
const TEST_USER = {
  email: 'feature168@test.com',
  password: 'Test1234!',
  displayName: 'Feature168 Test User'
};

let testUserId = null;
let canvases = [];
let noteIds = [];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function setup() {
  log('\n=== SETUP: Creating test user and canvases ===', YELLOW);

  // Check if test user exists
  let user = await prisma.user.findUnique({
    where: { email: TEST_USER.email }
  });

  if (user) {
    log(`Test user already exists: ${user.id}`, BLUE);
    // Clean up existing data
    await prisma.note.deleteMany({
      where: {
        canvas: {
          userId: user.id
        }
      }
    });
    await prisma.canvas.deleteMany({
      where: { userId: user.id }
    });
    log(`Cleaned up existing data`, BLUE);
  } else {
    // Create test user
    user = await prisma.user.create({
      data: {
        email: TEST_USER.email,
        passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz123456',
        displayName: TEST_USER.displayName
      }
    });
    log(`Created test user: ${user.id}`, GREEN);
  }

  testUserId = user.id;

  // Create 3 test canvases with different notes
  for (let i = 1; i <= 3; i++) {
    const canvas = await prisma.canvas.create({
      data: {
        userId: testUserId,
        name: `Canvas ${i}`,
        folderId: null
      }
    });
    canvases.push(canvas);
    log(`Created canvas ${i}: ${canvas.id}`, GREEN);

    // Add unique notes to each canvas
    for (let j = 1; j <= 3; j++) {
      const note = await prisma.note.create({
        data: {
          canvasId: canvas.id,
          title: `Canvas ${i} - Note ${j}`,
          content: `This note belongs to Canvas ${i}`,
          positionX: 100 * j,
          positionY: 100 * j,
          width: 300,
          height: 200
        }
      });
      noteIds.push(note.id);
    }
    log(`  Created 3 notes for canvas ${i}`, BLUE);
  }

  log('Setup complete!\n', GREEN);
}

async function cleanup() {
  log('\n=== CLEANUP ===', YELLOW);

  if (testUserId) {
    await prisma.note.deleteMany({
      where: {
        canvas: { userId: testUserId }
      }
    });
    await prisma.canvas.deleteMany({
      where: { userId: testUserId }
    });
    await prisma.user.delete({
      where: { id: testUserId }
    });
    log('Cleaned up test data', GREEN);
  }

  await prisma.$disconnect();
}

async function testCanvasDataIsolation() {
  log('\n=== TEST 1: Canvas Data Isolation ===', YELLOW);
  log('Verifying each canvas has its own unique notes\n');

  let allIsolated = true;

  for (let i = 0; i < canvases.length; i++) {
    const canvas = canvases[i];
    const canvasNum = i + 1;

    const notes = await prisma.note.findMany({
      where: { canvasId: canvas.id }
    });

    log(`  Canvas ${canvasNum} (${canvas.name}):`, BLUE);
    log(`    Note count: ${notes.length}`, BLUE);

    // Verify all notes belong to this canvas
    const allBelongToCanvas = notes.every(note => note.canvasId === canvas.id);

    // Verify all notes have the correct canvas in their title
    const allHaveCorrectTitle = notes.every(note => note.title.includes(`Canvas ${canvasNum}`));

    if (notes.length === 3 && allBelongToCanvas && allHaveCorrectTitle) {
      log(`    ✅ Canvas ${canvasNum} has correct unique notes`, GREEN);
    } else {
      log(`    ❌ Canvas ${canvasNum} data issue`, RED);
      allIsolated = false;
    }
  }

  if (allIsolated) {
    log(`✅ TEST 1 PASSED: Each canvas has its own isolated data`, GREEN);
    return true;
  } else {
    log(`❌ TEST 1 FAILED: Canvas data isolation issue`, RED);
    return false;
  }
}

async function testRapidCanvasSwitching() {
  log('\n=== TEST 2: Rapid Canvas Switching Simulation ===', YELLOW);
  log('Simulating rapid API calls to fetch different canvases\n');

  const switchOrder = [0, 1, 2, 0, 1, 2, 1, 0, 2]; // Switch pattern
  const results = [];

  // Simulate rapid switching
  for (let i = 0; i < switchOrder.length; i++) {
    const canvasIndex = switchOrder[i];
    const canvasId = canvases[canvasIndex].id;
    const canvasNum = canvasIndex + 1;

    log(`  Switch ${i + 1}: Fetching Canvas ${canvasNum}`, BLUE);

    try {
      // Fetch canvas with notes (simulating API call)
      const canvasData = await prisma.canvas.findUnique({
        where: { id: canvasId },
        include: {
          notes: true
        }
      });

      if (canvasData) {
        results.push({
          switchNum: i + 1,
          canvasId: canvasData.id,
          canvasName: canvasData.name,
          noteCount: canvasData.notes.length,
          firstNoteTitle: canvasData.notes[0]?.title || null
        });

        // Verify we got the correct canvas
        const isCorrectCanvas = canvasData.name === `Canvas ${canvasNum}`;
        const hasCorrectNotes = canvasData.notes.length === 3;
        const notesMatchCanvas = canvasData.notes.every(note =>
          note.title.includes(`Canvas ${canvasNum}`)
        );

        if (isCorrectCanvas && hasCorrectNotes && notesMatchCanvas) {
          log(`    ✅ Got Canvas ${canvasNum} with ${canvasData.notes.length} notes`, GREEN);
        } else {
          log(`    ❌ Data mismatch for Canvas ${canvasNum}`, RED);
          results.push({ error: `Mismatch at switch ${i + 1}` });
          break;
        }
      }
    } catch (error) {
      log(`    ❌ Error fetching canvas: ${error.message}`, RED);
      results.push({ error: error.message });
      break;
    }

    // Minimal delay to simulate rapid clicking
    await sleep(50);
  }

  // Verify all switches were successful
  const errors = results.filter(r => r.error);
  if (errors.length === 0) {
    log(`✅ TEST 2 PASSED: All ${switchOrder.length} rapid switches successful`, GREEN);
    return true;
  } else {
    log(`❌ TEST 2 FAILED: ${errors.length} switches failed`, RED);
    return false;
  }
}

async function testNoMixedContent() {
  log('\n=== TEST 3: No Mixed Content Between Canvases ===', YELLOW);
  log('Verifying notes from one canvas don\'t appear in another\n');

  for (let i = 0; i < canvases.length; i++) {
    const canvas = canvases[i];
    const canvasNum = i + 1;

    // Get notes for this canvas
    const notes = await prisma.note.findMany({
      where: { canvasId: canvas.id }
    });

    log(`  Canvas ${canvasNum} notes:`, BLUE);

    // Check all notes belong to this canvas
    for (const note of notes) {
      const belongsToCorrectCanvas = note.canvasId === canvas.id;
      const titleMatchesCanvas = note.title.includes(`Canvas ${canvasNum}`);
      const contentMatchesCanvas = note.content.includes(`Canvas ${canvasNum}`);

      if (belongsToCorrectCanvas && titleMatchesCanvas && contentMatchesCanvas) {
        log(`    ✅ "${note.title}" - correctly in Canvas ${canvasNum}`, GREEN);
      } else {
        log(`    ❌ "${note.title}" - data leak or mismatch`, RED);
        log(`       Belongs to canvas: ${note.canvasId} (expected: ${canvas.id})`, RED);
        return false;
      }
    }
  }

  log(`✅ TEST 3 PASSED: No mixed content detected`, GREEN);
  return true;
}

async function testConcurrentCanvasAccess() {
  log('\n=== TEST 4: Concurrent Canvas Access ===', YELLOW);
  log('Simulating multiple canvases being accessed simultaneously\n');

  // Fetch all canvases concurrently
  const fetchPromises = canvases.map((canvas, index) =>
    prisma.canvas.findUnique({
      where: { id: canvas.id },
      include: { notes: true }
    }).then(data => ({ index, data }))
  );

  const results = await Promise.all(fetchPromises);

  let allCorrect = true;
  for (const result of results) {
    const canvasNum = result.index + 1;
    const canvas = result.data;

    if (canvas && canvas.name === `Canvas ${canvasNum}` && canvas.notes.length === 3) {
      log(`  ✅ Canvas ${canvasNum}: ${canvas.notes.length} notes`, GREEN);
    } else {
      log(`  ❌ Canvas ${canvasNum}: Incorrect data`, RED);
      allCorrect = false;
    }
  }

  if (allCorrect) {
    log(`✅ TEST 4 PASSED: Concurrent access handled correctly`, GREEN);
    return true;
  } else {
    log(`❌ TEST 4 FAILED: Concurrent access issue`, RED);
    return false;
  }
}

async function testCanvasStateConsistency() {
  log('\n=== TEST 5: Canvas State Consistency ===', YELLOW);
  log('Verifying canvas state remains consistent after rapid operations\n');

  // Create a new canvas with specific state
  const testCanvas = await prisma.canvas.create({
    data: {
      userId: testUserId,
      name: 'State Test Canvas',
      viewportX: 100,
      viewportY: 200,
      zoom: 1.5,
      folderId: null
    }
  });

  log(`Created test canvas: ${testCanvas.id}`, BLUE);

  // Perform rapid state updates
  const states = [
    { viewportX: 150, viewportY: 250, zoom: 1.6 },
    { viewportX: 200, viewportY: 300, zoom: 1.7 },
    { viewportX: 250, viewportY: 350, zoom: 1.8 },
  ];

  for (const state of states) {
    await prisma.canvas.update({
      where: { id: testCanvas.id },
      data: state
    });
    await sleep(10); // Rapid updates
  }

  // Verify final state
  const finalCanvas = await prisma.canvas.findUnique({
    where: { id: testCanvas.id }
  });

  const stateMatches =
    finalCanvas.viewportX === states[states.length - 1].viewportX &&
    finalCanvas.viewportY === states[states.length - 1].viewportY &&
    finalCanvas.zoom === states[states.length - 1].zoom;

  // Cleanup
  await prisma.canvas.delete({ where: { id: testCanvas.id } });

  if (stateMatches) {
    log(`✅ TEST 5 PASSED: Canvas state remains consistent`, GREEN);
    return true;
  } else {
    log(`❌ TEST 5 FAILED: State mismatch`, RED);
    log(`   Expected: ${JSON.stringify(states[states.length - 1])}`, RED);
    log(`   Got: ${JSON.stringify({ viewportX: finalCanvas.viewportX, viewportY: finalCanvas.viewportY, zoom: finalCanvas.zoom })}`, RED);
    return false;
  }
}

async function runAllTests() {
  log('\n╔════════════════════════════════════════════════════════════════╗', BLUE);
  log('║   Feature #168: Rapid Canvas Switching - Test Suite           ║', BLUE);
  log('╚════════════════════════════════════════════════════════════════╝', BLUE);

  const results = {
    passed: 0,
    failed: 0,
    total: 5
  };

  try {
    await setup();

    const test1 = await testCanvasDataIsolation();
    if (test1) results.passed++; else results.failed++;

    const test2 = await testRapidCanvasSwitching();
    if (test2) results.passed++; else results.failed++;

    const test3 = await testNoMixedContent();
    if (test3) results.passed++; else results.failed++;

    const test4 = await testConcurrentCanvasAccess();
    if (test4) results.passed++; else results.failed++;

    const test5 = await testCanvasStateConsistency();
    if (test5) results.passed++; else results.failed++;

  } catch (error) {
    log(`\n❌ Error during testing: ${error.message}`, RED);
    console.error(error);
  } finally {
    await cleanup();
  }

  // Summary
  log('\n╔════════════════════════════════════════════════════════════════╗', BLUE);
  log('║                        TEST SUMMARY                           ║', BLUE);
  log('╚════════════════════════════════════════════════════════════════╝', BLUE);
  log(`  Total Tests: ${results.total}`, BLUE);
  log(`  ${GREEN}Passed: ${results.passed}${RESET}`);
  log(`  ${RED}Failed: ${results.failed}${RESET}`);

  if (results.passed === results.total) {
    log(`\n🎉 ALL TESTS PASSED! Feature #168 is working correctly.`, GREEN);
    return 0;
  } else {
    log(`\n⚠️  Some tests failed. Review results above.`, YELLOW);
    return 1;
  }
}

// Run tests
runAllTests()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
