import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  // Cleanup if needed (e.g., clear test data)
}

export default globalTeardown;
