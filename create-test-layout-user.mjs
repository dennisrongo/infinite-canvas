import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

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

  const passwordHash = await bcrypt.hash('LayoutTest123!', 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName: 'Layout Test User',
    }
  });

  console.log('Created user:', user.id, user.email);

  await prisma.$disconnect();
}

main().catch(console.error);
