import type { CDPSession, Locator, Page } from '@playwright/test';
import { a11yWidgetCopy } from '../src/components/a11yWidgetCopy';
import { TAB_POSITION_STORAGE_KEY } from '../src/lib/tabPositionStorage';
import { nextFrames, openHome, waitForStableBox } from './homeSupport';
import { expect, test } from './n8nGuard';

// The accessibility tab can be moved: a mouse, a finger or the buttons of the panel. A real browser proves it follows the
// pointer before the release, snaps to the nearest side keeping its height, stacks above the WhatsApp button on the left,
// opens its panel toward the inside of the window, remembers the place, and that a tap still opens the panel. The home
// mounts the real form, so the test comes from ./n8nGuard and nothing here sends it.

const TRIGGER = a11yWidgetCopy.triggerLabel;
const PANEL = a11yWidgetCopy.panelLabel;
const MARGIN = 16;
const SUBPIXEL = 0.75;
const DRAG_STEPS = 8;

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const trigger = (page: Page) => page.locator(`aside[aria-label="${PANEL}"] button[aria-label="${TRIGGER}"]`);
const whatsApp = (page: Page) => page.locator('aside[aria-label="Contato rápido"] a');
const panelOf = (page: Page) => page.getByRole('dialog', { name: PANEL });

async function rectOf(target: Locator): Promise<Rect> {
  const box = await target.boundingBox();
  if (!box) throw new Error('the element has no box');
  return { left: box.x, top: box.y, right: box.x + box.width, bottom: box.y + box.height };
}

const centre = (rect: Rect) => ({ x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2 });

const overlaps = (a: Rect, b: Rect) => Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top);

const storedPosition = (page: Page) =>
  page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? 'null') as { side: string; ratio: number } | null, TAB_POSITION_STORAGE_KEY);

async function settled(page: Page): Promise<Rect> {
  await waitForStableBox(trigger(page));
  return rectOf(trigger(page));
}

/** A mouse drag in small steps; `beforeRelease` runs with the button still down. */
async function mouseDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, beforeRelease?: () => Promise<void>) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let step = 1; step <= DRAG_STEPS; step += 1) {
    await page.mouse.move(from.x + ((to.x - from.x) * step) / DRAG_STEPS, from.y + ((to.y - from.y) * step) / DRAG_STEPS);
  }
  await beforeRelease?.();
  await page.mouse.up();
}

type TouchPoint = { x: number; y: number };
const touch = (cdp: CDPSession, type: 'touchStart' | 'touchMove' | 'touchEnd', point?: TouchPoint) =>
  cdp.send('Input.dispatchTouchEvent', { type, touchPoints: point && type !== 'touchEnd' ? [point] : [] });

/** A real touch drag through the DevTools protocol, so the browser decides about scrolling like it does for a finger. */
async function touchDrag(page: Page, from: TouchPoint, to: TouchPoint, beforeRelease?: () => Promise<void>) {
  const cdp = await page.context().newCDPSession(page);
  await touch(cdp, 'touchStart', from);
  for (let step = 1; step <= DRAG_STEPS; step += 1) {
    await touch(cdp, 'touchMove', { x: from.x + ((to.x - from.x) * step) / DRAG_STEPS, y: from.y + ((to.y - from.y) * step) / DRAG_STEPS });
  }
  await beforeRelease?.();
  await touch(cdp, 'touchEnd');
  await cdp.detach();
}

/** Counts the transform transitions the browser starts on the box of the tab (the slide into place). */
async function countSlides(page: Page) {
  await page.evaluate((name) => {
    const w = window as unknown as { __tabSlides: number };
    w.__tabSlides = 0;
    document.querySelector(`aside[aria-label="${name}"]`)?.addEventListener('transitionrun', (event) => {
      if ((event as TransitionEvent).propertyName === 'transform' && event.target === event.currentTarget) w.__tabSlides += 1;
    });
  }, PANEL);
}

async function startAt(page: Page, size: { width: number; height: number }, stored?: unknown) {
  await page.setViewportSize(size);
  if (stored !== undefined) {
    await page.addInitScript(([key, value]) => window.localStorage.setItem(key as string, value as string), [TAB_POSITION_STORAGE_KEY, typeof stored === 'string' ? stored : JSON.stringify(stored)]);
  }
  await openHome(page);
  await expect(trigger(page)).toBeVisible();
  await nextFrames(page);
}

