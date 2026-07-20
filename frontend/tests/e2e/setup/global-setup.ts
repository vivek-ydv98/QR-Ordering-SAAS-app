import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  // Verify that the backend and frontend are running
  const backendUrl = process.env.API_URL || 'http://localhost:3001/v1';
  const frontendUrl = process.env.BASE_URL || 'http://localhost:3000';

  try {
    await fetch(`${frontendUrl}/login`);
  } catch {
    console.log(`Frontend at ${frontendUrl} is not reachable. Make sure to start it before running E2E tests.`);
  }

  try {
    await fetch(`${backendUrl}/auth/login`, { method: 'POST' });
  } catch {
    console.log(`Backend at ${backendUrl} is not reachable. Make sure to start it before running E2E tests.`);
  }
}

export default globalSetup;
