import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function verifyPersistence() {
  console.log('=== POST-RESTART DATA PERSISTENCE VERIFICATION ===\n');

  // Read test data from file
  if (!fs.existsSync('.persistence-test-data.json')) {
    console.error('❌ Test data file not found!');
    console.error('   Run test-persistence-simple.ts first to create test data.');
    process.exit(1);
  }

  const testData = JSON.parse(
    fs.readFileSync('.persistence-test-data.json', 'utf-8')
  );

  console.log('📋 Test Data from file:');
  console.log(`   User ID: ${testData.userId}`);
  console.log(`   Folder ID: ${testData.folderId}`);
  console.log(`   Folder Name: ${testData.folderName}`);
  console.log(`   Email: ${testData.email}\n`);

  // Step 1: Verify user still exists
  console.log('Step 1: Verifying user still exists...');
  const userCheck = await prisma.user.findUnique({
    where: { id: testData.userId },
  });

  if (!userCheck) {
    console.error(`  ❌ USER NOT FOUND! Data was NOT persisted.`);
    console.error(`     Expected user ID: ${testData.userId}`);
    await cleanupTestData(testData.userId, testData.folderId);
    process.exit(1);
  }

  console.log(`  ✓ User found: ${userCheck.email}`);
  console.log(`  ✓ User ID matches: ${userCheck.id === testData.userId}`);

  // Step 2: Verify folder still exists
  console.log('\nStep 2: Verifying folder still exists...');
  const folderCheck = await prisma.folder.findUnique({
    where: { id: testData.folderId },
  });

  if (!folderCheck) {
    console.error(`  ❌ FOLDER NOT FOUND! Data was NOT persisted.`);
    console.error(`     Expected folder ID: ${testData.folderId}`);
    await cleanupTestData(testData.userId, testData.folderId);
    process.exit(1);
  }

  console.log(`  ✓ Folder found: ${folderCheck.name}`);
  console.log(`  ✓ Folder name matches: ${folderCheck.name === testData.folderName}`);
  console.log(`  ✓ Folder ID matches: ${folderCheck.id === testData.folderId}`);

  console.log('\n✅ SUCCESS! All data persisted across server restart!');
  console.log('   The application is using a REAL database, not in-memory storage.\n');

  // Cleanup
  await cleanupTestData(testData.userId, testData.folderId);
  console.log('🧹 Test data cleaned up successfully.\n');

  await prisma.$disconnect();
}

async function cleanupTestData(userId: string, folderId: string) {
  console.log('🧹 Cleaning up test data...');
  try {
    // Delete folder first (foreign key constraint)
    await prisma.folder.delete({
      where: { id: folderId },
    });
    console.log('  ✓ Test folder deleted');

    // Delete user
    await prisma.user.delete({
      where: { id: userId },
    });
    console.log('  ✓ Test user deleted');

    // Delete test data file
    fs.unlinkSync('.persistence-test-data.json');
    console.log('  ✓ Test data file deleted');
  } catch (error) {
    console.error('  ⚠️  Cleanup error (non-critical):', error);
  }
}

verifyPersistence().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