/** The panel is inside the window, toward the inside of the screen from the tab, clear of WhatsApp. */
async function expectPanelInside(page: Page, size: { width: number; height: number }, side: 'left' | 'right') {
  await trigger(page).click();
  await expect(panelOf(page)).toBeVisible();
  await waitForStableBox(panelOf(page));
  const panel = await rectOf(panelOf(page));
  const tab = await rectOf(trigger(page));
  const label = `${size.width}x${size.height} ${side}`;
  expect(panel.left, `${label}: panel left`).toBeGreaterThanOrEqual(-SUBPIXEL);
  expect(panel.right, `${label}: panel right`).toBeLessThanOrEqual(size.width + SUBPIXEL);
  expect(panel.top, `${label}: panel keeps 16px under the top`).toBeGreaterThanOrEqual(MARGIN - SUBPIXEL);
  expect(panel.bottom, `${label}: panel bottom`).toBeLessThanOrEqual(size.height + SUBPIXEL);
  if (side === 'left') expect(panel.left, `${label}: opens to the right of the tab`).toBeGreaterThanOrEqual(tab.right - SUBPIXEL);
  else expect(panel.right, `${label}: opens to the left of the tab`).toBeLessThanOrEqual(tab.left + SUBPIXEL);
  expect(overlaps(panel, tab), `${label}: panel over the tab`).toBe(false);
  expect(overlaps(panel, await rectOf(whatsApp(page))), `${label}: panel over WhatsApp`).toBe(false);
  await page.keyboard.press('Escape');
  await expect(panelOf(page)).toBeHidden();
}

