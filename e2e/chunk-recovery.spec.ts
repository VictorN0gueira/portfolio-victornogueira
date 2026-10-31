import type { Page, Route } from '@playwright/test';
import { shellCopy } from '../src/data/shellCopy';
import { menuButton } from './homeSupport';
import { expect, test } from './n8nGuard';

// A lazy chunk that cannot be fetched (the network drops, or a deploy deleted the old hashed file under an open tab)
// must never blank the app. The requests for the Services page chunk are aborted, which is what the browser sees.
// Chromium keeps a failed module import for the life of the document (the second import() of the same file makes no
// request), so what brings the page back is a reload, which the app does once by itself and again on the retry button.

const SERVICES_CHUNK = '**/assets/ServicesPage-*.js';
const DESKTOP_NAV_MIN_WIDTH = 1024;
const RECOVERY_TIMEOUT_MS = 20_000;
const QUIET_WINDOW_MS = 4000;
const SERVICES_HEADING = /serviços/i;

async function goToServices(page: Page) {
  if ((page.viewportSize()?.width ?? 0) >= DESKTOP_NAV_MIN_WIDTH) {
    await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Serviços' }).click();
    return;
  }
  await menuButton(page).click();
  await page.getByRole('dialog', { name: 'Menu de navegação' }).getByRole('link', { name: 'Serviços' }).click();
}

const retryButton = (page: Page) => page.getByRole('button', { name: shellCopy.errorBoundary.retry });
const servicesPage = (page: Page) => page.locator('main h1').first();

/** Marks the document, so a test can tell that the page was reloaded (the marker is gone with the old document). */
async function markDocument(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { __oldDocument: boolean }).__oldDocument = true;
  });
}

const isOldDocument = (page: Page) =>
  page.evaluate(() => (window as unknown as { __oldDocument?: boolean }).__oldDocument === true);

test.describe('a lazy page chunk that fails to load', () => {
  test('shows the recovery panel inside the layout, and the retry button brings the page back once the network is back', async ({ page }) => {
    let requests = 0;
    const abort = async (route: Route) => {
      requests += 1;
      await route.abort();
    };
    await page.route(SERVICES_CHUNK, abort);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await goToServices(page);

    await expect(retryButton(page)).toBeVisible({ timeout: RECOVERY_TIMEOUT_MS });
    await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeAttached();
    await expect(page.getByRole('link', { name: new RegExp(shellCopy.errorBoundary.whatsapp) })).toHaveAttribute('href', /^https:\/\/wa\.me\//);

    // The app reloaded once by itself and stopped: no loop, however long the file stays missing.
    const requestsAtPanel = requests;
    await page.waitForTimeout(QUIET_WINDOW_MS);
    expect(requests).toBe(requestsAtPanel);
    expect(requests).toBeLessThanOrEqual(4);

    await page.unroute(SERVICES_CHUNK, abort);
    await markDocument(page);
    await retryButton(page).click();

    await expect(servicesPage(page)).toBeVisible({ timeout: RECOVERY_TIMEOUT_MS });
    await expect(retryButton(page)).toHaveCount(0);
    expect(await isOldDocument(page)).toBe(false);
  });

  test('comes back by itself when the file fails once, as after a deploy, with no panel', async ({ page }) => {
    let requests = 0;
    await page.route(SERVICES_CHUNK, async (route) => {
      requests += 1;
      if (requests === 1) await route.abort();
      else await route.fallback();
    });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await goToServices(page);

    await expect(page).toHaveURL(/\/servicos$/);
    await expect(servicesPage(page)).toBeVisible({ timeout: RECOVERY_TIMEOUT_MS });
    await expect(servicesPage(page)).toContainText(SERVICES_HEADING);
    await expect(retryButton(page)).toHaveCount(0);
    await expect(page.getByRole('banner')).toBeVisible();
  });
});

test.describe('a lazy page chunk that stays missing while session storage is blocked', () => {
  test('never reloads in a loop: at most one document load, then the panel with its retry', async ({ page }) => {
    // The getter throws, as with all cookies blocked and in some in-app browsers.
    await page.addInitScript(() => {
      Object.defineProperty(window, 'sessionStorage', {
        configurable: true,
        get() {
          throw new DOMException('The operation is insecure.', 'SecurityError');
        },
      });
    });
    let loads = 0;
    page.on('load', () => {
      loads += 1;
    });
    let requests = 0;
    await page.route(SERVICES_CHUNK, async (route) => {
      requests += 1;
      await route.abort();
    });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await goToServices(page);

    await expect(retryButton(page)).toBeVisible({ timeout: RECOVERY_TIMEOUT_MS });
    const loadsAtPanel = loads;
    const requestsAtPanel = requests;
    await page.waitForTimeout(QUIET_WINDOW_MS + 2000);

    expect(loadsAtPanel).toBeLessThanOrEqual(2);
    expect(loads).toBe(loadsAtPanel);
    expect(requests).toBe(requestsAtPanel);
    await expect(retryButton(page)).toBeVisible();
  });
});
