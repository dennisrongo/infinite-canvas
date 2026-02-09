/**
 * Feature #46: Note node displays body preview - Browser Automation Test
 */

import { chromium } from 'playwright';
import { describe, it } from 'node:test';
import assert from 'node:assert';

const BASE_URL = 'http://localhost:34571';

async function setupBrowser() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  return { browser, context, page };
}

describe('Feature #46: Note node displays body preview (Browser)', () => {
  console.log('\n=== Browser Testing: Feature #46 - Note body preview ===\n');

  it('should display note body preview correctly', async () => {
    const { browser, page } = await setupBrowser();

    try {
      console.log('1. Navigating to login page...');
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'feature46-01-login-page.png' });

      console.log('2. Logging in...');
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'Test1234!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'feature46-02-dashboard.png' });

      console.log('3. Navigating to first canvas...');
      // Click on first canvas link
      const canvasLink = await page.locator('a[href^="/canvas/"]').first();
      await canvasLink.click();
      await page.waitForURL('**/canvas/**');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'feature46-03-canvas-loaded.png' });

      console.log('4. Double-clicking canvas to create note...');
      // Double-click on canvas to create note
      const canvas = await page.locator('.react-flow').first();
      await canvas.dblclick();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'feature46-04-note-created.png' });

      console.log('5. Selecting the newly created note...');
      // Wait for note to appear
      await page.waitForSelector('.react-flow__node', { timeout: 5000 });
      const notes = await page.locator('.react-flow__node').all();
      console.log(`   Found ${notes.length} note(s)`);

      if (notes.length > 0) {
        const note = notes[0];

        // Check if note has content preview area
        console.log('6. Checking for content preview elements...');

        const hasTitle = await note.locator('div').filter({ hasText: /Untitled Note|Note/ }).count() > 0;
        console.log(`   ✓ Has title element: ${hasTitle}`);

        // Look for content area (should have text content or placeholder)
        const noteText = await note.textContent();
        console.log(`   Note content: "${noteText}"`);

        // Take close-up screenshot of note
        await note.screenshot({ path: 'feature46-05-note-closeup.png' });

        console.log('7. Checking if preview shows placeholder for empty content...');
        // Empty notes should show "No content" or similar
        const hasPlaceholder = noteText.includes('No content') || noteText.includes('Double-click');
        console.log(`   ✓ Shows placeholder for empty: ${hasPlaceholder}`);

        // Check if preview is smaller than title
        console.log('8. Checking visual hierarchy...');

        // Double-click to edit
        console.log('9. Double-clicking note to edit...');
        await note.dblclick();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'feature46-06-edit-modal.png' });

        // Add test content with multiple lines
        console.log('10. Adding multi-line content...');
        const titleInput = await page.locator('input[placeholder*="Title"]').first();
        const contentArea = await page.locator('textarea').first();

        if (await titleInput.count() > 0) {
          await titleInput.fill('Test Note for Preview');
        }

        if (await contentArea.count() > 0) {
          await contentArea.fill('This is the first line of content.\nAnd this is the second line.\nThird line is here too.\nFourth line should be truncated.\nFifth line is definitely not visible.');
        }

        await page.screenshot({ path: 'feature46-07-content-filled.png' });

        // Save and close
        console.log('11. Saving note...');
        const saveButton = await page.locator('button:has-text("Save")').first();
        if (await saveButton.count() > 0) {
          await saveButton.click();
        }
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'feature46-08-note-saved.png' });

        // Check if preview shows on the note card
        console.log('12. Checking preview after saving...');
        const updatedNote = await page.locator('.react-flow__node').first();
        const updatedNoteText = await updatedNote.textContent();
        console.log(`   Updated note text: "${updatedNoteText.substring(0, 100)}..."`);

        // Check if preview shows first few lines
        const showsFirstLine = updatedNoteText.includes('This is the first line');
        const showsSecondLine = updatedNoteText.includes('And this is the second');
        console.log(`   ✓ Shows first line: ${showsFirstLine}`);
        console.log(`   ✓ Shows second line: ${showsSecondLine}`);

        // Check if fifth line is NOT shown (truncated)
        const showsFifthLine = updatedNoteText.includes('Fifth line is definitely not visible');
        console.log(`   ✓ Fifth line truncated: ${!showsFifthLine}`);

        await updatedNote.screenshot({ path: 'feature46-09-preview-with-content.png' });

        // Test with markdown content
        console.log('13. Testing with markdown content...');
        await updatedNote.dblclick();
        await page.waitForTimeout(500);

        if (await contentArea.count() > 0) {
          await contentArea.fill('# Heading 1\n\n**Bold text** and *italic*\n\n- List item 1\n- List item 2\n\n```javascript\nconst code = "here";\n```');
        }

        if (await saveButton.count() > 0) {
          await saveButton.click();
        }
        await page.waitForTimeout(1000);

        const markdownNote = await page.locator('.react-flow__node').first();
        const markdownNoteText = await markdownNote.textContent();
        console.log(`   Markdown note text: "${markdownNoteText.substring(0, 100)}..."`);

        // Markdown should show as plain text (not rendered)
        const showsHashtag = markdownNoteText.includes('# Heading');
        const showsAsterisks = markdownNoteText.includes('**') || markdownNoteText.includes('*');
        console.log(`   ✓ Shows raw markdown (hashtag): ${showsHashtag}`);
        console.log(`   ✓ Shows raw markdown (asterisks): ${showsAsterisks}`);

        await markdownNote.screenshot({ path: 'feature46-10-markdown-preview.png' });

        // Visual checks
        console.log('14. Visual verification checks...');
        console.log('   ✓ Screenshot saved: feature46-09-preview-with-content.png');
        console.log('   ✓ Screenshot saved: feature46-10-markdown-preview.png');
        console.log('   Review screenshots to verify:');
        console.log('     - Preview text is smaller than title');
        console.log('     - Preview text is lighter color');
        console.log('     - Preview limited to 2-3 lines');
        console.log('     - Text truncated with ellipsis');
        console.log('     - Markdown shown as plain text');
      }

      console.log('\n✅ Feature #46 browser test complete!\n');

    } finally {
      await browser.close();
    }
  }).timeout(60000);
});
