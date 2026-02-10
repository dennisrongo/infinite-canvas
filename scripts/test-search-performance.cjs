/**
 * Script to test search performance with 1000+ notes
 * Usage: node scripts/test-search-performance.cjs
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSearchPerformance() {
  console.log('🔍 Testing search performance...\n');

  // Find the canvas with the most notes
  const canvases = await prisma.$queryRaw`
    SELECT c.id, c.name, c.user_id, COUNT(n.id) as note_count
    FROM canvases c
    LEFT JOIN notes n ON c.id = n.canvas_id
    GROUP BY c.id
    ORDER BY note_count DESC
    LIMIT 1
  `;

  if (!canvases || canvases.length === 0 || canvases[0].note_count === 0) {
    console.error('❌ No canvas with notes found');
    await prisma.$disconnect();
    process.exit(1);
  }

  const canvas = canvases[0];
  console.log(`✅ Canvas: ${canvas.name} (${canvas.id})`);
  console.log(`📊 Total notes in canvas: ${canvas.note_count}\n`);

  if (canvas.note_count < 1000) {
    console.warn(`⚠️  Warning: Only ${canvas.note_count} notes. Test expects 1000+ notes.`);
  }

  // Test search terms
  const searchTerms = ['project', 'meeting', 'idea', 'task', 'note', 'design', 'feature', 'bug', 'review', 'planning'];

  const results = [];

  for (const term of searchTerms) {
    console.log(`\n🔎 Searching for: "${term}"`);

    // Method 1: Prisma findMany with JavaScript filtering (OLD METHOD - what we're replacing)
    const startTime1 = Date.now();
    const allNotes1 = await prisma.note.findMany({
      where: { canvasId: canvas.id },
      take: 100, // OLD LIMITATION
    });
    const filtered1 = allNotes1.filter(
      n => n.title.toLowerCase().includes(term) || n.content.toLowerCase().includes(term)
    ).slice(0, 50);
    const time1 = Date.now() - startTime1;

    console.log(`   Old method (take:100, JS filter): ${time1}ms, ${filtered1.length} results`);

    // Method 2: Raw SQL with LOWER and LIKE (NEW METHOD - optimized)
    const startTime2 = Date.now();
    const searchTerm = `%${term}%`;
    const notes2 = await prisma.$queryRaw`
      SELECT id, title, content
      FROM notes
      WHERE canvas_id = ${canvas.id}
        AND (LOWER(title) LIKE LOWER(${searchTerm}) OR LOWER(content) LIKE LOWER(${searchTerm}))
      LIMIT 50
    `;
    const time2 = Date.now() - startTime2;

    console.log(`   New method (raw SQL, no limit): ${time2}ms, ${notes2.length} results`);

    // Get true count for comparison
    const countResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM notes
      WHERE canvas_id = ${canvas.id}
        AND (LOWER(title) LIKE LOWER(${searchTerm}) OR LOWER(content) LIKE LOWER(${searchTerm}))
    `;
    const trueCount = Number(countResult[0].count);

    console.log(`   True matching notes in database: ${trueCount}`);

    // Note if old method missed results
    if (filtered1.length < Math.min(50, trueCount)) {
      console.log(`   ⚠️  Old method MISSED results! Found ${filtered1.length}, but database has ${trueCount}`);
    }

    results.push({
      term,
      oldTime: time1,
      oldResults: filtered1.length,
      newTime: time2,
      newResults: notes2.length,
      trueCount,
      missed: trueCount > filtered1.length,
    });
  }

  // Summary
  console.log('\n\n📊 PERFORMANCE SUMMARY');
  console.log('═'.repeat(80));
  console.log('Term         | Old (ms)   | New (ms)   | Speedup   | Results   | Missed?');
  console.log('─'.repeat(80));

  let totalOldTime = 0;
  let totalNewTime = 0;
  let totalMissed = 0;

  for (const r of results) {
    const speedup = r.oldTime > 0 ? ((r.oldTime - r.newTime) / r.oldTime * 100).toFixed(0) + '%' : 'N/A';
    console.log(`${r.term.padEnd(12)} | ${r.oldTime.toString().padEnd(10)} | ${r.newTime.toString().padEnd(10)} | ${speedup.padEnd(8)} | ${r.trueCount.toString().padEnd(8)} | ${r.missed ? 'YES ⚠️' : 'No'}`);
    totalOldTime += r.oldTime;
    totalNewTime += r.newTime;
    totalMissed += r.missed ? 1 : 0;
  }

  console.log('─'.repeat(80));
  const avgSpeedup = totalOldTime > 0 ? ((totalOldTime - totalNewTime) / totalOldTime * 100).toFixed(0) + '%' : 'N/A';
  console.log(`TOTAL        | ${totalOldTime.toString().padEnd(10)} | ${totalNewTime.toString().padEnd(10)} | ${avgSpeedup.padEnd(8)} |`);
  console.log('═'.repeat(80));

  console.log(`\n✅ Tests with ${canvas.note_count} notes:`);
  console.log(`   - Average search time: ${(totalNewTime / results.length).toFixed(0)}ms`);
  console.log(`   - Max search time: ${Math.max(...results.map(r => r.newTime))}ms`);
  console.log(`   - Min search time: ${Math.min(...results.map(r => r.newTime))}ms`);
  if (avgSpeedup !== 'N/A') {
    console.log(`   - Performance improvement: ${avgSpeedup}`);
  }

  if (totalMissed > 0) {
    console.log(`\n⚠️  WARNING: Old method missed results in ${totalMissed} out of ${results.length} searches!`);
  }

  // Verify < 2 second requirement
  const maxTime = Math.max(...results.map(r => r.newTime));
  if (maxTime < 2000) {
    console.log(`\n✅ PASS: All searches completed in under 2 seconds (${maxTime}ms max)`);
  } else {
    console.log(`\n❌ FAIL: Some searches exceeded 2 seconds (${maxTime}ms max)`);
  }

  await prisma.$disconnect();
}

testSearchPerformance().catch(console.error);
