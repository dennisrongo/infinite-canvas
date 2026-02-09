const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const user = await prisma.user.findUnique({ where: { email: 'test@example.com' } });
  console.log(JSON.stringify(user || null));
  await prisma.$disconnect();
})();
