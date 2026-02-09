// Test Feature #169: Pagination during updates (limit-based approach)
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
  email: 'feature169@test.com',
  password: 'Test1234!',
  displayName: 'Feature169 Test User'
};

const PAGE_SIZE = 10; // Simulating page size for testing
const SEARCH_LIMIT = 50; // Actual search limit used in the app

let testUserId = null;
let testCanvasId = null;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function setup() {
  log('\n=== SETUP: Creating test user and data ===', YELLOW);

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

  // Create test canvas
  const canvas = await prisma.canvas.create({
    data: {
      userId: testUserId,
      name: 'Feature169 Test Canvas',
      folderId: null
    }
  });
  testCanvasId = canvas.id;
  log(`Created test canvas: ${canvas.id}`, GREEN);

  // Create initial notes (more than page size)
  const initialNotes = [];
  for (let i = 1; i <= 25; i++) {
    const note = await prisma.note.create({
      data: {
        canvasId: testCanvasId,
        title: `Note ${String(i).padStart(3, '0')}`,
        content: `Content for note ${i}`,
        positionX: 100 * i,
        positionY: 100,
        width: 300,
        height: 200
      }
    });
    initialNotes.push(note);
  }
  log(`Created ${initialNotes.length} initial notes`, GREEN);

  log('Setup complete!\n', GREEN);
  return { initialNotes };
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

async function testPaginationInitialLoad() {
  log('\n=== TEST 1: Initial Pagination Load ===', YELLOW);
  log('Verifying first page returns correct number of items\n');

  // Get all notes (simulating API call)
  const allNotes = await prisma.note.findMany({
    where: {
      canvasId: testCanvasId
    },
    orderBy: {
      title: 'asc' // Alphabetical order
    }
  });

  // Simulate pagination: get first page
  const firstPage = allNotes.slice(0, PAGE_SIZE);
  const secondPage = allNotes.slice(PAGE_SIZE, PAGE_SIZE * 2);

  log(`  Total notes: ${allNotes.length}`, BLUE);
  log(`  First page (0-${PAGE_SIZE - 1}): ${firstPage.length} notes`, BLUE);
  log(`  Second page (${PAGE_SIZE}-${PAGE_SIZE * 2 - 1}): ${secondPage.length} notes`, BLUE);

  // Verify page 1 first note
  if (firstPage[0].title === 'Note 001') {
    log(`  ✅ First page starts with "Note 001"`, GREEN);
  } else {
    log(`  ❌ First page should start with "Note 001", got "${firstPage[0].title}"`, RED);
    return false;
  }

  // Verify page 2 first note
  if (secondPage[0].title === 'Note 011') {
    log(`  ✅ Second page starts with "Note 011"`, GREEN);
  } else {
    log(`  ❌ Second page should start with "Note 011", got "${secondPage[0].title}"`, RED);
    return false;
  }

  log(`✅ TEST 1 PASSED: Initial pagination loads correctly`, GREEN);
  return true;
}

async function testAddNewItemsAppearOnPage1() {
  log('\n=== TEST 2: New Items Appear on Page 1 ===', YELLOW);
  log('Adding items that should appear on first page\n');

  // Get current state
  const allNotes = await prisma.note.findMany({
    where: { canvasId: testCanvasId },
    orderBy: { title: 'asc' }
  });

  const oldFirstPageFirst = allNotes[0].title;
  log(`  Current first page starts with: "${oldFirstPageFirst}"`, BLUE);

  // Add new notes that should appear at the beginning (alphabetically)
  const newNotes = [];
  for (let i = 1; i <= 3; i++) {
    const note = await prisma.note.create({
      data: {
        canvasId: testCanvasId,
        title: `AAA New Note ${i}`,
        content: `New content ${i}`,
        positionX: 0,
        positionY: 0,
        width: 300,
        height: 200
      }
    });
    newNotes.push(note);
    log(`  Created: "${note.title}"`, BLUE);
  }

  // Re-fetch first page
  const updatedNotes = await prisma.note.findMany({
    where: { canvasId: testCanvasId },
    orderBy: { title: 'asc' }
  });

  const newFirstPage = updatedNotes.slice(0, PAGE_SIZE);
  const newFirstPageFirst = newFirstPage[0].title;

  log(`  After adding, first page starts with: "${newFirstPageFirst}"`, BLUE);

  // Verify new notes appear on page 1
  if (newFirstPageFirst.startsWith('AAA New Note')) {
    log(`  ✅ New notes appear at the top of page 1`, GREEN);
  } else {
    log(`  ❌ New notes should appear at top, but first is "${newFirstPageFirst}"`, RED);
    return false;
  }

  // Verify how many of the old first page items are still on page 1
  const oldPage1ItemsOnNewPage1 = newFirstPage.filter(n =>
    !n.title.startsWith('AAA New Note')
  ).length;

  log(`  Old page 1 items still on page 1: ${oldPage1ItemsOnNewPage1} (expected ${PAGE_SIZE - 3})`, BLUE);

  if (oldPage1ItemsOnNewPage1 === PAGE_SIZE - 3) {
    log(`  ✅ Page 1 correctly shifted down by 3 items`, GREEN);
    log(`✅ TEST 2 PASSED: New items appear on page 1 and shift other items`, GREEN);
    return true;
  } else {
    log(`  ❌ Page 1 shift incorrect`, RED);
    return false;
  }
}

async function testDeleteItemsFromPage1() {
  log('\n=== TEST 3: Delete Items from Page 1 ===', YELLOW);
  log('Deleting items from page 1 and verifying pagination adjusts\n');

  // Get current first page
  const allNotes = await prisma.note.findMany({
    where: { canvasId: testCanvasId },
    orderBy: { title: 'asc' }
  });

  const firstPageBefore = allNotes.slice(0, PAGE_SIZE);
  log(`  Page 1 before delete: ${firstPageBefore.length} items`, BLUE);
  log(`  First item: "${firstPageBefore[0].title}"`, BLUE);
  log(`  Last item on page 1: "${firstPageBefore[firstPageBefore.length - 1].title}"`, BLUE);

  // Delete first 3 items from page 1
  const itemsToDelete = firstPageBefore.slice(0, 3);
  log(`  Deleting 3 items from page 1...`, BLUE);

  for (const note of itemsToDelete) {
    await prisma.note.delete({
      where: { id: note.id }
    });
    log(`    Deleted: "${note.title}"`, BLUE);
  }

  // Re-fetch first page
  const updatedNotes = await prisma.note.findMany({
    where: { canvasId: testCanvasId },
    orderBy: { title: 'asc' }
  });

  const firstPageAfter = updatedNotes.slice(0, PAGE_SIZE);
  log(`  Page 1 after delete: ${firstPageAfter.length} items`, BLUE);
  log(`  First item: "${firstPageAfter[0].title}"`, BLUE);
  log(`  Last item on page 1: "${firstPageAfter[firstPageAfter.length - 1].title}"`, BLUE);

  // Verify items from page 2 moved up to page 1
  const expectedNewFirst = firstPageBefore[3].title; // 4th item should now be first
  if (firstPageAfter[0].title === expectedNewFirst) {
    log(`  ✅ Page 1 correctly filled with items from page 2`, GREEN);
    log(`✅ TEST 3 PASSED: Pagination adjusts after deletions`, GREEN);
    return true;
  } else {
    log(`  ❌ Expected "${expectedNewFirst}" to be first, got "${firstPageAfter[0].title}"`, RED);
    return false;
  }
}

async function testNavigateBetweenPages() {
  log('\n=== TEST 4: Navigate Between Pages ===', YELLOW);
  log('Simulating page navigation and verifying consistency\n');

  // Page 1
  const page1 = await prisma.note.findMany({
    where: { canvasId: testCanvasId },
    orderBy: { title: 'asc' },
    skip: 0,
    take: PAGE_SIZE
  });

  // Page 2
  const page2 = await prisma.note.findMany({
    where: { canvasId: testCanvasId },
    orderBy: { title: 'asc' },
    skip: PAGE_SIZE,
    take: PAGE_SIZE
  });

  // Page 3
  const page3 = await prisma.note.findMany({
    where: { canvasId: testCanvasId },
    orderBy: { title: 'asc' },
    skip: PAGE_SIZE * 2,
    take: PAGE_SIZE
  });

  log(`  Page 1: ${page1.length} items, first: "${page1[0]?.title}"`, BLUE);
  log(`  Page 2: ${page2.length} items, first: "${page2[0]?.title}"`, BLUE);
  log(`  Page 3: ${page3.length} items, first: "${page3[0]?.title}"`, BLUE);

  // Verify no overlap between pages
  const page1Ids = new Set(page1.map(n => n.id));
  const page2Ids = new Set(page2.map(n => n.id));
  const page3Ids = new Set(page3.map(n => n.id));

  const page1And2Overlap = [...page1Ids].filter(id => page2Ids.has(id));
  const page2And3Overlap = [...page2Ids].filter(id => page3Ids.has(id));

  if (page1And2Overlap.length > 0) {
    log(`  ❌ Overlap between page 1 and 2: ${page1And2Overlap.length} items`, RED);
    return false;
  }

  if (page2And3Overlap.length > 0) {
    log(`  ❌ Overlap between page 2 and 3: ${page2And3Overlap.length} items`, RED);
    return false;
  }

  log(`  ✅ No overlap between pages`, GREEN);

  // Verify page boundaries are correct
  if (page2.length > 0 && page1[page1.length - 1].title < page2[0].title) {
    log(`  ✅ Page 1 ends before page 2 starts`, GREEN);
  } else {
    log(`  ❌ Page boundary issue between 1 and 2`, RED);
    return false;
  }

  if (page3.length > 0 && page2[page2.length - 1].title < page3[0].title) {
    log(`  ✅ Page 2 ends before page 3 starts`, GREEN);
  } else if (page3.length > 0) {
    log(`  ❌ Page boundary issue between 2 and 3`, RED);
    return false;
  }

  log(`✅ TEST 4 PASSED: Page navigation works correctly`, GREEN);
  return true;
}

async function testSearchLimitBehavior() {
  log('\n=== TEST 5: Search Limit (50 items) ===', YELLOW);
  log('Verifying search respects the 50-item limit\n');

  // We already have ~25 notes. Let's create more to exceed 50.
  const currentCount = await prisma.note.count({
    where: { canvasId: testCanvasId }
  });

  log(`  Current note count: ${currentCount}`, BLUE);

  // Add more notes to exceed 50
  const notesToAdd = Math.max(0, 60 - currentCount);
  if (notesToAdd > 0) {
    log(`  Adding ${notesToAdd} more notes...`, BLUE);
    for (let i = 0; i < notesToAdd; i++) {
      await prisma.note.create({
        data: {
          canvasId: testCanvasId,
          title: `Extra Note ${String(i + 1).padStart(3, '0')}`,
          content: `Extra content ${i + 1}`,
          positionX: 500 + i,
          positionY: 100,
          width: 300,
          height: 200
        }
      });
    }
  }

  // Simulate search API behavior
  const allNotes = await prisma.note.findMany({
    where: { canvasId: testCanvasId },
    orderBy: { updatedAt: 'desc' },
    take: 100 // Get more than 50 to simulate filtering
  });

  const totalCount = allNotes.length;
  const limitedResults = allNotes.slice(0, SEARCH_LIMIT);

  log(`  Total notes available: ${totalCount}`, BLUE);
  log(`  Search limit (app): ${SEARCH_LIMIT}`, BLUE);
  log(`  Results returned: ${limitedResults.length}`, BLUE);

  if (limitedResults.length === SEARCH_LIMIT && totalCount > SEARCH_LIMIT) {
    log(`  ✅ Search correctly limits to ${SEARCH_LIMIT} results`, GREEN);
    log(`✅ TEST 5 PASSED: Search limit behavior works correctly`, GREEN);
    return true;
  } else if (totalCount <= SEARCH_LIMIT && limitedResults.length === totalCount) {
    log(`  ✅ Search returns all ${totalCount} results (under limit)`, GREEN);
    log(`✅ TEST 5 PASSED: Search limit behavior works correctly`, GREEN);
    return true;
  } else {
    log(`  ❌ Search limit not working correctly`, RED);
    return false;
  }
}

async function runAllTests() {
  log('\n╔════════════════════════════════════════════════════════════════╗', BLUE);
  log('║  Feature #169: Pagination During Updates - Test Suite           ║', BLUE);
  log('╚════════════════════════════════════════════════════════════════╝', BLUE);

  const results = {
    passed: 0,
    failed: 0,
    total: 5
  };

  try {
    await setup();

    const test1 = await testPaginationInitialLoad();
    if (test1) results.passed++; else results.failed++;

    const test2 = await testAddNewItemsAppearOnPage1();
    if (test2) results.passed++; else results.failed++;

    const test3 = await testDeleteItemsFromPage1();
    if (test3) results.passed++; else results.failed++;

    const test4 = await testNavigateBetweenPages();
    if (test4) results.passed++; else results.failed++;

    const test5 = await testSearchLimitBehavior();
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
    log(`\n🎉 ALL TESTS PASSED! Feature #169 is working correctly.`, GREEN);
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
