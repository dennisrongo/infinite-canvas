const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check all tokens for our test user
  const tokens = await prisma.passwordResetToken.findMany({
    where: { userId: '232257db-e479-42e5-aefa-f14a92201e63' },
    orderBy: { createdAt: 'desc' }
  });

  console.log('Remaining tokens for test user:');
  console.log(JSON.stringify(tokens, null, 2));

  // Check user password was changed
  const user = await prisma.user.findUnique({
    where: { id: '232257db-e479-42e5-aefa-f14a92201e63' },
    select: { id: true, email: true, passwordHash: true }
  });

  console.log('\nUser info:');
  console.log(JSON.stringify({ id: user.id, email: user.email, passwordHashChanged: user.passwordHash !== undefined }, null, 2));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
