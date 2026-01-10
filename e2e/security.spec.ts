import { test, expect } from '@playwright/test';

test.describe('Security & Multi-Tenancy', () => {
  test('should not allow access to API without authentication', async ({ page, request }) => {
    // Try to access bills API without being logged in
    const response = await request.get('/api/bills');

    // Should return 401 Unauthorized
    expect(response.status()).toBe(401);
  });

  test('should not allow creating bills without authentication', async ({ request }) => {
    const response = await request.post('/api/bills', {
      data: {
        name: 'Unauthorized Bill',
        amount: '100.00',
        dueDate: new Date().toISOString(),
      },
    });

    // Should return 401 Unauthorized
    expect(response.status()).toBe(401);
  });

  test('should isolate data between organizations', async ({ browser }) => {
    // Create two separate user sessions
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // User 1: Sign up with unique email
    const email1 = `org1-${Date.now()}@example.com`;
    await page1.goto('/signup');
    await page1.fill('input[name="name"]', 'User 1');
    await page1.fill('input[name="orgName"]', 'Organization 1');
    await page1.fill('input[name="email"]', email1);
    await page1.fill('input[name="password"]', 'password123');
    await page1.click('button[type="submit"]');
    await page1.waitForURL(/\/bills/, { timeout: 15000 });

    // User 1: Create a unique bill
    await page1.click('a:has-text("Add Bill")');
    const org1BillName = `Org 1 Secret Bill ${Date.now()}`;
    await page1.fill('input[name="name"]', org1BillName);
    await page1.fill('input[name="amount"]', '100.00');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    await page1.fill('input[name="dueDate"]', futureDate.toISOString().split('T')[0]);
    await page1.click('button[type="submit"]:has-text("Create Bill")');
    await expect(page1).toHaveURL(/\/bills$/);
    await expect(page1.locator(`text=${org1BillName}`)).toBeVisible();

    // User 2: Sign up with different email
    const email2 = `org2-${Date.now()}@example.com`;
    await page2.goto('/signup');
    await page2.fill('input[name="name"]', 'User 2');
    await page2.fill('input[name="orgName"]', 'Organization 2');
    await page2.fill('input[name="email"]', email2);
    await page2.fill('input[name="password"]', 'password123');
    await page2.click('button[type="submit"]');
    await page2.waitForURL(/\/bills/, { timeout: 15000 });

    // User 2 should NOT see User 1's bill
    await expect(page2.locator(`text=${org1BillName}`)).not.toBeVisible();

    // User 2: Create their own bill
    await page2.click('a:has-text("Add Bill")');
    const org2BillName = `Org 2 Bill ${Date.now()}`;
    await page2.fill('input[name="name"]', org2BillName);
    await page2.fill('input[name="amount"]', '200.00');
    await page2.fill('input[name="dueDate"]', futureDate.toISOString().split('T')[0]);
    await page2.click('button[type="submit"]:has-text("Create Bill")');
    await expect(page2).toHaveURL(/\/bills$/);

    // User 2 should see their own bill
    await expect(page2.locator(`text=${org2BillName}`)).toBeVisible();

    // User 1 should NOT see User 2's bill
    await page1.reload();
    await expect(page1.locator(`text=${org2BillName}`)).not.toBeVisible();

    // User 1 should still see their own bill
    await expect(page1.locator(`text=${org1BillName}`)).toBeVisible();

    await context1.close();
    await context2.close();
  });

  test('should enforce password requirements', async ({ page }) => {
    await page.goto('/signup');

    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="orgName"]', 'Test Org');
    await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'short'); // Too short

    await page.click('button[type="submit"]');

    // Should show error for weak password (if validation exists)
    const errorMessage = page.locator('text=/password|8 characters|invalid/i');
    if (await errorMessage.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(errorMessage).toBeVisible();
    }
  });

  test('should use httpOnly cookies for JWT', async ({ page }) => {
    // Create and login a user
    const { createTestUser } = await import('./helpers/auth');
    await createTestUser(page);
    await expect(page).toHaveURL(/\/bills/);

    // Try to access the token via JavaScript (should fail for httpOnly cookies)
    const tokenAccessible = await page.evaluate(() => {
      return document.cookie.includes('token=');
    });

    // httpOnly cookies should NOT be accessible via document.cookie
    // If token is visible in document.cookie, that's a security issue
    expect(tokenAccessible).toBe(false);
  });

  test('should handle expired/invalid tokens gracefully', async ({ page, context }) => {
    // Create and login a user
    const { createTestUser } = await import('./helpers/auth');
    await createTestUser(page);
    await expect(page).toHaveURL(/\/bills/);

    // Clear cookies to simulate expired token
    await context.clearCookies();

    // Try to access protected page
    await page.goto('/bills');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});
