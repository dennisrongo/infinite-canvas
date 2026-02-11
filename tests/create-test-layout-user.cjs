const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('../src/lib/auth');

const prisma = new PrismaClient();

async function main() {
  const email = 'layout_test@example.com';

  const existing = await prisma.user.findUnique({
    where: { email }
  });

  if (existing) {
    console.log('User exists:', existing.id, existing.email);
    await prisma.$disconnect();
    return;
  }

  const passwordHash = await hashPassword('LayoutTest123!');

  const user = await prisma.user.create({
    data: {
      email,
      password_hash: passwordHash,
      display_name: 'Layout Test User',
    }
  });

  console.log('Created user:', user.id, user.email);

  await prisma.$disconnect();
}

main().catch(console.error);
