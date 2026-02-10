/**
 * Script to create 1000+ test notes for performance testing
 * Usage: node scripts/create-test-notes.cjs
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const NUM_NOTES = 1000;
const SEARCHABLE_WORDS = [
  'project', 'meeting', 'idea', 'task', 'note', 'design', 'feature',
  'bug', 'review', 'planning', 'architecture', 'database', 'api',
  'frontend', 'backend', 'testing', 'deployment', 'documentation'
];

const ADJECTIVES = ['quick', 'slow', 'big', 'small', 'red', 'blue', 'green', 'important', 'urgent', 'simple'];
const NOUNS = ['thing', 'item', 'concept', 'method', 'approach', 'solution', 'problem', 'answer', 'question', 'result'];

function getRandomWord() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj} ${noun}`;
}

async function createTestNotes() {
  console.log('🔍 Finding user canvas...');

  // Get the first user's canvas
  const canvas = await prisma.canvas.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  if (!canvas) {
    console.error('❌ No canvas found. Please create a canvas first.');
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`✅ Using canvas: ${canvas.name} (${canvas.id})`);

  // Count existing notes
  const existingCount = await prisma.note.count();
  console.log(`📊 Existing notes: ${existingCount}`);

  console.log(`\n🌱 Creating ${NUM_NOTES} test notes...`);

  const startTime = Date.now();

  // Create notes one at a time (SQLite limitation)
  for (let i = 0; i < NUM_NOTES; i++) {
    const hasSearchableWord = Math.random() > 0.3; // 70% contain searchable words
    const titleWord = hasSearchableWord
      ? SEARCHABLE_WORDS[Math.floor(Math.random() * SEARCHABLE_WORDS.length)]
      : 'Untitled';

    const title = `${titleWord} ${i + 1}`;

    // Generate content with random words
    const contentWords = [];
    for (let k = 0; k < 30; k++) {
      if (Math.random() > 0.5) {
        contentWords.push(SEARCHABLE_WORDS[Math.floor(Math.random() * SEARCHABLE_WORDS.length)]);
      } else {
        contentWords.push(getRandomWord());
      }
    }
    const content = contentWords.join(' ');

    await prisma.note.create({
      data: {
        canvasId: canvas.id,
        title,
        content,
        positionX: Math.random() * 4000 - 2000, // -2000 to 2000
        positionY: Math.random() * 4000 - 2000, // -2000 to 2000
        width: 300,
        height: 200,
      },
    });

    if ((i + 1) % 50 === 0) {
      console.log(`   Created ${i + 1} notes...`);
    }
  }

  const elapsed = Date.now() - startTime;

  // Count total notes
  const totalCount = await prisma.note.count();

  console.log(`\n✅ Successfully created ${NUM_NOTES} test notes in ${elapsed}ms!`);
  console.log(`\n📊 Total notes in database: ${totalCount}`);
  console.log(`\n📝 You can now search for terms like:`);
  console.log(SEARCHABLE_WORDS.slice(0, 10).map(w => `   - "${w}"`).join('\n'));

  await prisma.$disconnect();
}

createTestNotes().catch(console.error);
