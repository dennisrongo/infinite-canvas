/**
 * Playwright script to test for memory leaks
 * This script navigates through the app, performs actions, and checks memory usage
 *
 * Run with: npx playwright codegen --device="Desktop Chrome" --target=javascript
 * Or paste this code into the Playwright browser evaluation
 */

// Test procedure for memory leak detection:
// 1. Navigate to the app
// 2. Take initial heap snapshot
// 3. Perform various actions (create, edit, delete notes, switch canvases)
// 4. Take another heap snapshot
// 5. Compare for memory growth

// Actions to perform:
// - Create 10+ notes
// - Edit notes multiple times
// - Switch between canvases 5+ times
// - Open and close modals
// - Navigate between pages

// Expected behavior:
// - Memory should increase during activity but stabilize
// - DOM nodes should be cleaned up when navigating away
// - Event listeners should be removed
// - No continuous memory growth trend

// Memory leak indicators:
// - Detached DOM nodes persisting
// - Increasing number of event listeners over time
// - Growth in "retained size" between snapshots
// - Objects that should be GC'd but aren't

console.log(`
Memory Leak Testing Guide
=========================

AUTOMATED TEST (Recommended):
1. Run the app
2. Open Chrome DevTools > Performance Monitor
3. Navigate through the app for 10 minutes:
   - Create/edit/delete notes
   - Switch canvases
   - Open/close modals
   - Use search
4. Watch the JS heap size:
   - It should fluctuate but not continuously grow
   - Memory should be released after garbage collection

MANUAL HEAP SNAPSHOT TEST:
1. Open DevTools > Memory > Heap Snapshot
2. Take snapshot 1 (baseline)
3. Use app for 5 minutes (create/edit/delete/switch)
4. Take snapshot 2
5. Compare snapshots:
   - Look for "Detached DOM nodes"
   - Check "Retained size" growth
   - Look for strings/arrays that shouldn't be there

MANUAL ALLOCATION SAMPLING:
1. Open DevTools > Memory > Allocation Sampling
2. Record for 5 minutes while using app
3. Stop recording
4. Look at the timeline:
   - Should see spikes during activity
   - Should return to baseline
   - No continuous upward trend

SPECIFIC CHECKS:
1. ReactFlowCanvas: Large component, check for node/edge cleanup
2. NoteEditor: Opens/closes frequently, check for cleanup
3. Toast notifications: Created/destroyed often
4. Search results: Large lists that should be cleaned up

FLAGS TO LOOK FOR:
- @detached DOM nodes
- @Event listeners
- Array/String entries growing
- Component instances not being destroyed
