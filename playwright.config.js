import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://127.0.0.1:3213', launchOptions: { executablePath: process.env.CHROMIUM_EXECUTABLE } },
  webServer: {
    command: 'node backend/start.js',
    env: { PORT: '3213', DB_PATH: ':memory:' },
    url: 'http://127.0.0.1:3213/api/health',
    reuseExistingServer: false
  }
})
