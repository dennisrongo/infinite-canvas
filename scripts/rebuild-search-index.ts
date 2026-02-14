/**
 * Search Index Rebuild Script
 * 
 * This script rebuilds the search index for all users or a specific user.
 * Run this once to populate the search index from existing notes.
 * 
 * Usage:
 *   npx tsx scripts/rebuild-search-index.ts          # Rebuild for all users
 *   npx tsx scripts/rebuild-search-index.ts <userId> # Rebuild for specific user
 */

import { prisma } from '../src/lib/prisma';
import { rebuildIndex, rebuildAllIndexes } from '../src/lib/search-index';

async function main() {
  const args = process.argv.slice(2);
  const userId = args[0];

  console.log('='.repeat(60));
  console.log('Search Index Rebuild Script');
  console.log('='.repeat(60));

  try {
    if (userId) {
      // Rebuild for specific user
      console.log(`\nRebuilding search index for user: ${userId}`);
      
      const result = await rebuildIndex(userId);
      
      console.log('\n✓ Index rebuild complete!');
      console.log(`  Indexed: ${result.indexed} notes`);
      console.log(`  Failed: ${result.failed} notes`);
      
      if (result.failed > 0) {
        console.log('\n⚠ Some notes failed to index. Check the logs above for details.');
      }
    } else {
      // Rebuild for all users
      console.log('\nRebuilding search index for ALL users...');
      console.log('This may take a while for large databases.\n');
      
      const result = await rebuildAllIndexes();
      
      console.log('\n✓ Index rebuild complete!');
      console.log(`  Users processed: ${result.usersProcessed}`);
      console.log(`  Total indexed: ${result.totalIndexed} notes`);
      console.log(`  Total failed: ${result.totalFailed} notes`);
      
      if (result.totalFailed > 0) {
        console.log('\n⚠ Some notes failed to index. Check the logs above for details.');
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('Done!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n✗ Error rebuilding search index:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
