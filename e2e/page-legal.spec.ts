import type { Locator, Page } from '@playwright/test';
import { legalCopy } from '../src/data/legalCopy';
import { ANCHOR_BOUNDS } from './headerBounds';
import { PAGE_LOAD_TIMEOUT_MS, brokenWordsIn, enableLargeFont, measureOverflow, nextFrames } from './homeSupport';
import { expect, test } from './n8nGuard';
import { describePageContract, openPage, type PageContract } from './pageContract';

// /privacidade and /lgpd: the frozen legal pages inside the editorial frame (src/pages/legal). The text cannot change, so
// everything the frame does is proved from the outside: the table of contents, the sticky column, the focus, and that the
// CSS reaches the classes of the old markup (computed styles, not the source).

const PRIVACY: PageContract = {
  path: '/privacidade',
  title: /^Política de Privacidade/,
  h1: 'Política de Privacidade',
  readyHeading: '1. Quem é o controlador',
  hasFloatingClearance: true,
};
const LGPD: PageContract = {
  path: '/lgpd',
  title: /^LGPD/,
  h1: 'LGPD',
  readyHeading: 'Victor Nogueira',
  hasFloatingClearance: true,
};
const PAGES = [PRIVACY, LGPD];

const ONLY_IN_DESKTOP = 'the test sets its own viewport: it runs once, in the desktop project';
const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };
const NARROWEST = { width: 280, height: 560 };
const TOC_NAV = `nav[aria-label="${legalCopy.tocLabel}"]`;
const STICKY_TOP_PX = 112;
const POSITION_TOLERANCE_PX = 1.5;
const SCROLL_STEP_PX = 1600;
const PRIVACY_HASH_TARGET = '7-seus-direitos-art-18-da-lgpd';
const TITLES = 'h1, h2, h3';
// The palette of the site as the browser reports a computed color: white, cream, gray light, mid and dark, ink and black.
const PALETTE_RGB = new Set([
  'rgb(255, 255, 255)',
  'rgb(242, 242, 242)',
  'rgb(199, 199, 199)',
  'rgb(138, 138, 138)',
  'rgb(77, 77, 77)',
  'rgb(26, 26, 26)',
  'rgb(10, 10, 10)',
]);
const TRANSPARENT = 'rgba(0, 0, 0, 0)';
const INK_RGB = 'rgb(26, 26, 26)';
const WHITE_RGB = 'rgb(255, 255, 255)';
const MIN_SMALL_PRINT_PX = 12;
// A scroll has settled when the top of the title did not move for this many frames in a row (about 200ms).
const SETTLED_FRAMES = 12;
const SETTLE_TIMEOUT_MS = 8000;
const MAX_BODY_SHIFT = 0.01;

// An id may start with a digit ("7-seus-direitos"), which a #selector cannot.
const byId = (page: Page, id: string) => page.locator(`[id="${id}"]`);
const tocLinks = (page: Page) => page.locator(`${TOC_NAV} a`);

/**
 * Where the top of the title is once the scroll to it has finished: sampled every frame until it holds still. Reading it
 * while the scroll is still going (or polling until it is first inside the bounds) says nothing about where it lands.
 */
