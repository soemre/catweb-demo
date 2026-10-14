import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  workers: 2,
  timeout: 15000,
  use: {
    baseURL: 'http://127.0.0.1:4323',
    browserName: 'chromium',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined },
    trace: 'retain-on-failure',
  },
  webServer: [
    { command: 'node tests/serve.ts dist 4322', port: 4322, reuseExistingServer: false },
    { command: 'node tests/serve.ts .test-site/dist 4323', port: 4323, reuseExistingServer: false },
  ],
});
