// Test script for Canvas features #16, #17, #18
const test = async () => {
  const baseURL = 'http://localhost:3010';

  console.log('=== Testing Canvas Features ===\n');

  // Step 1: Login
  console.log('1. Logging in...');
  const loginRes = await fetch(`${baseURL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'feature6-test@example.com',
      password: 'TestPass123!'
    }),
  });

  if (!loginRes.ok) {
    console.error('❌ Login failed');
    return;
  }

  const setCookieHeader = loginRes.headers.get('set-cookie');
  const cookie = setCookieHeader?.split(';')[0];
  console.log('✅ Logged in successfully\n');

  const headers = {
    'Content-Type': 'application/json',
    'Cookie': cookie
  };

  // Feature #16: Create new canvas with custom name
  console.log('=== Feature #16: Create new canvas ===');

  // Test 16.1: Create canvas in root
  console.log('16.1: Creating canvas in root...');
  const createRes1 = await fetch(`${baseURL}/api/canvases`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'TEST_CANVAS_16_ROOT_12345',
    }),
  });

  if (createRes1.ok) {
    const data1 = await createRes1.json();
    console.log('✅ Canvas created in root:', data1.canvas.name, 'ID:', data1.canvas.id);
  } else {
    console.error('❌ Failed to create canvas in root');
  }

  // Test 16.2: Create canvas with empty name (should fail)
  console.log('\n16.2: Creating canvas with empty name (should fail)...');
  const createRes2 = await fetch(`${baseURL}/api/canvases`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: '   ',
    }),
  });

  if (createRes2.status === 400) {
    const err = await createRes2.json();
    console.log('✅ Empty name rejected:', err.error);
  } else {
    console.error('❌ Empty name should have been rejected');
  }

  // Test 16.3: Create canvas in a folder (first create a folder)
  console.log('\n16.3: Creating folder...');
  const folderRes = await fetch(`${baseURL}/api/folders`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'TEST_FOLDER_16_12345',
    }),
  });

  if (folderRes.ok) {
    const folderData = await folderRes.json();
    console.log('✅ Folder created:', folderData.folder.name, 'ID:', folderData.folder.id);

    console.log('\n16.4: Creating canvas in folder...');
    const createRes3 = await fetch(`${baseURL}/api/canvases`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'TEST_CANVAS_16_FOLDER_12345',
        folderId: folderData.folder.id,
      }),
    });

    if (createRes3.ok) {
      const data3 = await createRes3.json();
      console.log('✅ Canvas created in folder:', data3.canvas.name);
      console.log('   Folder ID:', data3.canvas.folderId);
    } else {
      console.error('❌ Failed to create canvas in folder');
    }
  }

  // Test 16.5: Get all canvases
  console.log('\n16.5: Fetching all canvases...');
  const getRes = await fetch(`${baseURL}/api/canvases`, {
    headers,
  });

  if (getRes.ok) {
    const getData = await getRes.json();
    console.log('✅ Fetched canvases:', getData.canvases.length, 'total');
    getData.canvases.forEach((c) => {
      console.log(`   - ${c.name} (ID: ${c.id}, Folder: ${c.folderId || 'root'})`);
    });
  }

  // Feature #18: Rename canvas (testing before delete)
  console.log('\n=== Feature #18: Rename canvas ===');

  // Get the canvas we created
  const getCanvasRes = await fetch(`${baseURL}/api/canvases`, { headers });
  const canvases = (await getCanvasRes.json()).canvases;
  const canvasToRename = canvases.find((c) => c.name === 'TEST_CANVAS_16_ROOT_12345');

  if (canvasToRename) {
    console.log(`18.1: Renaming canvas "${canvasToRename.name}"...`);

    const renameRes = await fetch(`${baseURL}/api/canvases/${canvasToRename.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        name: 'RENAMED_CANVAS_18_12345',
      }),
    });

    if (renameRes.ok) {
      const renameData = await renameRes.json();
      console.log('✅ Canvas renamed to:', renameData.canvas.name);
    } else {
      console.error('❌ Failed to rename canvas');
    }

    // Test 18.2: Try to rename with empty name (should fail)
    console.log('\n18.2: Renaming canvas to empty name (should fail)...');
    const renameRes2 = await fetch(`${baseURL}/api/canvases/${canvasToRename.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        name: '   ',
      }),
    });

    if (renameRes2.status === 400) {
      const err = await renameRes2.json();
      console.log('✅ Empty name rejected:', err.error);
    } else {
      console.error('❌ Empty name should have been rejected');
    }
  }

  // Feature #17: Delete canvas with confirmation
  console.log('\n=== Feature #17: Delete canvas ===');

  // Get the renamed canvas
  const getCanvasRes2 = await fetch(`${baseURL}/api/canvases`, { headers });
  const canvases2 = (await getCanvasRes2.json()).canvases;
  const canvasToDelete = canvases2.find((c) => c.name === 'RENAMED_CANVAS_18_12345');

  if (canvasToDelete) {
    console.log(`17.1: Deleting canvas "${canvasToDelete.name}"...`);

    const deleteRes = await fetch(`${baseURL}/api/canvases/${canvasToDelete.id}`, {
      method: 'DELETE',
      headers,
    });

    if (deleteRes.ok) {
      const deleteData = await deleteRes.json();
      console.log('✅ Canvas deleted:', deleteData.message);

      // Verify it's gone
      console.log('\n17.2: Verifying canvas is deleted...');
      const verifyRes = await fetch(`${baseURL}/api/canvases`, { headers });
      const verifyData = await verifyRes.json();
      const stillExists = verifyData.canvases.some((c) => c.id === canvasToDelete.id);

      if (!stillExists) {
        console.log('✅ Canvas successfully removed from database');
      } else {
        console.error('❌ Canvas still exists after deletion');
      }
    } else {
      console.error('❌ Failed to delete canvas');
    }
  }

  // Test accessing deleted canvas (should 404)
  if (canvasToDelete) {
    console.log('\n17.3: Accessing deleted canvas via API (should 404)...');
    const deletedRes = await fetch(`${baseURL}/api/canvases/${canvasToDelete.id}`, {
      headers,
    });

    if (deletedRes.status === 404) {
      console.log('✅ Deleted canvas returns 404');
    } else {
      console.error('❌ Deleted canvas should return 404');
    }
  }

  console.log('\n=== All Tests Complete ===');
};

test().catch(console.error);
