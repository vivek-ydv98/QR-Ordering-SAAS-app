import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

type AuthFixtures = {
  loginPage: LoginPage;
  authState: { accessToken: string; refreshToken: string };
};

export const test = base.extend<AuthFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  authState: async ({ request }, use) => {
    const res = await request.post('http://localhost:3001/v1/auth/login', {
      data: { email: 'admin@tandooripalace.com', password: 'Password123' },
    });
    const data = await res.json();
    await use({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  },
});

export { expect } from '@playwright/test';
