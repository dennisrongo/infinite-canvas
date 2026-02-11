import { fetch } from 'undici';

const API_URL = 'http://localhost:54321';

async function createThemeTestUser() {
  console.log('Creating theme test user...');

  // Register test user
  const registerRes = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'theme_test@example.com',
      password: 'ThemeTest123!',
      name: 'Theme Test User'
    })
  });

  if (registerRes.ok) {
    const data = await registerRes.json();
    console.log('✅ Theme test user created successfully');
    console.log('Email: theme_test@example.com');
    console.log('Password: ThemeTest123!');
  } else if (registerRes.status === 409) {
    console.log('ℹ️  Theme test user already exists');
  } else {
    const error = await registerRes.json();
    console.error('❌ Failed to create theme test user:', error);
  }
}

createThemeTestUser();
