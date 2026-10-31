import type { Page } from '@playwright/test';
import { shellCopy } from '../src/data/shellCopy';
import { menuButton, openHome, PAGE_LOAD_TIMEOUT_MS, QUOTE_BUTTON, QUOTE_START } from './homeSupport';
import { expect, test } from './n8nGuard';

// Where keyboard focus lands after the visitor is sent somewhere: a section by a hash link, the form by the ROI
// quote, another page by a link or by the back button. Nothing here submits or fills the contact form.

const DESKTOP_NAV_MIN_WIDTH = 1024;
const MAIN_ID = 'main-content';
const FOCUS_TIMEOUT_MS = 10_000;

const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) >= DESKTOP_NAV_MIN_WIDTH;

const activeId = (page: Page) => page.evaluate(() => document.activeElement?.id ?? '');

/** The announcement region of the layout: sr-only, polite, the one that is not the page fallback. */
const announcement = (page: Page) => page.locator('[role="status"].sr-only').first();

async function followHeaderLink(page: Page, name: string) {
  if (isDesktop(page)) {
    await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name }).click();
    return;
  }
  await menuButton(page).click();
  await page.getByRole('dialog', { name: 'Menu de navegação' }).getByRole('link', { name }).click();
}

test.describe('focus after a hash link', () => {
  test('lands on the heading of the section, and the next Tab continues after it, not in the header', async ({ page }) => {
    await openHome(page, '/#metodo');

    await expect.poll(() => page.evaluate(() => document.activeElement?.closest('#metodo') !== null), { timeout: FOCUS_TIMEOUT_MS }).toBe(true);
    expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('H2');

    await page.keyboard.press('Tab');

    const isInsideHeader = await page.evaluate(() => document.querySelector('header')?.contains(document.activeElement) ?? false);
    expect(isInsideHeader).toBe(false);
    const isAfterHeading = await page.evaluate(() => {
      const heading = document.querySelector('#metodo h2');
      const active = document.activeElement;
      if (!heading || !active || active === document.body) return false;
      return Boolean(heading.compareDocumentPosition(active) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(isAfterHeading).toBe(true);
  });

  test('does not move focus on a first visit without a hash', async ({ page }) => {
    await openHome(page);

    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  });
});

test.describe('focus after the ROI quote hand off', () => {
  test('puts focus in the message field, filled with the quote, and says so in the status', async ({ page }) => {
    await openHome(page);

    await page.getByRole('button', { name: QUOTE_BUTTON }).click();

    const field = page.locator('#contato textarea');
    await expect(field).toBeFocused({ timeout: FOCUS_TIMEOUT_MS });
    expect((await field.inputValue()).startsWith(QUOTE_START)).toBe(true);
    await expect(page.locator('[role="status"]', { hasText: shellCopy.quoteFilled })).toBeAttached();
  });
});

test.describe('focus and announcement on a route change', () => {
  test('does not move focus on the first load of a page', async ({ page }) => {
    await page.goto('/sobre');
    await expect(page.getByRole('heading', { level: 2, name: 'Sobre mim' })).toBeVisible();

    expect(await activeId(page)).not.toBe(MAIN_ID);
  });

  test('moves focus to main after a link, and announces the new title', async ({ page }) => {
    await page.goto('/');
    await followHeaderLink(page, 'Sobre');

    await expect(page).toHaveURL(/\/sobre$/);
    await expect.poll(() => activeId(page), { timeout: FOCUS_TIMEOUT_MS }).toBe(MAIN_ID);
    // The new page is lazy: its title arrives after the route changes, and the announcer says that one.
    await expect(page).toHaveTitle(/^Sobre/, { timeout: FOCUS_TIMEOUT_MS });
    await expect(announcement(page)).toHaveText(await page.title(), { timeout: FOCUS_TIMEOUT_MS });
  });

  test('leaves focus on main, not on the menu button, when the mobile menu was used', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'the menu button only exists below 1024px');

    await page.goto('/');
    await followHeaderLink(page, 'Sobre');

    await expect(page).toHaveURL(/\/sobre$/);
    await expect.poll(() => activeId(page), { timeout: FOCUS_TIMEOUT_MS }).toBe(MAIN_ID);
    await expect(menuButton(page)).not.toBeFocused();
  });

  test('does the same when the visitor goes back and forward', async ({ page }) => {
    await page.goto('/');
    await followHeaderLink(page, 'Sobre');
    await expect.poll(() => activeId(page), { timeout: FOCUS_TIMEOUT_MS }).toBe(MAIN_ID);
    await page.evaluate(() => (document.activeElement as HTMLElement).blur());

    await page.goBack();

    await expect(page).toHaveURL(/\/$/);
    await expect.poll(() => activeId(page), { timeout: FOCUS_TIMEOUT_MS }).toBe(MAIN_ID);
    await page.evaluate(() => (document.activeElement as HTMLElement).blur());

    await page.goForward();

    await expect(page).toHaveURL(/\/sobre$/);
    await expect.poll(() => activeId(page), { timeout: FOCUS_TIMEOUT_MS }).toBe(MAIN_ID);
  });

  test('does not take focus for itself when only the hash changes', async ({ page }) => {
    await openHome(page);
    await followHeaderLink(page, 'Como funciona');

    await expect(page).toHaveURL(/\/#metodo$/);
    await expect.poll(() => page.evaluate(() => document.activeElement?.closest('#metodo') !== null), { timeout: PAGE_LOAD_TIMEOUT_MS }).toBe(true);
    expect(await activeId(page)).not.toBe(MAIN_ID);
  });
});

// A hash link must reach its section however late the chunks come, and end where an anchor puts it: the top of the
// section at the bottom edge of the header (the scroll-padding-top of the page), within one pixel.
const SECTION_CHUNK = /\/assets\/(StatementStats|UseCaseTabs|ServicesCards|MethodSteps|RoiSimulator|Testimonials|FaqSection|FinalCta)-[^/]*\.js$/;
const SLOW_CHUNK_MS = 6000;
const SETTLE_MS = 3500;
const ALIGN_TOLERANCE_PX = 1;

/** Delays the lazy section chunks: `delayOf` gets the chunk name and returns how long it waits. */
async function delaySectionChunks(page: Page, delayOf: (name: string) => number) {
  await page.route(SECTION_CHUNK, async (route) => {
    const name = route.request().url().match(SECTION_CHUNK)?.[1] ?? '';
    await new Promise((resolve) => setTimeout(resolve, delayOf(name)));
    await route.fallback();
  });
}

/** How far the top of the section is from the bottom edge of the header, in pixels (0 is where an anchor puts it). */
const offsetFromAnchor = (page: Page, id: string) =>
  page.evaluate((target) => {
    const element = document.getElementById(target);
    const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop);
    return element ? element.getBoundingClientRect().top - padding : Number.NaN;
  }, id);

test.describe('hash link while the section chunks are slow', () => {
  test('waits for chunks that take six seconds, then lands on the heading of the section', async ({ page }) => {
    await delaySectionChunks(page, () => SLOW_CHUNK_MS);
    await page.goto('/#metodo');

    await expect.poll(() => page.evaluate(() => document.activeElement?.closest('#metodo') !== null), { timeout: PAGE_LOAD_TIMEOUT_MS }).toBe(true);
    await page.waitForTimeout(SETTLE_MS);

    expect(Math.abs(await offsetFromAnchor(page, 'metodo'))).toBeLessThanOrEqual(ALIGN_TOLERANCE_PX);
  });

  test('stays within one pixel of the anchor when the sections above arrive after the target', async ({ page }) => {
    const LATE_MS: Record<string, number> = { StatementStats: 1500, UseCaseTabs: 1800, ServicesCards: 2100 };
    await delaySectionChunks(page, (name) => LATE_MS[name] ?? 0);
    await page.goto('/#metodo');

    await expect.poll(() => page.evaluate(() => document.activeElement?.closest('#metodo') !== null), { timeout: PAGE_LOAD_TIMEOUT_MS }).toBe(true);
    await page.waitForTimeout(SETTLE_MS);

    expect(Math.abs(await offsetFromAnchor(page, 'metodo'))).toBeLessThanOrEqual(ALIGN_TOLERANCE_PX);
  });

  test('does not pull a visitor who scrolled meanwhile to the section', async ({ page }) => {
    await delaySectionChunks(page, () => SLOW_CHUNK_MS);
    await page.goto('/#metodo');
    await page.waitForTimeout(1000);
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(SLOW_CHUNK_MS + SETTLE_MS);

    expect(await page.evaluate(() => scrollY)).toBeLessThan(1000);
    expect(await page.evaluate(() => document.activeElement?.closest('#metodo') ?? null)).toBeNull();
  });
});

// On a slower phone the mobile menu gives focus back to its button after the new page has taken focus. The CPU is
// throttled through the DevTools protocol, which is what makes the order of those two events happen every time.
test.describe('mobile menu link on a slow phone', () => {
  for (const rate of [4, 6]) {
    test(`ends on main, not on the menu button, with the CPU ${rate}x slower`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'mobile', 'the menu button only exists below 1024px');

      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT_MS });
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate });

      await followHeaderLink(page, 'Sobre');

      await expect(page).toHaveURL(/\/sobre$/);
      await expect.poll(() => activeId(page), { timeout: FOCUS_TIMEOUT_MS }).toBe(MAIN_ID);
      await page.waitForTimeout(SETTLE_MS);
      expect(await activeId(page)).toBe(MAIN_ID);
      await expect(menuButton(page)).not.toBeFocused();
    });
  }
});
