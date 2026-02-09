// Test login API
const response = await fetch('http://localhost:34571/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'feature46@example.com',
    password: 'Test1234!'
  })
});

const result = await response.json();
console.log('Status:', response.status);
console.log('Response:', result);