function settledTop(heading: Locator): Promise<number> {
  return heading.evaluate(
    (element, { frames, timeout }) =>
      new Promise<number>((resolve, reject) => {
        const startedAt = performance.now();
        let last = Number.NaN;
        let still = 0;
        const sample = () => {
          const top = element.getBoundingClientRect().top;
          still = top === last ? still + 1 : 0;
          last = top;
          if (still >= frames) resolve(top);
          else if (performance.now() - startedAt > timeout) reject(new Error('the scroll never settled'));
          else requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      }),
    { frames: SETTLED_FRAMES, timeout: SETTLE_TIMEOUT_MS },
  );
}

/** The first, a middle and the last entry of the contents: the ones a jump is most likely to get wrong. */
async function entriesToTry(page: Page): Promise<number[]> {
  const count = await tocLinks(page).count();
  return [...new Set([0, Math.floor(count / 2), count - 1])];
}

/** The title under the header, and not past it: both bounds on the position it settled at. */
function expectJustBelowHeader(top: number, label: string): void {
  expect(top, `${label}: below the header`).toBeGreaterThan(ANCHOR_BOUNDS.minTopPx);
  expect(top, `${label}: not far down the screen`).toBeLessThan(ANCHOR_BOUNDS.maxTopPx);
}

interface ShiftRecord {
  value: number;
  /** The shift moved a part of the legal text or of its contents (not the footer, which a lazy page moves site wide). */
  isPageBody: boolean;
}

/** Records the layout shifts from the first paint in window.__legalShifts, telling the ones that touch the page body. */
async function watchShifts(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const shifts: Array<{ value: number; isPageBody: boolean }> = [];
    (window as unknown as { __legalShifts: typeof shifts }).__legalShifts = shifts;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as unknown as Array<{
        value: number;
        hadRecentInput: boolean;
        sources: Array<{ node: Node | null }>;
      }>) {
        if (entry.hadRecentInput) continue;
        const isPageBody = entry.sources.some(({ node }) => {
          const element = node instanceof Element ? node : (node?.parentElement ?? null);
          return element?.closest('[data-legal-body], nav[aria-label]') != null;
        });
        shifts.push({ value: entry.value, isPageBody });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
}

const readShifts = (page: Page): Promise<ShiftRecord[]> =>
  page.evaluate(() => (window as unknown as { __legalShifts: ShiftRecord[] }).__legalShifts.slice());

test.describe('/privacidade and /lgpd', () => {
  for (const contract of PAGES) {
    describePageContract(contract);
  }
});

test.describe('the frame of the legal pages', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', ONLY_IN_DESKTOP);
    await page.setViewportSize(DESKTOP);
  });

  for (const contract of PAGES) {
    test(`${contract.path}: the contents stay put while the text scrolls, at 1440`, async ({ page }) => {
      await page.setViewportSize(DESKTOP);
      await openPage(page, contract);
      const nav = page.locator(TOC_NAV);
      await expect(nav).toBeVisible();
      expect(await nav.evaluate((element) => getComputedStyle(element).position)).toBe('sticky');
      expect(await page.locator(`${TOC_NAV} details`).count(), 'a column, not a folded list').toBe(0);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await nextFrames(page);

      for (const offset of [SCROLL_STEP_PX / 4, SCROLL_STEP_PX / 2]) {
        await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), offset);
        await nextFrames(page);
        const top = await nav.evaluate((element) => element.getBoundingClientRect().top);
        expect(Math.abs(top - STICKY_TOP_PX), `top of the contents at scroll ${offset}`).toBeLessThanOrEqual(
          POSITION_TOLERANCE_PX,
        );
      }
      await page.screenshot({ path: `e2e/__shots__/legal-sticky-${contract.path.slice(1)}-1440x900.png` });
    });

    test(`${contract.path}: a click on the contents puts the title under the header and keeps focus on it, at 1440`, async ({
      page,
    }) => {
      await page.setViewportSize(DESKTOP);
      await openPage(page, contract);

      for (const index of await entriesToTry(page)) {
        const link = tocLinks(page).nth(index);
        const href = (await link.getAttribute('href')) ?? '';
        await link.click();

        const heading = byId(page, href.slice(1));
        await expect(heading).toBeFocused();
        expectJustBelowHeader(await settledTop(heading), `${contract.path} entry ${index}`);
        await expect(link).toHaveAttribute('aria-current', 'location');
        expect(new URL(page.url()).hash).toBe(href);
        expect(new URL(page.url()).pathname).toBe(contract.path);
      }
    });

    test(`${contract.path}: the contents do not push the text when they appear, at 390`, async ({ page }) => {
      await page.setViewportSize(PHONE);
      await watchShifts(page);
      await page.goto(contract.path);
      await expect(page.locator(`${TOC_NAV} summary`)).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT_MS });
      await page.evaluate(() => document.fonts.ready);
      await nextFrames(page);
      await nextFrames(page);

      const shifts = (await readShifts(page)).filter((shift) => shift.isPageBody);

      expect(
        shifts.reduce((sum, shift) => sum + shift.value, 0),
        `layout shifts of the page body: ${shifts.map((shift) => shift.value).join(', ')}`,
      ).toBeLessThan(MAX_BODY_SHIFT);
    });

    test(`${contract.path}: marks the section being read while scrolling, one at a time, at 1440`, async ({ page }) => {
      await page.setViewportSize(DESKTOP);
      await openPage(page, contract);
      await page.evaluate(() =>
        window.scrollTo({ top: document.documentElement.scrollHeight / 2, behavior: 'instant' }),
      );

      await expect(page.locator(`${TOC_NAV} a[aria-current="location"]`)).toHaveCount(1);
    });

    test(`${contract.path}: the contents are a folded list above the text at 390, and a choice closes it and lands on the title`, async ({
      page,
    }) => {
      await page.setViewportSize(PHONE);
      await openPage(page, contract);
      const details = page.locator(`${TOC_NAV} details`);
      await expect(details).toHaveCount(1);
      await expect(details).not.toHaveAttribute('open', '');
      await page.screenshot({ path: `e2e/__shots__/legal-folded-${contract.path.slice(1)}-390x844.png` });

      for (const index of await entriesToTry(page)) {
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        await details.locator('summary').click();
        await expect(details).toHaveAttribute('open', '');
        const link = tocLinks(page).nth(index);
        const box = await link.boundingBox();
        expect(box?.height ?? 0, 'a row is a 44px target').toBeGreaterThanOrEqual(44 - 0.01);
        const id = ((await link.getAttribute('href')) ?? '').slice(1);
        await link.click();

        await expect(details).not.toHaveAttribute('open', '');
        await expect(byId(page, id)).toBeFocused();
        expectJustBelowHeader(await settledTop(byId(page, id)), `${contract.path} entry ${index} at 390`);
      }
    });
  }

  test('/privacidade: an address with a hash leads to its title, below the header, with focus on it', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(`/privacidade#${PRIVACY_HASH_TARGET}`);
    const heading = byId(page, PRIVACY_HASH_TARGET);

    await expect(heading).toBeFocused({ timeout: PAGE_LOAD_TIMEOUT_MS });
    await expect
      .poll(() => heading.evaluate((element) => element.getBoundingClientRect().top))
      .toBeGreaterThan(ANCHOR_BOUNDS.minTopPx);
    await expect
      .poll(() => heading.evaluate((element) => element.getBoundingClientRect().top))
      .toBeLessThan(ANCHOR_BOUNDS.maxTopPx);
  });

  test('the links of the contents show a ring when reached by the keyboard, and Enter leads to the title', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await openPage(page, PRIVACY);
    const second = tocLinks(page).nth(1);
    await tocLinks(page).first().focus();
    await page.keyboard.press('Tab');

    await expect(second).toBeFocused();
    const outline = await second.evaluate((element) => {
      const style = getComputedStyle(element);
      return { width: parseFloat(style.outlineWidth), style: style.outlineStyle, color: style.outlineColor };
    });
    expect(outline.style).not.toBe('none');
    expect(outline.width).toBeGreaterThanOrEqual(2);
    expect(outline.color).toBe(INK_RGB);

    const id = ((await second.getAttribute('href')) ?? '').slice(1);
    await page.keyboard.press('Enter');
    await expect(byId(page, id)).toBeFocused();
  });

  test('the table of contents is read from the titles: the same words, in the same order', async ({ page }) => {
    for (const contract of PAGES) {
      await page.setViewportSize(DESKTOP);
      await openPage(page, contract);
      const labels = await tocLinks(page).allInnerTexts();
      const titles = await page.locator('[data-legal-body] h2').allInnerTexts();

      // innerText follows the CSS, which lowercases the titles: the list keeps the case of the source.
      expect(labels.map((label) => label.toLowerCase())).toEqual(titles.map((title) => title.toLowerCase()));
      expect(labels.length).toBeGreaterThan(2);
    }
  });

  for (const contract of PAGES) {
    test(`${contract.path}: the old markup is restyled by CSS, in the computed styles, at 1440`, async ({ page }) => {
      await page.setViewportSize(DESKTOP);
      await openPage(page, contract);

      const report = await page.evaluate(
        ({ palette, transparent, minSmall }) => {
          const body = document.querySelector('[data-legal-body]');
          if (!body) throw new Error('no body');
          const paletteSet = new Set(palette);
          const problems: string[] = [];
          const name = (element: Element) =>
            `${element.tagName.toLowerCase()} "${(element.textContent ?? '').trim().slice(0, 30)}"`;
          const checkColor = (element: Element, property: string, value: string, allowTransparent: boolean) => {
            if (allowTransparent && value === transparent) return;
            if (!paletteSet.has(value)) problems.push(`${name(element)} ${property} ${value}`);
          };

          for (const element of Array.from(body.querySelectorAll('*'))) {
            const style = getComputedStyle(element);
            if (style.display === 'none') continue;
            if (style.fontStyle === 'italic') problems.push(`${name(element)} is italic`);
            if (style.backgroundImage !== 'none') problems.push(`${name(element)} has a background image`);
            if (style.filter !== 'none') problems.push(`${name(element)} has a filter ${style.filter}`);
            if (element.matches('[class*="text-[10px]"]') && parseFloat(style.fontSize) < minSmall) {
              problems.push(`${name(element)} is ${style.fontSize}`);
            }
            const hasText = Array.from(element.childNodes).some(
              (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '',
            );
            if (hasText || element.matches('svg')) checkColor(element, 'color', style.color, false);
            checkColor(element, 'background-color', style.backgroundColor, true);
            if (parseFloat(style.borderTopWidth) > 0) checkColor(element, 'border-color', style.borderTopColor, false);
          }
          const h1 = getComputedStyle(body.querySelector('h1') as Element);
          // A title is ink, except inside a black card, where it is white.
          const h2s = Array.from(body.querySelectorAll('h2')).map((heading) => ({
            transform: getComputedStyle(heading).textTransform,
            color: getComputedStyle(heading).color,
            isOnBlack:
              getComputedStyle(heading.closest('[class*="bg-zinc-950"]') ?? heading).backgroundColor ===
              'rgb(10, 10, 10)',
          }));
          return {
            problems,
            h1: { transform: h1.textTransform, spacing: h1.letterSpacing, color: h1.color, weight: h1.fontWeight },
            h2s,
          };
        },
        { palette: [...PALETTE_RGB], transparent: TRANSPARENT, minSmall: MIN_SMALL_PRINT_PX },
      );

      expect(report.problems).toEqual([]);
      expect(report.h1.transform).toBe('lowercase');
      expect(parseFloat(report.h1.spacing)).toBeLessThan(0);
      expect(report.h1.color).toBe(INK_RGB);
      expect(report.h1.weight).toBe('700');
      for (const title of report.h2s) {
        expect(title.transform).toBe('lowercase');
        expect(title.color).toBe(title.isOnBlack ? WHITE_RGB : INK_RGB);
      }
      await page.screenshot({
        path: `e2e/__shots__/legal-restyle-${contract.path.slice(1)}-1440x900.png`,
        fullPage: true,
      });
    });
  }

  for (const contract of PAGES) {
    for (const viewport of [NARROWEST, { width: 320, height: 568 }]) {
      test(`${contract.path}: no e-mail or long word pushes the page past ${viewport.width}px, with the font at 120 percent`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        await enableLargeFont(page);
        await openPage(page, contract);

        const overflow = await measureOverflow(page, viewport.width);
        expect(overflow.documentExcess, 'no horizontal scroll').toBeLessThanOrEqual(0);
        expect(overflow.elements, 'nothing past the right edge').toEqual([]);
        expect(await brokenWordsIn(page, TITLES), 'no word of a title is broken in the middle').toEqual([]);
        await page.screenshot({
          path: `e2e/__shots__/legal-large-${contract.path.slice(1)}-${viewport.width}x${viewport.height}.png`,
          fullPage: true,
        });
      });
    }
  }
});
