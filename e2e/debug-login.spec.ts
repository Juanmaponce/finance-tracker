import { test, expect } from '@playwright/test';

test('debug login flow', async ({ page }) => {
  // Listen for console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
  });
  page.on('response', (resp) => {
    if (resp.status() >= 400) console.log(`HTTP ${resp.status()}: ${resp.url()}`);
  });

  await page.goto('/');
  await page.waitForTimeout(1000);

  // Try to login
  await page.getByLabel('Email').fill('test@example.com');
  await page.locator('#password').fill('Test123456');
  await page.getByRole('button', { name: /ingresar/i }).click();

  // Wait longer for navigation
  await page.waitForTimeout(8000);

  await page.screenshot({ path: 'e2e/screenshots/after-login.png', fullPage: true });

  const bodyText = await page.locator('body').innerText();
  console.log('=== AFTER LOGIN ===');
  console.log(bodyText.substring(0, 2000));
  console.log('===================');
});
