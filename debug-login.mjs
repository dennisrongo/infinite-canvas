async function testLogin() {
  const response = await fetch('http://localhost:4002/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'features66@example.com',
      password: 'Test1234!@#$',
    }),
  });

  console.log('Status:', response.status);

  // Extract cookies from response
  const setCookieHeader = response.headers.get('set-cookie');
  console.log('Set-Cookie:', setCookieHeader);

  // Get cookie value
  let authToken = null;
  if (setCookieHeader) {
    const match = setCookieHeader.match(/auth_token=([^;]+)/);
    if (match) {
      authToken = match[1];
      console.log('Auth Token:', authToken ? authToken.substring(0, 20) + '...' : 'not found');
    }
  }

  if (authToken) {
    // Test using the cookie
    const canvasesResponse = await fetch('http://localhost:4002/api/canvases', {
      headers: {
        'Cookie': `auth_token=${authToken}`
      },
    });

    console.log('\nCanvases Status:', canvasesResponse.status);
    const canvases = await canvasesResponse.json();
    console.log('Canvases:', JSON.stringify(canvases, null, 2));
  }
}

testLogin().catch(console.error);
