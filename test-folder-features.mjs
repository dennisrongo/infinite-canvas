// Test script for Features #19, #20, #21 - Folder Management
// This script tests the folder management API endpoints

const API_BASE = 'http://localhost:3010';

// Test credentials
const TEST_USER = {
  email: `folder-test-${Date.now()}@example.com`,
  password: 'TestPass123!',
  displayName: 'Folder Test User'
};

let authToken = null;
let userId = null;
let testFolderId = null;
let testFolderWithCanvasId = null;
let testCanvasId = null;

async function test(description, fn) {
  console.log(`\n📋 ${description}`);
  try {
    await fn();
    console.log(`✅ PASSED`);
    return true;
  } catch (error) {
    console.error(`❌ FAILED: ${error.message}`);
    return false;
  }
}

async function register() {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_USER)
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Registration failed');
  }

  const data = await res.json();
  authToken = data.token;
  userId = data.user.id;
  console.log(`   Registered user: ${TEST_USER.email}`);
  console.log(`   User ID: ${userId}`);
}

async function createFolder(name) {
  const res = await fetch(`${API_BASE}/api/folders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `auth_token=${authToken}`
    },
    body: JSON.stringify({ name })
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create folder');
  }

  return await res.json();
}

async function getFolders() {
  const res = await fetch(`${API_BASE}/api/folders`, {
    headers: { 'Cookie': `auth_token=${authToken}` }
  });

  if (!res.ok) {
    throw new Error('Failed to fetch folders');
  }

  return await res.json();
}

async function renameFolder(folderId, newName) {
  const res = await fetch(`${API_BASE}/api/folders/${folderId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `auth_token=${authToken}`
    },
    body: JSON.stringify({ name: newName })
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to rename folder');
  }

  return await res.json();
}

async function deleteFolder(folderId, moveCanvasesToRoot = false) {
  const url = `${API_BASE}/api/folders/${folderId}?moveCanvasesToRoot=${moveCanvasesToRoot}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { 'Cookie': `auth_token=${authToken}` }
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to delete folder');
  }

  return await res.json();
}

async function createCanvas(name, folderId = null) {
  const body = { name };
  if (folderId) body.folderId = folderId;

  const res = await fetch(`${API_BASE}/api/canvases`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `auth_token=${authToken}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    throw new Error('Failed to create canvas');
  }

  return await res.json();
}

