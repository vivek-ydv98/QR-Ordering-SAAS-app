import { test, expect } from '../fixtures/auth.fixture';
import { LoginPage } from '../pages/login.page';

test.describe('Admin Dashboard', () => {
  test('should login and see admin dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('admin@tandooripalace.com', 'Password123');
    await page.waitForURL(/\/admin\//, { timeout: 15000 });
  });
});
