import type { Page } from '@playwright/test';
import { ACCENT_RGB, HOURS_PILL_NAME, choosePillOption as choose } from './homeSupport';
import { expect, test } from './n8nGuard';

const ROWS_LIST_NAME = 'Passos da automação';
const TASK_PILL_NAME = /^Tarefa/;
// The toggle keeps one name for good, and aria-pressed carries its state.
const PAUSE_NAME = 'Pausar animação';
const ROW_COUNT = 4;
const TASK_OPTIONS = ['atendimento no WhatsApp', 'emissão de notas', 'follow-up de vendas', 'planilha e WhatsApp'];
const LONG_OPTION = 'atendimento no WhatsApp';
const KICKER_TEXT = 'automação e IA para empresas';
const WHITE_RGB = 'rgb(255, 255, 255)';
// Sub pixel rounding of boxes.
const OVERFLOW_TOLERANCE_PX = 0;
const BASELINE_TOLERANCE_PX = 1;
const LAYOUT_TOLERANCE_PX = 1;
const TILT_FLAT_DEG = 0.5;
const TILT_LEANING_DEG = 1;
const READING_POSITION = 0.3;
const BEAT_MS = 1400;
// A beat of the cycle and a little more, so the interval of the page has fired once.
const ONE_BEAT_MS = BEAT_MS + 100;
const MANY_BEATS_MS = 10_000;
// The cycle has 5 beats (0 to 4 rows done) and the fifth starts over: a whole lap, with a beat to spare.
const FULL_LAP_MS = 6 * BEAT_MS;
const CYCLE_LENGTH = ROW_COUNT + 1;
// How far ahead of the page clock the clock is frozen: far enough that real time cannot overtake it first.
const FREEZE_LEAD_MS = 5000;
const MAX_TABS_TO_PAUSE_BUTTON = 60;
const PHONE_WIDTHS = [280, 360, 412];
const PHONE_LANDSCAPE = { width: 844, height: 390 };

function heading(page: Page) {
  return page.getByRole('heading', { level: 1 });
}

function flowRows(page: Page) {
  return page.getByRole('list', { name: ROWS_LIST_NAME }).getByRole('listitem');
}

function doneRows(page: Page) {
  return page.locator('[data-flow-window] [data-state="done"]');
}

/** The status word in the title bar of the window (a whole word, so "rodando" never matches the group name). */
function windowStatus(page: Page, word: string) {
  return page.locator('[data-flow-window]').getByText(word, { exact: true });
}

async function doneCount(page: Page): Promise<number> {
  return doneRows(page).count();
}

/**
 * Opens the home with a fake clock that stops once the panel is on screen. The page loads with the clock flowing, as
 * Playwright advises, so the timers of the page run normally while it loads. Then the clock is frozen: from there on
 * only runFor and fastForward move it, and the cycle cannot advance because of a slow runner. How many rows are done
 * at that moment depends on the load, so a test reads it as its starting point and never assumes a number.
 */
async function openWithFrozenClock(page: Page) {
  await page.clock.install();
  await page.goto('/');
  await expect(flowRows(page)).toHaveCount(ROW_COUNT);
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(now + FREEZE_LEAD_MS);
}

/** Waits one macrotask in the page, which comes after any render React had queued (its scheduler uses a message channel). */
async function flushRender(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = () => resolve();
        channel.port2.postMessage(null);
      }),
  );
}

function pulse(page: Page) {
  return page.locator('[data-flow-window] .vn-cable-pulse').first();
}

async function pageOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

async function scrollPanelToReadingPosition(page: Page) {
  await page.evaluate((fraction) => {
    const panel = document.querySelector('[data-flow-window]') as HTMLElement;
    const top = panel.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top - Math.round(window.innerHeight * fraction), behavior: 'instant' });
  }, READING_POSITION);
}

/** The rotateX of the tilted layer, in degrees, read from its computed matrix (scale and perspective do not touch it). */
async function readTiltDegrees(page: Page): Promise<number> {
  return page.evaluate(() => {
    const layer = document.querySelector('[data-flow-tilt]') as HTMLElement;
    const { transform } = getComputedStyle(layer);
    if (transform === 'none') return 0;
    const values = transform.replace(/^matrix3d\(|\)$/g, '').split(',').map(Number);
    return (Math.atan2(values[6], values[5]) * 180) / Math.PI;
  });
}

