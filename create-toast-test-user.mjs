import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestUser() {
  const email = 'toasttest@example.com';
  const password = 'TestPass123!';

  // Check if user exists
  const existing = await prisma.user.findUnique({
    where: { email }
  });

  if (existing) {
    console.log('User already exists:', email);
    await prisma.$disconnect();
    return;
  }

  // Create user
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName: 'Toast Test User',
    }
  });

  console.log('Created test user:');
  console.log('  Email:', email);
  console.log('  Password:', password);
  console.log('  User ID:', user.id);

  await prisma.$disconnect();
}

createTestUser().catch(console.error);
