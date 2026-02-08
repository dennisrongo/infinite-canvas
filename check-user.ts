const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  const user = await prisma.user.findUnique({
    where: { email: 'feature6-test@example.com' }
  });
  console.log('User found:', user ? 'YES' : 'NO');
  if (user) {
    console.log('User ID:', user.id);
    console.log('Email:', user.email);
    console.log('Display Name:', user.displayName);
    console.log('Created At:', user.createdAt);
    console.log('Password Hash stored:', user.passwordHash ? 'YES' : 'NO');
  }
  await prisma.$disconnect();
}

checkUser().catch(console.error);
