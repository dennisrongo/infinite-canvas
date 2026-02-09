const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const fs = require('fs');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

async function main() {
  try {
    // Create or update test user
    const hashedPassword = await bcrypt.hash('Test123!@#', 10);
    const user = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: { passwordHash: hashedPassword },
      create: {
        email: 'test@example.com',
        passwordHash: hashedPassword,
        displayName: 'Test User',
      },
    });

    console.log('User ID:', user.id);
    console.log('User Email:', user.email);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('Token:', token);
    console.log('');
    console.log('You can now test by setting this cookie:');

    // Save to file for reference
    fs.writeFileSync('test-auth-token.txt', token);
    console.log('Token saved to test-auth-token.txt');

    // Also save a curl command to test
    console.log('');
    console.log('Test with curl:');
    console.log(`curl -H "Cookie: auth_token=${token}" http://localhost:3000/dashboard`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
