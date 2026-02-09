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
  const data = await response.json();
  console.log('Response:', JSON.stringify(data, null, 2));

  if (data.token) {
    // Test using the token
    const canvasesResponse = await fetch('http://localhost:4002/api/canvases', {
      headers: { Authorization: `Bearer ${data.token}` },
    });

    console.log('\nCanvases Status:', canvasesResponse.status);
    const canvases = await canvasesResponse.json();
    console.log('Canvases:', JSON.stringify(canvases, null, 2));
  }
}

testLogin().catch(console.error);
