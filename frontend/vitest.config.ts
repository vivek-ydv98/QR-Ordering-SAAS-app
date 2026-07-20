import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['tests/setup/vitest.ts'],
    include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/types/**',
        'src/**/*.d.ts',
        'src/**/loading.tsx',
        'src/**/error.tsx',
        'src/middleware.ts',
        'src/app/layout.tsx',
      ],
      thresholds: {
        statements: 75,
        branches: 65,
        functions: 70,
        lines: 75,
      },
    },
    css: true,
    mockReset: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    modules: [path.resolve(__dirname, 'node_modules')],
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
});
