import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testPersistence() {
  console.log('=== SIMPLE DATA PERSISTENCE TEST ===\n');

  // Step 1: Create a test user
  console.log('Step 1: Creating test user with unique email...');
  const testEmail = `PERSIST_TEST_${Date.now()}@example.com`;
  console.log(`  Email: ${testEmail}`);

  const user = await prisma.user.create({
    data: {
      email: testEmail,
      passwordHash: 'test_hash_12345',
      displayName: 'Persistence Test User',
    },
  });

  console.log(`  ✓ User created with ID: ${user.id}`);

  // Step 2: Create a test folder
  console.log('\nStep 2: Creating test folder...');
  const testFolderName = `PERSIST_FOLDER_TEST_${Date.now()}`;
  console.log(`  Folder name: ${testFolderName}`);

  const folder = await prisma.folder.create({
    data: {
      userId: user.id,
      name: testFolderName,
    },
  });

  console.log(`  ✓ Folder created with ID: ${folder.id}`);
  console.log(`  Folder ID to verify: ${folder.id}`);
  console.log(`  Folder name to verify: ${folder.name}`);

  // Step 3: Verify data exists BEFORE restart
  console.log('\nStep 3: Verifying data exists in database...');
  const userCheck = await prisma.user.findUnique({
    where: { id: user.id },
  });
  const folderCheck = await prisma.folder.findUnique({
    where: { id: folder.id },
  });

  if (!userCheck || !folderCheck) {
    console.error('  ✗ Data verification FAILED before restart!');
    process.exit(1);
  }

  console.log(`  ✓ User exists: ${userCheck.email}`);
  console.log(`  ✓ Folder exists: ${folderCheck.name}`);

  console.log('\n✅ PRE-RESTART VERIFICATION COMPLETE!');
  console.log('\n⚠️  NEXT STEPS:');
  console.log('1. Stop this server (Ctrl+C)');
  console.log('2. Wait 5 seconds');
  console.log('3. Restart server: npm run dev');
  console.log('4. Run verification script: npx tsx test-persistence-verify.ts');
  console.log(`\n📝 Test Data IDs:`);
  console.log(`   User ID: ${user.id}`);
  console.log(`   Folder ID: ${folder.id}`);
  console.log(`   Folder Name: ${folder.name}`);

  // Save IDs to a file for the verification script
  const fs = require('fs');
  fs.writeFileSync(
    '.persistence-test-data.json',
    JSON.stringify({
      userId: user.id,
      folderId: folder.id,
      folderName: folder.name,
      email: testEmail,
    }),
    'utf-8'
  );
  console.log('\n💾 Test data saved to .persistence-test-data.json');

  await prisma.$disconnect();
}

testPersistence().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
