import { Page } from '@playwright/test';

export const generateUniqueEmail = () =>
  `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;

export const createTestUser = async (page: Page) => {
  const email = generateUniqueEmail();
  const password = 'password123';

  await page.goto('/signup');

  // Fill signup form (only 4 fields: name, orgName, email, password)
  await page.fill('input[name="name"]', 'Test User');
  await page.fill('input[name="orgName"]', 'Test Family');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for redirect to bills page
  await page.waitForURL(/\/bills/, { timeout: 15000 });

  return { email, password };
};

export const loginUser = async (page: Page, email: string, password: string) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/bills/, { timeout: 15000 });
};
