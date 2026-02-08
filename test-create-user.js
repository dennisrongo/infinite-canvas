const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const email = 'test-reset@example.com';
  const password = 'OldPass123!';

  // Check if user exists
  let user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    const passwordHash = await bcrypt.hash(password, 10);
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: 'Test Reset User'
      }
    });
    console.log('Created test user:', email);
  } else {
    console.log('Test user already exists:', email);
  }

  console.log('User ID:', user.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
