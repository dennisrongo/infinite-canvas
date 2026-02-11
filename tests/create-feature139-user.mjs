import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const testEmail = 'feature139@example.com';
  const password = 'Feature139!';

  console.log('Creating test user for Feature #139...');

  // Check if user exists
  const existing = await prisma.user.findUnique({
    where: { email: testEmail }
  });

  if (existing) {
    console.log('User already exists, deleting...');
    await prisma.user.delete({ where: { email: testEmail } });
  }

  // Create new user
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      passwordHash,
      displayName: 'Feature 139 Test User'
    }
  });

  console.log(`✓ Created test user: ${user.email}`);
  console.log(`  Password: ${password}`);
  console.log(`  ID: ${user.id}`);

  // Create a test canvas with a note
  const canvas = await prisma.canvas.create({
    data: {
      userId: user.id,
      name: 'Feature 139 Test Canvas',
      folderId: null
    }
  });

  console.log(`✓ Created test canvas: ${canvas.id}`);

  const note = await prisma.note.create({
    data: {
      canvasId: canvas.id,
      title: 'Test Note for Refresh',
      content: '# Original Content\n\nThis is the original content before editing.',
      positionX: 100,
      positionY: 100,
      width: 300,
      height: 200
    }
  });

  console.log(`✓ Created test note: ${note.id}`);
  console.log('\nTest setup complete!');
  console.log(`Canvas URL: http://localhost:3010/canvas/${canvas.id}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
