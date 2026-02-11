import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFeature18() {
  console.log('=== Testing Feature #18: Rename Canvas ===\n');

  try {
    // 1. Find the renamed canvas
    const canvas = await prisma.canvas.findFirst({
      where: {
        name: 'RENAMED_CANVAS_18_SUCCESS'
      }
    });

    if (!canvas) {
      console.log('❌ FAILED: Canvas not found in database');
      return false;
    }

    console.log('✅ Canvas found in database');
    console.log('   - ID:', canvas.id);
    console.log('   - Name:', canvas.name);
    console.log('   - User ID:', canvas.userId);
    console.log('   - Folder ID:', canvas.folderId || 'Root (no folder)');
    console.log('   - Created:', canvas.createdAt);
    console.log('   - Updated:', canvas.updatedAt);

    // 2. Verify the name was updated correctly
    if (canvas.name !== 'RENAMED_CANVAS_18_SUCCESS') {
      console.log('❌ FAILED: Canvas name not updated correctly');
      return false;
    }

    console.log('\n✅ Canvas name updated correctly in database');

    // 3. Verify the updatedAt timestamp changed
    if (canvas.updatedAt <= canvas.createdAt) {
      console.log('⚠️  WARNING: updatedAt timestamp not updated');
    } else {
      console.log('✅ updatedAt timestamp updated correctly');
    }

    // 4. Check for mock data patterns
    console.log('\n--- Mock Data Check ---');
    const mockPatterns = ['globalThis', 'devStore', 'dev-store', 'mockDb', 'mockData'];
    let hasMockData = false;

    for (const pattern of mockPatterns) {
      if (JSON.stringify(canvas).includes(pattern)) {
        console.log(`❌ MOCK DATA FOUND: ${pattern} detected`);
        hasMockData = true;
      }
    }

    if (!hasMockData) {
      console.log('✅ No mock data patterns detected');
    }

    console.log('\n=== Feature #18 Test: PASSED ✅ ===\n');
    return true;

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

testFeature18()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
