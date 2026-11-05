import type { Page } from '@playwright/test';
import { TAB_POSITION_STORAGE_KEY } from '../src/lib/tabPositionStorage';
import { A11Y_STORAGE_KEY, enableLargeFont, waitForSteadyHeight } from './homeSupport';
import { expect, test } from './n8nGuard';
import { overlaps, panelOf, rectOf, store, trigger, type Place, type Rect } from './tabSupport';

// WCAG 2.2 SC 2.4.11 Focus Not Obscured. The tab is fixed, and while the keyboard moves the focus the page scrolls a
// focused control out from under it with scroll-padding. At the top of the page nothing can scroll, so a control of the
// first screen that sits in the band of the tab stays under it: the tab has to step aside for as long as that control has
// the focus. These tests put a column of links in the first screen (full width ones, which can only be cleared by moving
// the tab up or down, and short ones on each side, which can be cleared by crossing to the other side), press the keys
// through them and measure, once the page and the tab have stopped moving: that nothing is on top of the focused link, that
// the tab moved exactly when it had to, that it stayed inside the window (under the header, over the WhatsApp stack) and
// that a pointer can still reach it.

const PROBE_ID = 'vn-obscured-probe';
const PROBE_MIN_TOP_PX = 104;
const PROBE_LINK_HEIGHT_PX = 40;
const PROBE_GAP_PX = 6;
const PROBE_LINKS = 10;
const LINKS_ABOVE_TAB = 3;
const SETTLE_FRAMES = 8;
const SETTLE_GIVE_UP_MS = 3000;
// The tab judges the focused control in the next frame, and again once the scroll settles (100ms): a calm that starts earlier is not the end.
const MIN_CALM_MS = 250;
const TEST_TIMEOUT_MS = 90_000;
const SUBPIXEL = 1.5;
const TAB_SIZE = 44;
const HEADER_CLEARANCE_PX = 96;
const SHORT_HEADER_CLEARANCE_PX = 72;
const SHORT_WINDOW_PX = 480;
const MARGIN_PX = 16;
const WHATSAPP_STACK_PX = 52 + 16;
const RATIOS = [0, 0.3, 0.4, 0.5, 0.6, 0.9];
const SIDES = ['left', 'right'] as const;
const PHONES = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
];
const DESKTOP = { width: 1440, height: 900 };
const SIDEWAYS = { width: 844, height: 390 };
const PHONE = { width: 390, height: 844 };
const PHONE_PLACE: Place = { side: 'right', ratio: 0.4 };

type Size = { width: number; height: number };

/** Puts the links first in the body, out of the flow, with the column straddling the tab, so the first Tab reaches them. */
async function addProbe(page: Page) {
  await page.evaluate(
    ({ id, min, height, gap, count, above }) => {
      const tab = document.querySelector('aside button[aria-expanded]')!.getBoundingClientRect();
      const step = height + gap;
      const top = Math.max(min, Math.min(Math.round(tab.top) - above * step, window.innerHeight - count * step - 16));
      const box = document.createElement('div');
      box.id = id;
      box.style.cssText = `position:absolute;top:${top}px;left:0;right:0;z-index:5;display:flex;flex-direction:column;gap:${gap}px;pointer-events:none`;
      const shapes = ['stretch', 'flex-start', 'flex-end'];
      for (let index = 0; index < count; index += 1) {
        const link = document.createElement('a');
        link.href = `#probe-${index}`;
        link.textContent = `Link de prova ${index + 1}`;
        const shape = shapes[index % 3];
        link.style.cssText = `align-self:${shape};width:${shape === 'stretch' ? 'auto' : '120px'};height:${height}px;background:#fff;color:#000;border:1px solid #000;pointer-events:auto;display:block`;
        box.append(link);
      }
      document.body.prepend(box);
    },
    {
      id: PROBE_ID,
      min: PROBE_MIN_TOP_PX,
      height: PROBE_LINK_HEIGHT_PX,
      gap: PROBE_GAP_PX,
      count: PROBE_LINKS,
      above: LINKS_ABOVE_TAB,
    },
  );
}

/** Waits until the scroll and the tab have stopped for a run of frames, and for the judge of the tab to have had its turn. */
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

interface OpenOptions {
  place: Place | null;
  size?: Size;
  hasLargeFont?: boolean;
  extra?: Record<string, unknown>;
}

