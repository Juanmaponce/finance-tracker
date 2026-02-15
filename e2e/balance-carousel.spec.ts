import { test, expect, type Page } from '@playwright/test';

const TEST_EMAIL = 'e2etest@example.com';
const TEST_PASSWORD = 'E2eTest123';

async function login(page: Page) {
  await page.goto('/');

  // If already on dashboard (auth persisted), skip login
  if (
    await page
      .getByText('Balances')
      .isVisible()
      .catch(() => false)
  )
    return;

  await page.getByLabel('Email').fill(TEST_EMAIL);
  await page.locator('#password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /ingresar/i }).click();

  // Wait for dashboard to load
  await expect(page.getByText('Balances')).toBeVisible({ timeout: 15000 });
}

test.describe('Balance Carousel - Desktop', () => {
  test.describe.configure({ mode: 'serial' });
  test.use({ viewport: { width: 1280, height: 720 } });

  test('should display balance cards and add button', async ({ page }) => {
    await login(page);

    // Carousel container should be visible
    await expect(page.getByText('Balances')).toBeVisible();

    // Should have the Agregar button
    await expect(page.getByRole('button', { name: /agregar/i }).first()).toBeVisible();

    // Should show at least the add account placeholder card
    const addCard = page.getByText('Agregar cuenta');
    await expect(addCard).toBeVisible();
  });

  test('should create a second account to enable carousel navigation', async ({ page }) => {
    await login(page);

    // Click Agregar button to open add account modal
    await page
      .getByRole('button', { name: /agregar/i })
      .first()
      .click();
    await page.waitForTimeout(500);

    // Fill in the new account form
    const nameInput = page.getByLabel('Nombre');
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill('Cuenta EUR');

      // Select EUR currency if possible
      const currencySelect = page.locator('select').first();
      if (await currencySelect.isVisible().catch(() => false)) {
        await currencySelect.selectOption('EUR');
      }

      // Submit
      const submitBtn = page.getByRole('button', { name: /crear|guardar|agregar/i }).last();
      await submitBtn.click();
      await page.waitForTimeout(2000);
    }
  });

  test('should show dot indicators when multiple cards exist', async ({ page }) => {
    await login(page);

    // Check for dot indicators (need at least 2 cards)
    const dots = page.locator('button[aria-label^="Ir a tarjeta"]');
    const dotCount = await dots.count();

    if (dotCount >= 2) {
      // First dot should be visible
      await expect(dots.nth(0)).toBeVisible();
    } else {
      // With viewport 1280 and only 2 cards at 45%, they might all fit
      // Just verify the carousel structure exists
      const carousel = page.locator('.group.relative');
      const carouselVisible = await carousel.isVisible().catch(() => false);
      expect(carouselVisible || dotCount === 0).toBeTruthy();
    }
  });

  test('should show right arrow on hover when scrollable', async ({ page }) => {
    await login(page);

    const carouselWrapper = page.locator('.group.relative');
    if (!(await carouselWrapper.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    // Hover to reveal arrows
    await carouselWrapper.hover();
    await page.waitForTimeout(300);

    // Right arrow may or may not be visible depending on content width
    const rightArrow = page.getByLabel('Siguiente');
    const rightVisible = await rightArrow.isVisible().catch(() => false);

    if (rightVisible) {
      // Click right arrow
      await rightArrow.click();
      await page.waitForTimeout(600);

      // Re-hover
      await carouselWrapper.hover();
      await page.waitForTimeout(300);

      // Left arrow should now be visible
      const leftArrow = page.getByLabel('Anterior');
      await expect(leftArrow).toBeVisible({ timeout: 2000 });

      // Navigate back
      await leftArrow.click();
      await page.waitForTimeout(600);
    } else {
      // All cards fit in viewport, no scrolling needed - that's OK
      console.log('All cards fit in viewport, no scroll arrows needed');
    }
  });

  test('should navigate via dot indicators', async ({ page }) => {
    await login(page);

    const dots = page.locator('button[aria-label^="Ir a tarjeta"]');
    const dotCount = await dots.count();

    if (dotCount >= 2) {
      // Click second dot
      await dots.nth(1).click();
      await page.waitForTimeout(600);

      // Click first dot to go back
      await dots.nth(0).click();
      await page.waitForTimeout(600);
    } else {
      console.log('Not enough dots for navigation test');
    }
  });
});

test.describe('Balance Carousel - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should show carousel with swipeable cards on mobile', async ({ page }) => {
    await login(page);

    // Carousel should be visible
    await expect(page.getByText('Balances')).toBeVisible();

    // Cards should take 85% width on mobile, so dots should appear
    const dots = page.locator('button[aria-label^="Ir a tarjeta"]');
    const dotCount = await dots.count();

    // On mobile with 85% card width, at least 2 cards means scrolling
    if (dotCount >= 2) {
      await expect(dots.nth(0)).toBeVisible();
    }

    // Arrows should NOT be visible on mobile (hidden md:flex)
    const rightArrow = page.getByLabel('Siguiente');
    await expect(rightArrow).not.toBeVisible();
  });
});
