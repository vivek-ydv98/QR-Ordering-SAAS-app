import { test, expect } from '@playwright/test';

test.describe('Customer Ordering Flow', () => {
  test('should load customer menu page', async ({ page }) => {
    await page.goto('/tandoori-palace/table/t1');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display menu categories', async ({ page }) => {
    await page.goto('/tandoori-palace/table/t1');
    await page.waitForLoadState('networkidle');
    // Look for menu item names
    const menuItem = page.locator('text=/Paneer|Dal|Naan|Shikanji/i').first();
    await expect(menuItem).toBeVisible({ timeout: 10000 });
  });
});
