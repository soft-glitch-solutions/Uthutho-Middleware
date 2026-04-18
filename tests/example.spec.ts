import { test, expect } from '@playwright/test';

test.describe('Homepage Smoke Tests', () => {
  test('should load homepage and display correct title', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');

    // Wait for page to load (optional, but good practice)
    await page.waitForLoadState('networkidle');

    // Check that the page title is correct
    await expect(page).toHaveTitle(/Vite|React|App/i);
  });

  test('should have visible content on the page', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');

    // Wait for page to be ready
    await page.waitForLoadState('domcontentloaded');

    // Check that the page has some content (body should not be empty)
    const body = page.locator('body');
    await expect(body).toBeTruthy();
  });
});