async function openProbe(page: Page, { place, size, hasLargeFont = false, extra }: OpenOptions) {
  if (size) await page.setViewportSize(size);
  if (hasLargeFont) await enableLargeFont(page);
  if (extra)
    await page.addInitScript(
      ([key, value]) => window.localStorage.setItem(key as string, value as string),
      [A11Y_STORAGE_KEY, JSON.stringify(extra)],
    );
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

const describeRect = (rect: Rect) =>
  `${Math.round(rect.left)},${Math.round(rect.top)} to ${Math.round(rect.right)},${Math.round(rect.bottom)}`;
const isSameRect = (a: Rect, b: Rect) => Math.max(Math.abs(a.left - b.left), Math.abs(a.top - b.top)) < SUBPIXEL;

/** The tab is inside the window, under the header and over the bottom limit of its side (the WhatsApp stack on the left). */
function boundsProblems(tab: Rect, size: Size): string[] {
  const header = size.height <= SHORT_WINDOW_PX ? SHORT_HEADER_CLEARANCE_PX : HEADER_CLEARANCE_PX;
  const isLeft = (tab.left + tab.right) / 2 < size.width / 2;
  const bottomLimit = size.height - MARGIN_PX - (isLeft ? WHATSAPP_STACK_PX : 0);
  const problems: string[] = [];
  if (tab.left < -SUBPIXEL || tab.right > size.width + SUBPIXEL) problems.push('is outside the window sideways');
  if (tab.top < header - SUBPIXEL) problems.push(`is over the header (top ${Math.round(tab.top)}, header ${header})`);
  if (tab.bottom > bottomLimit + SUBPIXEL)
    problems.push(`is over the bottom limit (bottom ${Math.round(tab.bottom)}, limit ${bottomLimit})`);
  return problems;
}

interface Walk {
  keys: string[];
  home: Rect;
  size: Size;
}

/** Presses each key and, once everything stopped, checks the focused probe link against the tab; returns what failed and how many dodges happened. */
async function walkProbe(page: Page, { keys, home, size }: Walk) {
  const problems: string[] = [];
  let dodges = 0;
  for (const [index, key] of keys.entries()) {
    await page.keyboard.press(key);
    await waitForCalm(page);
    const focused = page.locator(`#${PROBE_ID} a:focus`);
    if ((await focused.count()) !== 1) continue;
    const link = await rectOf(focused);
    const tab = await rectOf(trigger(page));
    const name = `${key} ${index + 1}: link ${describeRect(link)}, tab ${describeRect(tab)}`;
    if (overlaps(link, tab)) problems.push(`${name}: the link is under the tab`);
    const isDodged = !isSameRect(tab, home);
    if (isDodged) dodges += 1;
    const wasCovering = overlaps(link, home);
    if (wasCovering && !isDodged) problems.push(`${name}: the tab did not step aside`);
    if (!wasCovering && isDodged) problems.push(`${name}: the tab moved for a link that was not over it`);
    problems.push(...boundsProblems(tab, size).map((problem) => `${name}: the tab ${problem}`));
  }
  return { problems, dodges };
}

async function expectStoredPlace(page: Page, place: Place | null) {
  const stored = await page.evaluate((key) => window.localStorage.getItem(key), TAB_POSITION_STORAGE_KEY);
  expect(JSON.parse(stored ?? 'null')).toEqual(place);
}

async function expectReachableByPointer(page: Page) {
  await trigger(page).click();
  await expect(panelOf(page)).toBeVisible();
}

const tabKeys = (count: number) => Array.from({ length: count }, () => 'Tab');

function describeMatrix(label: string, size: Size, project: string) {
  const places: Array<Place | null> = [null, ...SIDES.flatMap((side) => RATIOS.map((ratio) => ({ side, ratio })))];
  for (const place of places) {
    for (const hasLargeFont of [false, true]) {
      const where = place ? `tab on the ${place.side} at ${place.ratio}` : 'tab at its default place';
      const name = `${label} ${size.width}x${size.height}, ${where}, font ${hasLargeFont ? '120' : '100'}%`;
      test(`${name}: Tab never leaves a link under the tab, moves it only when it must, keeps it in bounds and reachable`, async ({
        page,
      }, testInfo) => {
        test.skip(testInfo.project.name !== project, `the ${label} windows run on the ${project} project`);
        test.setTimeout(TEST_TIMEOUT_MS);
        await openProbe(page, { place, size, hasLargeFont });
        const home = await rectOf(trigger(page));
        const links = await page
          .locator(`#${PROBE_ID} a`)
          .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().toJSON()));
        const isCovered = links.some((link) =>
          overlaps({ left: link.left, top: link.top, right: link.right, bottom: link.bottom }, home),
        );

        const { problems, dodges } = await walkProbe(page, { keys: tabKeys(PROBE_LINKS), home, size });

        expect(problems).toEqual([]);
        // In the upper half the page cannot scroll a link clear of the band (it is at the top), so the tab has to move.
        // Lower down the browser scrolls the link out from under the tab, which is the other way to clear it.
        const isUpper = home.top + TAB_SIZE / 2 < size.height / 2;
        if (isCovered && isUpper)
          expect(dodges, 'the tab was over a link of the column and never moved').toBeGreaterThan(0);
        await expectStoredPlace(page, place);
        await expectReachableByPointer(page);
      });
    }
  }
}

