// Setup test notes for Feature #51 testing
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupTestNotes() {
  try {
    const user = await prisma.user.findFirst({
      where: {
        email: {
          contains: 'test'
        }
      }
    });

    if (!user) {
      console.error('No test user found');
      process.exit(1);
    }

    // Find or create a test canvas
    let canvas = await prisma.canvas.findFirst({
      where: {
        userId: user.id,
        name: 'Feature 51 Test Canvas'
      }
    });

    if (!canvas) {
      canvas = await prisma.canvas.create({
        data: {
          userId: user.id,
          name: 'Feature 51 Test Canvas',
          viewportX: 0,
          viewportY: 0,
          zoom: 1,
        }
      });
      console.log('Created test canvas');
    }

    // Create test notes
    const note1 = await prisma.note.create({
      data: {
        canvasId: canvas.id,
        title: 'Source Note TEST_51',
        content: 'This is the source note for testing connections',
        positionX: 100,
        positionY: 100,
      }
    });

    const note2 = await prisma.note.create({
      data: {
        canvasId: canvas.id,
        title: 'Target Note TEST_51',
        content: 'This is the target note for testing connections',
        positionX: 400,
        positionY: 100,
      }
    });

    const note3 = await prisma.note.create({
      data: {
        canvasId: canvas.id,
        title: 'Third Note TEST_51',
        content: 'Additional note for testing multiple connections',
        positionX: 250,
        positionY: 300,
      }
    });

    console.log('Created 3 test notes:');
    console.log(`- ${note1.title} (${note1.id})`);
    console.log(`- ${note2.title} (${note2.id})`);
    console.log(`- ${note3.title} (${note3.id})`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupTestNotes();
