async function testPersistence() {
  const baseUrl = 'http://localhost:3006';

  // Step 1: Create test user
  console.log('Step 1: Creating test user...');
  const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'PERSIST_TEST_12345@example.com',
      password: 'TestPass123!',
      confirmPassword: 'TestPass123!'
    })
  });

  if (!registerResponse.ok) {
    const error = await registerResponse.text();
    console.error('Registration failed:', error);
    process.exit(1);
  }

  const userData = await registerResponse.json();
  console.log('✓ User created:', userData.user.id);

  // Get the session cookie
  const setCookie = registerResponse.headers.get('set-cookie');
  const cookieMatch = setCookie?.match(/session=([^;]+)/);
  const sessionCookie = cookieMatch ? cookieMatch[1] : null;

  if (!sessionCookie) {
    console.error('No session cookie received');
    process.exit(1);
  }

  console.log('✓ Session cookie received');

  // Step 2: Create test folder
  console.log('\nStep 2: Creating test folder...');
  const folderResponse = await fetch(`${baseUrl}/api/folders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `session=${sessionCookie}`
    },
    body: JSON.stringify({
      name: 'PERSIST_FOLDER_TEST_12345'
    })
  });

  if (!folderResponse.ok) {
    const error = await folderResponse.text();
    console.error('Folder creation failed:', error);
    process.exit(1);
  }

  const folderData = await folderResponse.json();
  console.log('✓ Folder created:', folderData.folder.id);
  console.log('  Folder name:', folderData.folder.name);

  // Step 3: Verify folder exists
  console.log('\nStep 3: Verifying folder exists...');
  const getFoldersResponse = await fetch(`${baseUrl}/api/folders`, {
    headers: {
      'Cookie': `session=${sessionCookie}`
    }
  });

  if (!getFoldersResponse.ok) {
    console.error('Get folders failed');
    process.exit(1);
  }

  const foldersData = await getFoldersResponse.json();
  const testFolder = foldersData.folders.find((f: any) => f.name === 'PERSIST_FOLDER_TEST_12345');

  if (!testFolder) {
    console.error('✗ Test folder NOT found in list');
    process.exit(1);
  }

  console.log('✓ Test folder found in list');
  console.log('  Folder ID:', testFolder.id);

  console.log('\n✅ Data persistence test setup complete!');
  console.log('\nNext steps:');
  console.log('1. Stop the server (kill process ' + process.pid + ')');
  console.log('2. Wait 5 seconds');
  console.log('3. Restart the server with: npm run dev');
  console.log('4. Run this script again to verify data persists');
  console.log('\nTest folder ID to verify after restart:', testFolder.id);
}

testPersistence().catch(console.error);
