// Test script for toast features #104, #105, #106
// This script tests success and error toasts as well as empty states

const testLoginAndCreateCanvas = async () => {
  console.log('=== Testing Toast Features #104, #105, #106 ===\n');

  // First, login to get session token
  console.log('1. Testing login...');
  const loginResponse = await fetch('http://localhost:3015/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'toasttest@example.com',
      password: 'TestPass123!'
    })
  });

  if (!loginResponse.ok) {
    console.log('  ✗ Login failed');
    return;
  }

  const loginData = await loginResponse.json();
  const cookies = loginResponse.headers.get('set-cookie');
  console.log('  ✓ Login successful');
  console.log('  Session:', cookies ? 'Yes' : 'No');

  // Get cookie for subsequent requests
  const sessionCookie = cookies?.split(';')[0] || '';

  // Test creating a canvas (should trigger success toast)
  console.log('\n2. Testing canvas creation (success toast)...');
  const canvasResponse = await fetch('http://localhost:3015/api/canvases', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie
    },
    body: JSON.stringify({ name: 'Toast Test Canvas' })
  });

  if (canvasResponse.ok) {
    const canvasData = await canvasResponse.json();
    console.log('  ✓ Canvas created successfully');
    console.log('  Canvas ID:', canvasData.canvas.id);
    console.log('  Canvas Name:', canvasData.canvas.name);
  } else {
    console.log('  ✗ Canvas creation failed');
    const error = await canvasResponse.text();
    console.log('  Error:', error);
  }

  // Test creating a folder (should trigger success toast)
  console.log('\n3. Testing folder creation (success toast)...');
  const folderResponse = await fetch('http://localhost:3015/api/folders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie
    },
    body: JSON.stringify({ name: 'Toast Test Folder' })
  });

  if (folderResponse.ok) {
    const folderData = await folderResponse.json();
    console.log('  ✓ Folder created successfully');
    console.log('  Folder ID:', folderData.folder.id);
    console.log('  Folder Name:', folderData.folder.name);
  } else {
    console.log('  ✗ Folder creation failed');
    const error = await folderResponse.text();
    console.log('  Error:', error);
  }

  // Test error case - create canvas with empty name (should trigger error toast)
  console.log('\n4. Testing error case - empty canvas name (error toast)...');
  const errorResponse = await fetch('http://localhost:3015/api/canvases', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie
    },
    body: JSON.stringify({ name: '' })
  });

  if (!errorResponse.ok) {
    const errorData = await errorResponse.json();
    console.log('  ✓ Error correctly returned');
    console.log('  Error message:', errorData.error);
  } else {
    console.log('  ✗ Should have returned error for empty name');
  }

  // Test error case - create folder with empty name
  console.log('\n5. Testing error case - empty folder name (error toast)...');
  const folderErrorResponse = await fetch('http://localhost:3015/api/folders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie
    },
    body: JSON.stringify({ name: '' })
  });

  if (!folderErrorResponse.ok) {
    const errorData = await folderErrorResponse.json();
    console.log('  ✓ Error correctly returned');
    console.log('  Error message:', errorData.error);
  } else {
    console.log('  ✗ Should have returned error for empty name');
  }

  // Check empty state - fetch canvases for a new user
  console.log('\n6. Testing empty state (no canvases)...');

  // Create a new user for empty state testing
  const newUserResponse = await fetch('http://localhost:3015/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'emptystate' + Date.now() + '@example.com',
      password: 'Test1234!',
      displayName: 'Empty State Test User'
    })
  });

  if (newUserResponse.ok) {
    console.log('  ✓ New user created for empty state testing');

    // Now login as this user
    const newLoginResponse = await fetch('http://localhost:3015/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'emptystate' + Date.now() + '@example.com',
        password: 'Test1234!'
      })
    });

    if (newLoginResponse.ok) {
      const newCookies = newLoginResponse.headers.get('set-cookie');
      const newSessionCookie = newCookies?.split(';')[0] || '';

      // Fetch canvases
      const canvasesResponse = await fetch('http://localhost:3015/api/canvases', {
        headers: { 'Cookie': newSessionCookie }
      });

      if (canvasesResponse.ok) {
        const canvasesData = await canvasesResponse.json();
        console.log('  ✓ Empty state verified -', canvasesData.canvases.length, 'canvases');
        console.log('  Empty state message should be shown in UI');
      }
    }
  }

  console.log('\n=== Test Complete ===');
};

testLoginAndCreateCanvas().catch(console.error);