interface PillMeasure {
  /** How many lines the text of the task pill takes. */
  lines: number;
  /** The text line of the period against the last text line of the pill, top and bottom, in px (0 when aligned). */
  offsetTop: number;
  offsetBottom: number;
}

/** Where the period after the task pill sits against the last line of the text of the pill. */
async function measureTaskPill(page: Page): Promise<PillMeasure> {
  return page.getByRole('button', { name: TASK_PILL_NAME }).evaluate((pill) => {
    const textRects = (element: Element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return Array.from(range.getClientRects()).filter((rect) => rect.width > 0);
    };
    const pillLines = textRects(pill.querySelector('span') as HTMLElement);
    const lastLine = pillLines[pillLines.length - 1];
    const period = textRects(pill.closest('[data-reveal-item]')?.lastElementChild as Element)[0];
    return {
      lines: new Set(pillLines.map((rect) => Math.round(rect.top))).size,
      offsetTop: period.top - lastLine.top,
      offsetBottom: period.bottom - lastLine.bottom,
    };
  });
}

async function enableLargeFont(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('a11y-preferences', JSON.stringify({ fontSize: true }));
  });
}

/** The gap between the bottom of the fixed header and the top of the kicker: negative when the header covers it. */
async function gapBelowHeader(page: Page): Promise<number> {
  const header = await page.getByRole('banner').boundingBox();
  const kicker = await page.getByText(KICKER_TEXT).boundingBox();
  if (!header || !kicker) throw new Error('the header or the kicker has no box');
  return kicker.y - (header.y + header.height);
}

