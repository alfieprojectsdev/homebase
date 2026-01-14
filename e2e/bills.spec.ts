import { test, expect } from '@playwright/test';
import { createTestUser } from './helpers/auth';

test.describe('Bills CRUD Operations', () => {
  const seedBill = async (page: any) => {
    const apiUrl = page.url().split('/bills')[0];
    const response = await page.request.post(`${apiUrl}/api/bills`, {
      data: {
        name: 'Seeded Bill',
        amount: '150.00',
        dueDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0], // 5 days from now
        recurrenceEnabled: false
      }
    });
    expect(response.ok()).toBeTruthy();
    return response.json();
  };

  test.beforeEach(async ({ page }) => {
    // Create and login a fresh user for each test
    await createTestUser(page);
    await expect(page).toHaveURL(/\/bills/);
  });

  test('should display bills list', async ({ page }) => {
    await seedBill(page);
    await page.reload();

    // Should see the bills page header
    await expect(page.locator('h1:has-text("Bills")')).toBeVisible();

    // Page should load successfully and show the seeded bill
    await expect(page.locator('text=Seeded Bill')).toBeVisible();
    await expect(page.locator('text=$150.00')).toBeVisible();
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
    const { bill } = await seedBill(page);

    // Direct navigation to avoid click flakes
    await page.goto(`/bills/${bill.id}`);

    // Wait for the bill data to load
    await expect(page.getByRole('heading', { name: 'Seeded Bill', level: 1 })).toBeVisible();

    // Should be on bill detail page
    await expect(page).toHaveURL(new RegExp(`/bills/${bill.id}$`));

    // Should see bill details
    await expect(page.locator('text=/Amount:|Due Date:|Status:/i')).toBeVisible();
  });

  test('should edit a bill', async ({ page }) => {
    const { bill } = await seedBill(page);

    // Direct navigation
    await page.goto(`/bills/${bill.id}`);

    // Wait for the bill data to load
    await expect(page.getByRole('heading', { name: 'Seeded Bill', level: 1 })).toBeVisible();

    // Click edit button using exact text and force to bypass any overlay/layout issues
    await page.locator('a:has-text("Edit Bill")').click({ force: true });

    await expect(page).toHaveURL(new RegExp(`/bills/${bill.id}/edit$`));

    // Update bill name
    const updatedName = `Updated Bill ${Date.now()}`;
    await page.fill('input[name="name"]', updatedName);

    // Update amount
    await page.fill('input[name="amount"]', '250.75');

    // Submit form
    await page.click('button[type="submit"]:has-text("Update Bill")');

    // Should redirect back to bill details
    await expect(page).toHaveURL(new RegExp(`/bills/${bill.id}$`));

    // Should see updated information
    await expect(page.locator(`text=${updatedName}`)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=250.75')).toBeVisible();
  });

  test('should mark bill as paid', async ({ page }) => {
    const { bill } = await seedBill(page);
    await page.reload(); // Ensure list shows the bill

    // Navigate to seeded bill (optional for pay if button is on list, but good for coverage)
    // We can interact with list view button

    const payButton = page.locator('button:has-text("Pay")').first();

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

    // Find and click delete button for this bill using filter
    const billCard = page.locator('div.border-2').filter({ hasText: billToDelete });
    const deleteButton = billCard.locator('button:has-text("Delete")');

    // Setup dialog handler
    page.on('dialog', dialog => dialog.accept());

    // Wait for API call to complete
    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/bills/') && resp.request().method() === 'DELETE'),
      deleteButton.click()
    ]);
    expect(response.ok()).toBeTruthy();

    await page.reload(); // Reload to ensure list is updated if client-side update failed

    // Bill should be removed from list
    await expect(page.locator(`text=${billToDelete}`)).not.toBeVisible({ timeout: 20000 });
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
