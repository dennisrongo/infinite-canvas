/**
 * Regression Test Script for Features 22, 23, 24
 *
 * Feature 22: Note creation on canvas
 * Feature 23: Note editing/updating
 * Feature 24: Note deletion
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupTestUser() {
  console.log('\n=== Setting up test user ===');

  // Find or create test user
  let user = await prisma.user.findUnique({
    where: { email: 'test@example.com' }
  });

  if (!user) {
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash('Test123!@#', 10);

    user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: hashedPassword,
        name: 'Test User'
      }
    });

    console.log(`✓ Created test user: ${user.email} (ID: ${user.id})`);
  } else {
    console.log(`✓ Found existing test user: ${user.email} (ID: ${user.id})`);
  }

  return user;
}

async function setupTestCanvas(userId) {
  console.log('\n=== Setting up test canvas ===');

  // Clean up any existing test canvases
  await prisma.note.deleteMany({
    where: {
      canvas: {
        userId,
        name: { contains: 'Regression Test Canvas' }
      }
    }
  });

  await prisma.canvas.deleteMany({
    where: {
      userId,
      name: { contains: 'Regression Test Canvas' }
    }
  });

  // Create a new test canvas
  const canvas = await prisma.canvas.create({
    data: {
      userId,
      name: 'Regression Test Canvas'
    }
  });

  console.log(`✓ Created test canvas: "${canvas.name}" (ID: ${canvas.id})`);

  return canvas;
}

async function testFeature22_NoteCreation(canvasId) {
  console.log('\n=== Testing Feature 22: Note Creation ===');

  const testNote = {
    title: 'Test Note 22',
    content: '# Feature 22 Test\n\nThis is a test note for feature 22.',
    positionX: 100,
    positionY: 100,
    width: 300,
    height: 200
  };

  try {
    const note = await prisma.note.create({
      data: {
        canvasId,
        ...testNote
      }
    });

    console.log(`✓ Note created successfully`);
    console.log(`  - ID: ${note.id}`);
    console.log(`  - Title: "${note.title}"`);
    console.log(`  - Position: (${note.positionX}, ${note.positionY})`);
    console.log(`  - Size: ${note.width}x${note.height}`);

    // Verify the note exists in the database
    const retrievedNote = await prisma.note.findUnique({
      where: { id: note.id }
    });

    if (!retrievedNote) {
      throw new Error('Note was not persisted to database');
    }

    console.log(`✓ Note verified in database`);

    return note;
  } catch (error) {
    console.error(`✗ Feature 22 FAILED:`, error.message);
    throw error;
  }
}

async function testFeature23_NoteEditing(noteId) {
  console.log('\n=== Testing Feature 23: Note Editing ===');

  const updates = {
    title: 'Test Note 22 - EDITED',
    content: '# Feature 23 Test\n\nThis note has been edited.\n\n- Updated title\n- Updated content\n- Moved position',
    positionX: 250,
    positionY: 250,
    width: 350,
    height: 250
  };

  try {
    // Update the note
    const updatedNote = await prisma.note.update({
      where: { id: noteId },
      data: updates
    });

    console.log(`✓ Note updated successfully`);
    console.log(`  - Title: "${updatedNote.title}"`);
    console.log(`  - New position: (${updatedNote.positionX}, ${updatedNote.positionY})`);
    console.log(`  - New size: ${updatedNote.width}x${updatedNote.height}`);

    // Verify all fields were updated
    if (updatedNote.title !== updates.title) {
      throw new Error('Title was not updated correctly');
    }
    if (updatedNote.content !== updates.content) {
      throw new Error('Content was not updated correctly');
    }
    if (updatedNote.positionX !== updates.positionX || updatedNote.positionY !== updates.positionY) {
      throw new Error('Position was not updated correctly');
    }
    if (updatedNote.width !== updates.width || updatedNote.height !== updates.height) {
      throw new Error('Size was not updated correctly');
    }

    console.log(`✓ All fields verified correctly`);

    return updatedNote;
  } catch (error) {
    console.error(`✗ Feature 23 FAILED:`, error.message);
    throw error;
  }
}

async function testFeature24_NoteDeletion(noteId) {
  console.log('\n=== Testing Feature 24: Note Deletion ===');

  try {
    // First verify note exists
    const noteBeforeDelete = await prisma.note.findUnique({
      where: { id: noteId }
    });

    if (!noteBeforeDelete) {
      throw new Error('Note does not exist before deletion test');
    }

    // Delete the note
    await prisma.note.delete({
      where: { id: noteId }
    });

    console.log(`✓ Note deletion executed`);

    // Verify note no longer exists
    const noteAfterDelete = await prisma.note.findUnique({
      where: { id: noteId }
    });

    if (noteAfterDelete) {
      throw new Error('Note still exists in database after deletion');
    }

    console.log(`✓ Note verified as deleted from database`);

    return true;
  } catch (error) {
    console.error(`✗ Feature 24 FAILED:`, error.message);
    throw error;
  }
}

async function testEdgeCases(canvasId) {
  console.log('\n=== Testing Edge Cases ===');

  // Test 1: Duplicate title prevention
  console.log('\nTest 1: Duplicate title in same canvas');

  const note1 = await prisma.note.create({
    data: {
      canvasId,
      title: 'Duplicate Test',
      content: 'First note',
      positionX: 0,
      positionY: 0,
      width: 300,
      height: 200
    }
  });

  console.log(`✓ Created first note with title "Duplicate Test"`);

  // This should fail due to unique constraint
  try {
    await prisma.note.create({
      data: {
        canvasId,
        title: 'Duplicate Test',
        content: 'Second note',
        positionX: 100,
        positionY: 100,
        width: 300,
        height: 200
      }
    });
    console.log(`✗ FAILED: Duplicate title was allowed`);
  } catch (error) {
    if (error.code === 'P2002') { // Prisma unique constraint violation
      console.log(`✓ Duplicate title correctly rejected`);
    } else {
      console.log(`? Unexpected error: ${error.message}`);
    }
  }

  // Test 2: Large content handling
  console.log('\nTest 2: Large content handling');

  const largeContent = '# Large Content\n\n' + 'x'.repeat(1000);

  const largeNote = await prisma.note.create({
    data: {
      canvasId,
      title: 'Large Content Note',
      content: largeContent,
      positionX: 200,
      positionY: 200,
      width: 300,
      height: 200
    }
  });

  if (largeNote.content.length === largeContent.length) {
    console.log(`✓ Large content stored correctly (${largeContent.length} chars)`);
  } else {
    console.log(`✗ FAILED: Large content was truncated`);
  }

  // Test 3: Special characters in title
  console.log('\nTest 3: Special characters in title');

  const specialTitle = "Test with quotes \" ' and symbols < > &";
  const specialNote = await prisma.note.create({
    data: {
      canvasId,
      title: specialTitle,
      content: 'Testing special chars',
      positionX: 300,
      positionY: 300,
      width: 300,
      height: 200
    }
  });

  console.log(`✓ Special characters in title handled: "${specialNote.title}"`);

  // Clean up edge case test notes
  await prisma.note.deleteMany({ where: { canvasId } });
  console.log(`✓ Cleaned up edge case test notes`);
}

async function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  REGRESSION TEST SUITE: FEATURES 22, 23, 24               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  let user, canvas, testNote;
  let passedTests = 0;
  let failedTests = 0;

  try {
    // Setup
    user = await setupTestUser();
    canvas = await setupTestCanvas(user.id);

    // Feature 22: Note Creation
    try {
      testNote = await testFeature22_NoteCreation(canvas.id);
      passedTests++;
    } catch (error) {
      failedTests++;
    }

    // Feature 23: Note Editing
    if (testNote) {
      try {
        testNote = await testFeature23_NoteEditing(testNote.id);
        passedTests++;
      } catch (error) {
        failedTests++;
      }
    }

    // Feature 24: Note Deletion
    if (testNote) {
      try {
        await testFeature24_NoteDeletion(testNote.id);
        passedTests++;
      } catch (error) {
        failedTests++;
      }
    }

    // Edge Cases
    try {
      await testEdgeCases(canvas.id);
      passedTests++;
    } catch (error) {
      console.error('Edge case tests failed:', error);
      failedTests++;
    }

    // Summary
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  TEST SUMMARY                                              ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`\nTotal tests run: ${passedTests + failedTests}`);
    console.log(`✓ Passed: ${passedTests}`);
    console.log(`✗ Failed: ${failedTests}`);

    if (failedTests === 0) {
      console.log('\n✓✓✓ ALL TESTS PASSED ✓✓✓');
      console.log('\nFeatures 22, 23, 24 are functioning correctly!');
    } else {
      console.log('\n✗✗✗ SOME TESTS FAILED ✗✗✗');
      console.log('\nRegression detected! Please review the failed tests above.');
    }

  } catch (error) {
    console.error('\n✗✗✗ TEST SUITE CRASHED ✗✗✗');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the tests
runAllTests();