test.describe('hero sentence and panel', () => {
  test('shows the sentence as the page heading', async ({ page }) => {
    await page.goto('/');

    await expect(heading(page)).toBeVisible();
    await expect(heading(page)).toContainText('Sua equipe perde');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test('updates the result to R$ 6.933 when the hours change to 40', async ({ page }) => {
    await page.goto('/');

    await choose(page, HOURS_PILL_NAME, '40 horas');

    await expect(heading(page)).toContainText(/R\$\s6\.933/);
    // The visible number counts up to the same value.
    await expect(heading(page).locator('[data-value]')).toHaveAttribute('data-value', /R\$\s6\.933/);
  });

  test('shows "Nota emitida" in the panel when the task changes to invoice issuing', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('list', { name: ROWS_LIST_NAME }).getByText('Planilha atualizada')).toBeVisible();

    await choose(page, TASK_PILL_NAME, 'emissão de notas');

    await expect(page.getByRole('list', { name: ROWS_LIST_NAME }).getByText('Nota emitida')).toBeVisible();
    await expect(page.getByRole('list', { name: ROWS_LIST_NAME }).getByText('Planilha atualizada')).toHaveCount(0);
  });

  test('has no horizontal overflow, at the top and with the panel in the reading position', async ({ page }) => {
    await page.goto('/');
    await expect(heading(page)).toBeVisible();
    expect(await pageOverflow(page)).toBeLessThanOrEqual(OVERFLOW_TOLERANCE_PX);

    await scrollPanelToReadingPosition(page);

    expect(await pageOverflow(page)).toBeLessThanOrEqual(OVERFLOW_TOLERANCE_PX);
  });

  // Regression: the pill used to be capped at a percentage of its own item (pill plus period), a few pixels
  // under the width its text needs, so even the default option wrapped on a line wide enough for it.
  test('keeps every option of the task pill on one line in the wide column, the period on its baseline, and never overflows', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'a phone wraps the long options by design');

    await page.goto('/');
    for (const option of TASK_OPTIONS) {
      await choose(page, TASK_PILL_NAME, option);

      const { lines, offsetTop, offsetBottom } = await measureTaskPill(page);
      expect(lines, option).toBe(1);
      expect(Math.abs(offsetTop), option).toBeLessThanOrEqual(BASELINE_TOLERANCE_PX);
      expect(Math.abs(offsetBottom), option).toBeLessThanOrEqual(BASELINE_TOLERANCE_PX);
      expect(await pageOverflow(page)).toBeLessThanOrEqual(OVERFLOW_TOLERANCE_PX);
    }
  });

  // On a phone the long option wraps inside the pill: the period has to stay on the last line of its text, and
  // the page must not grow sideways. Measured at the narrowest and at two usual widths.
  for (const width of PHONE_WIDTHS) {
    test(`keeps the period on the last text line of a wrapped task pill, with no overflow, at ${width}px`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'mobile', 'this is the phone check');

      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      await choose(page, TASK_PILL_NAME, LONG_OPTION);

      const { lines, offsetTop, offsetBottom } = await measureTaskPill(page);
      expect(lines).toBeGreaterThan(1);
      expect(Math.abs(offsetTop)).toBeLessThanOrEqual(BASELINE_TOLERANCE_PX);
      expect(Math.abs(offsetBottom)).toBeLessThanOrEqual(BASELINE_TOLERANCE_PX);
      expect(await pageOverflow(page)).toBeLessThanOrEqual(OVERFLOW_TOLERANCE_PX);
    });
  }

  test('marks the rows done one after another while motion is on', async ({ page }) => {
    await page.goto('/');

    await expect(flowRows(page).first()).toHaveAttribute('data-state', 'done');
    await expect(flowRows(page).nth(1)).toHaveAttribute('data-state', 'done');
  });

  test('has exactly one element in the accent inside the hero: the result pill', async ({ page }) => {
    await page.goto('/');
    await expect(heading(page)).toBeVisible();

    const accents = await page.evaluate((accent) => {
      const hero = document.querySelector('main section') as HTMLElement;
      return Array.from(hero.querySelectorAll('*'))
        .filter((element) => {
          const style = getComputedStyle(element);
          return (
            style.color === accent ||
            style.backgroundColor === accent ||
            style.borderTopColor === accent ||
            style.fill === accent ||
            style.stroke === accent
          );
        })
        .map((element) => (element as HTMLElement).className);
    }, ACCENT_RGB);

    expect(accents).toHaveLength(1);
    expect(accents[0]).toContain('bg-vn-accent');
  });

  test('leans the panel back at the top of the page and lies it flat once it is scrolled to', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-flow-tilt]')).toBeAttached();

    expect(Math.abs(await readTiltDegrees(page))).toBeGreaterThan(TILT_LEANING_DEG);

    await scrollPanelToReadingPosition(page);

    await expect.poll(async () => Math.abs(await readTiltDegrees(page))).toBeLessThan(TILT_FLAT_DEG);
  });

  test('opens the pill list with a tap on a phone', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'this is the touch check');

    await page.goto('/');
    const pill = page.getByRole('button', { name: TASK_PILL_NAME });
    const list = page.getByRole('listbox', { name: 'Tarefa' });
    // Retry safe: a tap that did not open the list is tapped again, a list already open is not tapped shut.
    await expect(async () => {
      if (!(await list.isVisible())) await pill.tap();
      await expect(list).toBeVisible({ timeout: 2000 });
    }).toPass();
    await expect(list.getByRole('option')).toHaveCount(4);
  });

  test('reaches the contact and method anchors from the two calls to action', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('link', { name: 'Quero automatizar' })).toHaveAttribute('href', '/#contato');
    await expect(page.getByRole('link', { name: 'Ver como funciona' })).toHaveAttribute('href', '/#metodo');
  });
});

