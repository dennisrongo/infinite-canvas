/**
 * Create test user for features 66-67-68 testing
 */

async function registerUser() {
  try {
    const response = await fetch('http://localhost:4002/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'features66@example.com',
        password: 'Test1234!@#$',
        confirmPassword: 'Test1234!@#$'
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ User registered successfully');
      console.log('Email: features66@example.com');
      console.log('Password: Test1234!@#$');
    } else if (response.status === 400 && data.error.includes('already exists')) {
      console.log('✅ User already exists');
      console.log('Email: features66@example.com');
      console.log('Password: Test1234!@#$');
    } else {
      console.error('❌ Registration failed:', data.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

registerUser();
