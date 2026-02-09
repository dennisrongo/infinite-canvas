import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createFreshTestUser() {
  const email = 'feature49@example.com';
  const password = 'Test1234!';
  const displayName = 'Feature 49 Test User';

  console.log('Creating fresh test user...');

  // Check if user exists
  const existing = await prisma.user.findUnique({
    where: { email }
  });

  if (existing) {
    console.log('User already exists, deleting...');
    await prisma.user.delete({
      where: { email }
    });
  }

  // Create user
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: passwordHash,
      displayName: displayName,
    }
  });

  console.log('\n✅ Test user created:');
  console.log(`  Email: ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`  Display Name: ${displayName}`);
  console.log(`  User ID: ${user.id}`);

  // Create a test canvas with some notes
  console.log('\nCreating test canvas with notes...');

  const canvas = await prisma.canvas.create({
    data: {
      userId: user.id,
      name: 'Feature 49 Test Canvas',
    }
  });

  console.log(`  Canvas ID: ${canvas.id}`);

  // Create two notes
  const note1 = await prisma.note.create({
    data: {
      canvasId: canvas.id,
      title: 'Note 1',
      content: 'This is note 1',
      positionX: 100,
      positionY: 100,
      width: 300,
      height: 200,
    }
  });

  const note2 = await prisma.note.create({
    data: {
      canvasId: canvas.id,
      title: 'Note 2',
      content: 'This is note 2',
      positionX: 500,
      positionY: 100,
      width: 300,
      height: 200,
    }
  });

  console.log(`  Note 1 ID: ${note1.id}`);
  console.log(`  Note 2 ID: ${note2.id}`);

  // Create a connection between them
  const connection = await prisma.noteConnection.create({
    data: {
      canvasId: canvas.id,
      sourceNoteId: note1.id,
      targetNoteId: note2.id,
    }
  });

  console.log(`  Connection ID: ${connection.id}`);
  console.log('\n✅ Setup complete! You can now log in and test the features.');

  await prisma.$disconnect();
}

createFreshTestUser()
  .catch(console.error);
