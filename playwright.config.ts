import { defineConfig, devices } from '@playwright/test';

const BASE_URL = 'http://localhost:4173';

export default defineConfig({
  testDir: 'e2e',
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 180000,
  },
  use: {
    baseURL: BASE_URL,
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],
});
