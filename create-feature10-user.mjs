import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'feature10_test@example.com' }
    });

    if (existingUser) {
      console.log('User already exists:', existingUser.email);
      return existingUser;
    }

    // Hash password
    const passwordHash = await bcrypt.hash('Test1234!', 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: 'feature10_test@example.com',
        passwordHash,
        displayName: 'Feature10 Test User',
      }
    });

    console.log('Test user created:', user.email);
    return user;
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
