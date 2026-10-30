import { devices, type Locator, type Page } from '@playwright/test';
import {
  HOURS_PILL_NAME,
  MIN_TOUCH_PX,
  TOUCH_ROUNDING_PX,
  brokenWordsIn,
  enableLargeFont,
  measureOverflow,
  measurePauseOverlaps,
  measureSmallTargets,
  nextFrames,
  openHome,
  waitForStableBox,
  walkPage,
} from './homeSupport';
import { expect, test } from './n8nGuard';

// The home on the devices people really use, from the Galaxy Fold closed to a large monitor. One test per device sets
// its own viewport and touch options (so the results do not depend on the defaults of the Playwright project) and walks
// the whole page. The home mounts the real form, so the test comes from ./n8nGuard, and nothing here sends the form.

interface Device {
  name: string;
  width: number;
  height: number;
  /** Phones and tablets are touch screens; the laptops and monitors are not. */
  isTouch: boolean;
}

const DEVICES: readonly Device[] = [
  { name: 'Galaxy Fold closed', width: 280, height: 653, isTouch: true },
  { name: 'iPhone SE 1st gen', width: 320, height: 568, isTouch: true },
  { name: 'common Android', width: 360, height: 740, isTouch: true },
  { name: 'iPhone SE', width: 375, height: 667, isTouch: true },
  { name: 'iPhone 13/14', width: 390, height: 844, isTouch: true },
  { name: 'iPhone Pro Max', width: 430, height: 932, isTouch: true },
  { name: 'iPhone landscape', width: 844, height: 390, isTouch: true },
  { name: 'iPad portrait', width: 768, height: 1024, isTouch: true },
  { name: 'iPad landscape', width: 1024, height: 768, isTouch: true },
  { name: 'iPad Air', width: 820, height: 1180, isTouch: true },
  { name: 'laptop', width: 1280, height: 800, isTouch: false },
  { name: 'desktop', width: 1440, height: 900, isTouch: false },
  { name: 'full HD', width: 1920, height: 1080, isTouch: false },
  { name: 'large monitor', width: 2560, height: 1440, isTouch: false },
];

const PANEL_READING_POSITION = 0.3;
const FOOTER_TEXT = 'footer a, footer li';
const A11Y_TRIGGER_NAME = 'Abrir opções de acessibilidade';
// Every row sets all of these, so the results do not depend on the Playwright project (the mobile one is a Pixel 7 with
// a pixel ratio of 2.625): a phone or tablet is a touch screen with a phone user agent, the rest has a desktop one.
const TOUCH_AGENT = devices['Pixel 7'].userAgent;
const DESKTOP_AGENT = devices['Desktop Chrome'].userAgent;
const OVERFLOW_ALLOWANCE_PX = 0;
const LARGE_FONT_PHONE = { width: 375, height: 667 };

/** The header ends above the top of the main heading when the page opens. */
async function headerClearance(page: Page): Promise<number> {
  const header = await page.getByRole('banner').boundingBox();
  const heading = await page.getByRole('heading', { level: 1 }).boundingBox();
  if (!header || !heading) throw new Error('the header or the main heading has no box');
  return heading.y - (header.y + header.height);
}

/**
 * The option list has room for two options, and the panel does not lie over the centre of the trigger nor of the WhatsApp
 * button (`box` is the box of the panel).
 */
async function expectPanelClearsControls(page: Page, panel: Locator, box: { x: number; y: number; width: number; height: number } | null) {
  const listBox = await panel.getByRole('list').first().boundingBox();
  expect(listBox?.height ?? 0, 'the option list has room for two options').toBeGreaterThanOrEqual(MIN_LIST_HEIGHT_PX);
  for (const [label, locator] of [
    ['the trigger', page.getByRole('button', { name: A11Y_TRIGGER_NAME })],
    ['the WhatsApp button', page.getByRole('complementary', { name: 'Contato rápido' }).getByRole('link')],
  ] as const) {
    const target = await locator.boundingBox();
    expect(target, label).not.toBeNull();
    const cx = (target?.x ?? 0) + (target?.width ?? 0) / 2;
    const cy = (target?.y ?? 0) + (target?.height ?? 0) / 2;
    const covered = box !== null && cx >= box.x && cx <= box.x + box.width && cy >= box.y && cy <= box.y + box.height;
    expect(covered, `the panel does not cover the centre of ${label}`).toBe(false);
  }
}

