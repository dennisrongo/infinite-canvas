#!/usr/bin/env node

async function http(url, options = {}) {
  return fetch(url, options);
}

const BASE_URL = 'http://localhost:3017';
const TEST_USER = {
  email: 'test_search_features_88_89_90@example.com',
  password: 'TestPass123!',
  displayName: 'Search Test User'
};

async function registerUser(userData) {
  const response = await http(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });

  const data = await response.json();
  return data;
}

async function main() {
  try {
    console.log('Creating test user...');
    const result = await registerUser(TEST_USER);

    if (result.error) {
      console.log('User might already exist or error:', result.error);
    } else {
      console.log('✓ User created successfully');
      console.log('Email:', TEST_USER.email);
      console.log('Password:', TEST_USER.password);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
