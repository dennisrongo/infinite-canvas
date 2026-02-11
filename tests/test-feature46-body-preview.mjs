import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFeature46() {
  console.log('=== Testing Feature #46: Note Body Preview ===\n');

  // Find or create test user
  let user = await prisma.user.findFirst({
    where: { email: 'feature46@test.com' }
  });

  if (!user) {
    console.log('Creating test user...');
    user = await prisma.user.create({
      data: {
        email: 'feature46@test.com',
        passwordHash: 'test_hash',
        displayName: 'Feature 46 Tester',
      }
    });
    console.log('✅ Created test user:', user.id);
  } else {
    console.log('✅ Found existing test user:', user.id);
  }

  // Find or create a canvas
  let canvas = await prisma.canvas.findFirst({
    where: {
      userId: user.id,
      name: 'Feature 46 Test Canvas'
    }
  });

  if (!canvas) {
    console.log('\nCreating test canvas...');
    canvas = await prisma.canvas.create({
      data: {
        userId: user.id,
        name: 'Feature 46 Test Canvas',
      }
    });
    console.log('✅ Created test canvas:', canvas.id);
  } else {
    console.log('\n✅ Found existing test canvas:', canvas.id);
  }

  // Create test notes with different content types
  const testNotes = [
    {
      title: 'Multi-line Note',
      content: 'This is the first line of content.\nAnd this is the second line.\nThird line is here too.\nFourth line should not show in preview.',
    },
    {
      title: 'Markdown Note',
      content: '# Header here\n\n**Bold text** and *italic text*\n\n- List item 1\n- List item 2',
    },
    {
      title: 'Empty Note',
      content: '',
    },
    {
      title: 'Long Content Note',
      content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
    },
    {
      title: 'Wiki Links Note',
      content: 'Check out [[Other Note]] and [[Another Note]].\n\nAlso see [regular link](https://example.com).',
    }
  ];

  console.log('\nCreating/updating test notes...');
  for (const noteData of testNotes) {
    const existing = await prisma.note.findFirst({
      where: {
        canvasId: canvas.id,
        title: noteData.title
      }
    });

    if (existing) {
      await prisma.note.update({
        where: { id: existing.id },
        data: {
          content: noteData.content,
        }
      });
      console.log(`✅ Updated note: "${noteData.title}"`);
    } else {
      await prisma.note.create({
        data: {
          canvasId: canvas.id,
          title: noteData.title,
          content: noteData.content,
          positionX: Math.random() * 500,
          positionY: Math.random() * 500,
        }
      });
      console.log(`✅ Created note: "${noteData.title}"`);
    }
  }

  console.log('\n=== Setup Complete ===');
  console.log(`User: feature46@test.com / Test123!`);
  console.log(`Canvas: ${canvas.id}`);
  console.log(`Total notes: ${testNotes.length}`);
  console.log('\nNavigate to: http://localhost:8001/canvas/' + canvas.id);
  console.log('\nExpected previews:');
  console.log('1. Multi-line Note: "This is the first line of content. And this is the second line. Third line is here too..."');
  console.log('2. Markdown Note: "Header here Bold text and italic text - List item 1..."');
  console.log('3. Empty Note: "No content yet"');
  console.log('4. Long Content Note: Truncated to ~2-3 lines');
  console.log('5. Wiki Links Note: "Check out Other Note and Another Note..."');

  await prisma.$disconnect();
}

testFeature46().catch(console.error);
