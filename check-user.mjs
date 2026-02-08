import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const user = await prisma.user.findUnique({
  where: { email: 'logout_test_12345@example.com' }
});

if (user) {
  console.log('User found:', user.id);
} else {
  console.log('User NOT found');
}

await prisma.$disconnect();
