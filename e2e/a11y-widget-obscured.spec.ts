import type { Page } from '@playwright/test';
import { TAB_POSITION_STORAGE_KEY } from '../src/lib/tabPositionStorage';
import { enableLargeFont, waitForSteadyHeight } from './homeSupport';
import { expect, test } from './n8nGuard';
import { overlaps, rectOf, store, trigger, type Place, type Side } from './tabSupport';

// WCAG 2.2 SC 2.4.11 Focus Not Obscured. The tab is fixed, and while the keyboard moves the focus the page scrolls a
// focused control out from under it with scroll-padding. At the top of the page nothing can scroll, so a control of the
// first screen that sits in the band of the tab stays under it: the tab has to step aside for as long as that control has
// the focus. These tests put a column of links in the first screen (full width ones, which can only be cleared by moving
// the tab up or down, and short ones on each side, which can be cleared by crossing to the other side), press Tab through
// them and measure what is on top of each one once the page and the tab have stopped moving.

const PROBE_ID = 'vn-obscured-probe';
const PROBE_TOP_PX = 104;
const PROBE_LINK_HEIGHT_PX = 40;
const PROBE_GAP_PX = 6;
const PROBE_LINKS = 10;
const SETTLE_FRAMES = 8;
const SETTLE_GIVE_UP_MS = 3000;
// The tab judges the focused control after a quiet moment (120ms), so a calm that starts earlier is not the end of the move.
const MIN_CALM_MS = 250;
const TEST_TIMEOUT_MS = 90_000;
const RATIOS = [0.3, 0.4, 0.5, 0.6];
const SIDES: Side[] = ['left', 'right'];
const PHONES = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
];
const DESKTOP = { width: 1440, height: 900 };

/** Puts the links first in the body, out of the flow, so the page below them is the real one and the first Tab reaches them. */
async function addProbe(page: Page) {
  await page.evaluate(
    ({ id, top, height, gap, count }) => {
      const box = document.createElement('div');
      box.id = id;
      box.style.cssText = `position:absolute;top:${top}px;left:0;right:0;z-index:5;display:flex;flex-direction:column;gap:${gap}px;pointer-events:none`;
      const shapes = ['stretch', 'flex-start', 'flex-end'];
      for (let index = 0; index < count; index += 1) {
        const link = document.createElement('a');
        link.href = `#probe-${index}`;
        link.textContent = `Link de prova ${index + 1}`;
        const width = shapes[index % 3] === 'stretch' ? 'auto' : '120px';
        link.style.cssText = `align-self:${shapes[index % 3]};width:${width};height:${height}px;background:#fff;color:#000;border:1px solid #000;pointer-events:auto;display:block`;
        box.append(link);
      }
      document.body.prepend(box);
    },
    { id: PROBE_ID, top: PROBE_TOP_PX, height: PROBE_LINK_HEIGHT_PX, gap: PROBE_GAP_PX, count: PROBE_LINKS },
  );
}

