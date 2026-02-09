import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create test user
  const email = 'test@example.com';
  const password = 'password123';
  const passwordHash = await bcrypt.hash(password, 10);

  // Clean up existing test data
  await prisma.noteConnection.deleteMany({});
  await prisma.note.deleteMany({});
  await prisma.canvas.deleteMany({});
  await prisma.userSettings.deleteMany({});
  await prisma.user.deleteMany({
    where: { email }
  });

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName: 'Test User',
      settings: {
        create: {
          theme: 'light',
          canvasSortOrder: 'updated'
        }
      }
    }
  });

  console.log('Created test user:', { email, password });

  // Create a canvas with notes and connections for testing
  const canvas = await prisma.canvas.create({
    data: {
      userId: user.id,
      name: 'Test Canvas for Regression Testing',
      viewportX: 0,
      viewportY: 0,
      zoom: 1,
      notes: {
        create: [
          {
            title: 'Note 1',
            content: 'This is the first note',
            positionX: 100,
            positionY: 100,
            width: 300,
            height: 200
          },
          {
            title: 'Note 2',
            content: 'This is the second note',
            positionX: 500,
            positionY: 100,
            width: 300,
            height: 200
          },
          {
            title: 'Note 3',
            content: 'This is the third note',
            positionX: 300,
            positionY: 400,
            width: 300,
            height: 200
          },
          {
            title: 'Distant Note',
            content: 'This note is far away for zoom testing',
            positionX: 2000,
            positionY: 1500,
            width: 300,
            height: 200
          }
        ]
      }
    }
  });

  console.log('Created canvas with notes');

  // Get the notes we just created
  const notes = await prisma.note.findMany({
    where: { canvasId: canvas.id },
    orderBy: { createdAt: 'asc' }
  });

  // Create connections between notes
  if (notes.length >= 3) {
    await prisma.noteConnection.create({
      data: {
        canvasId: canvas.id,
        sourceNoteId: notes[0].id,
        targetNoteId: notes[1].id
      }
    });

    await prisma.noteConnection.create({
      data: {
        canvasId: canvas.id,
        sourceNoteId: notes[1].id,
        targetNoteId: notes[2].id
      }
    });

    await prisma.noteConnection.create({
      data: {
        canvasId: canvas.id,
        sourceNoteId: notes[0].id,
        targetNoteId: notes[2].id
      }
    });

    console.log('Created connections between notes');
  }

  console.log('Seed complete!');
  console.log(`Canvas ID: ${canvas.id}`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