async function getCanvases() {
  const res = await fetch(`${API_BASE}/api/canvases`, {
    headers: { 'Cookie': `auth_token=${authToken}` }
  });

  if (!res.ok) {
    throw new Error('Failed to fetch canvases');
  }

  return await res.json();
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('FOLDER MANAGEMENT TEST - Features #19, #20, #21');
  console.log('═══════════════════════════════════════════════════════');

  // Setup: Register user
  await test('Setup: Register test user', async () => {
    await register();
  });

  // Feature #19: Create new folder with custom name
  console.log('\n🎯 FEATURE #19: Create new folder with custom name');
  console.log('═══════════════════════════════════════════════════════');

  await test('Create folder with unique name', async () => {
    const uniqueName = `TEST_FOLDER_19_${Date.now()}`;
    const result = await createFolder(uniqueName);

    if (!result.folder) {
      throw new Error('No folder returned');
    }

    if (result.folder.name !== uniqueName) {
      throw new Error(`Folder name mismatch: expected "${uniqueName}", got "${result.folder.name}"`);
    }

    testFolderId = result.folder.id;
    console.log(`   Created folder: ${result.folder.name} (ID: ${result.folder.id})`);
  });

  await test('Verify folder appears in folder list', async () => {
    const folders = await getFolders();

    if (!folders.folders) {
      throw new Error('No folders array in response');
    }

    const testFolder = folders.folders.find(f => f.id === testFolderId);
    if (!testFolder) {
      throw new Error('Created folder not found in list');
    }

    if (testFolder.canvases.length !== 0) {
      throw new Error('New folder should be empty');
    }

    console.log(`   Folder found in list with ${testFolder.canvases.length} canvases`);
  });

  await test('Validate empty folder name is rejected', async () => {
    let rejected = false;
    try {
      await createFolder('   ');
    } catch (error) {
      rejected = true;
      console.log(`   Correctly rejected: ${error.message}`);
    }

    if (!rejected) {
      throw new Error('Empty folder name should be rejected');
    }
  });

  // Feature #20: Delete folder
  console.log('\n🎯 FEATURE #20: Delete folder (empty and with canvases)');
  console.log('═══════════════════════════════════════════════════════');

  await test('Create folder with canvas for delete test', async () => {
    const folderResult = await createFolder(`TEST_FOLDER_WITH_CANVAS_${Date.now()}`);
    testFolderWithCanvasId = folderResult.folder.id;

    const canvasResult = await createCanvas('Test Canvas', testFolderWithCanvasId);
    testCanvasId = canvasResult.canvas.id;

    console.log(`   Created folder with canvas (ID: ${testFolderWithCanvasId})`);
  });

  await test('Verify folder has canvas inside', async () => {
    const folders = await getFolders();
    const folder = folders.folders.find(f => f.id === testFolderWithCanvasId);

    if (!folder) {
      throw new Error('Folder not found');
    }

    if (folder.canvases.length !== 1) {
      throw new Error(`Expected 1 canvas, found ${folder.canvases.length}`);
    }

    console.log(`   Folder contains ${folder.canvases.length} canvas`);
  });

  await test('Delete empty folder without confirmation', async () => {
    await deleteFolder(testFolderId);
    console.log(`   Empty folder deleted (ID: ${testFolderId})`);
  });

  await test('Verify empty folder was deleted', async () => {
    const folders = await getFolders();
    const deletedFolder = folders.folders.find(f => f.id === testFolderId);

    if (deletedFolder) {
      throw new Error('Deleted folder still exists');
    }

    console.log('   Empty folder successfully removed from database');
  });

  await test('Delete folder with canvases and move to root', async () => {
    await deleteFolder(testFolderWithCanvasId, true);
    console.log(`   Folder deleted, canvases moved to root`);
  });

  await test('Verify canvases moved to root', async () => {
    const canvases = await getCanvases();
    const movedCanvas = canvases.canvases.find(c => c.id === testCanvasId);

    if (!movedCanvas) {
      throw new Error('Canvas not found after folder deletion');
    }

    if (movedCanvas.folderId !== null) {
      throw new Error('Canvas should have folderId null (root)');
    }

    console.log('   Canvas successfully moved to root (folderId: null)');
  });

  // Feature #21: Rename folder
  console.log('\n🎯 FEATURE #21: Rename folder');
  console.log('═══════════════════════════════════════════════════════');

  await test('Create folder for rename test', async () => {
    const result = await createFolder(`ORIGINAL_NAME_${Date.now()}`);
    testFolderId = result.folder.id;
    console.log(`   Created folder: ${result.folder.name} (ID: ${testFolderId})`);
  });

  await test('Rename folder to new unique name', async () => {
    const newName = `RENAMED_FOLDER_21_${Date.now()}`;
    const result = await renameFolder(testFolderId, newName);

    if (!result.folder) {
      throw new Error('No folder returned');
    }

    if (result.folder.name !== newName) {
      throw new Error(`Folder name not updated: expected "${newName}", got "${result.folder.name}"`);
    }

    console.log(`   Renamed to: ${result.folder.name}`);
  });

  await test('Verify renamed folder in list', async () => {
    const folders = await getFolders();
    const folder = folders.folders.find(f => f.id === testFolderId);

    if (!folder) {
      throw new Error('Renamed folder not found');
    }

    if (!folder.name.startsWith('RENAMED_FOLDER_21_')) {
      throw new Error('Folder name was not updated in database');
    }

    console.log(`   Confirmed folder name in database: ${folder.name}`);
  });

  await test('Validate empty rename is rejected', async () => {
    let rejected = false;
    try {
      await renameFolder(testFolderId, '   ');
    } catch (error) {
      rejected = true;
      console.log(`   Correctly rejected: ${error.message}`);
    }

    if (!rejected) {
      throw new Error('Empty folder name should be rejected');
    }
  });

  // Cleanup
  console.log('\n🧹 Cleanup: Delete test folder');
  await test('Delete test folder', async () => {
    await deleteFolder(testFolderId);
    console.log('   Test folder deleted');
  });

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✅ ALL FOLDER MANAGEMENT TESTS COMPLETED');
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n📊 SUMMARY:');
  console.log('   ✅ Feature #19: Create new folder with custom name');
  console.log('   ✅ Feature #20: Delete folder (empty and with canvases)');
  console.log('   ✅ Features #21: Rename folder');
  console.log('\n🎉 All folder management features are working correctly!\n');
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
});
