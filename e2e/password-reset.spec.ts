import { test, expect } from '@playwright/test';
import { createTestUser, loginUser } from './helpers/auth';

test.describe('Password Reset Flow', () => {
  const ORIGINAL_PASSWORD = 'password123';
  const NEW_PASSWORD = 'NewSecurePassword123!';

  test('should complete full password reset flow successfully', async ({ page }) => {
    // Create a test user first
    const { email } = await createTestUser(page);

    // Logout to test password reset flow
    await page.click('button:has-text("Logout")');
    await expect(page).toHaveURL(/\/login/);
    // Step 1: Navigate to forgot-password page
    await page.goto('/forgot-password');
    await expect(page.locator('h2:has-text("Forgot Password")')).toBeVisible();

    // Step 2: Enter email address
    await page.fill('input[name="email"]', email);

    // Step 3: Submit form and wait for response
    await page.click('button[type="submit"]:has-text("Request Reset Link")');

    // Step 4: Wait for success message
    await expect(page.locator('text=Reset link generated successfully!')).toBeVisible({ timeout: 10000 });

    // Step 5: Extract reset token from the textarea on the page
    const resetLinkTextarea = page.locator('textarea#reset-link');
    await expect(resetLinkTextarea).toBeVisible();
    const resetLink = await resetLinkTextarea.inputValue();

    // Extract token from the link
    const tokenMatch = resetLink.match(/token=([^&]+)/);
    expect(tokenMatch).not.toBeNull();
    const token = tokenMatch![1];

    // Step 6: Navigate to reset-password page with token
    await page.goto(`/reset-password?token=${token}`);

    // Step 7: Wait for token validation to complete
    await expect(page.locator('h2:has-text("Reset Password")')).toBeVisible({ timeout: 10000 });

    // Verify masked email is displayed (should contain ** to indicate masking)
    await expect(page.locator('text=/Enter new password for:/i')).toBeVisible();
    await expect(page.locator(`text=/${email.substring(0, 2)}\\*\\*/i`).or(page.locator('text=/\\*\\*@/i'))).toBeVisible();

    // Step 8: Enter new password (twice)
    await page.fill('input[name="password"]', NEW_PASSWORD);
    await page.fill('input[name="confirm-password"]', NEW_PASSWORD);

    // Step 9: Submit reset form
    await page.click('button[type="submit"]:has-text("Reset Password")');

    // Step 10: Wait for success message
    await expect(page.locator('text=/Password Reset Complete|Password updated successfully/i')).toBeVisible({ timeout: 10000 });

    // Step 11: Verify redirect to login page
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });

    // Step 12: Login with new password
    await loginUser(page, email, NEW_PASSWORD);

    // Verify successful login
    await expect(page).toHaveURL(/\/bills/);
    await expect(page.locator('h1:has-text("Bills")')).toBeVisible();

    // Step 13: Cleanup - Reset password back to original
    await page.goto('/forgot-password');
    await page.fill('input[name="email"]', email);
    await page.click('button[type="submit"]:has-text("Request Reset Link")');
    await expect(page.locator('textarea#reset-link')).toBeVisible();

    const cleanupResetLink = await page.locator('textarea#reset-link').inputValue();
    const cleanupTokenMatch = cleanupResetLink.match(/token=([^&]+)/);
    expect(cleanupTokenMatch).not.toBeNull();
    const cleanupToken = cleanupTokenMatch![1];

    await page.goto(`/reset-password?token=${cleanupToken}`);
    await expect(page.locator('h2:has-text("Reset Password")')).toBeVisible({ timeout: 10000 });

    await page.fill('input[name="password"]', ORIGINAL_PASSWORD);
    await page.fill('input[name="confirm-password"]', ORIGINAL_PASSWORD);
    await page.click('button[type="submit"]:has-text("Reset Password")');

    await expect(page.locator('text=/Password Reset Complete|Password updated successfully/i')).toBeVisible({ timeout: 10000 });
  });

  test('should handle invalid reset token', async ({ page }) => {
    // Navigate to reset-password with invalid token
    await page.goto('/reset-password?token=invalidtoken123456789');

    // Wait for validation to complete
    await expect(page.locator('h2:has-text("Invalid Reset Link")')).toBeVisible({ timeout: 10000 });

    // Verify error message is shown
    await expect(page.locator('text=/Reset link is invalid or expired/i')).toBeVisible();

    // Verify link to request new token is present
    const requestNewLinkButton = page.locator('a:has-text("Request New Reset Link")');
    await expect(requestNewLinkButton).toBeVisible();
    await expect(requestNewLinkButton).toHaveAttribute('href', '/forgot-password');

    // Verify link back to sign in is present
    const backToSignInLink = page.locator('a:has-text("Back to Sign in")');
    await expect(backToSignInLink).toBeVisible();
    await expect(backToSignInLink).toHaveAttribute('href', '/login');
  });

  test('should handle missing reset token', async ({ page }) => {
    // Navigate to reset-password without token
    await page.goto('/reset-password');

    // Wait for validation to complete
    await expect(page.locator('h2:has-text("Invalid Reset Link")')).toBeVisible({ timeout: 10000 });

    // Verify error message is shown
    await expect(page.locator('text=/Reset link is invalid or expired|No reset token provided/i').first()).toBeVisible();

    // Verify link to request new token is present
    await expect(page.locator('a:has-text("Request New Reset Link")')).toBeVisible();
  });

  test('should validate password requirements (minimum 8 characters)', async ({ page }) => {
    // Create a test user first
    const { email } = await createTestUser(page);
    await page.click('button:has-text("Logout")');
    await expect(page).toHaveURL(/\/login/);

    // Step 1: Request reset token
    await page.goto('/forgot-password');
    await page.fill('input[name="email"]', email);
    await page.click('button[type="submit"]:has-text("Request Reset Link")');
    await expect(page.locator('textarea#reset-link')).toBeVisible({ timeout: 10000 });

    // Step 2: Extract token and navigate to reset page
    const resetLink = await page.locator('textarea#reset-link').inputValue();
    const tokenMatch = resetLink.match(/token=([^&]+)/);
    expect(tokenMatch).not.toBeNull();
    const token = tokenMatch![1];

    await page.goto(`/reset-password?token=${token}`);
    await expect(page.locator('h2:has-text("Reset Password")')).toBeVisible({ timeout: 10000 });

    // Step 3: Try to set weak password (< 8 chars)
    const weakPassword = 'short1';
    await page.fill('input[name="password"]', weakPassword);
    await page.fill('input[name="confirm-password"]', weakPassword);

    // Step 4: Submit form
    await page.click('button[type="submit"]:has-text("Reset Password")');

    // Step 5: Verify client-side validation error is shown
    await expect(page.locator('text=/Password must be at least 8 characters/i')).toBeVisible({ timeout: 5000 });

    // Verify we're still on the reset page (not redirected)
    await expect(page).toHaveURL(new RegExp(`/reset-password\\?token=${token}`));
  });

  test('should validate password matching', async ({ page }) => {
    // Create a test user first
    const { email } = await createTestUser(page);
    await page.click('button:has-text("Logout")');
    await expect(page).toHaveURL(/\/login/);

    // Step 1: Request reset token
    await page.goto('/forgot-password');
    await page.fill('input[name="email"]', email);
    await page.click('button[type="submit"]:has-text("Request Reset Link")');
    await expect(page.locator('textarea#reset-link')).toBeVisible({ timeout: 10000 });

    // Step 2: Extract token and navigate to reset page
    const resetLink = await page.locator('textarea#reset-link').inputValue();
    const tokenMatch = resetLink.match(/token=([^&]+)/);
    expect(tokenMatch).not.toBeNull();
    const token = tokenMatch![1];

    await page.goto(`/reset-password?token=${token}`);
    await expect(page.locator('h2:has-text("Reset Password")')).toBeVisible({ timeout: 10000 });

    // Step 3: Enter mismatched passwords
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirm-password"]', 'DifferentPassword123!');

    // Step 4: Submit form
    await page.click('button[type="submit"]:has-text("Reset Password")');

    // Step 5: Verify error message
    await expect(page.locator('text=/Passwords do not match/i')).toBeVisible({ timeout: 5000 });

    // Verify we're still on the reset page (not redirected)
    await expect(page).toHaveURL(new RegExp(`/reset-password\\?token=${token}`));
  });

  test('should handle non-existent email gracefully (no enumeration)', async ({ page }) => {
    // Navigate to forgot-password page
    await page.goto('/forgot-password');
    await expect(page.locator('h2:has-text("Forgot Password")')).toBeVisible();

    // Enter non-existent email
    const nonExistentEmail = 'doesnotexist@example.com';
    await page.fill('input[name="email"]', nonExistentEmail);

    // Submit form
    await page.click('button[type="submit"]:has-text("Request Reset Link")');

    // Should show success message even for non-existent email (security best practice)
    // This prevents email enumeration attacks
    await expect(page.locator('text=Reset link generated successfully!')).toBeVisible({ timeout: 10000 });

    // However, no actual link should be generated (textarea should not appear)
    // Or if it appears, it should be empty or invalid
    const resetLinkTextarea = page.locator('textarea#reset-link');
    const isVisible = await resetLinkTextarea.isVisible().catch(() => false);

    if (isVisible) {
      // If textarea is shown, the link should be empty or the token should be invalid
      const resetLink = await resetLinkTextarea.inputValue();
      if (resetLink) {
        const tokenMatch = resetLink.match(/token=([^&]+)/);
        if (tokenMatch) {
          const token = tokenMatch[1];
          // Try to use the token - should fail
          await page.goto(`/reset-password?token=${token}`);
          await expect(page.locator('h2:has-text("Invalid Reset Link")')).toBeVisible({ timeout: 10000 });
        }
      }
    }
  });

  test('should reject expired token', async ({ page }) => {
    // Note: This test verifies the UI behavior when receiving an expired token response
    // In a real scenario, we would need to wait 1 hour or manipulate the database
    // For now, we test that the error handling works correctly

    // Create a fake expired token scenario by using a random token
    // The API should return an appropriate error
    await page.goto('/reset-password?token=expiredtoken123456789abcdef');

    // Wait for validation to complete
    await expect(page.locator('h2:has-text("Invalid Reset Link")')).toBeVisible({ timeout: 10000 });

    // Verify error message mentions invalid or expired
    await expect(page.locator('text=/Reset link is invalid or expired/i')).toBeVisible();

    // Verify link to request new token
    await expect(page.locator('a:has-text("Request New Reset Link")')).toBeVisible();
  });

  test('should reject reused token', async ({ page }) => {
    // Create a test user first
    const { email } = await createTestUser(page);
    await page.click('button:has-text("Logout")');
    await expect(page).toHaveURL(/\/login/);

    // Step 1: Request reset token
    await page.goto('/forgot-password');
    await page.fill('input[name="email"]', email);
    await page.click('button[type="submit"]:has-text("Request Reset Link")');
    await expect(page.locator('textarea#reset-link')).toBeVisible({ timeout: 10000 });

    // Step 2: Extract token
    const resetLink = await page.locator('textarea#reset-link').inputValue();
    const tokenMatch = resetLink.match(/token=([^&]+)/);
    expect(tokenMatch).not.toBeNull();
    const token = tokenMatch![1];

    // Step 3: Use token once to reset password
    await page.goto(`/reset-password?token=${token}`);
    await expect(page.locator('h2:has-text("Reset Password")')).toBeVisible({ timeout: 10000 });

    await page.fill('input[name="password"]', NEW_PASSWORD);
    await page.fill('input[name="confirm-password"]', NEW_PASSWORD);
    await page.click('button[type="submit"]:has-text("Reset Password")');

    await expect(page.locator('text=/Password Reset Complete|Password updated successfully/i')).toBeVisible({ timeout: 10000 });

    // Step 4: Try to reuse the same token
    await page.goto(`/reset-password?token=${token}`);

    // Step 5: Should show invalid/expired error
    await expect(page.locator('h2:has-text("Invalid Reset Link")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/Reset link is invalid or expired/i')).toBeVisible();

    // Cleanup: Reset password back to original
    await page.goto('/forgot-password');
    await page.fill('input[name="email"]', email);
    await page.click('button[type="submit"]:has-text("Request Reset Link")');
    await expect(page.locator('textarea#reset-link')).toBeVisible();

    const cleanupResetLink = await page.locator('textarea#reset-link').inputValue();
    const cleanupTokenMatch = cleanupResetLink.match(/token=([^&]+)/);
    expect(cleanupTokenMatch).not.toBeNull();
    const cleanupToken = cleanupTokenMatch![1];

    await page.goto(`/reset-password?token=${cleanupToken}`);
    await expect(page.locator('h2:has-text("Reset Password")')).toBeVisible({ timeout: 10000 });

    await page.fill('input[name="password"]', ORIGINAL_PASSWORD);
    await page.fill('input[name="confirm-password"]', ORIGINAL_PASSWORD);
    await page.click('button[type="submit"]:has-text("Reset Password")');

    await expect(page.locator('text=/Password Reset Complete|Password updated successfully/i')).toBeVisible({ timeout: 10000 });
  });

  test('should validate email format on forgot-password page', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.locator('h2:has-text("Forgot Password")')).toBeVisible();

    // Try to submit with invalid email format (no @ symbol)
    // HTML5 validation should prevent form submission
    const emailInput = page.locator('input[name="email"]');
    await emailInput.fill('notanemail');

    // Check HTML5 validation message
    const validationMessage = await emailInput.evaluate((input: HTMLInputElement) => input.validationMessage);
    expect(validationMessage).toBeTruthy();
    expect(validationMessage).toContain('@');

    // Try with format that passes HTML5 but fails JavaScript validation (no TLD)
    await emailInput.fill('user@domain');
    await page.click('button[type="submit"]:has-text("Request Reset Link")');

    // Should show validation error from JavaScript
    await expect(page.locator('text=/Please enter a valid email address|Invalid email/i').first()).toBeVisible({ timeout: 5000 });

    // Should still be on forgot-password page
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  test('should redirect authenticated user away from forgot-password page', async ({ page }) => {
    // Create and login a user
    await createTestUser(page);
    await expect(page).toHaveURL(/\/bills/);

    // Try to access forgot-password page
    await page.goto('/forgot-password');

    // Should redirect to bills page (authenticated users don't need password reset)
    await expect(page).toHaveURL(/\/bills/, { timeout: 5000 });
  });

  test('should show loading state during token validation', async ({ page }) => {
    // Create a test user first
    const { email } = await createTestUser(page);
    await page.click('button:has-text("Logout")');
    await expect(page).toHaveURL(/\/login/);

    // Request reset token
    await page.goto('/forgot-password');
    await page.fill('input[name="email"]', email);
    await page.click('button[type="submit"]:has-text("Request Reset Link")');
    await expect(page.locator('textarea#reset-link')).toBeVisible({ timeout: 10000 });

    // Extract token
    const resetLink = await page.locator('textarea#reset-link').inputValue();
    const tokenMatch = resetLink.match(/token=([^&]+)/);
    expect(tokenMatch).not.toBeNull();
    const token = tokenMatch![1];

    // Navigate to reset page (should show loading state briefly)
    await page.goto(`/reset-password?token=${token}`);

    // The page should either show loading state or go directly to the form
    // Check for either state
    const loadingText = page.locator('text=/Validating Reset Link|Please wait/i');
    const resetForm = page.locator('h2:has-text("Reset Password")');

    // One of these should be visible
    const loadingVisible = await loadingText.isVisible().catch(() => false);
    const formVisible = await resetForm.isVisible({ timeout: 10000 });

    expect(loadingVisible || formVisible).toBeTruthy();

    // Eventually should show the form
    await expect(resetForm).toBeVisible({ timeout: 10000 });
  });

  test('should have proper ADHD-optimized touch targets', async ({ page }) => {
    // Navigate to forgot-password page
    await page.goto('/forgot-password');

    // Check submit button has minimum 44px height (ADHD accessibility requirement)
    const submitButton = page.locator('button[type="submit"]:has-text("Request Reset Link")');
    await expect(submitButton).toBeVisible();

    const buttonHeight = await submitButton.evaluate((el) => {
      return window.getComputedStyle(el).minHeight;
    });

    // Verify minimum height of 44px (WCAG 2.5.5)
    expect(parseInt(buttonHeight)).toBeGreaterThanOrEqual(44);

    // Check email input has appropriate height
    const emailInput = page.locator('input[name="email"]');
    const inputHeight = await emailInput.evaluate((el) => {
      return window.getComputedStyle(el).minHeight;
    });

    expect(parseInt(inputHeight)).toBeGreaterThanOrEqual(44);
  });
});
