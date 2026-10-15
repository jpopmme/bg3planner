import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['apps/*', 'packages/*'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['**/src/**/*.{ts,vue}'],
      exclude: ['**/*.test.ts', '**/fixtures/**'],
    },
  },
});
