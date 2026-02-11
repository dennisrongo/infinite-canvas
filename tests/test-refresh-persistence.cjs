// Feature #127: Data persists across page refresh
// This test verifies that canvas data persists when refreshing the page

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TEST_CANVAS_NAME = 'REFRESH_TEST_12345';
const TEST_NOTE_TITLE = 'Refresh Test Note';
const TEST_NOTE_CONTENT = 'This note should persist across page refresh';

async function cleanup() {
  console.log('\n=== Cleaning up test data ===');
  try {
    // Delete the test canvas and all its notes
    const deletedCanvas = await prisma.canvas.deleteMany({
      where: { name: TEST_CANVAS_NAME }
    });
    console.log(`✓ Cleaned up ${deletedCanvas.count} test canvas(es)`);
  } catch (error) {
    console.error('Error during cleanup:', error.message);
  }
}

async function testRefreshPersistence() {
  console.log('=== Feature #127: Data persists across page refresh ===\n');

  let testCanvasId = null;
  let testNoteId = null;

  try {
    // Get a test user
    const testUser = await prisma.user.findFirst();
    if (!testUser) {
      throw new Error('No test user found in database!');
    }
    console.log('Using test user:', testUser.email);

    // Step 1: Create a canvas with unique test name
    console.log('\nStep 1: Creating canvas with name:', TEST_CANVAS_NAME);
    const canvas = await prisma.canvas.create({
      data: {
        name: TEST_CANVAS_NAME,
        userId: testUser.id,
        folderId: null,
      }
    });
    testCanvasId = canvas.id;
    console.log('✓ Canvas created with ID:', canvas.id);

    // Step 2: Add notes with specific content
    console.log('\nStep 2: Creating note with specific content');
    const note = await prisma.note.create({
      data: {
        canvasId: canvas.id,
        title: TEST_NOTE_TITLE,
        content: TEST_NOTE_CONTENT,
        positionX: 100,
        positionY: 100,
        width: 300,
        height: 200,
      }
    });
    testNoteId = note.id;
    console.log('✓ Note created with ID:', note.id);
    console.log('  Title:', note.title);
    console.log('  Content:', note.content);

    // Step 3: Move notes to specific positions
    console.log('\nStep 3: Moving note to specific positions');
    const updatedNote = await prisma.note.update({
      where: { id: note.id },
      data: {
        positionX: 250,
        positionY: 300,
        width: 350,
        height: 250,
      }
    });
    console.log('✓ Note moved to position:');
    console.log('  X:', updatedNote.positionX);
    console.log('  Y:', updatedNote.positionY);
    console.log('  Width:', updatedNote.width);
    console.log('  Height:', updatedNote.height);

    // Step 4: Create additional notes for connections
    console.log('\nStep 4: Creating second note for connection');
    const note2 = await prisma.note.create({
      data: {
        canvasId: canvas.id,
        title: 'Second Note',
        content: 'This is the second note',
        positionX: 600,
        positionY: 200,
        width: 300,
        height: 200,
      }
    });
    console.log('✓ Second note created with ID:', note2.id);

    // Step 5: Create connections between notes
    console.log('\nStep 5: Creating connection between notes');
    const connection = await prisma.noteConnection.create({
      data: {
        canvasId: canvas.id,
        sourceNoteId: note.id,
        targetNoteId: note2.id,
      }
    });
    console.log('✓ Connection created with ID:', connection.id);

    // Step 6: Verify canvas exists in database (simulating "after refresh")
    console.log('\n=== SIMULATING PAGE REFRESH ===');
    console.log('\nStep 6: Verifying canvas still exists in database');
    const fetchedCanvas = await prisma.canvas.findUnique({
      where: { id: canvas.id },
      include: {
        notes: true,
      }
    });

    if (!fetchedCanvas) {
      throw new Error('Canvas not found after refresh!');
    }
    console.log('✓ Canvas still exists in database');
    console.log('  Name:', fetchedCanvas.name);

    // Step 7: Verify all notes are still present
    console.log('\nStep 7: Verifying all notes are still present');
    if (fetchedCanvas.notes.length !== 2) {
      throw new Error(`Expected 2 notes, found ${fetchedCanvas.notes.length}`);
    }
    console.log(`✓ All ${fetchedCanvas.notes.length} notes are still present`);

    // Step 8: Verify notes are in same positions
    console.log('\nStep 8: Verifying notes are in same positions');
    const fetchedNote = fetchedCanvas.notes.find(n => n.id === note.id);
    if (!fetchedNote) {
      throw new Error('Original note not found!');
    }
    if (fetchedNote.positionX !== 250 || fetchedNote.positionY !== 300) {
      throw new Error(`Note position changed! Expected (250, 300), got (${fetchedNote.positionX}, ${fetchedNote.positionY})`);
    }
    if (fetchedNote.width !== 350 || fetchedNote.height !== 250) {
      throw new Error(`Note size changed! Expected 350x250, got ${fetchedNote.width}x${fetchedNote.height}`);
    }
    console.log('✓ Notes are in the same positions:');
    console.log('  Note 1 position:', `(${fetchedNote.positionX}, ${fetchedNote.positionY})`);
    console.log('  Note 1 size:', `${fetchedNote.width}x${fetchedNote.height}`);
    console.log('  Note 2 position:', `(${fetchedCanvas.notes[1].positionX}, ${fetchedCanvas.notes[1].positionY})`);

    // Step 9: Verify connections are still present
    console.log('\nStep 9: Verifying connections are still present');
    const fetchedConnections = await prisma.noteConnection.findMany({
      where: { canvasId: canvas.id }
    });
    if (fetchedConnections.length !== 1) {
      throw new Error(`Expected 1 connection, found ${fetchedConnections.length}`);
    }
    const fetchedConnection = fetchedConnections[0];
    if (fetchedConnection.sourceNoteId !== note.id || fetchedConnection.targetNoteId !== note2.id) {
      throw new Error('Connection endpoints changed!');
    }
    console.log('✓ Connection is still present');
    console.log('  Source:', fetchedConnection.sourceNoteId);
    console.log('  Target:', fetchedConnection.targetNoteId);

    // Step 10: Verify no data was lost
    console.log('\nStep 10: Verifying no data was lost');
    if (fetchedCanvas.name !== TEST_CANVAS_NAME) {
      throw new Error('Canvas name changed!');
    }
    if (fetchedNote.title !== TEST_NOTE_TITLE) {
      throw new Error('Note title changed!');
    }
    if (fetchedNote.content !== TEST_NOTE_CONTENT) {
      throw new Error('Note content changed!');
    }
    console.log('✓ No data was lost');
    console.log('  Canvas name:', fetchedCanvas.name);
    console.log('  Note title:', fetchedNote.title);
    console.log('  Note content:', fetchedNote.content);

    console.log('\n=== ✅ FEATURE #127 PASSED: Data persists across page refresh ===\n');

    return true;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    return false;
  } finally {
    await cleanup();
    await prisma.$disconnect();
  }
}

// Run the test
testRefreshPersistence()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
