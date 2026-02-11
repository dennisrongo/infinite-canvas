import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findUnique({
    where: { email: 'feature49@example.com' }
  });
  console.log('User:', user ? 'EXISTS' : 'NOT FOUND');
  if (user) {
    console.log('ID:', user.id);
    console.log('Email:', user.email);
  }
}
check().then(() => process.exit(0));
