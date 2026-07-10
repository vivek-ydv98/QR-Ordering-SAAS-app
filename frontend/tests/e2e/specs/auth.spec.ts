import { test, expect } from '../fixtures/auth.fixture';
import { LoginPage } from '../pages/login.page';

test.describe('Authentication', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
  });

  test('should display login form', async ({ page }) => {
    await loginPage.goto();
    await expect(page.locator('h1')).toContainText(/single entry point/i);
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('should login with valid credentials and redirect to admin', async ({ page }) => {
    await loginPage.goto();
    await loginPage.login('admin@tandooripalace.com', 'Password123');
    await page.waitForURL(/\/admin\//, { timeout: 15000 });
    expect(page.url()).toContain('/admin/');
  });

  test('should show error with invalid password', async ({ page }) => {
    await loginPage.goto();
    await loginPage.login('admin@tandooripalace.com', 'wrongpassword');
    await expect(page.locator('text=/invalid|error|incorrect/i')).toBeVisible({ timeout: 5000 });
  });

  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    await page.goto('/admin/live-orders');
    await page.waitForURL(/\/login/, { timeout: 5000 });
    expect(page.url()).toContain('/login');
  });
});
