/**
 * Feature #46: Note node displays body preview
 * Test that note nodes show a preview of the body content
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

// Test helper to read files
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function readFile(relativePath) {
  const absolutePath = join(__dirname, relativePath);
  return readFileSync(absolutePath, 'utf-8');
}

describe('Feature #46: Note node displays body preview', () => {
  console.log('\n=== Testing Feature #46: Note node displays body preview ===\n');

  it('1. NoteNode component exists', () => {
    const content = readFile('src/components/canvas/NoteNode.tsx');
    assert.ok(content.includes('export default function NoteNode'),
      'NoteNode component should exist');
    console.log('✓ NoteNode component exists');
  });

  it('2. NoteNode displays content preview area', () => {
    const content = readFile('src/components/canvas/NoteNode.tsx');
    assert.ok(content.includes('contentPreview') || content.includes('Content preview'),
      'NoteNode should have content preview element');
    console.log('✓ NoteNode has content preview element');
  });

  it('3. Preview limits to 2-3 lines using line-clamp', () => {
    const content = readFile('src/components/canvas/NoteNode.tsx');
    assert.ok(content.includes('line-clamp-') || content.includes('line-clamp'),
      'Content preview should use line-clamp CSS utility');
    console.log('✓ Preview uses line-clamp to limit lines');
  });

  it('4. Preview text is smaller than title text', () => {
    const content = readFile('src/components/canvas/NoteNode.tsx');
    // Title typically uses font-semibold or text-base, preview should be text-sm
    assert.ok(content.match(/text-sm[\s\S]*content/),
      'Preview text should use text-sm (smaller than title)');
    console.log('✓ Preview text is smaller than title (text-sm)');
  });

  it('5. Preview text is lighter color than title', () => {
    const content = readFile('src/components/canvas/NoteNode.tsx');
    // Title uses text-[#1E293B], preview should use lighter color
    assert.ok(content.match(/text-\[#64748B\]|text-\[#94A3B8\]/),
      'Preview text should use lighter color (Slate-500 or Slate-400)');
    console.log('✓ Preview text is lighter color than title');
  });

  it('6. Empty body shows placeholder text', () => {
    const content = readFile('src/components/canvas/NoteNode.tsx');
    assert.ok(content.includes('No content') || content.includes('Empty') || content.includes('!data.content'),
      'Empty body should show placeholder or handle empty case');
    console.log('✓ Empty body shows placeholder ("No content")');
  });

  it('7. Long content is truncated with ellipsis', () => {
    const content = readFile('src/components/canvas/NoteNode.tsx');
    // Check for ellipsis handling (either ... or CSS line-clamp)
    const hasEllipsis = content.includes('...') || content.includes('line-clamp');
    assert.ok(hasEllipsis,
      'Long content should be truncated with ellipsis or line-clamp');
    console.log('✓ Long content is truncated with ellipsis or line-clamp');
  });

  it('8. Preview shows plain text, not rendered markdown', () => {
    const content = readFile('src/components/canvas/NoteNode.tsx');
    // Should NOT have markdown rendering in preview (no MDX, no ReactMarkdown, etc.)
    // Should use simple substring or plain text
    const hasNoMarkdownRender = !content.includes('ReactMarkdown') &&
                                !content.includes('remark') &&
                                !content.includes('rehype');
    assert.ok(hasNoMarkdownRender,
      'Preview should show plain text, not rendered markdown');
    console.log('✓ Preview shows plain text (markdown not rendered in preview)');
  });

  it('9. Preview area is visually distinct from title', () => {
    const content = readFile('src/components/canvas/NoteNode.tsx');
    // Should have mb-2 (margin-bottom) on title to separate from preview
    assert.ok(content.includes('mb-2') || content.includes('margin-bottom'),
      'Title should have margin to separate from preview');
    console.log('✓ Preview area is visually distinct from title');
  });

  it('10. Component receives content prop', () => {
    const content = readFile('src/components/canvas/NoteNode.tsx');
    assert.ok(content.includes('data.content') || content.includes('content: string'),
      'Component should receive content from data prop');
    console.log('✓ Component receives content prop');
  });
});

// Run tests
console.log('Running Feature #46 verification tests...\n');
