import { register } from './test-auth.mjs';

async function createTestUser() {
  const email = 'feature78@example.com';
  const password = 'Test1234!@#$';

  try {
    const result = await register(email, password);
    console.log('✅ Test user created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('User ID:', result.user.id);
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('✅ Test user already exists');
      console.log('Email:', email);
      console.log('Password:', password);
    } else {
      console.error('❌ Error creating test user:', error.message);
    }
  }
}

createTestUser();
