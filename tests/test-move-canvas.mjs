// Test script for Features #22, #23, #24
// Tests moving canvases between folders and to root

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Test configuration
const TEST_EMAIL = `test-feature22-${Date.now()}@example.com`;
const TEST_PASSWORD = 'Test1234!';

async function cleanup() {
  console.log('Cleaning up test data...');
  try {
    // Find test user
    const user = await prisma.user.findUnique({
      where: { email: TEST_EMAIL },
    });

    if (user) {
      // Delete canvases (will cascade to notes and connections)
      await prisma.canvas.deleteMany({
        where: { userId: user.id },
      });

      // Delete folders
      await prisma.folder.deleteMany({
        where: { userId: user.id },
      });

      // Delete user
      await prisma.user.delete({
        where: { id: user.id },
      });

      console.log('✓ Cleanup complete');
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

async function setup() {
  console.log('\n=== SETUP ===');

  // Register test user
  const bcryptModule = await import('bcryptjs');
  const bcrypt = bcryptModule.default;
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);

  const user = await prisma.user.create({
    data: {
      email: TEST_EMAIL,
      passwordHash,
      displayName: 'Feature 22 Test User',
    },
  });

  console.log(`✓ Created test user: ${user.id}`);

  // Create two folders
  const folderA = await prisma.folder.create({
    data: {
      userId: user.id,
      name: 'Folder A',
    },
  });

  const folderB = await prisma.folder.create({
    data: {
      userId: user.id,
      name: 'Folder B',
    },
  });

  console.log(`✓ Created Folder A: ${folderA.id}`);
  console.log(`✓ Created Folder B: ${folderB.id}`);

  // Create a canvas in Folder A
  const canvas = await prisma.canvas.create({
    data: {
      userId: user.id,
      folderId: folderA.id,
      name: 'Test Canvas',
    },
  });

  console.log(`✓ Created canvas in Folder A: ${canvas.id}`);

  return { user, folderA, folderB, canvas };
}

async function testMoveCanvasBetweenFolders() {
  console.log('\n=== TEST FEATURE #22: Move canvas between folders ===');

  const { user, folderA, folderB, canvas } = await setup();

  // Verify canvas is in Folder A
  let canvasCheck = await prisma.canvas.findUnique({
    where: { id: canvas.id },
  });

  if (canvasCheck.folderId !== folderA.id) {
    throw new Error('Canvas should be in Folder A initially');
  }
  console.log('✓ Canvas is in Folder A initially');

  // Move canvas to Folder B
  await prisma.canvas.update({
    where: { id: canvas.id },
    data: { folderId: folderB.id },
  });

  console.log('✓ Moved canvas to Folder B');

  // Verify canvas is now in Folder B
  canvasCheck = await prisma.canvas.findUnique({
    where: { id: canvas.id },
  });

  if (canvasCheck.folderId !== folderB.id) {
    throw new Error('Canvas should be in Folder B after move');
  }
  console.log('✓ Canvas is now in Folder B');

  // Verify canvas is no longer in Folder A's canvases
  const folderACheck = await prisma.folder.findUnique({
    where: { id: folderA.id },
    include: { canvases: true },
  });

  if (folderACheck.canvases.some(c => c.id === canvas.id)) {
    throw new Error('Canvas should not appear in Folder A');
  }
  console.log('✓ Canvas no longer appears in Folder A');

  // Verify canvas appears in Folder B's canvases
  const folderBCheck = await prisma.folder.findUnique({
    where: { id: folderB.id },
    include: { canvases: true },
  });

  if (!folderBCheck.canvases.some(c => c.id === canvas.id)) {
    throw new Error('Canvas should appear in Folder B');
  }
  console.log('✓ Canvas appears in Folder B');

  console.log('\n✅ FEATURE #22 PASSED: Canvas can be moved between folders');
}

async function testMoveCanvasToRoot() {
  console.log('\n=== TEST FEATURE #23: Move canvas to root ===');

  const { user, folderA, canvas } = await setup();

  // Verify canvas is in Folder A
  let canvasCheck = await prisma.canvas.findUnique({
    where: { id: canvas.id },
  });

  if (canvasCheck.folderId !== folderA.id) {
    throw new Error('Canvas should be in Folder A initially');
  }
  console.log('✓ Canvas is in Folder A initially');

  // Move canvas to root (folderId = null)
  await prisma.canvas.update({
    where: { id: canvas.id },
    data: { folderId: null },
  });

  console.log('✓ Moved canvas to root');

  // Verify canvas has no folder
  canvasCheck = await prisma.canvas.findUnique({
    where: { id: canvas.id },
  });

  if (canvasCheck.folderId !== null) {
    throw new Error('Canvas should have folderId = null');
  }
  console.log('✓ Canvas folderId is null');

  // Verify canvas is no longer in Folder A's canvases
  const folderACheck = await prisma.folder.findUnique({
    where: { id: folderA.id },
    include: { canvases: true },
  });

  if (folderACheck.canvases.some(c => c.id === canvas.id)) {
    throw new Error('Canvas should not appear in Folder A');
  }
  console.log('✓ Canvas no longer appears in Folder A');

  // Verify canvas appears in root canvases query
  const rootCanvases = await prisma.canvas.findMany({
    where: {
      userId: user.id,
      folderId: null,
    },
  });

  if (!rootCanvases.some(c => c.id === canvas.id)) {
    throw new Error('Canvas should appear in root canvases');
  }
  console.log('✓ Canvas appears in root canvases');

  console.log('\n✅ FEATURE #23 PASSED: Canvas can be moved to root');
}

async function testSidebarHierarchy() {
  console.log('\n=== TEST FEATURE #24: Sidebar hierarchy display ===');

  const { user, folderA, folderB } = await setup();

  // Fetch all folders with canvases
  const folders = await prisma.folder.findMany({
    where: { userId: user.id },
    include: {
      canvases: {
        select: { id: true, name: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Fetch all canvases
  const allCanvases = await prisma.canvas.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, updatedAt: true },
  });

  // Calculate root canvases
  const folderCanvasIds = new Set();
  folders.forEach(f => {
    f.canvases.forEach(c => folderCanvasIds.add(c.id));
  });

  const rootCanvases = allCanvases.filter(c => !folderCanvasIds.has(c.id));

  console.log(`✓ Fetched ${folders.length} folders`);
  console.log(`✓ Fetched ${allCanvases.length} total canvases`);
  console.log(`✓ Calculated ${rootCanvases.length} root canvases`);

  // Verify hierarchy structure
  if (folders.length !== 2) {
    throw new Error('Should have 2 folders');
  }
  console.log('✓ Correct number of folders');

  // Verify Folder A has 1 canvas
  const folderAFetched = folders.find(f => f.id === folderA.id);
  if (folderAFetched.canvases.length !== 1) {
    throw new Error('Folder A should have 1 canvas');
  }
  console.log('✓ Folder A contains 1 canvas');

  // Verify Folder B has 0 canvases
  const folderBFetched = folders.find(f => f.id === folderB.id);
  if (folderBFetched.canvases.length !== 0) {
    throw new Error('Folder B should have 0 canvases');
  }
  console.log('✓ Folder B contains 0 canvases');

  // Verify root canvases count
  if (rootCanvases.length !== 0) {
    throw new Error('Should have 0 root canvases');
  }
  console.log('✓ Correct number of root canvases');

  console.log('\n✅ FEATURE #24 PASSED: Sidebar hierarchy displays correctly');
}

async function runTests() {
  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   FEATURES #22, #23, #24 - Canvas Movement Tests            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    await testMoveCanvasBetweenFolders();
    await cleanup();

    await testMoveCanvasToRoot();
    await cleanup();

    await testSidebarHierarchy();
    await cleanup();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   ALL TESTS PASSED ✅                                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    await cleanup();
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
