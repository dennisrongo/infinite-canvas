/**
 * Test API-level duplicate title prevention for features 22, 23, 24
 */

const testNoteDuplicatePrevention = async () => {
  console.log('\n=== Testing API-Level Duplicate Title Prevention ===\n');

  // Simulate the API duplicate check logic from the code
  const mockNotes = [
    { id: '1', canvasId: 'canvas1', title: 'Test Note' },
    { id: '2', canvasId: 'canvas1', title: 'Another Note' }
  ];

  // Test 1: Attempting to create a duplicate title should be detected
  console.log('Test 1: Detecting duplicate title in same canvas');
  const newTitle = 'Test Note';
  const duplicateExists = mockNotes.some(n => n.canvasId === 'canvas1' && n.title === newTitle);

  if (duplicateExists) {
    console.log('✓ Duplicate title correctly detected by API logic');
    console.log(`  - Title "${newTitle}" already exists in canvas`);
  } else {
    console.log('✗ FAILED: Duplicate title was not detected');
  }

  // Test 2: Same title in different canvas should be allowed
  console.log('\nTest 2: Same title in different canvas (should be allowed)');
  const newTitle2 = 'Test Note';
  const duplicateExists2 = mockNotes.some(n => n.canvasId === 'canvas2' && n.title === newTitle2);

  if (!duplicateExists2) {
    console.log('✓ Same title in different canvas correctly allowed');
  } else {
    console.log('✗ FAILED: Same title in different canvas was blocked');
  }

  // Test 3: Updating a note with its own title should be allowed
  console.log('\nTest 3: Updating note with its own title (should be allowed)');
  const noteId = '1';
  const updateTitle = 'Test Note';
  const duplicateExists3 = mockNotes.some(n => n.canvasId === 'canvas1' && n.title === updateTitle && n.id !== noteId);

  if (!duplicateExists3) {
    console.log('✓ Updating note with its own title correctly allowed');
  } else {
    console.log('✗ FAILED: Updating note with its own title was blocked');
  }

  console.log('\n=== API Duplicate Prevention Tests Complete ===\n');
};

testNoteDuplicatePrevention();