test.describe('hero layout', () => {
  test('starts the content below the fixed header', async ({ page }) => {
    await page.goto('/');
    await expect(heading(page)).toBeVisible();

    expect(await gapBelowHeader(page)).toBeGreaterThanOrEqual(LAYOUT_TOLERANCE_PX);
  });

  test('starts the content below the fixed header with the large font', async ({ page }) => {
    await enableLargeFont(page);
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/a11y-font-large/);
    await expect(heading(page)).toBeVisible();

    expect(await gapBelowHeader(page)).toBeGreaterThanOrEqual(LAYOUT_TOLERANCE_PX);
  });

  test('starts the content below the shorter, lifted header of a phone held sideways', async ({ page }) => {
    await page.setViewportSize(PHONE_LANDSCAPE);
    await page.goto('/');
    await expect(heading(page)).toBeVisible();

    expect(await gapBelowHeader(page)).toBeGreaterThanOrEqual(LAYOUT_TOLERANCE_PX);
    expect(await pageOverflow(page)).toBeLessThanOrEqual(OVERFLOW_TOLERANCE_PX);
  });

  test('puts the annotation under the sentence at its right side, arrow rising and unflipped, from lg up', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'the annotation is shown from the lg breakpoint');

    await page.goto('/');
    const note = page.locator('[data-hero-annotation]');
    await expect(note).toBeVisible();

    const noteBox = await note.boundingBox();
    const headingBox = await heading(page).boundingBox();
    const subBox = await page.getByText(/^A gente mapeia/).boundingBox();
    if (!noteBox || !headingBox || !subBox) throw new Error('missing box');
    expect(noteBox.y).toBeGreaterThanOrEqual(headingBox.y + headingBox.height - LAYOUT_TOLERANCE_PX);
    expect(noteBox.y + noteBox.height).toBeLessThanOrEqual(subBox.y + LAYOUT_TOLERANCE_PX);
    expect(noteBox.x + noteBox.width).toBeGreaterThan(headingBox.x + headingBox.width - 40);
    const transform = await note.locator('svg').evaluate((svg) => {
      let node: Element | null = svg;
      const seen: string[] = [];
      while (node && node.tagName !== 'SECTION') {
        seen.push(getComputedStyle(node).transform, getComputedStyle(node).scale);
        node = node.parentElement;
      }
      return seen;
    });
    expect(transform.every((value) => value === 'none')).toBe(true);
  });

  test('hides the annotation below lg', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'a phone is below lg');

    await page.goto('/');

    await expect(page.locator('[data-hero-annotation]')).toBeHidden();
  });
});

