import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestData() {
  try {
    console.log('Creating test user and notes for Feature #94...');

    // Check if test user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'feature94@test.com' }
    });

    let user;
    if (existingUser) {
      console.log('Test user already exists, deleting old data...');
      user = existingUser;

      // Delete existing canvases and their notes
      await prisma.note.deleteMany({
        where: {
          canvas: {
            userId: user.id
          }
        }
      });

      await prisma.canvas.deleteMany({
        where: { userId: user.id }
      });
    } else {
      // Create test user
      const hashedPassword = await bcrypt.hash('Test1234!', 10);
      user = await prisma.user.create({
        data: {
          email: 'feature94@test.com',
          passwordHash: hashedPassword,
          displayName: 'Feature 94 Test User',
        }
      });
      console.log('Created test user:', user.email);
    }

    // Create a canvas
    const canvas = await prisma.canvas.create({
      data: {
        userId: user.id,
        name: 'Search Filter Test Canvas',
      }
    });
    console.log('Created canvas:', canvas.name);

    const now = new Date();

    // Create notes with different timestamps
    const notes = [
      {
        title: 'Today Note - SEARCH_FILTER_TODAY',
        content: 'This note was created today for testing the today filter in search.',
        positionX: 100,
        positionY: 100,
        createdAt: now,
        updatedAt: now,
      },
      {
        title: 'Yesterday Note - SEARCH_FILTER_WEEK',
        content: 'This note was created yesterday for testing the week filter in search.',
        positionX: 300,
        positionY: 100,
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
        updatedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      },
      {
        title: 'Last Week Note - SEARCH_FILTER_WEEK',
        content: 'This note was created 5 days ago for testing the week filter in search.',
        positionX: 500,
        positionY: 100,
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        updatedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Last Month Note - SEARCH_FILTER_MONTH',
        content: 'This note was created 20 days ago for testing the month filter in search.',
        positionX: 100,
        positionY: 300,
        createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
        updatedAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Old Note - SEARCH_FILTER_YEAR',
        content: 'This note was created 6 months ago for testing the year filter in search.',
        positionX: 300,
        positionY: 300,
        createdAt: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000), // 180 days ago
        updatedAt: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Very Old Note - SEARCH_FILTER_OLD',
        content: 'This note was created over a year ago for testing the year filter in search.',
        positionX: 500,
        positionY: 300,
        createdAt: new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000), // 400 days ago
        updatedAt: new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000),
      },
    ];

    for (const note of notes) {
      await prisma.note.create({
        data: {
          canvasId: canvas.id,
          title: note.title,
          content: note.content,
          positionX: note.positionX,
          positionY: note.positionY,
          width: 300,
          height: 200,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
        }
      });
      console.log('Created note:', note.title);
    }

    console.log('\n✅ Test data created successfully!');
    console.log('\nTest User Credentials:');
    console.log('Email: feature94@test.com');
    console.log('Password: Test1234!');
    console.log('\nNotes created with different timestamps for testing filters.');
    console.log('- 1 note from today');
    console.log('- 2 notes from last week');
    console.log('- 1 note from last month');
    console.log('- 1 note from 6 months ago');
    console.log('- 1 note from over a year ago');

  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();
