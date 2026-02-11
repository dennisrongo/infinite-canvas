// Simple test user creation for search testing
import fetch from 'node-fetch';

const TEST_USER = {
  email: `search_ui_test_${Date.now()}@example.com`,
  password: 'TestPass123!',
};

async function createUser() {
  try {
    const res = await fetch('http://localhost:3500/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER)
    });

    if (res.ok) {
      const data = await res.json();
      console.log('✓ User created successfully');
      console.log(`Email: ${TEST_USER.email}`);
      console.log(`Password: ${TEST_USER.password}`);
      console.log(`\nNavigate to: http://localhost:3500/dashboard`);
      console.log('Login with the credentials above to test the search UI');
    } else {
      const error = await res.json();
      console.error('Failed to create user:', error);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

createUser();
