import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

main().then(() => prisma.$disconnect());

async function main() {
  const email = 'test_features_55_56_57@example.com';
  const password = 'test123456';

  // Delete existing user if any
  await prisma.user.deleteMany({
    where: { email }
  });

  // Create new user
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: 'Test User Features 55-56-57'
    }
  });

  // Create a default canvas for the user
  const canvas = await prisma.canvas.create({
    data: {
      userId: user.id,
      name: 'Test Canvas',
      viewportX: 0,
      viewportY: 0,
      zoom: 1
    }
  });

  console.log('Created user:', email);
  console.log('User ID:', user.id);
  console.log('Canvas ID:', canvas.id);
  console.log('Password:', password);
}
