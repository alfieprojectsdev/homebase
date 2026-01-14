import { test, expect } from '@playwright/test';
import { createTestUser } from './helpers/auth';

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

  test('should update chore progress', async ({ page }) => {
    const apiUrl = page.url().split('/chores')[0];

    const createResponse = await page.request.post(`${apiUrl}/api/chores`, {
      data: {
        title: `Progress Test ${Date.now()}`,
        progress: 0,
      },
    });

    expect(createResponse.ok()).toBeTruthy();
    const choreData = await createResponse.json();
    const choreId = choreData.chore.id;

    await page.goto('/chores');

    const updateResponse = await page.request.patch(`${apiUrl}/api/chores/${choreId}`, {
      data: {
        progress: 50,
      },
    });

    expect(updateResponse.ok()).toBeTruthy();

    await page.reload();
    await expect(page.locator('text="50%"')).toBeVisible({ timeout: 5000 });
  });

  test('should mark chore as complete', async ({ page }) => {
    const apiUrl = page.url().split('/chores')[0];

    const createResponse = await page.request.post(`${apiUrl}/api/chores`, {
      data: {
        title: `Completion Test ${Date.now()}`,
        progress: 0,
      },
    });

    expect(createResponse.ok()).toBeTruthy();
    const choreData = await createResponse.json();
    const choreId = choreData.chore.id;

    await page.goto('/chores');

    const completeResponse = await page.request.patch(`${apiUrl}/api/chores/${choreId}`, {
      data: {
        progress: 100,
      },
    });

    expect(completeResponse.ok()).toBeTruthy();

    await page.reload();

    await expect(page.locator('text="100%"')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=bg-green-600')).toBeVisible({ timeout: 5000 });
  });

  test('should delete chore', async ({ page }) => {
    const apiUrl = page.url().split('/chores')[0];

    const createResponse = await page.request.post(`${apiUrl}/api/chores`, {
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

    const deleteResponse = await page.request.delete(`${apiUrl}/api/chores/${choreId}`);

    expect(deleteResponse.ok()).toBeTruthy();

    await page.reload();
    await expect(page.locator(`text=Delete Test`)).not.toBeVisible({ timeout: 5000 });
  });
});
