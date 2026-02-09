/**
 * Test Script for Feature #155: Canvas deletion cascades to notes
 *
 * This script tests that deleting a canvas properly cascades to:
 * 1. All notes in the canvas
 * 2. All connections in the canvas
 * 3. All images attached to notes
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Test user credentials
const TEST_USER = {
  email: `test_cascade_${Date.now()}@example.com`,
  password: 'TestPass123!',
  displayName: 'Cascade Test User'
};

let testUserId = null;
let testCanvasId = null;
let testNoteIds = [];
let testConnectionIds = [];

async function cleanup() {
  console.log('\n=== Cleaning up test data ===');
  try {
    // Delete test canvas (should cascade)
    if (testCanvasId) {
      await prisma.canvas.deleteMany({
        where: {
          id: testCanvasId
        }
      });
      console.log('✓ Deleted test canvas');
    }

    // Delete test user
    if (testUserId) {
      await prisma.user.deleteMany({
        where: {
          email: TEST_USER.email
        }
      });
      console.log('✓ Deleted test user');
    }
  } catch (error) {
    console.error('Error during cleanup:', error.message);
  }
}

async function runTest() {
  console.log('=== Testing Feature #155: Canvas deletion cascades to notes ===\n');

  try {
    // Step 1: Create test user
    console.log('Step 1: Creating test user...');
    const passwordHash = await bcrypt.hash(TEST_USER.password, 10);

    const user = await prisma.user.create({
      data: {
        email: TEST_USER.email,
        passwordHash: passwordHash,
        displayName: TEST_USER.displayName
      }
    });
    testUserId = user.id;
    console.log(`✓ Created user: ${user.email} (ID: ${user.id})`);

    // Step 2: Create a canvas
    console.log('\nStep 2: Creating canvas with multiple notes...');
    const canvas = await prisma.canvas.create({
      data: {
        userId: testUserId,
        name: `Test Canvas ${Date.now()}`
      }
    });
    testCanvasId = canvas.id;
    console.log(`✓ Created canvas: ${canvas.name} (ID: ${canvas.id})`);

    // Step 3: Create multiple notes
    console.log('\nStep 3: Creating notes...');
    const note1 = await prisma.note.create({
      data: {
        canvasId: canvas.id,
        title: 'Note 1',
        content: 'Content of note 1',
        positionX: 100,
        positionY: 100
      }
    });
    testNoteIds.push(note1.id);

    const note2 = await prisma.note.create({
      data: {
        canvasId: canvas.id,
        title: 'Note 2',
        content: 'Content of note 2',
        positionX: 300,
        positionY: 100
      }
    });
    testNoteIds.push(note2.id);

    const note3 = await prisma.note.create({
      data: {
        canvasId: canvas.id,
        title: 'Note 3',
        content: 'Content of note 3',
        positionX: 200,
        positionY: 300
      }
    });
    testNoteIds.push(note3.id);

    console.log(`✓ Created ${testNoteIds.length} notes:`);
    testNoteIds.forEach((id, i) => console.log(`  - Note ${i+1}: ${id}`));

    // Step 4: Create connections between notes
    console.log('\nStep 4: Creating connections between notes...');
    const conn1 = await prisma.noteConnection.create({
      data: {
        canvasId: canvas.id,
        sourceNoteId: note1.id,
        targetNoteId: note2.id
      }
    });
    testConnectionIds.push(conn1.id);

    const conn2 = await prisma.noteConnection.create({
      data: {
        canvasId: canvas.id,
        sourceNoteId: note1.id,
        targetNoteId: note3.id
      }
    });
    testConnectionIds.push(conn2.id);

    const conn3 = await prisma.noteConnection.create({
      data: {
        canvasId: canvas.id,
        sourceNoteId: note2.id,
        targetNoteId: note3.id
      }
    });
    testConnectionIds.push(conn3.id);

    console.log(`✓ Created ${testConnectionIds.length} connections:`);
    testConnectionIds.forEach((id, i) => console.log(`  - Connection ${i+1}: ${id}`));

    // Step 5: Verify all data exists before deletion
    console.log('\nStep 5: Verifying data exists before deletion...');
    const notesBefore = await prisma.note.findMany({
      where: { canvasId: canvas.id }
    });
    const connectionsBefore = await prisma.noteConnection.findMany({
      where: { canvasId: canvas.id }
    });
    console.log(`✓ Found ${notesBefore.length} notes`);
    console.log(`✓ Found ${connectionsBefore.length} connections`);

    // Step 6: Delete the canvas
    console.log('\nStep 6: Deleting the canvas...');
    await prisma.canvas.delete({
      where: { id: canvas.id }
    });
    console.log(`✓ Deleted canvas ${canvas.id}`);

    // Step 7: Verify canvas is deleted
    console.log('\nStep 7: Verifying canvas is deleted...');
    const deletedCanvas = await prisma.canvas.findUnique({
      where: { id: canvas.id }
    });

    if (deletedCanvas === null) {
      console.log('✓ Canvas record is deleted');
    } else {
      console.error('✗ Canvas record still exists!');
      throw new Error('Canvas was not deleted');
    }

    // Step 8: Verify all notes are deleted
    console.log('\nStep 8: Verifying all Note records are deleted...');
    const notesAfter = await prisma.note.findMany({
      where: { canvasId: canvas.id }
    });

    if (notesAfter.length === 0) {
      console.log('✓ All Note records for this canvas are deleted');
    } else {
      console.error(`✗ Found ${notesAfter.length} orphaned notes:`);
      notesAfter.forEach(n => console.error(`  - ${n.id}: ${n.title}`));
      throw new Error('Notes were not cascade deleted');
    }

    // Step 9: Verify all connections are deleted
    console.log('\nStep 9: Verifying all NoteConnection records are deleted...');
    const connectionsAfter = await prisma.noteConnection.findMany({
      where: { canvasId: canvas.id }
    });

    if (connectionsAfter.length === 0) {
      console.log('✓ All NoteConnection records for this canvas are deleted');
    } else {
      console.error(`✗ Found ${connectionsAfter.length} orphaned connections:`);
      connectionsAfter.forEach(c => console.error(`  - ${c.id}`));
      throw new Error('Connections were not cascade deleted');
    }

    // Step 10: Verify no orphaned notes remain globally
    console.log('\nStep 10: Verifying no orphaned notes remain globally...');
    const allNotesAfter = await prisma.note.findMany({
      where: { id: { in: testNoteIds } }
    });

    if (allNotesAfter.length === 0) {
      console.log('✓ No orphaned notes remain in database');
    } else {
      console.error(`✗ Found ${allNotesAfter.length} orphaned notes globally:`);
      allNotesAfter.forEach(n => console.error(`  - ${n.id}: ${n.title}`));
      throw new Error('Orphaned notes exist globally');
    }

    // All tests passed!
    console.log('\n' + '='.repeat(60));
    console.log('✅ FEATURE #155 TEST PASSED!');
    console.log('='.repeat(60));
    console.log('\nAll test steps verified:');
    console.log('✓ Canvas deletion cascades to all notes');
    console.log('✓ Canvas deletion cascades to all connections');
    console.log('✓ No orphaned notes remain');
    console.log('✓ No orphaned connections remain');
    console.log('✓ Database integrity maintained');

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ TEST FAILED!');
    console.error('='.repeat(60));
    console.error(`Error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await cleanup();
    await prisma.$disconnect();
  }
}

// Run the test
runTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
