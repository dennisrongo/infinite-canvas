import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSchema() {
  try {
    // Get table information using raw query
    const tables = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`;

    console.log('Tables in database:');
    console.log(JSON.stringify(tables, null, 2));

    // Check specific tables from spec
    const requiredTables = [
      'users',
      'folders',
      'canvases',
      'notes',
      'note_connections',
      'images',
      'password_reset_tokens',
      'user_settings'
    ];

    const tableNames = (tables as any[]).map((t: any) => t.name);

    console.log('\nRequired tables check:');
    requiredTables.forEach(table => {
      const exists = tableNames.includes(table);
      console.log(`  ${table}: ${exists ? '✓ EXISTS' : '✗ MISSING'}`);
    });

    // Check column information for each table
    console.log('\n\nTable schemas:');
    for (const table of requiredTables) {
      if (tableNames.includes(table)) {
        const columns = await prisma.$queryRaw`PRAGMA table_info(${table})`;
        console.log(`\n${table}:`);
        console.log(JSON.stringify(columns, null, 2));
      }
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkSchema();
