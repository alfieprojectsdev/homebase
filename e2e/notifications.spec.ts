
import { test, expect } from '@playwright/test';

// User-specified production URL for this session
const BASE_URL = process.env.TEST_URL || 'https://homebase-blond.vercel.app';

test.describe('Notification Engine (Production)', () => {
    test.use({
        baseURL: BASE_URL,
        permissions: ['notifications'], // Grant notification permissions automatically
    });

    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
        page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`));
    });

    test('should subscribe to web push notifications successfully', async ({ page }) => {
        // 1. Login
        await page.goto('/login');
        await page.fill('input[type="email"]', 'alfie@pelicano.family');
        await page.fill('input[type="password"]', 'Alfie@Pelicano');
        await page.click('button[type="submit"]');

        // Wait for dashboard and navigation
        await expect(page).toHaveURL(/\/bills|chores/); // Support default redirect to Bills or Chores

        // 2. Navigate to Settings
        await page.goto('/settings');
        // Use a more specific locator for the page title vs app title
        await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

        // Debug: Check SW Registration (Now safe to check)
        const swRegistrations = await page.evaluate(async () => {
            if (!('serviceWorker' in navigator)) return 'Not Supported';
            const regs = await navigator.serviceWorker.getRegistrations();
            return regs.length;
        });
        console.log(`DEBUG: SW Registrations count: ${swRegistrations}`);

        // 3. Setup Request Interception for Subscription API
        const subscribeRequestPromise = page.waitForRequest(request =>
            request.url().includes('/api/notifications/subscribe') && request.method() === 'POST'
        );

        // 4. Click Enable Push Notifications
        const enableButton = page.getByRole('button', { name: 'Enable Push Notifications' });

        // Wait for hydration/rendering to ensure button state is stable
        await page.waitForLoadState('networkidle');

        if (await enableButton.isVisible()) {
            await enableButton.click();

            // 5. Verify API Call
            const request = await subscribeRequestPromise;
            expect(request.postDataJSON()).toHaveProperty('endpoint');
            expect(request.postDataJSON()).toHaveProperty('keys');

            // 6. Verify UI Update
            await expect(page.locator('text=✅ Active')).toBeVisible();
        } else {
            // If already active, verify the status
            await expect(page.locator('text=✅ Active')).toBeVisible();
            console.log('Push notifications already enabled for this user.');
        }
    });

    test('should show SMS fallback as Coming Soon', async ({ page }) => {
        // 1. Login
        await page.goto('/login');
        await page.fill('input[type="email"]', 'alfie@pelicano.family');
        await page.fill('input[type="password"]', 'Alfie@Pelicano');
        await page.click('button[type="submit"]');

        // 2. Navigate to Settings
        await page.goto('/settings');

        // 3. Verify SMS Fallback shows "Coming Soon" state
        const phoneInput = page.locator('input[type="tel"]');
        await expect(phoneInput).toBeVisible();
        await expect(phoneInput).toBeDisabled();

        // 4. Verify Coming Soon badge
        await expect(page.locator('text=Coming Soon')).toBeVisible();

        // 5. Verify description mentions future availability
        await expect(page.locator('text=will be available in a future update')).toBeVisible();
    });
});
