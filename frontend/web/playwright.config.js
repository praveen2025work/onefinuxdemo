// Browser end-to-end and accessibility checks against the running stack (hub 7070, simulator 7081, console 7091).
// CI starts the jars and this config starts Vite. Locally: ./scripts/run.sh, then `npm run e2e`.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: 'e2e-report' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:7091',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: 'npx vite --port 7091 --strictPort',
    url: 'http://localhost:7091',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
