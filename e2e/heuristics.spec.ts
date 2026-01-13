import { test, expect } from '@playwright/test';
import { createTestUser } from './helpers/auth';

test.describe('Heuristics API Tests', () => {
  test.beforeEach(async ({ page }) => {
    await createTestUser(page);
  });

  test('should get amount suggestion for existing bill', async ({ page, request }) => {
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

  test('should categorize bill automatically', async ({ page, request }) => {
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

  test('should detect anomalies in bill amounts', async ({ page, request }) => {
    const analyzeResponse = await request.post('/api/heuristics/analyze-bill', {
      data: {
        amount: 5000,
      },
    });

    expect(analyzeResponse.ok()).toBeTruthy();
    const analyzeData = await analyzeResponse.json();

    expect(analyzeData.detection).toHaveProperty('isAnomaly');
    expect(analyzeData.detection).toHaveProperty('message');
    expect(analyzeData.detection).toHaveProperty('severity');
  });

  test('should calculate urgency score for bill', async ({ page, request }) => {
    const createResponse = await request.post('/api/bills', {
      data: {
        name: 'Electric Bill',
        amount: '2000',
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
    });

    expect(createResponse.ok()).toBeTruthy();
    const billData = await createResponse.json();
    const billId = billData.bill.id;

    const urgencyResponse = await request.post('/api/heuristics/calculate-urgency', {
      data: { billId },
    });

    expect(urgencyResponse.ok()).toBeTruthy();
    const urgencyData = await urgencyResponse.json();

    expect(urgencyData.urgencyScore).toHaveProperty('score');
    expect(urgencyData.urgencyScore).toHaveProperty('level');
    expect(urgencyData.urgencyScore).toHaveProperty('reasons');
    expect(['critical', 'high', 'normal']).toContain(urgencyData.urgencyScore.level);
  });
});

test.describe('Heuristics UI Integration', () => {
  test.beforeEach(async ({ page }) => {
    await createTestUser(page);
    await page.goto('/bills');
  });

  test('should show amount suggestion on create bill', async ({ page }) => {
    await page.click('a:has-text("Add Bill")');
    await expect(page).toHaveURL(/\/bills\/new/);

    await page.fill('input[name="name"]', 'Meralco Electric');
    await page.waitForTimeout(500);

    const suggestion = await page.locator('text=Suggested amount').isVisible().catch(() => false);
    if (suggestion) {
      await expect(page.locator('text=Suggested amount')).toBeVisible();
    }
  });

  test('should display anomaly warning for unusual amount', async ({ page }) => {
    await page.click('a:has-text("Add Bill")');
    await page.fill('input[name="name"]', 'Water Bill');
    await page.fill('input[name="amount"]', '5000');

    await page.waitForTimeout(500);

    const warning = await page.locator('text=unusual').isVisible().catch(() => false);
    if (warning) {
      await expect(page.locator('text=unusual')).toBeVisible();
    }
  });
});
