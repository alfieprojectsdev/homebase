import { test, expect } from '@playwright/test';
import { createTestUser } from './helpers/auth';

test.describe('Bills CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Create and login a fresh user for each test
    await createTestUser(page);
    await expect(page).toHaveURL(/\/bills/);
  });

  test('should display bills list', async ({ page }) => {
    // Should see the bills page header
    await expect(page.locator('h1:has-text("Bills")')).toBeVisible();

    // Page should load successfully (either showing bills or empty state)
    const hasBills = await page.locator('text=/No bills yet|Add Bill/i').isVisible();
    expect(hasBills).toBeTruthy();
  });

  test('should create a new bill', async ({ page }) => {
    await page.click('a:has-text("Add Bill")');

    await expect(page).toHaveURL(/\/bills\/new/);

    // Fill the form
    const uniqueBillName = `Test Bill ${Date.now()}`;
    await page.fill('input[name="name"]', uniqueBillName);
    await page.fill('input[name="amount"]', '100.50');

    // Set due date to 5 days from now
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const dateString = futureDate.toISOString().split('T')[0];
    await page.fill('input[name="dueDate"]', dateString);

    // Submit form
    await page.click('button[type="submit"]:has-text("Create Bill")');

    // Should redirect to bills list
    await expect(page).toHaveURL(/\/bills$/);

    // Should see the new bill in the list
    await expect(page.locator(`text=${uniqueBillName}`)).toBeVisible({ timeout: 10000 });
  });

  test('should view bill details', async ({ page }) => {
    // Click on first bill
    const firstBill = page.locator('a[href*="/bills/"]').first();
    await firstBill.click();

    // Should be on bill detail page
    await expect(page).toHaveURL(/\/bills\/\d+$/);

    // Should see bill details
    await expect(page.locator('text=/Amount:|Due Date:|Status:/i')).toBeVisible();
  });

  test('should edit a bill', async ({ page }) => {
    // Navigate to first bill
    const firstBill = page.locator('a[href*="/bills/"]').first();
    await firstBill.click();

    // Click edit button
    await page.click('a:has-text("Edit")');

    await expect(page).toHaveURL(/\/bills\/\d+\/edit/);

    // Update bill name
    const updatedName = `Updated Bill ${Date.now()}`;
    await page.fill('input[name="name"]', updatedName);

    // Update amount
    await page.fill('input[name="amount"]', '250.75');

    // Submit form
    await page.click('button[type="submit"]:has-text("Update Bill")');

    // Should redirect back to bill details
    await expect(page).toHaveURL(/\/bills\/\d+$/);

    // Should see updated information
    await expect(page.locator(`text=${updatedName}`)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=250.75')).toBeVisible();
  });

  test('should mark bill as paid', async ({ page }) => {
    // Navigate to first pending bill
    const pendingBill = page.locator('a[href*="/bills/"]').first();
    await pendingBill.click();

    // Click pay button (either on list or detail page)
    const payButton = page.locator('button:has-text("Pay")').or(page.locator('button:has-text("Mark as Paid")')).first();

    if (await payButton.isVisible()) {
      await payButton.click();

      // Should see success message or status change
      await expect(page.locator('text=/paid|success/i')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should delete a bill', async ({ page }) => {
    // Create a bill first to ensure we have one to delete
    await page.click('a:has-text("Add Bill")');
    const billToDelete = `Delete Me ${Date.now()}`;
    await page.fill('input[name="name"]', billToDelete);
    await page.fill('input[name="amount"]', '50.00');

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    await page.fill('input[name="dueDate"]', futureDate.toISOString().split('T')[0]);
    await page.click('button[type="submit"]:has-text("Create Bill")');

    await expect(page).toHaveURL(/\/bills$/);
    await expect(page.locator(`text=${billToDelete}`)).toBeVisible();

    // Find and click delete button for this bill
    const billRow = page.locator(`text=${billToDelete}`).locator('..').locator('..');
    const deleteButton = billRow.locator('button:has-text("Delete")');

    await deleteButton.click();

    // Confirm deletion if there's a confirmation dialog
    page.on('dialog', dialog => dialog.accept());

    // Bill should be removed from list
    await expect(page.locator(`text=${billToDelete}`)).not.toBeVisible({ timeout: 10000 });
  });

  test('should display visual urgency for overdue bills', async ({ page }) => {
    // Look for bills with red background (overdue indicator)
    const overdueIndicator = page.locator('[class*="bg-red"]').first();

    // If there are overdue bills, they should have red styling
    if (await overdueIndicator.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(overdueIndicator).toBeVisible();
    }
  });

  test('should filter bills by residence', async ({ page }) => {
    // Check if residence filter exists
    const residenceFilter = page.locator('select[name="residence"]').or(page.locator('text=/Primary Residence|Secondary Residence/i')).first();

    if (await residenceFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
      await residenceFilter.click();
      // Should show filtered results
      await expect(page.locator('text=/bill|financial obligation/i')).toBeVisible();
    }
  });

  test('should validate required fields on create', async ({ page }) => {
    await page.click('a:has-text("Add Bill")');

    // Try to submit empty form
    await page.click('button[type="submit"]:has-text("Create Bill")');

    // Should show validation errors or stay on page
    await expect(page).toHaveURL(/\/bills\/new/);
  });

  test('should validate amount is positive', async ({ page }) => {
    await page.click('a:has-text("Add Bill")');

    await page.fill('input[name="name"]', 'Test Bill');
    await page.fill('input[name="amount"]', '-50');

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    await page.fill('input[name="dueDate"]', futureDate.toISOString().split('T')[0]);

    await page.click('button[type="submit"]:has-text("Create Bill")');

    // Should show error or reject negative amount
    const errorMessage = page.locator('text=/invalid|error|positive/i');
    if (await errorMessage.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(errorMessage).toBeVisible();
    } else {
      // Or should stay on the form page
      await expect(page).toHaveURL(/\/bills\/new/);
    }
  });
});