test.describe('the accessibility tab with a mouse', () => {
  test.beforeEach(async ({ browserName }, testInfo) => {
    void browserName;
    test.skip(testInfo.project.name !== 'desktop', 'the mouse is the desktop project');
  });

  test('follows the pointer before the release, snaps to the nearest side keeping its height, and is remembered after a reload', async ({ page }) => {
    test.slow();
    const size = { width: 1440, height: 900 };
    await startAt(page, size);
    const start = await settled(page);
    expect(start.right, 'default place: the right edge').toBeCloseTo(size.width, 0);

    let during: Rect | null = null;
    await mouseDrag(page, centre(start), { x: 300, y: 200 }, async () => {
      during = await rectOf(trigger(page));
    });

    expect(during, 'the tab was drawn somewhere else before the release').not.toBeNull();
    expect(Math.abs((during as unknown as Rect).left - start.left), 'it moved with the pointer').toBeGreaterThan(500);
    const end = await settled(page);
    expect(end.left, 'snapped to the left edge').toBeCloseTo(0, 0);
    expect(Math.abs(centre(end).y - 200), 'kept the height where it was released').toBeLessThan(2);
    expect(await storedPosition(page)).toMatchObject({ side: 'left' });
    await expect(panelOf(page), 'a drag does not open the panel').toHaveCount(0);

    await page.reload();
    await expect(trigger(page)).toBeVisible();
    const afterReload = await settled(page);
    expect(afterReload.left).toBeCloseTo(0, 0);
    expect(Math.abs(centre(afterReload).y - 200)).toBeLessThan(2);
  });

  test('a press that moves only a few pixels is a tap: it opens the panel and does not move the tab', async ({ page }) => {
    test.slow();
    await startAt(page, { width: 1440, height: 900 });
    const start = await settled(page);

    await mouseDrag(page, centre(start), { x: centre(start).x + 3, y: centre(start).y + 3 });

    await expect(panelOf(page)).toBeVisible();
    expect(await settled(page)).toEqual(start);
    expect(await storedPosition(page)).toBeNull();
  });

  test('the panel follows the tab while it is dragged open, and flips to the other side with it', async ({ page }) => {
    test.slow();
    await startAt(page, { width: 1440, height: 900 });
    const start = await settled(page);
    await trigger(page).click();
    await expect(panelOf(page)).toBeVisible();
    await waitForStableBox(panelOf(page));
    const panelBefore = await rectOf(panelOf(page));
    expect(panelBefore.right).toBeLessThanOrEqual(start.left + SUBPIXEL);

    let midway: { tab: Rect; panel: Rect } | null = null;
    await mouseDrag(page, centre(start), { x: 400, y: 450 }, async () => {
      midway = { tab: await rectOf(trigger(page)), panel: await rectOf(panelOf(page)) };
    });

    const live = midway as unknown as { tab: Rect; panel: Rect };
    expect(live.panel.left, 'while dragging on the left half the panel is to the right of the tab').toBeGreaterThanOrEqual(live.tab.right - SUBPIXEL);
    expect(live.panel.left).toBeGreaterThanOrEqual(-SUBPIXEL);
    await expect(panelOf(page)).toBeVisible();
    await waitForStableBox(panelOf(page));
    const panelAfter = await rectOf(panelOf(page));
    const tabAfter = await settled(page);
    expect(panelAfter.left, 'after the release the panel opens inward from the left edge').toBeGreaterThanOrEqual(tabAfter.right - SUBPIXEL);
  });

  test('never overlaps the WhatsApp button when dragged to the bottom left corner', async ({ page }) => {
    test.slow();
    await startAt(page, { width: 1440, height: 900 });
    const start = await settled(page);

    await mouseDrag(page, centre(start), { x: 5, y: 895 });

    const tab = await settled(page);
    const wa = await rectOf(whatsApp(page));
    expect(overlaps(tab, wa)).toBe(false);
    expect(wa.top - tab.bottom, 'a 16px gap over the WhatsApp button').toBeGreaterThanOrEqual(MARGIN - SUBPIXEL);
    expect(tab.left).toBeCloseTo(0, 0);
  });

  test('the buttons of the panel move the tab without dragging, and Voltar ao padrão undoes it', async ({ page }) => {
    test.slow();
    await startAt(page, { width: 1440, height: 900 });
    const start = await settled(page);
    await trigger(page).focus();
    await page.keyboard.press('Enter');
    const group = panelOf(page).getByRole('group', { name: a11yWidgetCopy.positionGroupLabel });

    await group.getByRole('button', { name: a11yWidgetCopy.moveLeftLabel }).click();
    const left = await settled(page);
    expect(left.left).toBeCloseTo(0, 0);
    expect(Math.abs(centre(left).y - centre(start).y), 'keeps its height').toBeLessThan(2);

    await group.getByRole('button', { name: a11yWidgetCopy.moveUpLabel }).focus();
    await page.keyboard.press('Enter');
    const up = await settled(page);
    expect(centre(left).y - centre(up).y, 'Subir moves about a tenth of the window').toBeGreaterThan(70);
    await group.getByRole('button', { name: a11yWidgetCopy.moveDownLabel }).click();
    expect(centre(await settled(page)).y).toBeCloseTo(centre(left).y, 0);
    await group.getByRole('button', { name: a11yWidgetCopy.moveRightLabel }).click();
    expect((await settled(page)).right).toBeCloseTo(1440, 0);

    await group.getByRole('button', { name: a11yWidgetCopy.moveLeftLabel }).click();
    await group.getByRole('button', { name: a11yWidgetCopy.resetPositionLabel }).click();
    const back = await settled(page);
    expect(back).toEqual(start);
    expect(await storedPosition(page)).toBeNull();
  });

  test('a corrupted stored value falls back to the default place', async ({ page }) => {
    test.slow();
    await startAt(page, { width: 1440, height: 900 }, '{"side":"top","ratio":"x"}');
    const rect = await settled(page);

    expect(rect.right).toBeCloseTo(1440, 0);
    expect(centre(rect).y).toBeCloseTo(450, 0);
  });

  test('snaps instantly when the system asks for reduced motion, and slides otherwise', async ({ page }) => {
    test.slow();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await startAt(page, { width: 1440, height: 900 });
    const start = await settled(page);

    await countSlides(page);
    await mouseDrag(page, centre(start), { x: 200, y: 300 });
    await nextFrames(page);
    expect(await page.evaluate(() => (window as unknown as { __tabSlides: number }).__tabSlides), 'no transition ran').toBe(0);
    const instant = await rectOf(trigger(page));
    expect(instant.left, 'on the left edge one frame after the release').toBeCloseTo(0, 0);
    expect(await trigger(page).evaluate((button) => (button.closest('aside') as HTMLElement).style.transition)).toBe('none');
  });

  test('slides into place with the motion allowed: the browser runs a transform transition on release', async ({ page }) => {
    test.slow();
    await startAt(page, { width: 1440, height: 900 });
    const start = await settled(page);
    await countSlides(page);

    await mouseDrag(page, centre(start), { x: 600, y: 300 });

    // The event, not the clock: a slow runner that passes the 220ms of the slide does not change what is asserted.
    await expect.poll(() => page.evaluate(() => (window as unknown as { __tabSlides: number }).__tabSlides)).toBe(1);
    expect((await settled(page)).left).toBeCloseTo(0, 0);
  });
});

