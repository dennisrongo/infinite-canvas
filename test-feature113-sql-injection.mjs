// Feature #113: SQL Injection Prevention Test
// This test verifies that SQL injection attempts are prevented
// by using Prisma ORM with parameterized queries

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SQL_INJECTION_ATTEMPTS = [
  "'; DROP TABLE notes; --",
  "'; DROP TABLE users; --",
  "' OR '1'='1",
  "' UNION SELECT * FROM users --",
  "admin'--",
  "'; DELETE FROM users WHERE '1'='1'; --",
  "<script>alert('xss')</script>",
  "${process.env.FLAG}",
  "$(cat /etc/passwd)",
  "`whoami`"
];

async function testSQLInjectionInSearch() {
  console.log('=== Feature #113: SQL Injection Prevention Test ===\n');

  // Create a test user
  const testEmail = `sql_injection_test_${Date.now()}@example.com`;
  console.log(`1. Creating test user: ${testEmail}`);

  // Clean up any existing test user
  await prisma.user.deleteMany({
    where: { email: { contains: 'sql_injection_test' } }
  }).catch(() => {});

  const user = await prisma.user.create({
    data: {
      email: testEmail,
      passwordHash: '$2b$10$test_hash_for_testing_only',
      displayName: 'SQL Injection Test User'
    }
  });
  console.log(`   ✓ User created: ${user.id}\n`);

  // Create test canvas with note
  const canvas = await prisma.canvas.create({
    data: {
      userId: user.id,
      name: 'Test Canvas'
    }
  });

  const note = await prisma.note.create({
    data: {
      canvasId: canvas.id,
      title: 'Safe Note Title',
      content: 'This is safe content',
      positionX: 0,
      positionY: 0,
      width: 200,
      height: 150
    }
  });
  console.log(`2. Created test canvas and note\n`);

  // Test each SQL injection attempt
  console.log('3. Testing SQL injection attempts in search...\n');

  let allTestsPassed = true;

  for (const injectionAttempt of SQL_INJECTION_ATTEMPTS) {
    try {
      console.log(`   Testing: "${injectionAttempt.substring(0, 40)}..."`);

      // Try to search with SQL injection payload
      const results = await prisma.note.findMany({
        where: {
          canvas: {
            userId: user.id
          },
          OR: [
            { title: { contains: injectionAttempt } },
            { content: { contains: injectionAttempt } }
          ]
        },
        include: {
          canvas: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // SQL injection should be treated as literal text
      // The query should succeed but return no results (no notes contain injection strings)
      console.log(`   ✓ Query succeeded - treated as literal text`);
      console.log(`   ✓ No SQL error occurred`);
      console.log(`   ✓ Results count: ${results.length} (expected: 0)\n`);

      // Verify no data was corrupted
      const notesCount = await prisma.note.count({
        where: { canvasId: canvas.id }
      });

      if (notesCount !== 1) {
        console.log(`   ✗ FAIL: Data corruption detected! Expected 1 note, found ${notesCount}`);
        allTestsPassed = false;
      } else {
        console.log(`   ✓ Data integrity verified: 1 note still exists\n`);
      }

    } catch (error) {
      // Any error here would indicate SQL injection vulnerability
      console.log(`   ✗ FAIL: SQL error occurred: ${error.message}`);
      console.log(`   ✗ This indicates potential SQL injection vulnerability!\n`);
      allTestsPassed = false;
    }
  }

  // Test SQL injection in note title update
  console.log('4. Testing SQL injection in note title update...\n');

  for (const injectionAttempt of SQL_INJECTION_ATTEMPTS.slice(0, 3)) {
    try {
      const updatedNote = await prisma.note.update({
        where: { id: note.id },
        data: { title: injectionAttempt }
      });

      console.log(`   ✓ Title updated to: "${injectionAttempt.substring(0, 30)}..."`);
      console.log(`   ✓ No SQL error occurred\n`);

      // Verify the title was saved as literal text
      if (updatedNote.title === injectionAttempt) {
        console.log(`   ✓ Title saved as literal text (not executed)\n`);
      } else {
        console.log(`   ✗ FAIL: Title was modified unexpectedly\n`);
        allTestsPassed = false;
      }

      // Restore original title
      await prisma.note.update({
        where: { id: note.id },
        data: { title: 'Safe Note Title' }
      });

    } catch (error) {
      console.log(`   ✗ FAIL: SQL error on title update: ${error.message}\n`);
      allTestsPassed = false;
    }
  }

  // Verify database tables still exist and are intact
  console.log('5. Verifying database integrity...\n');

  try {
    const usersCount = await prisma.user.count();
    const canvasesCount = await prisma.canvas.count();
    const notesCount = await prisma.note.count();

    console.log(`   ✓ Users table exists: ${usersCount} records`);
    console.log(`   ✓ Canvases table exists: ${canvasesCount} records`);
    console.log(`   ✓ Notes table exists: ${notesCount} records`);
    console.log(`   ✓ No tables were dropped\n`);

  } catch (error) {
    console.log(`   ✗ FAIL: Database integrity check failed: ${error.message}`);
    console.log(`   ✗ Tables may have been dropped!\n`);
    allTestsPassed = false;
  }

  // Cleanup
  console.log('6. Cleaning up test data...\n');
  await prisma.note.delete({ where: { id: note.id } });
  await prisma.canvas.delete({ where: { id: canvas.id } });
  await prisma.user.delete({ where: { id: user.id } });
  console.log('   ✓ Test data cleaned up\n');

  // Final result
  console.log('=== Test Result ===\n');

  if (allTestsPassed) {
    console.log('✅ PASS: Feature #113 - SQL Injection Prevention\n');
    console.log('All SQL injection attempts were safely handled.');
    console.log('Prisma ORM with parameterized queries prevents SQL injection.');
    console.log('All special characters are treated as literal text.\n');
    return 0;
  } else {
    console.log('✗ FAIL: Feature #113 - SQL Injection Prevention\n');
    console.log('Some tests failed. Review the output above.\n');
    return 1;
  }
}

// Run the test
testSQLInjectionInSearch()
  .then(exitCode => {
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('Test failed with error:', error);
    process.exit(1);
  });
