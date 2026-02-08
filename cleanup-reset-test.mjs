import { prisma } from './lib/prisma.ts';

async function cleanup() {
  await prisma.passwordResetToken.deleteMany({});
  await prisma.user.deleteMany({
    where: {
      email: {
        contains: 'test-reset'
      }
    }
  });
  console.log('Cleanup complete');
  await prisma.$disconnect();
}

cleanup();