for (const phone of PHONES) describeMatrix('phone', phone, 'mobile');
describeMatrix('desktop', DESKTOP, 'desktop');

test.describe('the keyboard paths besides Tab', () => {
  test.use({ viewport: PHONE });
  test.skip(({ isMobile }) => !isMobile, 'touch window');
  test.describe.configure({ timeout: TEST_TIMEOUT_MS });

  test('Shift+Tab walks back through the links with the same guarantees', async ({ page }) => {
    await openProbe(page, { place: PHONE_PLACE });
    const home = await rectOf(trigger(page));

    const forward = await walkProbe(page, { keys: tabKeys(PROBE_LINKS), home, size: PHONE });
    const back = await walkProbe(page, {
      keys: Array.from({ length: PROBE_LINKS - 1 }, () => 'Shift+Tab'),
      home,
      size: PHONE,
    });

    expect([...forward.problems, ...back.problems]).toEqual([]);
    expect(back.dodges).toBeGreaterThan(0);
  });

  test('a focus the keyboard brings without a Tab key (a script after an arrow key) is judged too', async ({
    page,
  }) => {
    await openProbe(page, { place: PHONE_PLACE });
    const home = await rectOf(trigger(page));
    await page.keyboard.press('ArrowDown');
    await page.evaluate((id) => (document.querySelectorAll(`#${id} a`)[3] as HTMLElement).focus(), PROBE_ID);
    await waitForCalm(page);

    const link = await rectOf(page.locator(`#${PROBE_ID} a:focus`));
    expect(overlaps(link, home)).toBe(true);
    expect(overlaps(link, await rectOf(trigger(page)))).toBe(false);
  });

  for (const leave of ['Tab', 'Shift+Tab']) {
    test(`${leave} out of the open panel judges the control the focus lands on`, async ({ page }) => {
      await openProbe(page, { place: PHONE_PLACE });
      await page.keyboard.press('Tab');
      await trigger(page).focus();
      await page.keyboard.press('Enter');
      await expect(panelOf(page)).toBeVisible();

      const isInsideWidget = () =>
        page.evaluate(() => !!document.activeElement?.closest('aside') && document.activeElement !== document.body);
      for (let press = 0; press < 20 && (await isInsideWidget()); press += 1) await page.keyboard.press(leave);
      await waitForCalm(page);

      await expect(panelOf(page)).toBeHidden();
      const focusedBox = await page.evaluate(() => {
        const active = document.activeElement;
        return active && active !== document.body ? active.getBoundingClientRect().toJSON() : null;
      });
      const tab = await rectOf(trigger(page));
      if (focusedBox)
        expect(
          overlaps(
            { left: focusedBox.left, top: focusedBox.top, right: focusedBox.right, bottom: focusedBox.bottom },
            tab,
          ),
        ).toBe(false);
      expect(boundsProblems(tab, PHONE)).toEqual([]);
    });
  }

  test('a rotation to the side and back while a link is covered leaves the tab inside the window and clear of the link', async ({
    page,
  }) => {
    await openProbe(page, { place: PHONE_PLACE });
    for (let press = 0; press < 3; press += 1) await page.keyboard.press('Tab');
    await waitForCalm(page);

    for (const size of [SIDEWAYS, PHONE, SIDEWAYS, PHONE]) {
      await page.setViewportSize(size);
      await waitForCalm(page);
      const tab = await rectOf(trigger(page));
      const focused = page.locator(`#${PROBE_ID} a:focus`);
      await expect(focused).toHaveCount(1);
      expect(overlaps(await rectOf(focused), tab), `${size.width}x${size.height}: the link is under the tab`).toBe(
        false,
      );
      expect(boundsProblems(tab, size), `${size.width}x${size.height}`).toEqual([]);
    }
    await expectStoredPlace(page, PHONE_PLACE);
  });
});

