import { defineConfig, devices } from '@playwright/test';

const DEFAULT_E2E_PORT = 4173;
const DEV_SERVER_PORT = 3000;
const MAX_PORT = 65535;
// The full suite flakes under load with the default worker count (the contact form pages time out opening).
const WORKERS = process.env.CI ? 2 : 4;

/** E2E_PORT picks the preview port, so several worktrees can run the suite at once. */
function readPort(raw: string | undefined): number {
  if (raw === undefined || raw === '') return DEFAULT_E2E_PORT;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > MAX_PORT) {
    throw new Error(`E2E_PORT needs a port number from 1 to ${MAX_PORT}, got "${raw}"`);
  }
  if (port === DEV_SERVER_PORT) throw new Error('E2E_PORT must not be 3000: it is the dev server.');
  return port;
}

const PORT = readPort(process.env.E2E_PORT);
const BASE_URL = `http://localhost:${PORT}`;
// One build folder per port: two worktrees (or two runs) building at once never overwrite each other's dist.
const BUILD_DIR = `dist-e2e-${PORT}`;

export default defineConfig({
  testDir: 'e2e',
  workers: WORKERS,
  outputDir: `test-results/e2e-${PORT}`,
  webServer: {
    command: `npx vite build --outDir ${BUILD_DIR} --emptyOutDir && node scripts/build-seo.mjs --outDir ${BUILD_DIR} && npx vite preview --config e2e/vite.preview.config.ts --outDir ${BUILD_DIR} --port ${PORT} --strictPort`,
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
