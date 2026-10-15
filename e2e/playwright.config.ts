import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;
// Where a browser is already installed (e.g. a container with its own Chromium), point at it.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

/**
 * End-to-end tests against a production build: the server serves the built web app with an
 * in-memory database, as in the Docker image. Run with `npm run test:e2e`.
 */
export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['github'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, grepInvert: /@phone/ },
    { name: 'phone', use: { ...devices['Pixel 7'] }, grep: /@phone/ },
  ],
  webServer: {
    command:
      'npm run build -w @bg3planner/web && npm run build -w @bg3planner/server && node --disable-warning=ExperimentalWarning apps/server/dist/index.js',
    cwd: '..',
    url: `http://127.0.0.1:${PORT}/api/health`,
    env: { PORT: String(PORT), HOST: '127.0.0.1', DATABASE_PATH: ':memory:', LOG_LEVEL: 'warn' },
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