test.describe('the tab is still the visitor’s: a press on a dodged tab, and the motion options', () => {
  test.use({ viewport: PHONE });
  test.skip(({ isMobile }) => !isMobile, 'touch window');
  test.describe.configure({ timeout: TEST_TIMEOUT_MS });

  /** Tab until the tab has stepped aside; returns where it rests and where it is drawn. */
  async function dodgeTheTab(page: Page, size: Size = PHONE) {
    const home = await rectOf(trigger(page));
    const { dodges } = await walkProbe(page, { keys: tabKeys(4), home, size });
    expect(dodges).toBeGreaterThan(0);
    return { home, dodged: await rectOf(trigger(page)) };
  }

  test('a pointer on a link under the tab band never moves the tab, and the tab is back home once the focus leaves', async ({
    page,
  }) => {
    await openProbe(page, { place: PHONE_PLACE });
    const { home, dodged } = await dodgeTheTab(page);
    expect(overlaps(await rectOf(page.locator(`#${PROBE_ID} a:focus`)), dodged)).toBe(false);

    await page.evaluate(() => (document.activeElement as HTMLElement).blur());
    await waitForCalm(page);
    expect(await rectOf(trigger(page))).toEqual(home);
    await expectStoredPlace(page, PHONE_PLACE);

    // A pointer press on a link is not the keyboard: whatever it focuses, the tab stays where the visitor put it.
    await page
      .locator(`#${PROBE_ID} a`)
      .nth(3)
      .click({ position: { x: 20, y: 20 } });
    await waitForCalm(page);
    expect(await rectOf(trigger(page))).toEqual(home);
  });

  test('a press on the dodged tab keeps it under the pointer, and the click opens the panel', async ({ page }) => {
    await openProbe(page, { place: PHONE_PLACE });
    const { dodged } = await dodgeTheTab(page);
    const x = (dodged.left + dodged.right) / 2;
    const y = (dodged.top + dodged.bottom) / 2;

    await page.mouse.move(x, y);
    await page.mouse.down();
    await waitForCalm(page);
    expect(isSameRect(await rectOf(trigger(page)), dodged)).toBe(true);
    await page.mouse.up();

    await expect(panelOf(page)).toBeVisible();
    await expectStoredPlace(page, PHONE_PLACE);
  });

  test('a drag that starts on the dodged tab starts where the tab is drawn and ends where the pointer lets go', async ({
    page,
  }) => {
    await openProbe(page, { place: PHONE_PLACE });
    const { dodged } = await dodgeTheTab(page);
    const x = (dodged.left + dodged.right) / 2;
    const y = (dodged.top + dodged.bottom) / 2;
    const endY = 700;

    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 30, { steps: 4 });
    const during = await rectOf(trigger(page));
    expect(
      Math.abs((during.top + during.bottom) / 2 - (y + 30)),
      'the tab follows the pointer from where it is drawn',
    ).toBeLessThan(SUBPIXEL * 2);
    await page.mouse.move(x, endY, { steps: 8 });
    await page.mouse.up();
    await waitForCalm(page);

    const stored = await page.evaluate(
      (key) => JSON.parse(window.localStorage.getItem(key) ?? 'null') as Place,
      TAB_POSITION_STORAGE_KEY,
    );
    expect(stored.side).toBe('right');
    expect(Math.abs(stored.ratio - endY / PHONE.height)).toBeLessThan(0.03);
    const rested = await rectOf(trigger(page));
    expect(Math.abs((rested.top + rested.bottom) / 2 - endY)).toBeLessThan(SUBPIXEL * 4);
    expect(boundsProblems(rested, PHONE)).toEqual([]);
  });

  test('a drag that starts on a dodged tab at the default place keeps the tab under the pointer, during and after', async ({
    page,
  }) => {
    const size = { width: 700, height: 844 };
    await openProbe(page, { place: null, size });
    const { dodged } = await dodgeTheTab(page, size);
    const x = (dodged.left + dodged.right) / 2;
    const y = (dodged.top + dodged.bottom) / 2;
    const endY = 700;
    const centreY = async () => {
      const box = await rectOf(trigger(page));
      return (box.top + box.bottom) / 2;
    };

    await page.mouse.move(x, y);
    await page.mouse.down();
    for (const step of [20, 60, 120]) {
      await page.mouse.move(x, y + step, { steps: 3 });
      expect(Math.abs((await centreY()) - (y + step)), `the tab is under the pointer at +${step}`).toBeLessThan(1);
    }
    await page.mouse.move(x, endY, { steps: 6 });
    expect(Math.abs((await centreY()) - endY), 'the tab is under the pointer at the end').toBeLessThan(1);
    await page.mouse.up();
    await waitForCalm(page);

    expect(Math.abs((await centreY()) - endY), 'the tab rests where the pointer let go').toBeLessThan(1);
    const stored = await page.evaluate(
      (key) => JSON.parse(window.localStorage.getItem(key) ?? 'null') as Place,
      TAB_POSITION_STORAGE_KEY,
    );
    expect(stored.side).toBe('right');
    expect(Math.abs(stored.ratio - endY / size.height)).toBeLessThan(0.02);
  });

  test('after a dodge the tab takes the colours for the page under the place it moved to, and back when it comes home', async ({
    page,
  }, testInfo) => {
    await openProbe(page, { place: PHONE_PLACE });
    const home = await rectOf(trigger(page));
    // A dark band right under the link that covers the tab: the tab steps down onto it.
    await page.evaluate(
      (top) => {
        const band = document.createElement('div');
        band.style.cssText = `position:absolute;left:0;right:0;top:${top}px;height:400px;z-index:1;background:rgb(10,10,10)`;
        document.body.prepend(band);
      },
      Math.round(home.bottom) - 2,
    );
    const background = () => trigger(page).evaluate((node) => getComputedStyle(node).backgroundColor);
    const atHome = await background();

    const { dodged } = await dodgeTheTab(page);
    expect(dodged.top).toBeGreaterThan(home.top);
    await expect.poll(background, { message: 'the tab over the dark band takes the light colours' }).not.toBe(atHome);
    await testInfo.attach('dodged-over-dark', { body: await page.screenshot(), contentType: 'image/png' });

    await page.evaluate(() => (document.activeElement as HTMLElement).blur());
    await waitForCalm(page);
    await expect
      .poll(background, { message: 'the tab at home over the light page takes its colours back' })
      .toBe(atHome);
    await testInfo.attach('home-over-light', { body: await page.screenshot(), contentType: 'image/png' });
  });

  test('the tab can still be reached with the keyboard and opens its panel', async ({ page }) => {
    await openProbe(page, { place: PHONE_PLACE });
    await trigger(page).focus();
    await page.keyboard.press('Enter');
    await expect(panelOf(page)).toBeVisible();
    await expectStoredPlace(page, PHONE_PLACE);
  });

  const MOTION_OFF = [
    {
      name: 'the system asks for reduced motion',
      prepare: (page: Page) => page.emulateMedia({ reducedMotion: 'reduce' }),
      extra: undefined,
    },
    { name: 'Pausar animações is on', prepare: async () => undefined, extra: { noAnimations: true } },
  ];
  for (const option of MOTION_OFF) {
    test(`the move is instant when ${option.name}, and slides otherwise`, async ({ page }) => {
      await option.prepare(page);
      await openProbe(page, { place: PHONE_PLACE, extra: option.extra });
      await dodgeTheTab(page);
      const slide = await trigger(page).evaluate((node) =>
        Number.parseFloat(getComputedStyle(node).transitionDuration.split(',').pop() ?? '1'),
      );
      expect(slide).toBeLessThan(0.001);
    });
  }

  test('the move slides for the length of the tab slide when motion is on', async ({ page }) => {
    await openProbe(page, { place: PHONE_PLACE });
    const slide = await trigger(page).evaluate((node) =>
      Number.parseFloat(getComputedStyle(node).transitionDuration.split(',').pop() ?? '0'),
    );
    expect(slide).toBeCloseTo(0.22, 2);
  });
});
