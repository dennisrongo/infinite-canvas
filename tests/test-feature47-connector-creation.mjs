/**
 * Feature #47: Visual connector creation (drag from node to node)
 * Test that connections can be created between notes by dragging
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function readFile(relativePath) {
  const absolutePath = join(__dirname, relativePath);
  return readFileSync(absolutePath, 'utf-8');
}

describe('Feature #47: Visual connector creation (drag from node to node)', () => {
  console.log('\n=== Testing Feature #47: Visual connector creation ===\n');

  it('1. NoteNode has connection handles', () => {
    const noteNode = readFile('src/components/canvas/NoteNode.tsx');
    assert.ok(noteNode.includes('Handle'),
      'NoteNode should import Handle from @xyflow/react');
    assert.ok(noteNode.includes('type="target"') || noteNode.includes('type: \'target\''),
      'NoteNode should have target handle');
    assert.ok(noteNode.includes('type="source"') || noteNode.includes('type: \'source\''),
      'NoteNode should have source handle');
    console.log('✓ NoteNode has connection handles (target and source)');
  });

  it('2. Handles positioned on edges', () => {
    const noteNode = readFile('src/components/canvas/NoteNode.tsx');
    assert.ok(noteNode.includes('Position.Top') || noteNode.includes('Position.Bottom'),
      'Handles should be positioned on Top and Bottom');
    console.log('✓ Handles positioned on Top and Bottom edges');
  });

  it('3. ReactFlowCanvas has onConnect handler', () => {
    const canvas = readFile('src/components/canvas/ReactFlowCanvas.tsx');
    assert.ok(canvas.includes('onConnect'),
      'ReactFlowCanvas should have onConnect handler');
    console.log('✓ ReactFlowCanvas has onConnect handler');
  });

  it('4. ReactFlow accepts onConnect prop', () => {
    const canvas = readFile('src/components/canvas/ReactFlowCanvas.tsx');
    assert.ok(canvas.includes('onConnectionCreate?:'),
      'ReactFlowCanvas should accept onConnectionCreate prop');
    console.log('✓ ReactFlowCanvas accepts onConnectionCreate prop');
  });

  it('5. onConnect calls onConnectionCreate callback', () => {
    const canvas = readFile('src/components/canvas/ReactFlowCanvas.tsx');
    // Check if onConnect uses onConnectionCreate
    const hasCallback = canvas.includes('onConnectionCreate') &&
                       canvas.match(/onConnect.*useCallback[\s\S]*onConnectionCreate/);
    assert.ok(hasCallback,
      'onConnect should call onConnectionCreate to save to database');
    console.log('✓ onConnect calls onConnectionCreate callback');
  });

  it('6. Canvas page has handleConnectionCreate', () => {
    const page = readFile('app/canvas/[id]/page.tsx');
    assert.ok(page.includes('handleConnectionCreate'),
      'Canvas page should have handleConnectionCreate function');
    console.log('✓ Canvas page has handleConnectionCreate function');
  });

  it('7. handleConnectionCreate saves to database', () => {
    const page = readFile('app/canvas/[id]/page.tsx');
    assert.ok(page.includes('/api/canvases/${canvasId}/connections') ||
                page.includes(`/api/canvases/`) && page.includes('/connections'),
      'handleConnectionCreate should POST to API endpoint');
    console.log('✓ handleConnectionCreate saves to database via API');
  });

  it('8. API endpoint for creating connections exists', () => {
    try {
      const apiRoute = readFile('app/api/canvases/[id]/connections/route.ts');
      assert.ok(apiRoute.includes('export async function POST'),
        'API route should have POST handler');
      console.log('✓ API endpoint for creating connections exists');
    } catch (e) {
      throw new Error('API route file does not exist');
    }
  });

  it('9. API creates NoteConnection in database', () => {
    try {
      const apiRoute = readFile('app/api/canvases/[id]/connections/route.ts');
      assert.ok(apiRoute.includes('prisma.noteConnection.create'),
        'API should create NoteConnection via Prisma');
      console.log('✓ API creates NoteConnection in database');
    } catch (e) {
      throw new Error('API route missing Prisma create call');
    }
  });

  it('10. ReactFlow component receives onConnect', () => {
    const canvas = readFile('src/components/canvas/ReactFlowCanvas.tsx');
    assert.ok(canvas.includes('<ReactFlow') &&
                canvas.includes('onConnect={onConnect}'),
      'ReactFlow component should receive onConnect prop');
    console.log('✓ ReactFlow component receives onConnect prop');
  });

  it('11. Connections loaded from database', () => {
    const canvas = readFile('src/components/canvas/ReactFlowCanvas.tsx');
    assert.ok(canvas.includes('initialConnections'),
      'ReactFlowCanvas should accept initialConnections prop');
    assert.ok(canvas.includes('initialEdges'),
      'ReactFlowCanvas should convert connections to initial edges');
    console.log('✓ Connections loaded from database and converted to edges');
  });

  it('12. Canvas page fetches connections', () => {
    const page = readFile('app/canvas/[id]/page.tsx');
    assert.ok(page.includes('fetchConnections') ||
                page.includes('/connections'),
      'Canvas page should fetch connections');
    console.log('✓ Canvas page fetches connections on load');
  });

  it('13. Connection state managed', () => {
    const page = readFile('app/canvas/[id]/page.tsx');
    assert.ok(page.includes('useState<Connection[]>') ||
                page.includes('useState') && page.includes('connections'),
      'Canvas page should manage connections state');
    console.log('✓ Connections state managed in component');
  });

  it('14. Connections passed to ReactFlowCanvas', () => {
    const page = readFile('app/canvas/[id]/page.tsx');
    assert.ok(page.includes('initialConnections={connections}'),
      'Canvas page should pass connections to ReactFlowCanvas');
    console.log('✓ Connections passed to ReactFlowCanvas as initialConnections');
  });

  it('15. No mock data patterns', () => {
    const canvas = readFile('src/components/canvas/ReactFlowCanvas.tsx');
    const page = readFile('app/canvas/[id]/page.tsx');
    const noMockData = !canvas.includes('globalThis.devStore') &&
                       !canvas.includes('mockDb') &&
                       !page.includes('globalThis.devStore') &&
                       !page.includes('mockDb');
    assert.ok(noMockData,
      'No mock data patterns should be present');
    console.log('✓ No mock data patterns detected');
  });
});
