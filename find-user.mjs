const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (user) {
    console.log('User ID:', user.id);
    console.log('Email:', user.email);
    console.log('Display Name:', user.displayName);
  } else {
    console.log('No users found');
  }
  await prisma.$disconnect();
}

main();
