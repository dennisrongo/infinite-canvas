import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking for existing users...');

  // Check for any existing user
  const users = await prisma.user.findMany({
    take: 5,
    select: { id: true, email: true, displayName: true }
  });

  console.log(`Found ${users.length} users:`);
  users.forEach(user => {
    console.log(`  - ${user.email} (${user.displayName || 'no name'})`);
  });

  // If no users or test user doesn't exist, create one
  const testEmail = 'feature46@example.com';
  const existingTestUser = await prisma.user.findUnique({
    where: { email: testEmail }
  });

  if (!existingTestUser) {
    console.log('\nCreating test user...');
    const passwordHash = await bcrypt.hash('Test1234!', 10);

    const user = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash,
        displayName: 'Feature 46 Test User'
      }
    });

    console.log(`✓ Created test user: ${user.email}`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Password: Test1234!`);
  } else {
    console.log('\nTest user already exists.');
    console.log(`  Email: ${testEmail}`);
    console.log(`  Password: Test1234!`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