const POINTS_ACROSS = [0.2, 0.5, 0.8];

/**
 * With the panel open: at the centre and at sample points of the WhatsApp button the element on top is the WhatsApp
 * link (nothing invisible lies over it), and the trigger and every control of the panel are on top at their centres.
 */
async function expectPointerReachesControls(page: Page, panel: Locator) {
  const link = page.getByRole('complementary', { name: 'Contato rápido' }).getByRole('link');
  const box = await link.boundingBox();
  expect(box).not.toBeNull();
  const points = POINTS_ACROSS.flatMap((fx) => POINTS_ACROSS.map((fy) => [(box?.x ?? 0) + (box?.width ?? 0) * fx, (box?.y ?? 0) + (box?.height ?? 0) * fy]));
  const hits = await page.evaluate((samples) => samples.map(([x, y]) => document.elementFromPoint(x, y)?.closest('a')?.getAttribute('aria-label') ?? null), points);
  expect(hits, 'the WhatsApp link is the element at its centre and at the sample points of its box').toEqual(points.map(() => 'Falar no WhatsApp'));

  const controls = [page.getByRole('button', { name: A11Y_TRIGGER_NAME }), ...(await panel.getByRole('button').all())];
  for (const control of controls) {
    await control.scrollIntoViewIfNeeded();
    const target = await control.boundingBox();
    const onTop = await control.evaluate(
      (element, [x, y]) => element.contains(document.elementFromPoint(x, y)),
      [(target?.x ?? 0) + (target?.width ?? 0) / 2, (target?.y ?? 0) + (target?.height ?? 0) / 2],
    );
    expect(onTop, `a control of the accessibility widget is on top at its centre`).toBe(true);
  }
}

/**
 * With the panel open, a real click on the WhatsApp link reaches it (Playwright's own hit test fails when something lies
 * over the link). The click is cancelled on the page, so the request to wa.me, which the network guard would block, is
 * not made. The click also closes the panel (a press outside it), which is why this comes last.
 */
async function expectWhatsAppClickWithPanelOpen(page: Page) {
  const link = page.getByRole('complementary', { name: 'Contato rápido' }).getByRole('link');
  await link.evaluate((element) => {
    (window as unknown as { __whatsAppClicks: number }).__whatsAppClicks = 0;
    element.addEventListener('click', (event) => {
      event.preventDefault();
      (window as unknown as { __whatsAppClicks: number }).__whatsAppClicks += 1;
    });
  });
  await link.click();
  expect(await page.evaluate(() => (window as unknown as { __whatsAppClicks: number }).__whatsAppClicks)).toBe(1);
}

/** Scrolls the hero panel to its reading position, where the tilt is gone and its boxes are at full size. */
async function scrollPanelFlat(page: Page) {
  await page.evaluate((fraction) => {
    const panel = document.querySelector('[data-flow-window]') as HTMLElement;
    window.scrollTo({ top: panel.getBoundingClientRect().top + window.scrollY - window.innerHeight * fraction, behavior: 'instant' });
  }, PANEL_READING_POSITION);
  await nextFrames(page);
  await nextFrames(page);
}

/** The WhatsApp button and the Enviar button, with Enviar scrolled into view, and how many px of one lie on the other. */
async function whatsAppOverlapWithSend(page: Page): Promise<number> {
  const send = page.locator('form[name="contact"]').getByRole('button', { name: 'Enviar', exact: true });
  await send.evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await nextFrames(page);
  const sendBox = await send.boundingBox();
  const chatBox = await page.getByRole('complementary', { name: 'Contato rápido' }).getByRole('link').boundingBox();
  if (!sendBox || !chatBox) throw new Error('the Enviar button or the WhatsApp button has no box');
  const overlapX = Math.min(sendBox.x + sendBox.width, chatBox.x + chatBox.width) - Math.max(sendBox.x, chatBox.x);
  const overlapY = Math.min(sendBox.y + sendBox.height, chatBox.y + chatBox.height) - Math.max(sendBox.y, chatBox.y);
  return overlapX > 0 && overlapY > 0 ? overlapX * overlapY : 0;
}

