import { test, expect } from '@playwright/test';
import { createTestUser } from './helpers/auth';

test.describe('Blocking Fetch Verification', () => {
    test('should navigate to bills page immediately even if API is slow', async ({ page }) => {
        // 1. Create user and get to dashboard (bills page)
        // We manually handle the login flow to inject the route handler BEFORE navigation

        // Setup interceptor for bills API with long delay
        await page.route('**/api/bills', async route => {
            await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
            await route.continue();
        });

        // Create user (this navigates to /bills at the end)
        console.log('Starting createTestUser...');
        await createTestUser(page);
        console.log('createTestUser completed.');

        // 2. Verify we are on the bills page
        await expect(page).toHaveURL(/\/bills/);

        // 3. Verify loading state is visible (because API is delayed)
        // The Bills page component sets loading=true initially
        await expect(page.locator('.text-gray-600.text-lg:has-text("Loading...")')).toBeVisible();

        console.log('Loading state confirmed visible.');
    });
});
