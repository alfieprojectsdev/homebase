import { test, expect } from '@playwright/test';
import { createTestUser } from './helpers/auth';

test.describe('Heuristics Tests', () => {
  test.beforeEach(async ({ page }) => {
    await createTestUser(page);
  });

  test('should get amount suggestion via API', async ({ request }) => {
    const createResponse = await request.post('/api/bills', {
      data: {
        name: 'Netflix Subscription',
        amount: '15.99',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
    });

    expect(createResponse.ok()).toBeTruthy();
    const billData = await createResponse.json();
    const billId = billData.bill.id;

    const suggestionResponse = await request.get(
      `/api/heuristics/amount-suggestion?billId=${billId}`
    );

    expect(suggestionResponse.ok()).toBeTruthy();
    const suggestionData = await suggestionResponse.json();

    expect(suggestionData.suggestion).toHaveProperty('suggested');
    expect(suggestionData.suggestion).toHaveProperty('confidence');
    expect(suggestionData.suggestion).toHaveProperty('pattern');
  });

  test('should categorize bill automatically', async ({ request }) => {
    const categorizeResponse = await request.post('/api/heuristics/categorize', {
      data: {
        name: 'Meralco Electric Bill',
        amount: 2500,
      },
    });

    expect(categorizeResponse.ok()).toBeTruthy();
    const categorizeData = await categorizeResponse.json();

    expect(categorizeData.category).toBe('utility-electric');
    expect(categorizeData.confidence).toBeGreaterThan(0.8);
    expect(categorizeData.autoDetected).toBe(true);
  });
});

test.describe('Chores CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await createTestUser(page);
    await page.goto('/chores');
  });

  test('should display chores list', async ({ page }) => {
    await expect(page.locator('h1:has-text("Chores")')).toBeVisible();

    const emptyState = await page.locator('text="No chores found"').isVisible().catch(() => false);
    const addButton = await page.locator('text="Add Chore"').isVisible().catch(() => false);
    const hasChores = emptyState || addButton;
    expect(hasChores).toBeTruthy();
  });

  test('should create a new chore', async ({ page }) => {
    await page.click('text=Add Chore');

    await expect(page).toHaveURL(/\/chores\/new/);

    const uniqueChoreName = `Test Chore ${Date.now()}`;
    await page.fill('input[name="title"]', uniqueChoreName);

    await page.click('button[type="submit"]:has-text("Create Chore")');

    await expect(page).toHaveURL(/\/chores$/);

    await expect(page.locator(`text=${uniqueChoreName}`)).toBeVisible({ timeout: 10000 });
  });

  test('should update chore progress', async ({ page, request }) => {
    const apiUrl = page.url().split('/chores')[0];

    const createResponse = await request.post(`${apiUrl}/api/chores`, {
      data: {
        title: `Progress Test ${Date.now()}`,
        progress: 0,
      },
    });

    expect(createResponse.ok()).toBeTruthy();
    const choreData = await createResponse.json();
    const choreId = choreData.chore.id;

    await page.goto('/chores');

    const updateResponse = await request.patch(`${apiUrl}/api/chores/${choreId}`, {
      data: {
        progress: 50,
      },
    });

    expect(updateResponse.ok()).toBeTruthy();

    await page.reload();
    await expect(page.locator('text="50%"')).toBeVisible({ timeout: 5000 });
  });

  test('should mark chore as complete', async ({ page, request }) => {
    const apiUrl = page.url().split('/chores')[0];

    const createResponse = await request.post(`${apiUrl}/api/chores`, {
      data: {
        title: `Completion Test ${Date.now()}`,
        progress: 0,
      },
    });

    expect(createResponse.ok()).toBeTruthy();
    const choreData = await createResponse.json();
    const choreId = choreData.chore.id;

    await page.goto('/chores');

    const completeResponse = await request.patch(`${apiUrl}/api/chores/${choreId}`, {
      data: {
        progress: 100,
      },
    });

    expect(completeResponse.ok()).toBeTruthy();

    await page.reload();

    await expect(page.locator('text="100%"')).toBeVisible({ timeout: 5000 });
  });

  test('should delete chore', async ({ page, request }) => {
    const apiUrl = page.url().split('/chores')[0];

    const createResponse = await request.post(`${apiUrl}/api/chores`, {
      data: {
        title: `Delete Test ${Date.now()}`,
        progress: 0,
      },
    });

    expect(createResponse.ok()).toBeTruthy();
    const choreData = await createResponse.json();
    const choreId = choreData.chore.id;

    await page.goto('/chores');
    await expect(page.locator(`text=Delete Test`)).toBeVisible();

    const deleteResponse = await request.delete(`${apiUrl}/api/chores/${choreId}`);

    expect(deleteResponse.ok()).toBeTruthy();

    await page.reload();
    await expect(page.locator(`text=Delete Test`)).not.toBeVisible({ timeout: 5000 });
  });
});