/** Taps the hours pill (a click on a screen with no touch) and a tab, and checks that each did its job. */
async function useTheControls(page: Page, isTouch: boolean) {
  const press = (locator: ReturnType<Page['locator']>) => (isTouch ? locator.tap() : locator.click());

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  const pill = page.getByRole('button', { name: HOURS_PILL_NAME });
  const list = page.getByRole('listbox');
  // Retry safe: a press that did not open the list is repeated, a list already open is not pressed shut.
  await expect(async () => {
    if (!(await list.isVisible())) await press(pill);
    await expect(list).toBeVisible({ timeout: 2000 });
  }).toPass();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);

  const other = page.getByRole('tab', { selected: false }).first();
  const otherName = (await other.innerText()).trim();
  await press(other);
  await expect(page.getByRole('tab', { name: otherName, selected: true })).toBeVisible();
}

for (const device of DEVICES) {
  test.describe(`${device.name} ${device.width}x${device.height}`, () => {
    test.use({
      viewport: { width: device.width, height: device.height },
      hasTouch: device.isTouch,
      isMobile: device.isTouch,
      deviceScaleFactor: 1,
      userAgent: device.isTouch ? TOUCH_AGENT : DESKTOP_AGENT,
    });

    test('has no overflow, a clear header, no overlap with the form, 44px targets and working controls', async ({ page }) => {
      test.slow(); // walks the whole page: 5s to 10s with nothing else running, and the default 30s is not enough under load
      await openHome(page);
      await nextFrames(page);
      const clearance = await headerClearance(page);
      const tiltedOverlaps = await measurePauseOverlaps(page);
      await scrollPanelFlat(page);
      const pauseOverlaps = [...tiltedOverlaps, ...(await measurePauseOverlaps(page))];

      const small = new Map<string, string>();
      await walkPage(page, async () => {
        for (const target of await measureSmallTargets(page, MIN_TOUCH_PX - TOUCH_ROUNDING_PX)) {
          small.set(`${target.element}|${Math.round(target.width)}x${Math.round(target.height)}`, `${target.element} ${target.width.toFixed(1)}x${target.height.toFixed(1)}`);
        }
      });
      const overflow = await measureOverflow(page, device.width);
      const brokenFooterWords = await brokenWordsIn(page, FOOTER_TEXT);
      const overlap = await whatsAppOverlapWithSend(page);

      expect.soft(overflow.documentExcess, 'scrollWidth past the viewport width').toBeLessThanOrEqual(OVERFLOW_ALLOWANCE_PX);
      expect.soft(overflow.elements, 'visible elements past the right edge').toEqual([]);
      expect.soft(clearance, 'gap between the header and the main heading at load').toBeGreaterThan(0);
      expect.soft(pauseOverlaps, 'what the 52px pause button lies on (title bar text, controls of the panel)').toEqual([]);
      expect.soft(overlap, 'overlap area between the WhatsApp button and Enviar').toBe(0);
      expect.soft([...small.values()], `targets under ${MIN_TOUCH_PX}px`).toEqual([]);
      expect.soft(brokenFooterWords, 'footer words broken in the middle').toEqual([]);

      await useTheControls(page, device.isTouch);
    });

    test('has 44px targets in the accessibility panel, with the reset button it shows once an option is on', async ({ page }) => {
      test.slow();
      await openHome(page);
      await page.getByRole('button', { name: A11Y_TRIGGER_NAME }).click();
      const panel = page.getByRole('dialog', { name: 'Opções de acessibilidade' });
      await expect(panel).toBeVisible();
      // Sublinhar links turns the reset button on without changing any size (Texto maior would scale every row by 120%
      // and hide a row that is 40px at the normal font).
      await panel.getByRole('button', { name: /Sublinhar links/ }).click();
      await expect(panel.getByRole('button', { name: /Resetar tudo/ })).toBeVisible();
      await waitForStableBox(panel);

      const small = (await measureSmallTargets(page, MIN_TOUCH_PX - TOUCH_ROUNDING_PX)).map(
        (target) => `${target.element} ${target.width.toFixed(1)}x${target.height.toFixed(1)}`,
      );

      expect(small, `targets under ${MIN_TOUCH_PX}px with the panel open`).toEqual([]);
    });
  });
}

