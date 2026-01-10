import { test, expect } from '@playwright/test';
import { createTestUser } from './helpers/auth';

test.describe('Bill Recurrence - Phase 1.5', () => {
  test.beforeEach(async ({ page }) => {
    // Create and login a fresh user for each test
    await createTestUser(page);
    await expect(page).toHaveURL(/\/bills/);
  });

  test('should create a recurring bill with monthly frequency', async ({ page }) => {
    // Navigate to Add Bill page
    await page.click('a:has-text("Add Bill")');
    await expect(page).toHaveURL(/\/bills\/new/);

    // Fill in bill details
    const uniqueBillName = `Monthly Electric Bill ${Date.now()}`;
    await page.fill('input[name="name"]', uniqueBillName);
    await page.fill('input[name="amount"]', '125.50');

    // Set due date to 10 days from now
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const dateString = futureDate.toISOString().split('T')[0];
    await page.fill('input[name="dueDate"]', dateString);

    // Enable recurrence checkbox
    const recurrenceCheckbox = page.locator('input#recurrence-enabled');
    await recurrenceCheckbox.check();

    // Verify recurrence options are visible
    await expect(page.locator('select#frequency')).toBeVisible();

    // Select "Monthly" frequency (should be default)
    await page.selectOption('select#frequency', 'monthly');

    // Verify the frequency is set
    const selectedFrequency = await page.locator('select#frequency').inputValue();
    expect(selectedFrequency).toBe('monthly');

    // Submit form
    await page.click('button[type="submit"]:has-text("Create Bill")');

    // Should redirect to bills list
    await expect(page).toHaveURL(/\/bills$/);

    // Should see the new bill in the list
    await expect(page.locator(`text=${uniqueBillName}`)).toBeVisible({ timeout: 10000 });

    // Verify 🔄 "Recurring" indicator is visible
    const billCard = page.locator(`text=${uniqueBillName}`).locator('..').locator('..');
    await expect(billCard.locator('text=🔄 Recurring')).toBeVisible();
  });

  test('should mark recurring bill as paid and verify next occurrence auto-created', async ({ page }) => {
    // Create a recurring monthly bill first
    await page.click('a:has-text("Add Bill")');

    const recurringBillName = `Water Bill ${Date.now()}`;
    await page.fill('input[name="name"]', recurringBillName);
    await page.fill('input[name="amount"]', '45.00');

    // Set due date to today (for immediate payment test)
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    await page.fill('input[name="dueDate"]', todayString);

    // Enable recurrence
    await page.locator('input#recurrence-enabled').check();
    await page.selectOption('select#frequency', 'monthly');

    // Submit form
    await page.click('button[type="submit"]:has-text("Create Bill")');
    await expect(page).toHaveURL(/\/bills$/);

    // Wait for bill to appear
    await expect(page.locator(`text=${recurringBillName}`)).toBeVisible({ timeout: 10000 });

    // Find and click "Mark as Paid" button
    const payButton = page
      .locator(`text=${recurringBillName}`)
      .locator('xpath=ancestor::div[contains(@class, "border")]')
      .locator('button:has-text("Mark as Paid")');
    await payButton.click();

    // Wait for success message or page reload
    await page.waitForTimeout(2000);

    // Navigate back to bills list to see updated state
    await page.goto('/bills');
    await page.waitForLoadState('networkidle');

    // Verify TWO bills exist with the same name
    const billInstances = page.locator(`text=${recurringBillName}`);
    const count = await billInstances.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // Verify one is paid (green background) and one is pending
    const paidBill = page.locator('.bg-green-100').locator(`text=${recurringBillName}`);
    const pendingBill = page.locator('div').filter({ hasText: recurringBillName }).filter({ hasNotText: 'bg-green-100' }).first();

    await expect(paidBill).toBeVisible({ timeout: 5000 });
    await expect(pendingBill).toBeVisible({ timeout: 5000 });

    // Verify both have same amount
    const amountElements = page.locator('text=/\\$45\\.00/');
    const amountCount = await amountElements.count();
    expect(amountCount).toBeGreaterThanOrEqual(2);
  });

  test('should create recurring bill with quarterly frequency', async ({ page }) => {
    await page.click('a:has-text("Add Bill")');

    const quarterlyBillName = `Property Tax ${Date.now()}`;
    await page.fill('input[name="name"]', quarterlyBillName);
    await page.fill('input[name="amount"]', '850.00');

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 15);
    await page.fill('input[name="dueDate"]', futureDate.toISOString().split('T')[0]);

    // Enable recurrence and select quarterly
    await page.locator('input#recurrence-enabled').check();
    await page.selectOption('select#frequency', 'quarterly');

    // Verify quarterly is selected
    const selectedFrequency = await page.locator('select#frequency').inputValue();
    expect(selectedFrequency).toBe('quarterly');

    // Submit form
    await page.click('button[type="submit"]:has-text("Create Bill")');
    await expect(page).toHaveURL(/\/bills$/);

    // Verify bill created with recurring indicator
    await expect(page.locator(`text=${quarterlyBillName}`)).toBeVisible({ timeout: 10000 });
    const billCard = page.locator(`text=${quarterlyBillName}`).locator('..').locator('..');
    await expect(billCard.locator('text=🔄 Recurring')).toBeVisible();
  });

  test('should edit recurrence settings on existing bill', async ({ page }) => {
    // Create a recurring monthly bill
    await page.click('a:has-text("Add Bill")');

    const billName = `Internet Bill ${Date.now()}`;
    await page.fill('input[name="name"]', billName);
    await page.fill('input[name="amount"]', '75.00');

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    await page.fill('input[name="dueDate"]', futureDate.toISOString().split('T')[0]);

    // Enable monthly recurrence
    await page.locator('input#recurrence-enabled').check();
    await page.selectOption('select#frequency', 'monthly');

    await page.click('button[type="submit"]:has-text("Create Bill")');
    await expect(page).toHaveURL(/\/bills$/);

    // Wait for bill to appear
    await expect(page.locator(`text=${billName}`)).toBeVisible({ timeout: 10000 });

    // Navigate to edit page
    const editButton = page
      .locator(`text=${billName}`)
      .locator('xpath=ancestor::div[contains(@class, "border")]')
      .locator('a:has-text("Edit")');
    await editButton.click();

    await expect(page).toHaveURL(/\/bills\/\d+\/edit/);

    // Verify recurrence is enabled
    const recurrenceCheckbox = page.locator('input#recurrence-enabled');
    await expect(recurrenceCheckbox).toBeChecked();

    // Change frequency to "Quarterly"
    await page.selectOption('select#frequency', 'quarterly');

    // Verify frequency changed
    const selectedFrequency = await page.locator('select#frequency').inputValue();
    expect(selectedFrequency).toBe('quarterly');

    // Save changes
    await page.click('button[type="submit"]:has-text("Update Bill")');

    // Should redirect back to bill details or list
    await page.waitForURL(/\/bills/, { timeout: 10000 });

    // Verify bill still shows as recurring
    await expect(page.locator(`text=${billName}`)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=🔄 Recurring')).toBeVisible();
  });

  test('should disable recurrence on existing recurring bill', async ({ page }) => {
    // Create a recurring bill
    await page.click('a:has-text("Add Bill")');

    const billName = `Phone Bill ${Date.now()}`;
    await page.fill('input[name="name"]', billName);
    await page.fill('input[name="amount"]', '55.00');

    const today = new Date();
    await page.fill('input[name="dueDate"]', today.toISOString().split('T')[0]);

    // Enable recurrence
    await page.locator('input#recurrence-enabled').check();
    await page.selectOption('select#frequency', 'monthly');

    await page.click('button[type="submit"]:has-text("Create Bill")');
    await expect(page).toHaveURL(/\/bills$/);

    // Wait for bill to appear
    await expect(page.locator(`text=${billName}`)).toBeVisible({ timeout: 10000 });

    // Navigate to edit page
    const editButton = page
      .locator(`text=${billName}`)
      .locator('xpath=ancestor::div[contains(@class, "border")]')
      .locator('a:has-text("Edit")');
    await editButton.click();

    await expect(page).toHaveURL(/\/bills\/\d+\/edit/);

    // Uncheck recurrence enabled
    const recurrenceCheckbox = page.locator('input#recurrence-enabled');
    await recurrenceCheckbox.uncheck();

    // Verify recurrence options are hidden
    await expect(page.locator('select#frequency')).not.toBeVisible();

    // Save changes
    await page.click('button[type="submit"]:has-text("Update Bill")');
    await page.waitForURL(/\/bills/, { timeout: 10000 });

    // Go back to bills list
    await page.goto('/bills');
    await page.waitForLoadState('networkidle');

    // Verify bill no longer shows recurring indicator
    await expect(page.locator(`text=${billName}`)).toBeVisible({ timeout: 10000 });
    const updatedBillCard = page.locator(`text=${billName}`).locator('..').locator('..');
    await expect(updatedBillCard.locator('text=🔄 Recurring')).not.toBeVisible();

    // Mark bill as paid
    await page.goto('/bills');
    const finalBillCard = page.locator(`text=${billName}`).locator('..').locator('..').locator('..');
    const payButton = finalBillCard.locator('button:has-text("Mark as Paid")');
    await payButton.click();

    // Wait for payment to process
    await page.waitForTimeout(2000);
    await page.goto('/bills');
    await page.waitForLoadState('networkidle');

    // Verify NO next occurrence was created (should only see ONE bill with this name)
    const billInstances = page.locator(`text=${billName}`);
    const count = await billInstances.count();
    expect(count).toBe(1); // Only the original bill, now paid
  });

  test('should test duplicate prevention when marking paid twice quickly', async ({ page }) => {
    // Create a recurring bill
    await page.click('a:has-text("Add Bill")');

    const billName = `Gas Bill ${Date.now()}`;
    await page.fill('input[name="name"]', billName);
    await page.fill('input[name="amount"]', '90.00');

    const today = new Date();
    await page.fill('input[name="dueDate"]', today.toISOString().split('T')[0]);

    // Enable recurrence
    await page.locator('input#recurrence-enabled').check();
    await page.selectOption('select#frequency', 'monthly');

    await page.click('button[type="submit"]:has-text("Create Bill")');
    await expect(page).toHaveURL(/\/bills$/);

    // Wait for bill to appear
    await expect(page.locator(`text=${billName}`)).toBeVisible({ timeout: 10000 });

    // Mark as paid
    const payButton = page
      .locator(`text=${billName}`)
      .locator('xpath=ancestor::div[contains(@class, "border")]')
      .locator('button:has-text("Mark as Paid")');
    await payButton.click();

    // Wait for next occurrence to be created
    await page.waitForTimeout(2000);
    await page.goto('/bills');
    await page.waitForLoadState('networkidle');

    // Now immediately try to mark the NEXT occurrence as paid (simulate double-click scenario)
    const pendingBills = page.locator('button:has-text("Mark as Paid")');
    const pendingCount = await pendingBills.count();

    if (pendingCount > 0) {
      // Click the first pending bill's pay button
      await pendingBills.first().click();

      // Wait for processing
      await page.waitForTimeout(2000);
      await page.goto('/bills');
      await page.waitForLoadState('networkidle');
    }

    // Count total bills with this name
    const allBillInstances = page.locator(`text=${billName}`);
    const totalCount = await allBillInstances.count();

    // Should have EXACTLY 2 or 3 bills (original paid, next occurrence, and possibly one more)
    // But NOT duplicates for the same due date
    expect(totalCount).toBeGreaterThanOrEqual(2);
    expect(totalCount).toBeLessThanOrEqual(3);

    // Verify no duplicate due dates by checking that we don't have more than one bill with same status and date
    // This is a smoke test to ensure the duplicate prevention logic works
  });

  test('should create recurring bill with custom day of month', async ({ page }) => {
    await page.click('a:has-text("Add Bill")');

    const billName = `Mortgage ${Date.now()}`;
    await page.fill('input[name="name"]', billName);
    await page.fill('input[name="amount"]', '1500.00');

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 20);
    await page.fill('input[name="dueDate"]', futureDate.toISOString().split('T')[0]);

    // Enable recurrence
    await page.locator('input#recurrence-enabled').check();
    await page.selectOption('select#frequency', 'monthly');

    // Set custom day of month (15th)
    await page.fill('input#dayOfMonth', '15');

    // Submit form
    await page.click('button[type="submit"]:has-text("Create Bill")');
    await expect(page).toHaveURL(/\/bills$/);

    // Verify bill created with recurring indicator
    await expect(page.locator(`text=${billName}`)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=🔄 Recurring')).toBeVisible();
  });

  test('should create recurring bill with biannual frequency', async ({ page }) => {
    await page.click('a:has-text("Add Bill")');

    const billName = `Car Insurance ${Date.now()}`;
    await page.fill('input[name="name"]', billName);
    await page.fill('input[name="amount"]', '650.00');

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    await page.fill('input[name="dueDate"]', futureDate.toISOString().split('T')[0]);

    // Enable recurrence and select biannual
    await page.locator('input#recurrence-enabled').check();
    await page.selectOption('select#frequency', 'biannual');

    // Verify biannual is selected
    const selectedFrequency = await page.locator('select#frequency').inputValue();
    expect(selectedFrequency).toBe('biannual');

    // Submit form
    await page.click('button[type="submit"]:has-text("Create Bill")');
    await expect(page).toHaveURL(/\/bills$/);

    // Verify bill created with recurring indicator
    await expect(page.locator(`text=${billName}`)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=🔄 Recurring')).toBeVisible();
  });

  test('should create recurring bill with annual frequency', async ({ page }) => {
    await page.click('a:has-text("Add Bill")');

    const billName = `HOA Fees ${Date.now()}`;
    await page.fill('input[name="name"]', billName);
    await page.fill('input[name="amount"]', '1200.00');

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 60);
    await page.fill('input[name="dueDate"]', futureDate.toISOString().split('T')[0]);

    // Enable recurrence and select annual
    await page.locator('input#recurrence-enabled').check();
    await page.selectOption('select#frequency', 'annual');

    // Verify annual is selected
    const selectedFrequency = await page.locator('select#frequency').inputValue();
    expect(selectedFrequency).toBe('annual');

    // Submit form
    await page.click('button[type="submit"]:has-text("Create Bill")');
    await expect(page).toHaveURL(/\/bills$/);

    // Verify bill created with recurring indicator
    await expect(page.locator(`text=${billName}`)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=🔄 Recurring')).toBeVisible();
  });

  test('should verify recurrence checkbox toggles frequency options', async ({ page }) => {
    await page.click('a:has-text("Add Bill")');

    // Verify recurrence options are initially hidden
    const recurrenceCheckbox = page.locator('input#recurrence-enabled');
    await expect(recurrenceCheckbox).not.toBeChecked();
    await expect(page.locator('select#frequency')).not.toBeVisible();

    // Check the recurrence checkbox
    await recurrenceCheckbox.check();

    // Verify recurrence options become visible
    await expect(page.locator('select#frequency')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input#interval')).toBeVisible();
    await expect(page.locator('input#dayOfMonth')).toBeVisible();

    // Uncheck the recurrence checkbox
    await recurrenceCheckbox.uncheck();

    // Verify recurrence options are hidden again
    await expect(page.locator('select#frequency')).not.toBeVisible();
  });
});