/** Waits until the scroll and the tab have stopped for a run of frames (the dodge debounces, then slides). */
function waitForCalm(page: Page) {
  return page.evaluate(
    ({ frames, giveUp, minimum }) =>
      new Promise<void>((resolve) => {
        const tab = document.querySelector('aside button[aria-expanded]');
        const read = () => `${window.scrollY}|${tab ? JSON.stringify(tab.getBoundingClientRect()) : ''}`;
        const started = performance.now();
        let last = '';
        let same = 0;
        const tick = () => {
          const now = read();
          same = now === last ? same + 1 : 0;
          last = now;
          const elapsed = performance.now() - started;
          if ((same >= frames && elapsed >= minimum) || elapsed > giveUp) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    { frames: SETTLE_FRAMES, giveUp: SETTLE_GIVE_UP_MS, minimum: MIN_CALM_MS },
  );
}

async function openProbe(page: Page, place: Place, hasLargeFont: boolean) {
  if (hasLargeFont) await enableLargeFont(page);
  await store(page, place);
  await page.goto('/servicos');
  await page.evaluate(() => document.fonts.ready);
  await waitForSteadyHeight(page);
  await expect(trigger(page)).toBeVisible();
  await addProbe(page);
  await page.evaluate(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    (document.activeElement as HTMLElement | null)?.blur();
  });
}

/** Presses Tab through the probe links; returns what was on top of each one once everything stopped. */
async function tabThroughProbe(page: Page) {
  const problems: string[] = [];
  for (let index = 0; index < PROBE_LINKS; index += 1) {
    await page.keyboard.press('Tab');
    await waitForCalm(page);
    const focused = page.locator(`#${PROBE_ID} a:focus`);
    await expect(focused).toHaveCount(1);
    const link = await rectOf(focused);
    const tab = await rectOf(trigger(page));
    if (overlaps(link, tab)) {
      problems.push(
        `link ${index + 1} (${Math.round(link.left)},${Math.round(link.top)} to ${Math.round(link.right)},${Math.round(link.bottom)}) is under the tab (${Math.round(tab.left)},${Math.round(tab.top)} to ${Math.round(tab.right)},${Math.round(tab.bottom)})`,
      );
    }
  }
  return problems;
}

async function expectStoredPlace(page: Page, place: Place) {
  const stored = await page.evaluate((key) => window.localStorage.getItem(key), TAB_POSITION_STORAGE_KEY);
  expect(JSON.parse(stored ?? 'null')).toEqual(place);
}

function describeRun(label: string, viewport: { width: number; height: number }, skipOn: string, reason: string) {
  for (const side of SIDES) {
    for (const ratio of RATIOS) {
      for (const hasLargeFont of [false, true]) {
        const name = `${label} ${viewport.width}x${viewport.height}, tab on the ${side} at ${ratio}, font ${hasLargeFont ? '120' : '100'}%`;
        test(`${name}: no link of the first screen stays under the tab while Tab moves the focus`, async ({
          page,
        }, testInfo) => {
          test.skip(testInfo.project.name !== skipOn, reason);
          test.setTimeout(TEST_TIMEOUT_MS);
          const place: Place = { side, ratio };
          await page.setViewportSize(viewport);
          await openProbe(page, place, hasLargeFont);

          expect(await tabThroughProbe(page)).toEqual([]);
          await expectStoredPlace(page, place);
        });
      }
    }
  }
}

for (const phone of PHONES) describeRun('phone', phone, 'mobile', 'the phone windows run on the mobile project');
describeRun('desktop', DESKTOP, 'desktop', 'the desktop window runs on the desktop project');

test.describe('the tab steps aside only for the keyboard', () => {
  const place: Place = { side: 'right', ratio: 0.4 };
  test.use({ viewport: { width: 390, height: 844 } });

  test('a pointer on a link under the tab band never moves the tab, and the tab is back home once the focus leaves', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'touch window');
    await openProbe(page, place, false);
    const home = await rectOf(trigger(page));

    // The sixth link is a short one on the right, over the tab at this height.
    for (let press = 0; press < 6; press += 1) await page.keyboard.press('Tab');
    await waitForCalm(page);
    const dodged = await rectOf(trigger(page));
    expect(dodged).not.toEqual(home);
    expect(overlaps(await rectOf(page.locator(`#${PROBE_ID} a:focus`)), dodged)).toBe(false);

    await page.evaluate(() => (document.activeElement as HTMLElement).blur());
    await waitForCalm(page);
    expect(await rectOf(trigger(page))).toEqual(home);
    await expectStoredPlace(page, place);

    // A pointer press on a link is not the keyboard: whatever it focuses, the tab stays where the visitor put it.
    await page
      .locator(`#${PROBE_ID} a`)
      .nth(5)
      .click({ position: { x: 20, y: 20 } });
    await waitForCalm(page);
    expect(await rectOf(trigger(page))).toEqual(home);
  });

  test('the tab can still be reached with the keyboard and opens its panel', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'touch window');
    await openProbe(page, place, false);
    await trigger(page).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectStoredPlace(page, place);
  });
});
