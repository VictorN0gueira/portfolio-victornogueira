import type { Page } from '@playwright/test';
import { expect, test } from './n8nGuard';

// What a Radix modal does to the page with CLASSIC scrollbars (the kind that takes room): it removes the scrollbar and
// widens the viewport. Nothing the visitor sees may move: the fixed layers (header, WhatsApp button, accessibility tab)
// stay where they were, the body keeps its content width, and the overlay and the drawer cover the full viewport.
// The default Playwright Chromium hides its scrollbars (--hide-scrollbars), so this file starts a Chromium that keeps
// them, and runs in the desktop project only (a phone has overlay scrollbars, which take no room).
// Each test first checks that the scrollbar really takes room, so it cannot pass by measuring nothing.

test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

const ABOVE_LG = { width: 1440, height: 900 };
const BELOW_LG = { width: 900, height: 800 };
const SCROLLBAR_MIN_PX = 4;
const SUBPIXEL_PX = 0.5;

const WHATSAPP_NAME = 'Falar no WhatsApp';
const TAB_NAME = 'Abrir opções de acessibilidade';
const MENU_DIALOG_NAME = 'Menu de navegação';
const TESTIMONIAL_BUTTON = /Ler depoimento completo/;
const PAGE_LOAD_TIMEOUT_MS = 20_000;

interface Box {
  left: number;
  right: number;
  top: number;
  width: number;
}

interface Snapshot {
  scrollbar: number;
  header: Box;
  whatsapp: Box;
  tab: Box;
  bodyWidth: number;
}

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'a phone has overlay scrollbars: they take no room');
});

async function openHome(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.goto('/');
  await expect(page.locator('form[name="contact"]')).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT_MS });
}

/** The header pill narrows when the page scrolls: wait until it has (and until its transitions end) so a measure is of a settled box. */
async function settle(page: Page) {
  const header = page.locator('header').first();
  const isScrolled = await page.evaluate(() => window.scrollY > 0);
  if (isScrolled) await expect(header).toHaveAttribute('data-scrolled', 'true');
  else await expect(header).not.toHaveAttribute('data-scrolled', 'true');
  await header.evaluate((header) => Promise.all(header.getAnimations().map((animation) => animation.finished)));
}

async function snapshot(page: Page): Promise<Snapshot> {
  await settle(page);
  return page.evaluate(
    ({ whatsappName, tabName }) => {
      const box = (element: Element | null): Box => {
        const rect = (element as Element).getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, width: rect.width };
      };
      const byLabel = (label: string) => document.querySelector(`[aria-label="${label}"]`);
      return {
        scrollbar: window.innerWidth - document.documentElement.clientWidth,
        header: box(document.querySelector('header')),
        whatsapp: box(byLabel(whatsappName)),
        tab: box(byLabel(tabName)),
        bodyWidth: document.body.getBoundingClientRect().width,
      };
    },
    { whatsappName: WHATSAPP_NAME, tabName: TAB_NAME },
  );
}

/** The overlay of the open dialog (the sibling in front of its content) and the dialog itself. */
function layersOfOpenDialog(page: Page) {
  return page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    const overlay = dialog.previousElementSibling as HTMLElement;
    const rect = (element: HTMLElement) => element.getBoundingClientRect();
    return {
      innerWidth: window.innerWidth,
      clientWidth: document.documentElement.clientWidth,
      overlay: { left: rect(overlay).left, right: rect(overlay).right, top: rect(overlay).top, bottom: rect(overlay).bottom },
      dialogRight: rect(dialog).right,
      innerHeight: window.innerHeight,
    };
  });
}

function expectSameBox(after: Box, before: Box, name: string) {
  expect(Math.abs(after.left - before.left), `${name} left`).toBeLessThanOrEqual(SUBPIXEL_PX);
  expect(Math.abs(after.right - before.right), `${name} right`).toBeLessThanOrEqual(SUBPIXEL_PX);
  expect(Math.abs(after.top - before.top), `${name} top`).toBeLessThanOrEqual(SUBPIXEL_PX);
}

function expectNothingMoved(before: Snapshot, during: Snapshot) {
  expectSameBox(during.header, before.header, 'header');
  expectSameBox(during.whatsapp, before.whatsapp, 'WhatsApp button');
  expectSameBox(during.tab, before.tab, 'accessibility tab');
  expect(Math.abs(during.bodyWidth - before.bodyWidth), 'body content width').toBeLessThanOrEqual(SUBPIXEL_PX);
}

async function openTestimonial(page: Page) {
  const button = page.getByRole('button', { name: TESTIMONIAL_BUTTON }).first();
  await button.scrollIntoViewIfNeeded();
  const before = await snapshot(page);
  expect(before.scrollbar, 'the scrollbar takes room').toBeGreaterThanOrEqual(SCROLLBAR_MIN_PX);
  await button.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  return before;
}

for (const viewport of [ABOVE_LG, BELOW_LG]) {
  test.describe(`testimonial dialog at ${viewport.width}px`, () => {
    test('moves nothing and covers the whole viewport while open, and gives everything back when it closes', async ({ page }) => {
      await openHome(page, viewport);
      const before = await openTestimonial(page);

      const during = await snapshot(page);
      const layers = await layersOfOpenDialog(page);
      expectNothingMoved(before, during);
      expect(layers.overlay.left).toBe(0);
      expect(layers.overlay.right, 'overlay reaches the right edge of the viewport').toBeGreaterThanOrEqual(layers.innerWidth - SUBPIXEL_PX);
      expect(layers.overlay.bottom).toBeGreaterThanOrEqual(layers.innerHeight - SUBPIXEL_PX);

      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toBeHidden();
      expectNothingMoved(before, await snapshot(page));
    });
  });
}

test.describe(`mobile menu at ${BELOW_LG.width}px`, () => {
  test('moves nothing, and the overlay and the drawer reach both edges of the viewport', async ({ page }) => {
    await openHome(page, BELOW_LG);
    await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));
    const before = await snapshot(page);
    expect(before.scrollbar, 'the scrollbar takes room').toBeGreaterThanOrEqual(SCROLLBAR_MIN_PX);

    await page.getByRole('button', { name: 'Abrir menu' }).click();
    const dialog = page.getByRole('dialog', { name: MENU_DIALOG_NAME });
    await expect(dialog).toBeVisible();
    // The panel slides in: wait for its right edge to settle on the edge of the viewport.
    await expect.poll(async () => (await layersOfOpenDialog(page)).dialogRight).toBeGreaterThanOrEqual(BELOW_LG.width - SUBPIXEL_PX);

    const during = await snapshot(page);
    const layers = await layersOfOpenDialog(page);
    expectNothingMoved(before, during);
    expect(layers.overlay.left).toBe(0);
    expect(layers.overlay.right, 'overlay reaches the right edge of the viewport').toBeGreaterThanOrEqual(layers.innerWidth - SUBPIXEL_PX);
    expect(layers.dialogRight, 'drawer is docked to the right edge of the viewport').toBeGreaterThanOrEqual(layers.innerWidth - SUBPIXEL_PX);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    expectNothingMoved(before, await snapshot(page));
  });
});
