import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const user = await prisma.user.findUnique({
  where: { email: 'feature6-session3@example.com' },
  select: {
    id: true,
    email: true,
    displayName: true,
    createdAt: true,
    // Not selecting password_hash for security
  }
});

console.log('User found in database:');
console.log(JSON.stringify(user, null, 2));

await prisma.$disconnect();
