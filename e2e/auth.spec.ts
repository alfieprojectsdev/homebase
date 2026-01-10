import { test, expect } from '@playwright/test';
import { generateUniqueEmail, createTestUser, loginUser } from './helpers/auth';

test.describe('Authentication Flows', () => {
  test('should signup with new account', async ({ page }) => {
    const credentials = await createTestUser(page);

    // Should be on bills page after signup
    await expect(page).toHaveURL(/\/bills/);

    // Should see bills page heading
    await expect(page.locator('h1:has-text("Bills")')).toBeVisible({ timeout: 10000 });
  });

  test('should login with existing credentials', async ({ page }) => {
    // First create a user
    const credentials = await createTestUser(page);

    // Logout
    await page.click('button:has-text("Logout")');
    await expect(page).toHaveURL(/\/login/);

    // Now login with those credentials
    await loginUser(page, credentials.email, credentials.password);

    // Should be on bills page
    await expect(page).toHaveURL(/\/bills/);
    await expect(page.locator('h1:has-text("Bills")')).toBeVisible({ timeout: 10000 });
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');

    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=/Invalid credentials|error/i')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Create and login a user
    await createTestUser(page);
    await expect(page).toHaveURL(/\/bills/);

    // Click logout button
    await page.click('button:has-text("Logout")');

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/bills');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect authenticated users away from login page', async ({ page }) => {
    // Create a user (automatically logs in)
    await createTestUser(page);
    await expect(page).toHaveURL(/\/bills/);

    // Try to access login page again
    await page.goto('/login');

    // Should redirect to bills
    await expect(page).toHaveURL(/\/bills/);
  });
});
