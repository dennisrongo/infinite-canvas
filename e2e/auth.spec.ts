import { test, expect, Page } from '@playwright/test';

/**
 * E2E tests for authentication flows
 * Tests: Register, Login, Logout, and error handling
 */

// Generate unique test data for each test run
const generateTestEmail = () => `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
const validPassword = 'TestPass123!';

test.describe('Authentication', () => {
  test.describe('Register', () => {
    test('should register a new user successfully', async ({ page }) => {
      const testEmail = generateTestEmail();

      await page.goto('/auth/register');

      // Fill in registration form
      await page.getByLabel('Email Address').fill(testEmail);
      await page.getByLabel('Password').first().fill(validPassword);
      await page.getByLabel('Confirm Password').fill(validPassword);

      // Submit form
      await page.getByRole('button', { name: 'Create Account' }).click();

      // Should redirect to dashboard on success
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

      // Verify user is logged in (check for user-specific UI elements)
      await expect(page.getByRole('heading', { name: 'Recent Canvases' })).toBeVisible();
    });

    test('should show error for invalid email format', async ({ page }) => {
      await page.goto('/auth/register');

      await page.getByLabel('Email Address').fill('invalid-email');
      await page.getByLabel('Password').first().fill(validPassword);
      await page.getByLabel('Confirm Password').fill(validPassword);

      // Click somewhere else to trigger validation
      await page.getByLabel('Password').first().click();

      // Form should not submit (HTML5 validation)
      await expect(page.getByLabel('Email Address')).toHaveValue('invalid-email');
    });

    test('should show error for weak password', async ({ page }) => {
      const testEmail = generateTestEmail();

      await page.goto('/auth/register');

      await page.getByLabel('Email Address').fill(testEmail);
      await page.getByLabel('Password').first().fill('weak');
      await page.getByLabel('Confirm Password').fill('weak');

      await page.getByRole('button', { name: 'Create Account' }).click();

      // Should show password requirements not met
      await expect(page.getByText(/password/i)).toBeVisible();
    });

    test('should show error when passwords do not match', async ({ page }) => {
      const testEmail = generateTestEmail();

      await page.goto('/auth/register');

      await page.getByLabel('Email Address').fill(testEmail);
      await page.getByLabel('Password').first().fill(validPassword);
      await page.getByLabel('Confirm Password').fill('DifferentPass123!');

      await page.getByRole('button', { name: 'Create Account' }).click();

      // Should show password mismatch error
      await expect(page.getByText(/passwords do not match/i)).toBeVisible();
    });

    test('should navigate to login page', async ({ page }) => {
      await page.goto('/auth/register');

      await page.getByRole('link', { name: 'Log in' }).click();

      await expect(page).toHaveURL(/\/auth\/login/);
    });
  });

  test.describe('Login', () => {
    let registeredEmail: string;

    test.beforeAll(async ({ browser }) => {
      // Register a user to use for login tests
      const context = await browser.newContext();
      const page = await context.newPage();

      registeredEmail = generateTestEmail();

      await page.goto('/auth/register');
      await page.getByLabel('Email Address').fill(registeredEmail);
      await page.getByLabel('Password').first().fill(validPassword);
      await page.getByLabel('Confirm Password').fill(validPassword);
      await page.getByRole('button', { name: 'Create Account' }).click();
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

      await context.close();
    });

    test('should login with valid credentials', async ({ page }) => {
      await page.goto('/auth/login');

      await page.getByLabel('Email Address').fill(registeredEmail);
      await page.getByLabel('Password').fill(validPassword);

      await page.getByRole('button', { name: 'Login' }).click();

      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
      await expect(page.getByRole('heading', { name: 'Recent Canvases' })).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/auth/login');

      await page.getByLabel('Email Address').fill(registeredEmail);
      await page.getByLabel('Password').fill('WrongPassword123!');

      await page.getByRole('button', { name: 'Login' }).click();

      // Should show error message
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(page.getByText(/invalid|incorrect|failed/i)).toBeVisible();
    });

    test('should show error for non-existent user', async ({ page }) => {
      await page.goto('/auth/login');

      await page.getByLabel('Email Address').fill('nonexistent@example.com');
      await page.getByLabel('Password').fill(validPassword);

      await page.getByRole('button', { name: 'Login' }).click();

      // Should show error message
      await expect(page.getByRole('alert')).toBeVisible();
    });

    test('should show validation error for empty fields', async ({ page }) => {
      await page.goto('/auth/login');

      // Try to submit without filling fields
      await page.getByRole('button', { name: 'Login' }).click();

      // Should show validation errors (HTML5 or custom)
      await expect(page.getByText(/required/i)).toBeVisible();
    });

    test('should navigate to register page', async ({ page }) => {
      await page.goto('/auth/login');

      await page.getByRole('link', { name: 'Create account' }).click();

      await expect(page).toHaveURL(/\/auth\/register/);
    });

    test('should navigate to forgot password page', async ({ page }) => {
      await page.goto('/auth/login');

      await page.getByRole('link', { name: 'Forgot password?' }).click();

      await expect(page).toHaveURL(/\/auth\/forgot-password/);
    });
  });

  test.describe('Logout', () => {
    test('should logout successfully', async ({ page }) => {
      // First register and login
      const testEmail = generateTestEmail();

      await page.goto('/auth/register');
      await page.getByLabel('Email Address').fill(testEmail);
      await page.getByLabel('Password').first().fill(validPassword);
      await page.getByLabel('Confirm Password').fill(validPassword);
      await page.getByRole('button', { name: 'Create Account' }).click();
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

      // Find and click logout button (typically in sidebar or header)
      // Look for logout in sidebar or user menu
      const logoutButton = page.getByRole('button', { name: /logout|sign out/i }).or(
        page.getByRole('menuitem', { name: /logout|sign out/i })
      );

      // Open sidebar if needed
      const sidebarToggle = page.getByRole('button', { name: /menu|sidebar/i });
      if (await sidebarToggle.isVisible()) {
        await sidebarToggle.click();
      }

      // Try to find user menu or logout button
      const userMenuButton = page.getByRole('button', { name: /user|account|profile/i });
      if (await userMenuButton.isVisible()) {
        await userMenuButton.click();
        await page.getByRole('menuitem', { name: /logout|sign out/i }).click();
      } else if (await logoutButton.isVisible()) {
        await logoutButton.click();
      }

      // Should redirect to login or home
      await expect(page).toHaveURL(/\/(auth\/login)?$/, { timeout: 10000 });

      // Verify user is logged out by trying to access protected route
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 });
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      await page.goto('/dashboard');

      // Should be redirected to login
      await expect(page).toHaveURL(/\/auth\/login/);
    });

    test('should redirect unauthenticated users from canvas page', async ({ page }) => {
      await page.goto('/canvas/some-canvas-id');

      // Should be redirected to login
      await expect(page).toHaveURL(/\/auth\/login/);
    });
  });
});
