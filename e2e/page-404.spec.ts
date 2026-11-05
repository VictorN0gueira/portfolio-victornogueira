import type { Page } from '@playwright/test';
import { A11Y_STORAGE_KEY, PAGE_LOAD_TIMEOUT_MS } from './homeSupport';
import { expect, test } from './n8nGuard';
import { describePageContract, openPage, type PageContract } from './pageContract';

const UNKNOWN_PATH = '/rota-que-nao-existe';
const TITLE = 'Página não encontrada';
const CONTRACT: PageContract = {
  path: UNKNOWN_PATH,
  title: /^Página não encontrada/,
  h1: /página não encontrada/i,
  hasFloatingClearance: true,
  isNoindex: true,
};
const GLITCH_LAYERS = ['.vn-glitch-a', '.vn-glitch-b'];
// The layers rest fully clipped: nothing of them is drawn.
const CLIPPED_AWAY = /inset\(0px 0px 100%/;
// The widths where the title sits close to a line break: the width of a scrambled frame used to flip it between 1 and 2 lines.
const JITTER_WIDTHS = [390, 412, 430];
const SAMPLE_WINDOW_MS = 2200;
const MAX_LAYOUT_SHIFT = 0.01;
const LANDSCAPE = { width: 844, height: 390 };
// WCAG 2.2.2: what moves by itself for more than 5 seconds needs a way to stop. These two stop by themselves before it.
const ONLY_IN_DESKTOP = 'the test sets its own viewport: it runs once, in the desktop project';
const SELF_STOPPING = ['vn-blink', 'vn-glitch-a', 'vn-glitch-b'];
const SELF_STOP_LIMIT_MS = 6000;
const MOVEMENT_LIMIT_MS = 5000;
const RUNNING_TIMEOUT_MS = 5000;

/** The animation a layer or the cursor runs, as the browser computed it. */
function animationOf(page: Page, selector: string): Promise<string> {
  return page
    .locator(selector)
    .first()
    .evaluate((element) => getComputedStyle(element).animationName);
}

interface FrameSample {
  height: number;
  top: number;
  text: string;
  inner: string;
  hasFrame: boolean;
}

interface TitleRun {
  samples: FrameSample[];
  layoutShift: number;
}

/** Watches the layout shifts of the page from before it runs (the entries come from a PerformanceObserver). */
async function observeLayoutShift(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const store = window as unknown as { __shift: number };
    store.__shift = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as unknown as Array<{ value: number; hadRecentInput: boolean }>) {
        if (!entry.hadRecentInput) store.__shift += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
}

/** The h1 on every frame of the first seconds, which is when the scramble runs. */
async function sampleTitle(page: Page): Promise<TitleRun> {
  await page.goto(UNKNOWN_PATH);
  await expect(page.getByRole('heading', { level: 1 })).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT_MS });
  return page.evaluate(
    ({ windowMs, expected }) =>
      new Promise<TitleRun>((resolve) => {
        const samples: FrameSample[] = [];
        const started = performance.now();
        const read = (): void => {
          const heading = document.querySelector('h1') as HTMLElement;
          const box = heading.getBoundingClientRect();
          // Measured from the number above it: both ride the entrance of the block, so the gap is the layout.
          const anchor = (document.querySelector('.vn-chrome-text') as HTMLElement).getBoundingClientRect();
          samples.push({
            height: Math.round(box.height * 100) / 100,
            top: Math.round((box.top - anchor.top) * 100) / 100,
            text: heading.textContent ?? '',
            inner: heading.innerText,
            hasFrame: heading.querySelector('[data-scramble]') !== null || heading.textContent !== expected,
          });
          if (performance.now() - started < windowMs) requestAnimationFrame(read);
          else resolve({ samples, layoutShift: (window as unknown as { __shift: number }).__shift });
        };
        read();
      }),
    { windowMs: SAMPLE_WINDOW_MS, expected: TITLE },
  );
}

/** Every self stopping animation of the page (the cursor and the glitch), as the browser has them now. */
function selfStoppingAnimations(page: Page): Promise<string[]> {
  return page.evaluate(
    (names) =>
      document
        .getAnimations()
        .map((animation) => (animation as CSSAnimation).animationName)
        .filter((name) => names.includes(name)),
    SELF_STOPPING,
  );
}

