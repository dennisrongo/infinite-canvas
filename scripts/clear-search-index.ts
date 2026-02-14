import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('Clearing search index...');
  await prisma.noteSearchIndex.deleteMany({});
  console.log('Search index cleared!');
  await prisma.$disconnect();
}

main();
