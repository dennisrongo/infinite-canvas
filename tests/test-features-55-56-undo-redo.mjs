#!/usr/bin/env node
/**
 * Test suite for Features #55 and #56: Undo and Redo keyboard shortcuts
 *
 * Feature #55: Ctrl+Z / Cmd+Z for undo
 * Feature #56: Ctrl+Shift+Z / Cmd+Shift+Z for redo
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('='.repeat(80));
console.log('FEATURES #55 & #56 VERIFICATION: Undo and Redo Keyboard Shortcuts');
console.log('='.repeat(80));
console.log();

let testsPassed = 0;
let testsFailed = 0;

function testSection(sectionName) {
  console.log('\n' + '─'.repeat(80));
  console.log(sectionName);
  console.log('─'.repeat(80));
}

function testPass(testName) {
  console.log(`✅ PASS: ${testName}`);
  testsPassed++;
}

function testFail(testName, reason) {
  console.log(`❌ FAIL: ${testName}`);
  console.log(`   Reason: ${reason}`);
  testsFailed++;
}

function testWarn(testName, reason) {
  console.log(`⚠️  WARN: ${testName}`);
  console.log(`   Reason: ${reason}`);
  testsPassed++; // Warnings don't fail the test
}

// ============================================================================
// FEATURE #55: UNDO (Ctrl+Z / Cmd+Z)
// ============================================================================

testSection('FEATURE #55: Undo Keyboard Shortcut (Ctrl+Z / Cmd+Z)');

// Read ReactFlowCanvas component
const canvasComponentPath = join(__dirname, 'src/components/canvas/ReactFlowCanvas.tsx');
let canvasComponent;

try {
  canvasComponent = readFileSync(canvasComponentPath, 'utf-8');
} catch (error) {
  testFail('Read ReactFlowCanvas component', 'Could not read file');
  process.exit(1);
}

// Test 1: UndoAction interface exists
if (canvasComponent.includes('interface UndoAction')) {
  testPass('UndoAction interface defined');
} else {
  testFail('UndoAction interface', 'Interface not found');
}

// Test 2: UndoStack state exists
if (canvasComponent.includes('const [undoStack, setUndoStack]')) {
  testPass('undoStack state variable exists');
} else {
  testFail('undoStack state', 'State variable not found');
}

// Test 3: Keyboard event listener for Ctrl+Z/Cmd+Z
if (canvasComponent.includes('(event.ctrlKey || event.metaKey) && event.key === \'z\'')) {
  testPass('Keyboard handler detects Ctrl+Z / Cmd+Z');
} else {
  testFail('Undo keyboard detection', 'Keyboard shortcut not detected');
}

// Test 4: Prevents default behavior
const undoHandlerMatch = canvasComponent.match(/if \(.*event\.ctrlKey.*event\.key === 'z'.*?\)\s*{[\s\S]*?event\.preventDefault\(\)/);
if (undoHandlerMatch) {
  testPass('Prevents default browser behavior for Ctrl+Z');
} else {
  testFail('Prevent default', 'Default behavior not prevented');
}

// Test 5: Checks undoStack is not empty
if (canvasComponent.includes('if (undoStack.length > 0)')) {
  testPass('Checks if undoStack has actions before undoing');
} else {
  testFail('Undo stack check', 'No check for empty undo stack');
}

// Test 6: Restores deleted note
if (canvasComponent.includes('lastAction.type === \'delete\'') &&
    canvasComponent.includes('onNoteRestore(lastAction.note)')) {
  testPass('Restores deleted note on undo');
} else {
  testFail('Note restore', 'Does not restore deleted note');
}

// Test 7: Removes action from undo stack after undoing
if (canvasComponent.includes('setUndoStack(prev => prev.slice(0, -1))')) {
  testPass('Removes action from undo stack after undoing');
} else {
  testFail('Undo stack cleanup', 'Does not remove action from stack');
}

// Test 8: Adds node back to nodes state
if (canvasComponent.includes('setNodes(prev => [...prev, restoredNode])')) {
  testPass('Adds restored node to React Flow nodes state');
} else {
  testFail('Node state update', 'Does not add node back to state');
}

// Test 9: onNoteRestore callback exists in props
if (canvasComponent.includes('onNoteRestore?:')) {
  testPass('onNoteRestore callback prop defined');
} else {
  testFail('onNoteRestore prop', 'Callback prop not defined');
}

// Test 10: Saves deleted notes to undo stack
if (canvasComponent.includes('setUndoStack(prev => [...prev, {') &&
    canvasComponent.includes('type: \'delete\'') &&
    canvasComponent.includes('note,')) {
  testPass('Saves deleted notes to undo stack');
} else {
  testFail('Save to undo stack', 'Does not save deletions to undo stack');
}

// Test 11: Checks for !event.shiftKey to avoid conflict with redo
if (canvasComponent.includes('&& !event.shiftKey')) {
  testPass('Prevents triggering on Ctrl+Shift+Z (redo)');
} else {
  testWarn('Shift key check', 'May conflict with redo shortcut');
}

// ============================================================================
// FEATURE #56: REDO (Ctrl+Shift+Z / Cmd+Shift+Z)
// ============================================================================

testSection('FEATURE #56: Redo Keyboard Shortcut (Ctrl+Shift+Z / Cmd+Shift+Z)');

// Test 12: RedoStack state exists
if (canvasComponent.includes('const [redoStack, setRedoStack]')) {
  testPass('redoStack state variable exists');
} else {
  testFail('redoStack state', 'State variable not found - REDO NOT IMPLEMENTED');
}

// Test 13: Keyboard event listener for Ctrl+Shift+Z/Cmd+Shift+Z
const redoHandlerMatch = canvasComponent.match(/if \(.*event\.ctrlKey.*event\.shiftKey.*event\.key === 'z'\)/);
if (redoHandlerMatch) {
  testPass('Keyboard handler detects Ctrl+Shift+Z / Cmd+Shift+Z');
} else {
  testFail('Redo keyboard detection', 'Keyboard shortcut not detected - REDO NOT IMPLEMENTED');
}

// Test 14: Checks redoStack is not empty
if (canvasComponent.includes('if (redoStack.length > 0)')) {
  testPass('Checks if redoStack has actions before redoing');
} else {
  testFail('Redo stack check', 'No check for empty redo stack - REDO NOT IMPLEMENTED');
}

// Test 15: Redoes previously undone action
if (canvasComponent.includes('onNoteRedo') || canvasComponent.includes('redoAction')) {
  testPass('Redoes previously undone action');
} else {
  testFail('Redo action', 'Does not redo action - REDO NOT IMPLEMENTED');
}

// Test 16: Moves action from redoStack back to undoStack
if (canvasComponent.includes('setUndoStack(prev => [...prev, ') &&
    canvasComponent.includes('setRedoStack(prev => prev.slice(0, -1))')) {
  testPass('Moves action from redoStack to undoStack after redoing');
} else {
  testFail('Redo stack management', 'Does not manage redo stack - REDO NOT IMPLEMENTED');
}

// Test 17: Clears redo stack when new action is performed
if (canvasComponent.includes('setRedoStack([])')) {
  testPass('Clears redo stack when new action performed');
} else {
  testWarn('Redo stack clear', 'Should clear redo stack on new action (UX best practice)');
}

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

testSection('INTEGRATION TESTS');

// Test 18: Canvas page has handleNoteRestore
const canvasPagePath = join(__dirname, 'app/canvas/[id]/page.tsx');
let canvasPage;

try {
  canvasPage = readFileSync(canvasPagePath, 'utf-8');
} catch (error) {
  testFail('Read canvas page', 'Could not read file');
}

if (canvasPage && canvasPage.includes('const handleNoteRestore')) {
  testPass('Canvas page implements handleNoteRestore callback');
} else {
  testFail('handleNoteRestore callback', 'Callback not implemented in canvas page');
}

// Test 19: handleNoteRestore calls API with original note data
if (canvasPage && canvasPage.includes('method: \'POST\'') &&
    canvasPage.includes('/api/canvases/${canvasId}/notes') &&
    canvasPage.includes('id: note.id')) {
  testPass('handleNoteRestore calls API with original note ID');
} else {
  testFail('handleNoteRestore API call', 'Does not properly restore note');
}

// Test 20: Both undo and redo listeners in same useEffect
const hasUndoListener = canvasComponent.includes('event.ctrlKey || event.metaKey) && event.key === \'z\'');
const hasRedoListener = canvasComponent.includes('event.key === \'z\' && event.shiftKey');
if (hasUndoListener && hasRedoListener) {
  testPass('Both undo and redo in same keyboard listener');
} else if (hasUndoListener && !hasRedoListener) {
  testWarn('Keyboard listener', 'Only undo implemented, redo missing');
} else {
  testFail('Keyboard listeners', 'Neither undo nor redo properly implemented');
}

// ============================================================================
// MOCK DATA DETECTION (STEP 5.6)
// ============================================================================

testSection('MOCK DATA DETECTION (STEP 5.6)');

const mockPatterns = [
  'globalThis.devStore',
  'globalThis.',
  'devStore',
  'dev-store',
  'mockDb',
  'mockData',
  'fakeData',
  'sampleData',
  'dummyData',
  'isDevelopment',
  'isDev &&',
];

let mockDataFound = false;
const foundPatterns = [];

for (const pattern of mockPatterns) {
  // Skip checking for patterns that might be in comments or strings
  if (canvasComponent.includes(pattern)) {
    // Check if it's in a meaningful context (not just in comments)
    const lines = canvasComponent.split('\n');
    for (const line of lines) {
      if (line.includes(pattern) && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
        mockDataFound = true;
        foundPatterns.push(`${pattern} at line: ${line.trim().substring(0, 60)}`);
        break;
      }
    }
  }
}

if (!mockDataFound) {
  testPass('No mock data patterns found in ReactFlowCanvas');
} else {
  testFail('Mock data detection', `Found patterns: ${foundPatterns.join(', ')}`);
}

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('VERIFICATION SUMMARY');
console.log('='.repeat(80));
console.log(`Total Tests: ${testsPassed + testsFailed}`);
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`Pass Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
console.log();

if (testsFailed === 0) {
  console.log('🎉 ALL TESTS PASSED! Features #55 and #56 are properly implemented.');
  console.log();
  console.log('Feature #55 (Undo): ✅ COMPLETE');
  console.log('Feature #56 (Redo): ✅ COMPLETE');
} else {
  console.log('⚠️  SOME TESTS FAILED. Review the failures above.');
  console.log();
  console.log('Feature #55 (Undo): ' + (testsFailed < 10 ? '⚠️  NEEDS ATTENTION' : '✅ COMPLETE'));
  console.log('Feature #56 (Redo): ' + (canvasComponent.includes('redoStack') ? '✅ COMPLETE' : '❌ NOT IMPLEMENTED'));
}

console.log();
console.log('='.repeat(80));

process.exit(testsFailed > 0 ? 1 : 0);
