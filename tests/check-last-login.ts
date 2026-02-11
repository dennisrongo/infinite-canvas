const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLastLogin() {
  const user = await prisma.user.findUnique({
    where: { email: 'feature6-test@example.com' }
  });
  console.log('User found:', user ? 'YES' : 'NO');
  if (user) {
    console.log('User ID:', user.id);
    console.log('Email:', user.email);
    console.log('Last Login:', user.lastLogin);
    console.log('Last Login was updated:', user.lastLogin ? 'YES' : 'NO');
  }
  await prisma.$disconnect();
}

checkLastLogin().catch(console.error);
