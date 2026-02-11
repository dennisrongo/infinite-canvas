import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const users = await prisma.user.findMany({
  select: { email: true, displayName: true, createdAt: true },
  take: 5
});

console.log('Total users:', users.length);
console.log('Users:', JSON.stringify(users, null, 2));

await prisma.$disconnect();
