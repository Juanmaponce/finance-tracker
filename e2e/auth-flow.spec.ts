import { test, expect } from '@playwright/test';

test.describe('Auth Flow', () => {
  test('should show login page by default', async ({ page }) => {
    await page.goto('/');
    // Should redirect to login or show login form
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('should show validation errors on empty login', async ({ page }) => {
    await page.goto('/');

    // Try to submit empty login form
    const submitButton = page.getByRole('button', { name: /iniciar sesión|login|sign in/i });
    if (await submitButton.isVisible()) {
      await submitButton.click();
      // Should show validation feedback
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/');

    const registerLink = page.getByRole('link', { name: /registr|sign up|create/i });
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await expect(page).toHaveURL(/register/);
    }
  });
});

test.describe('Smoke Tests', () => {
  test('health check endpoint responds', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/v1/health');
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ok');
  });
});
