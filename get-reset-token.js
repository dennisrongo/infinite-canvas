const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
  const email = 'test-reset@example.com';

  // Find user
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  // Delete any existing tokens
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id }
  });

  // Generate reset token (mimicking the auth library)
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

  // Create reset token
  const resetToken = await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt
    }
  });

  console.log('Password Reset Token created:');
  console.log('Token:', token);
  console.log('Expires:', expiresAt);
  console.log('');
  console.log('Reset Link:', `http://localhost:3010/auth/reset-password?token=${token}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
