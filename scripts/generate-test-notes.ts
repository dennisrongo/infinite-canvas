/**
 * Script to generate 1000+ test notes for performance testing
 * Usage: npx tsx scripts/generate-test-notes.ts
 */

import { prisma } from '../src/lib/prisma';
import { faker } from '@faker-js/faker';

const NUM_CANVASES = 10;
const NUM_NOTES_PER_CANVAS = 120; // Total: 1200 notes
const SEARCHABLE_WORDS = ['project', 'meeting', 'idea', 'task', 'note', 'design', 'feature', 'bug', 'review', 'planning', 'architecture', 'database', 'api', 'frontend', 'backend'];

async function generateTestNotes() {
  console.log('🌱 Generating test data for search performance testing...');

  // Get or create a test user
  const testUser = await prisma.user.upsert({
    where: { email: 'perftest@example.com' },
    update: {},
    create: {
      email: 'perftest@example.com',
      passwordHash: 'dummy_hash',
      displayName: 'Performance Test User',
    },
  });
  console.log(`✅ Test user: ${testUser.email} (ID: ${testUser.id})`);

  // Create canvases
  const createdCanvases = [];
  for (let i = 0; i < NUM_CANVASES; i++) {
    const canvas = await prisma.canvas.create({
      data: {
        userId: testUser.id,
        name: `Performance Test Canvas ${i + 1}`,
      },
    });
    createdCanvases.push(canvas);
    console.log(`✅ Created canvas: ${canvas.name} (ID: ${canvas.id})`);
  }

  // Create notes with searchable content
  let notesCreated = 0;
  for (const canvas of createdCanvases) {
    for (let i = 0; i < NUM_NOTES_PER_CANVAS; i++) {
      const hasSearchableWord = Math.random() > 0.3; // 70% contain searchable words
      const titleWord = hasSearchableWord
        ? SEARCHABLE_WORDS[Math.floor(Math.random() * SEARCHABLE_WORDS.length)]
        : 'Untitled';

      const title = `${titleWord} ${i + 1}`;

      // Generate content with random words
      const contentWords = [];
      for (let j = 0; j < 20; j++) {
        if (Math.random() > 0.5) {
          contentWords.push(SEARCHABLE_WORDS[Math.floor(Math.random() * SEARCHABLE_WORDS.length)]);
        } else {
          contentWords.push(faker.lorem.word());
        }
      }
      const content = contentWords.join(' ');

      await prisma.note.create({
        data: {
          canvasId: canvas.id,
          title,
          content,
          positionX: Math.random() * 2000,
          positionY: Math.random() * 2000,
          width: 300,
          height: 200,
        },
      });

      notesCreated++;
      if (notesCreated % 50 === 0) {
        console.log(`   Created ${notesCreated} notes...`);
      }
    }
    console.log(`✅ Created ${NUM_NOTES_PER_CANVAS} notes in ${canvas.name}`);
  }

  console.log(`\n✅ Successfully generated ${notesCreated} test notes across ${NUM_CANVASES} canvases!`);
  console.log(`\n📝 Search terms you can use:`);
  console.log(SEARCHABLE_WORDS.map(w => `   - "${w}"`).join('\n'));

  await prisma.$disconnect();
}

generateTestNotes().catch(console.error);