test.describe('the 404 page', () => {
  describePageContract(CONTRACT);

  test('is out of the index: noindex, no canonical and no structured data', async ({ page }) => {
    await openPage(page, CONTRACT);

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
  });

  test('gives the way back to the home page', async ({ page }) => {
    await openPage(page, CONTRACT);
    await page.getByRole('link', { name: 'Voltar ao início' }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(/página não encontrada/i);
  });

  test.describe('while the title scrambles', () => {
    test('the h1 keeps one box, the block does not move and nothing shifts, at 390, 412 and 430', async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', ONLY_IN_DESKTOP);
      test.slow();
      await observeLayoutShift(page);

      for (const width of JITTER_WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        const { samples, layoutShift } = await sampleTitle(page);

        expect(
          samples.some((sample) => sample.hasFrame),
          `${width}px: the scramble was seen running`,
        ).toBe(true);
        expect(new Set(samples.map((sample) => sample.height)).size, `${width}px: one height on every frame`).toBe(1);
        expect(new Set(samples.map((sample) => sample.top)).size, `${width}px: the title does not move`).toBe(1);
        expect(layoutShift, `${width}px: layout shift`).toBeLessThan(MAX_LAYOUT_SHIFT);
        for (const sample of samples) {
          expect(sample.text, `${width}px: textContent is the title, once`).toBe(TITLE);
          // innerText follows the CSS, which lowercases the title.
          expect(sample.inner, `${width}px: innerText is the title, once`).toBe(TITLE.toLowerCase());
        }
      }
    });
  });

  test('plays the cursor and the glitch when motion is welcome, and both stop by themselves', async ({ page }) => {
    test.slow();
    await openPage(page, CONTRACT);

    await expect(page.locator('.vn-cursor').first()).toBeVisible();
    expect(await animationOf(page, '.vn-cursor')).toBe('vn-blink');
    expect(await animationOf(page, '.vn-glitch-a')).toBe('vn-glitch-a');
    expect(await animationOf(page, '.vn-glitch-b')).toBe('vn-glitch-b');

    const lengths = await page.evaluate(
      (names) =>
        document
          .getAnimations()
          .filter((animation) => names.includes((animation as CSSAnimation).animationName))
          .map((animation) => ({
            name: (animation as CSSAnimation).animationName,
            endMs: Number(animation.effect?.getComputedTiming().endTime),
          })),
      SELF_STOPPING,
    );
    expect(lengths.map((item) => item.name).sort()).toEqual(['vn-blink', 'vn-glitch-a', 'vn-glitch-b']);
    for (const { name, endMs } of lengths)
      expect(endMs, `${name} lasts at most 5 seconds`).toBeLessThanOrEqual(MOVEMENT_LIMIT_MS);

    const outcome = await page.evaluate(
      ({ names, limit }) =>
        Promise.race([
          Promise.all(
            document
              .getAnimations()
              .filter((animation) => names.includes((animation as CSSAnimation).animationName))
              .map((animation) => animation.finished),
          ).then(() => 'finished'),
          new Promise<string>((resolve) => setTimeout(() => resolve('still running'), limit)),
        ]),
      { names: SELF_STOPPING, limit: SELF_STOP_LIMIT_MS },
    );

    expect(outcome).toBe('finished');
    expect(await selfStoppingAnimations(page)).toEqual([]);
    await expect(page.locator('.vn-cursor').first()).toBeVisible();
    expect(
      await page
        .locator('.vn-cursor')
        .first()
        .evaluate((element) => getComputedStyle(element).opacity),
    ).toBe('1');
  });

  test('stops the cursor and the glitch in the middle when animations are paused', async ({ page }) => {
    test.slow();
    await openPage(page, CONTRACT);
    await expect.poll(() => selfStoppingAnimations(page), { timeout: RUNNING_TIMEOUT_MS }).toContain('vn-glitch-a');

    await page.evaluate(() => document.documentElement.classList.add('a11y-no-animations'));

    await expect.poll(() => selfStoppingAnimations(page)).toEqual([]);
    expect(await animationOf(page, '.vn-cursor')).toBe('none');
    for (const layer of GLITCH_LAYERS) expect(await animationOf(page, layer)).toBe('none');
  });

  test.describe('on a phone held sideways', () => {
    test.use({ viewport: LANDSCAPE, hasTouch: true, isMobile: true });

    test('shows the way back above the fold, with no scroll needed', async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', ONLY_IN_DESKTOP);
      await openPage(page, CONTRACT);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));

      const box = await page.getByRole('link', { name: 'Voltar ao início' }).boundingBox();

      expect(box, 'the way back has a box').not.toBeNull();
      expect(box!.y + box!.height, 'the bottom of the way back is inside the window').toBeLessThanOrEqual(
        LANDSCAPE.height,
      );
    });
  });

  test.describe('with a preference for reduced motion', () => {
    test.use({ contextOptions: { reducedMotion: 'reduce' } });

    test('shows the title at once, the cursor visible and still, and the glitch layers clipped and still', async ({
      page,
    }) => {
      await openPage(page, CONTRACT);

      await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITLE);
      await expect(page.locator('h1 [data-scramble]')).toHaveCount(0);
      await expect(page.locator('.vn-cursor').first()).toBeVisible();
      expect(await animationOf(page, '.vn-cursor')).toBe('none');
      for (const layer of GLITCH_LAYERS) {
        expect(await animationOf(page, layer)).toBe('none');
        expect(await page.locator(layer).evaluate((element) => getComputedStyle(element).clipPath)).toMatch(
          CLIPPED_AWAY,
        );
      }
    });
  });

  test.describe('with the option to pause animations', () => {
    test('shows the title at once, the cursor visible and still, and the glitch layers clipped and still', async ({
      page,
    }) => {
      await page.addInitScript((key) => {
        localStorage.setItem(key, JSON.stringify({ noAnimations: true }));
      }, A11Y_STORAGE_KEY);
      await openPage(page, CONTRACT);

      await expect(page.locator('html')).toHaveClass(/a11y-no-animations/);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITLE, { timeout: PAGE_LOAD_TIMEOUT_MS });
      await expect(page.locator('h1 [data-scramble]')).toHaveCount(0);
      expect(await animationOf(page, '.vn-cursor')).toBe('none');
      for (const layer of GLITCH_LAYERS) {
        expect(await animationOf(page, layer)).toBe('none');
        expect(await page.locator(layer).evaluate((element) => getComputedStyle(element).clipPath)).toMatch(
          CLIPPED_AWAY,
        );
      }
    });
  });
});
