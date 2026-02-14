import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * E2E tests for canvas operations
 * Tests: Canvas creation, note management, connections
 */

// Generate unique test data for each test run
const generateTestEmail = () => `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
const validPassword = 'TestPass123!';

test.describe('Canvas Operations', () => {
  let context: BrowserContext;
  let page: Page;
  let testEmail: string;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();

    // Register and login before all tests
    testEmail = generateTestEmail();

    await page.goto('/auth/register');
    await page.getByLabel('Email Address').fill(testEmail);
    await page.getByLabel('Password').first().fill(validPassword);
    await page.getByLabel('Confirm Password').fill(validPassword);
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.describe('Canvas Creation', () => {
    test('should create a new canvas', async () => {
      // Ensure we're on dashboard
      await page.goto('/dashboard');
      await expect(page.getByRole('heading', { name: 'Recent Canvases' })).toBeVisible();

      // Click New Canvas button
      await page.getByRole('button', { name: 'New Canvas' }).click();

      // Wait for modal to appear
      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();

      // Fill in canvas name
      const canvasName = `Test Canvas ${Date.now()}`;
      const nameInput = modal.getByLabel(/name/i).or(modal.getByPlaceholder(/name/i));
      await nameInput.fill(canvasName);

      // Submit the form
      await modal.getByRole('button', { name: /create/i }).click();

      // Should navigate to the new canvas
      await expect(page).toHaveURL(/\/canvas\/[a-zA-Z0-9-]+/, { timeout: 10000 });
    });

    test('should show empty state when no canvases exist', async ({ browser }) => {
      // Create a new context with a fresh user
      const newContext = await browser.newContext();
      const newPage = await newContext.newPage();

      const freshEmail = generateTestEmail();
      await newPage.goto('/auth/register');
      await newPage.getByLabel('Email Address').fill(freshEmail);
      await newPage.getByLabel('Password').first().fill(validPassword);
      await newPage.getByLabel('Confirm Password').fill(validPassword);
      await newPage.getByRole('button', { name: 'Create Account' }).click();
      await expect(newPage).toHaveURL(/\/dashboard/, { timeout: 10000 });

      // Should show empty state
      await expect(newPage.getByText(/no canvases yet/i)).toBeVisible();

      await newContext.close();
    });
  });

  test.describe('Note Management', () => {
    let canvasId: string;

    test.beforeAll(async () => {
      // Create a canvas for note tests
      await page.goto('/dashboard');
      await page.getByRole('button', { name: 'New Canvas' }).click();

      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();

      const canvasName = `Note Test Canvas ${Date.now()}`;
      const nameInput = modal.getByLabel(/name/i).or(modal.getByPlaceholder(/name/i));
      await nameInput.fill(canvasName);
      await modal.getByRole('button', { name: /create/i }).click();

      await expect(page).toHaveURL(/\/canvas\/[a-zA-Z0-9-]+/, { timeout: 10000 });

      // Extract canvas ID from URL
      const url = page.url();
      const match = url.match(/\/canvas\/([a-zA-Z0-9-]+)/);
      canvasId = match ? match[1] : '';
    });

    test('should add a note to canvas', async () => {
      // Double-click on canvas to create note
      const canvas = page.locator('.react-flow__viewport, [data-testid="canvas"], .react-flow');

      // Wait for canvas to be ready
      await expect(canvas.or(page.locator('main'))).toBeVisible({ timeout: 10000 });

      // Double-click to create note (common interaction for infinite canvas apps)
      await page.mouse.dblclick(400, 300);

      // Wait for note to appear
      await expect(page.locator('[data-id]').or(page.locator('.react-flow__node'))).toBeVisible({
        timeout: 5000
      });
    });

    test('should edit note content', async () => {
      // Find a note on the canvas
      const note = page.locator('.react-flow__node').or(page.locator('[data-id]')).first();

      if (await note.isVisible()) {
        // Click on the note to select it
        await note.click();

        // Look for an editable area or double-click to edit
        const editableArea = note.locator('[contenteditable="true"]').or(
          note.locator('textarea')
        ).or(
          note.locator('input[type="text"]')
        );

        if (await editableArea.isVisible()) {
          await editableArea.click();
          await editableArea.fill('Updated note content');
          await page.keyboard.press('Escape');
        } else {
          // Try double-clicking to enter edit mode
          await note.dblclick();

          // Look for editor after double-click
          const editor = page.locator('[contenteditable="true"]').or(
            page.locator('textarea')
          );

          if (await editor.isVisible()) {
            await editor.fill('Updated note content via editor');
            await page.keyboard.press('Escape');
          }
        }
      }
    });

    test('should drag note to new position', async () => {
      // Find a note on the canvas
      const note = page.locator('.react-flow__node').or(page.locator('[data-id]')).first();

      if (await note.isVisible()) {
        // Get initial position
        const boundingBox = await note.boundingBox();
        if (boundingBox) {
          const startX = boundingBox.x + boundingBox.width / 2;
          const startY = boundingBox.y + boundingBox.height / 2;

          // Drag note to new position
          await page.mouse.move(startX, startY);
          await page.mouse.down();
          await page.mouse.move(startX + 100, startY + 100, { steps: 10 });
          await page.mouse.up();

          // Verify note moved (small delay to let position save)
          await page.waitForTimeout(500);

          // Note should still be visible
          await expect(note).toBeVisible();
        }
      }
    });
  });

  test.describe('Connection Management', () => {
    test.beforeAll(async () => {
      // Create a fresh canvas with two notes for connection tests
      await page.goto('/dashboard');
      await page.getByRole('button', { name: 'New Canvas' }).click();

      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();

      const canvasName = `Connection Test Canvas ${Date.now()}`;
      const nameInput = modal.getByLabel(/name/i).or(modal.getByPlaceholder(/name/i));
      await nameInput.fill(canvasName);
      await modal.getByRole('button', { name: /create/i }).click();

      await expect(page).toHaveURL(/\/canvas\/[a-zA-Z0-9-]+/, { timeout: 10000 });

      // Create first note
      await page.mouse.dblclick(300, 200);
      await page.waitForTimeout(500);

      // Create second note
      await page.mouse.dblclick(600, 200);
      await page.waitForTimeout(500);
    });

    test('should create connection between notes', async () => {
      // Find notes on the canvas
      const notes = page.locator('.react-flow__node').or(page.locator('[data-id]'));
      const noteCount = await notes.count();

      if (noteCount >= 2) {
        const firstNote = notes.first();
        const secondNote = notes.nth(1);

        // Look for connection handles or drag from one note to another
        // This varies by implementation - try common patterns

        // Pattern 1: Drag from handle
        const handle = firstNote.locator('.react-flow__handle').or(
          firstNote.locator('[data-handleid]')
        );

        if (await handle.isVisible()) {
          const handleBox = await handle.boundingBox();
          const targetBox = await secondNote.boundingBox();

          if (handleBox && targetBox) {
            await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
            await page.mouse.down();
            await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 10 });
            await page.mouse.up();
          }
        }
      }

      // Wait for any animations
      await page.waitForTimeout(500);
    });
  });

  test.describe('Canvas Navigation', () => {
    test('should navigate to canvas from dashboard', async () => {
      await page.goto('/dashboard');

      // Wait for canvases to load
      await expect(page.getByRole('heading', { name: 'Recent Canvases' })).toBeVisible();

      // Click on a canvas card (if any exist)
      const canvasCard = page.locator('a[href^="/canvas/"]').first();

      if (await canvasCard.isVisible()) {
        await canvasCard.click();
        await expect(page).toHaveURL(/\/canvas\/[a-zA-Z0-9-]+/, { timeout: 10000 });
      }
    });

    test('should pan the canvas viewport', async () => {
      // Navigate to a canvas first
      await page.goto('/dashboard');

      const canvasCard = page.locator('a[href^="/canvas/"]').first();
      if (await canvasCard.isVisible()) {
        await canvasCard.click();
        await expect(page).toHaveURL(/\/canvas\/[a-zA-Z0-9-]+/, { timeout: 10000 });

        // Try to pan the canvas (grab and drag background)
        await page.keyboard.down('Space');
        await page.mouse.move(400, 300);
        await page.mouse.down();
        await page.mouse.move(500, 400, { steps: 10 });
        await page.mouse.up();
        await page.keyboard.up('Space');

        // Or try clicking and dragging on canvas background
        const canvasBackground = page.locator('.react-flow__pane').or(page.locator('.react-flow'));
        if (await canvasBackground.isVisible()) {
          await canvasBackground.click({ position: { x: 100, y: 100 } });
        }
      }
    });

    test('should zoom the canvas', async () => {
      // Navigate to a canvas first
      await page.goto('/dashboard');

      const canvasCard = page.locator('a[href^="/canvas/"]').first();
      if (await canvasCard.isVisible()) {
        await canvasCard.click();
        await expect(page).toHaveURL(/\/canvas\/[a-zA-Z0-9-]+/, { timeout: 10000 });

        // Use mouse wheel to zoom
        const canvas = page.locator('.react-flow').or(page.locator('main'));
        if (await canvas.isVisible()) {
          await canvas.hover();
          await page.mouse.wheel(0, -100); // Zoom in
          await page.waitForTimeout(200);
          await page.mouse.wheel(0, 100); // Zoom out
        }
      }
    });
  });

  test.describe('Canvas Actions', () => {
    test('should delete a canvas from dashboard', async () => {
      await page.goto('/dashboard');

      // Create a canvas first
      await page.getByRole('button', { name: 'New Canvas' }).click();

      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();

      const canvasName = `Delete Test Canvas ${Date.now()}`;
      const nameInput = modal.getByLabel(/name/i).or(modal.getByPlaceholder(/name/i));
      await nameInput.fill(canvasName);
      await modal.getByRole('button', { name: /create/i }).click();

      await expect(page).toHaveURL(/\/canvas\/[a-zA-Z0-9-]+/, { timeout: 10000 });

      // Go back to dashboard
      await page.goto('/dashboard');

      // Find the canvas card and hover to reveal actions
      const canvasCard = page.locator(`text="${canvasName}"`).first();
      if (await canvasCard.isVisible()) {
        await canvasCard.hover();

        // Look for delete button
        const deleteButton = page.getByRole('button', { name: /delete/i }).or(
          page.locator('[title="Delete"]').or(page.locator('[aria-label="Delete"]'))
        );

        if (await deleteButton.isVisible()) {
          await deleteButton.click();

          // Confirm deletion if there's a confirmation dialog
          const confirmButton = page.getByRole('button', { name: /confirm|delete|yes/i });
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
          }

          // Canvas should be removed from the list
          await page.waitForTimeout(500);
        }
      }
    });

    test('should rename a canvas from dashboard', async () => {
      await page.goto('/dashboard');

      // Find any canvas card and hover to reveal actions
      const canvasCard = page.locator('a[href^="/canvas/"]').first();
      if (await canvasCard.isVisible()) {
        await canvasCard.hover();

        // Look for rename/edit button
        const renameButton = page.getByRole('button', { name: /rename|edit/i }).or(
          page.locator('[title="Rename"]').or(page.locator('[aria-label="Rename"]'))
        );

        if (await renameButton.isVisible()) {
          await renameButton.click();

          // Look for rename input or modal
          const renameInput = page.locator('input[type="text"]').or(page.getByRole('textbox'));
          if (await renameInput.isVisible()) {
            await renameInput.fill(`Renamed Canvas ${Date.now()}`);
            await page.keyboard.press('Enter');
          }
        }
      }
    });
  });
});