test.describe('hero pause control', () => {
  test('pauses the rows and the cable with the button in the title bar, and resumes them', async ({ page }) => {
    await openWithFrozenClock(page);
    const start = await doneCount(page);
    await page.clock.runFor(ONE_BEAT_MS);
    await expect.poll(() => doneCount(page)).not.toBe(start);
    await expect.poll(() => pulse(page).evaluate((node) => getComputedStyle(node).animationPlayState)).toBe('running');
    await expect(windowStatus(page, 'rodando')).toBeVisible();

    const toggle = page.getByRole('button', { name: PAUSE_NAME });
    await toggle.click();

    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: PAUSE_NAME })).toHaveCount(1);
    await expect(windowStatus(page, 'pausado')).toBeVisible();
    await expect(windowStatus(page, 'rodando')).toHaveCount(0);
    await expect(page.locator('[data-flow-window]')).toHaveAttribute('data-paused', 'true');
    await expect.poll(() => pulse(page).evaluate((node) => getComputedStyle(node).animationPlayState)).toBe('paused');
    // The count stays the same however far the clock goes.
    const paused = await doneCount(page);
    await page.clock.runFor(MANY_BEATS_MS);
    await flushRender(page);
    expect(await doneCount(page)).toBe(paused);

    await toggle.click();

    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(windowStatus(page, 'rodando')).toBeVisible();
    await expect(windowStatus(page, 'pausado')).toHaveCount(0);
    await expect(page.locator('[data-flow-window]')).not.toHaveAttribute('data-paused', 'true');
    await expect.poll(() => pulse(page).evaluate((node) => getComputedStyle(node).animationPlayState)).toBe('running');
    // Resuming starts a new interval, so exactly one beat is due within a beat and a little more.
    await page.clock.runFor(ONE_BEAT_MS);
    await expect.poll(() => doneCount(page)).toBe((paused + 1) % CYCLE_LENGTH);
  });

  test('keeps running while the pointer is over the panel', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'this needs a pointer that hovers');

    await openWithFrozenClock(page);
    const before = await doneCount(page);
    await page.getByRole('list', { name: ROWS_LIST_NAME }).hover();

    await expect(page.locator('[data-flow-window]')).not.toHaveAttribute('data-paused', 'true');
    await page.clock.runFor(ONE_BEAT_MS);
    await flushRender(page);

    await expect.poll(() => doneCount(page)).toBe((before + 1) % CYCLE_LENGTH);
    await expect(page.locator('[data-flow-window]')).not.toHaveAttribute('data-paused', 'true');
    await expect.poll(() => pulse(page).evaluate((node) => getComputedStyle(node).animationPlayState)).toBe('running');
  });

  test('keeps the pause when the pointer comes and goes', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'this needs a pointer that hovers');

    await openWithFrozenClock(page);
    const before = await doneCount(page);
    await page.getByRole('button', { name: PAUSE_NAME }).click();
    const rows = page.getByRole('list', { name: ROWS_LIST_NAME });

    await rows.hover();
    await page.mouse.move(0, 0);
    await page.clock.runFor(MANY_BEATS_MS);
    await flushRender(page);

    await expect(page.locator('[data-flow-window]')).toHaveAttribute('data-paused', 'true');
    expect(await doneCount(page)).toBe(before);
  });

  test('is reached and operated with the keyboard, with a white focus ring on the dark title bar', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'the tab order is checked on the desktop project');

    await page.goto('/');
    await expect(flowRows(page)).toHaveCount(ROW_COUNT);
    const pause = page.getByRole('button', { name: PAUSE_NAME });
    for (let press = 0; press < MAX_TABS_TO_PAUSE_BUTTON; press += 1) {
      if (await pause.evaluate((node) => node === document.activeElement)) break;
      await page.keyboard.press('Tab');
    }

    await expect(pause).toBeFocused();
    await expect(pause).toHaveCSS('outline-style', 'solid');
    await expect(pause).toHaveCSS('outline-width', '2px');
    await expect(pause).toHaveCSS('outline-color', WHITE_RGB);
    await page.keyboard.press('Space');
    await expect(pause).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Enter');
    await expect(pause).toHaveAttribute('aria-pressed', 'false');
  });

  test('has a 44px hit area', async ({ page }) => {
    await page.goto('/');

    // The layout size, not the bounding box: the panel leans and shrinks a little at the top of the page.
    const [width, height] = await page
      .getByRole('button', { name: PAUSE_NAME })
      .evaluate((node) => [(node as HTMLElement).offsetWidth, (node as HTMLElement).offsetHeight]);
    expect(width).toBeGreaterThanOrEqual(44);
    expect(height).toBeGreaterThanOrEqual(44);
  });
});

test.describe('hero with reduced motion', () => {
  // Not a top level option: Playwright Test ignores `reducedMotion` there without a word, so it goes in contextOptions.
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('shows the four rows already done, with no tilt and no pause control', async ({ page }) => {
    await page.goto('/');

    await expect(flowRows(page)).toHaveCount(ROW_COUNT);
    for (let index = 0; index < ROW_COUNT; index += 1) {
      await expect(flowRows(page).nth(index)).toHaveAttribute('data-state', 'done');
    }
    await expect(page.locator('[data-flow-tilt]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: PAUSE_NAME })).toHaveCount(0);
    await expect(windowStatus(page, 'rodando')).toBeVisible();
  });

  // The real guard that no timer exists in this mode is the unit test (vi.getTimerCount() is 0). Here the clock
  // runs a whole lap of the cycle, with every due timer fired, and the page must show the same static state.
  test('keeps the four rows done, with no running step and no pause control, through a whole lap of the clock', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    await expect(flowRows(page)).toHaveCount(ROW_COUNT);

    await page.clock.runFor(FULL_LAP_MS);
    await flushRender(page);

    await expect(doneRows(page)).toHaveCount(ROW_COUNT);
    await expect(page.locator('[data-flow-window] [data-active="true"]')).toHaveCount(0);
    await expect(page.locator('[data-flow-window]')).not.toHaveAttribute('data-paused', 'true');
    await expect(page.getByRole('button', { name: PAUSE_NAME })).toHaveCount(0);
  });
});
