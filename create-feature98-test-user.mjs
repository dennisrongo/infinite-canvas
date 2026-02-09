/**
 * Create test user for Feature #98
 */
const TEST_USER = {
  email: 'feature98@test.com',
  password: 'Test1234!',
  displayName: 'Feature98 Test User'
};

fetch('http://localhost:3010/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(TEST_USER),
})
.then(res => res.json())
.then(data => {
  console.log('User creation response:', data);
})
.catch(err => {
  console.error('Error:', err.message);
});
