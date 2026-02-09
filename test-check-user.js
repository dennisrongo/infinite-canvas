const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  // Get the user
  const user = await prisma.user.findUnique({
    where: { email: 'regression-test-1770660787806@example.com' },
    select: { id: true, email: true, passwordHash: true }
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  // Test passwords
  const passwords = ['TestPassword123!', 'NewPassword123!', 'ChangedPassword123!'];

  console.log('Testing passwords for user:', user.email);
  for (const pwd of passwords) {
    const isValid = await bcrypt.compare(pwd, user.passwordHash);
    console.log(`  ${pwd}: ${isValid ? 'VALID ✓' : 'INVALID ✗'}`);
  }

  // Set a known password
  const newPassword = await bcrypt.hash('KnownPassword123!', 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newPassword }
  });

  console.log('\nPassword reset to: KnownPassword123!');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
