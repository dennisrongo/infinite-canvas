// Test if user exists
async function testUser() {
  const response = await fetch('http://localhost:3010/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test-reset-password@example.com',
      password: 'OldPassword123!'
    })
  });

  const data = await response.json();
  console.log('Status:', response.status);
  console.log('Response:', data);
}

testUser();