test.describe(`the larger font at ${LARGE_FONT_PHONE.width}x${LARGE_FONT_PHONE.height}`, () => {
  test.use({ viewport: LARGE_FONT_PHONE, hasTouch: true, isMobile: true });

  test('has no horizontal scroll and nothing past the right edge', async ({ page }) => {
    test.slow();
    await enableLargeFont(page);
    await openHome(page);
    await expect(page.locator('html')).toHaveClass(/a11y-font-large/);
    await walkPage(page);

    const overflow = await measureOverflow(page, LARGE_FONT_PHONE.width);

    expect.soft(overflow.documentExcess, 'scrollWidth past the viewport width').toBeLessThanOrEqual(OVERFLOW_ALLOWANCE_PX);
    expect.soft(overflow.elements, 'visible elements past the right edge').toEqual([]);
  });
});

// The panel of the accessibility button is anchored above the middle of a phone and was as tall as its list: on a short
// phone its top went above the window and "Texto maior", the switch that turns the larger font off, was out of reach.
const SHORT_PHONES = [
  { width: 280, height: 653 },
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 375, height: 667 },
  { width: 844, height: 390 },
  // Phones on their side: lifted from the bottom the panel left its list 8px to 10px high at 568x320.
  { width: 568, height: 320 },
  { width: 640, height: 360 },
  { width: 667, height: 375 },
  { width: 740, height: 360 },
];
// A list with room for two options at least (the options are 44px each), so the panel is not a header bar only.
const MIN_LIST_HEIGHT_PX = 2 * MIN_TOUCH_PX;
const FONTS = [
  { name: 'normal', isLarge: false },
  { name: 'larger', isLarge: true },
];

for (const phone of SHORT_PHONES) {
  for (const { name, isLarge } of FONTS) {
    test.describe(`the accessibility panel at ${phone.width}x${phone.height} with the ${name} font`, () => {
      test.use({ viewport: phone, hasTouch: true, isMobile: true, deviceScaleFactor: 1, userAgent: TOUCH_AGENT });

      test('stays inside the window and its Texto maior switch can be reached and pressed', async ({ page }) => {
        test.slow();
        if (isLarge) await enableLargeFont(page);
        await openHome(page);
        await page.getByRole('button', { name: A11Y_TRIGGER_NAME }).tap();
        const panel = page.getByRole('dialog', { name: 'Opções de acessibilidade' });
        await expect(panel).toBeVisible();
        // With an option on the panel shows its reset row too, which makes it taller: the worst case for the window.
        await panel.getByRole('button', { name: /Sublinhar links/ }).tap();
        await expect(panel.getByRole('button', { name: /Resetar tudo/ })).toBeVisible();
        await waitForStableBox(panel);

        const box = await panel.boundingBox();
        expect(box?.y ?? -1, 'panel top is inside the window').toBeGreaterThanOrEqual(0);
        expect((box?.y ?? 0) + (box?.height ?? 0), 'panel bottom is inside the window').toBeLessThanOrEqual(phone.height);

        await expectPanelClearsControls(page, panel, box);

        await expectPointerReachesControls(page, panel);

        const largeFont = panel.getByRole('button', { name: /Texto maior/ });
        await largeFont.scrollIntoViewIfNeeded();
        await expect(largeFont).toBeVisible();
        await expect(largeFont).toHaveAttribute('aria-pressed', String(isLarge));
        const optionBox = await largeFont.boundingBox();
        expect(optionBox?.y ?? -1, 'the switch is inside the window').toBeGreaterThanOrEqual(0);
        expect((optionBox?.y ?? 0) + (optionBox?.height ?? 0), 'the switch is inside the window').toBeLessThanOrEqual(phone.height);
        expect(optionBox?.height ?? 0, 'the switch is a 44px target').toBeGreaterThanOrEqual(MIN_TOUCH_PX - TOUCH_ROUNDING_PX);

        await largeFont.tap();
        await expect(largeFont).toHaveAttribute('aria-pressed', String(!isLarge));

        // Escape from inside the panel closes it and the focus goes back to the button that opened it.
        await panel.getByRole('button', { name: /Texto maior/ }).focus();
        await page.keyboard.press('Escape');
        await expect(panel).toHaveCount(0);
        await expect(page.getByRole('button', { name: A11Y_TRIGGER_NAME })).toBeFocused();

        // Open again: the WhatsApp button can be clicked while the panel is open.
        await page.getByRole('button', { name: A11Y_TRIGGER_NAME }).tap();
        await expect(panel).toBeVisible();
        await waitForStableBox(panel);
        await expectWhatsAppClickWithPanelOpen(page);
      });
    });
  }
}