test.describe('the accessibility tab with a finger', () => {
  test.beforeEach(async ({ browserName }, testInfo) => {
    void browserName;
    test.skip(testInfo.project.name !== 'mobile', 'touch is the mobile project');
  });

  for (const size of [
    { width: 390, height: 844 },
    { width: 320, height: 568 },
  ]) {
    test(`${size.width}x${size.height}: follows the finger, snaps left above WhatsApp, and the page keeps its scroll`, async ({ page }) => {
      test.slow();
      await startAt(page, size);
      const start = await settled(page);
      const scrollBefore = await page.evaluate(() => window.scrollY);

      let during: Rect | null = null;
      await touchDrag(page, centre(start), { x: 20, y: size.height - 8 }, async () => {
        during = await rectOf(trigger(page));
      });

      expect(Math.abs((during as unknown as Rect).left - start.left), 'moved before the release').toBeGreaterThan(size.width / 3);
      expect(await page.evaluate(() => window.scrollY), 'the drag did not scroll the page').toBe(scrollBefore);
      const tab = await settled(page);
      const wa = await rectOf(whatsApp(page));
      expect(tab.left).toBeCloseTo(0, 0);
      expect(overlaps(tab, wa)).toBe(false);
      expect(wa.top - tab.bottom).toBeGreaterThanOrEqual(MARGIN - SUBPIXEL);
      expect(await storedPosition(page)).toMatchObject({ side: 'left' });
    });
  }

  test('a tap with a finger still opens the panel', async ({ page }) => {
    test.slow();
    await startAt(page, { width: 390, height: 844 });
    const start = await settled(page);

    await trigger(page).tap();

    await expect(panelOf(page)).toBeVisible();
    expect(await settled(page)).toEqual(start);
  });

  test('a finger that starts outside the tab still scrolls the page', async ({ page }) => {
    test.slow();
    await startAt(page, { width: 390, height: 844 });
    const start = await settled(page);

    await touchDrag(page, { x: 150, y: 600 }, { x: 150, y: 200 });
    await nextFrames(page);

    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
    expect(await settled(page)).toEqual(start);
  });
});

// The panel inside the window, on both sides, at the sizes of the brief and with the tab high, in the middle and low.
const SIZES = [
  { width: 320, height: 568, project: 'mobile' },
  { width: 390, height: 844, project: 'mobile' },
  { width: 844, height: 390, project: 'mobile' },
  { width: 667, height: 375, project: 'mobile' },
  { width: 1440, height: 900, project: 'desktop' },
] as const;

test.describe('the panel opens toward the inside and stays in the window', () => {
  for (const size of SIZES) {
    for (const side of ['left', 'right'] as const) {
      test(`${size.width}x${size.height}, tab on the ${side}, high, middle and low`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== size.project, `${size.width}px is measured in the ${size.project} project`);
        test.slow();
        await page.setViewportSize(size);
        await startAt(page, size);
        for (const ratio of [0, 0.5, 1]) {
          await page.evaluate(([key, value]) => window.localStorage.setItem(key, value), [TAB_POSITION_STORAGE_KEY, JSON.stringify({ side, ratio })]);
          await page.reload();
          await expect(trigger(page)).toBeVisible();
          await nextFrames(page);
          const tab = await settled(page);
          const wa = await rectOf(whatsApp(page));
          expect(overlaps(tab, wa), `ratio ${ratio}: the tab and WhatsApp overlap`).toBe(false);
          if (side === 'left') expect(wa.top - tab.bottom >= MARGIN - SUBPIXEL || tab.bottom <= wa.top, `ratio ${ratio}: stacked above WhatsApp`).toBe(true);
          await expectPanelInside(page, size, side);
        }
      });
    }
  }
});

test.describe('the scroll padding follows the tab', () => {
  test('a tab the visitor moved keeps a focused control clear of it, low or high, and the default rules come back with the default place', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'measured with the phone window');
    test.slow();
    const size = { width: 390, height: 844 };
    await startAt(page, size);
    const padding = () =>
      page.evaluate(() => ({
        top: Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop),
        bottom: Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingBottom),
      }));
    const base = await padding();

    await page.evaluate(([key, value]) => window.localStorage.setItem(key, value), [TAB_POSITION_STORAGE_KEY, JSON.stringify({ side: 'right', ratio: 0.9 })]);
    await page.reload();
    await expect(trigger(page)).toBeVisible();
    const low = await settled(page);
    expect((await padding()).bottom, 'the bottom band reaches the top of the tab').toBeGreaterThanOrEqual(size.height - low.top);

    await page.evaluate(([key, value]) => window.localStorage.setItem(key, value), [TAB_POSITION_STORAGE_KEY, JSON.stringify({ side: 'right', ratio: 0.1 })]);
    await page.reload();
    await expect(trigger(page)).toBeVisible();
    const high = await settled(page);
    expect((await padding()).top, 'at rest the top padding is the default one, so anchors land where they always do').toBe(base.top);
    await page.keyboard.press('Tab');
    expect((await padding()).top, 'while the keyboard moves the focus the top band reaches the bottom of the tab').toBeGreaterThanOrEqual(high.bottom);

    await page.evaluate((key) => window.localStorage.removeItem(key), TAB_POSITION_STORAGE_KEY);
    await page.reload();
    await expect(trigger(page)).toBeVisible();
    expect(await padding()).toEqual(base);
  });
});