// The title bar of the hero panel wraps in three ways (the title alone on the first row, or with the status, or all on
// one row), and where it wraps depends on the width and on the font. At every integer width from 270 to 440 the 52px
// pause button must not enter the title line, must not lie on the title, the dots or the status, and its disc must be
// level with the status pill when they share a row.
const PAUSE_SWEEP = { from: 270, to: 440 };

/** What the pause button of the hero panel does to its title bar at the current width, or an empty list when it is clean. */
function pauseBarProblems(page: Page, minTouch: number): Promise<string[]> {
  return page.evaluate((min) => {
    const button = document.querySelector('[data-flow-window] button[aria-label="Pausar animação"]') as HTMLElement;
    const bar = button.parentElement?.parentElement as HTMLElement;
    const [, title, status] = Array.from(bar.children).filter((child) => !child.contains(button)) as HTMLElement[];
    const own = button.getBoundingClientRect();
    const disc = (button.firstElementChild as HTMLElement).getBoundingClientRect();
    const titleBox = title.getBoundingClientRect();
    const pill = status.getBoundingClientRect();
    const problems: string[] = [];
    if (own.width < min || own.height < min) problems.push(`box ${own.width.toFixed(1)}x${own.height.toFixed(1)}`);
    const isTitleAbove = titleBox.bottom < own.top + own.height / 2;
    if (isTitleAbove && titleBox.bottom - own.top > 0.5) problems.push(`enters the title line by ${(titleBox.bottom - own.top).toFixed(1)}px`);
    const isOnPillRow = pill.top < own.bottom && pill.bottom > own.top && Math.abs(pill.y + pill.height / 2 - (own.y + own.height / 2)) < own.height;
    const offset = disc.y + disc.height / 2 - (pill.y + pill.height / 2);
    if (isOnPillRow && Math.abs(offset) > 0.5 && Math.abs(offset) < own.height / 2) problems.push(`disc ${offset.toFixed(1)}px off the pill`);
    return problems;
  }, minTouch);
}

for (const { name, isLarge } of FONTS) {
  test(`keeps the hero pause button clear of its title bar at every width from ${PAUSE_SWEEP.from} to ${PAUSE_SWEEP.to} with the ${name} font`, async ({ page }) => {
    test.slow();
    if (isLarge) await enableLargeFont(page);
    await page.setViewportSize({ width: PAUSE_SWEEP.to, height: 800 });
    await openHome(page);
    const failures: string[] = [];
    for (let width = PAUSE_SWEEP.from; width <= PAUSE_SWEEP.to; width += 1) {
      await page.setViewportSize({ width, height: 800 });
      await scrollPanelFlat(page);
      const problems = [...(await pauseBarProblems(page, MIN_TOUCH_PX - TOUCH_ROUNDING_PX)), ...(await measurePauseOverlaps(page))];
      if (problems.length > 0) failures.push(`${width}px: ${problems.join(', ')}`);
    }

    expect(failures).toEqual([]);
  });
}
