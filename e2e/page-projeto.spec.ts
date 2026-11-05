import type { Page } from '@playwright/test';
import { FEATURES_LABEL, TAGS_LABEL } from '../src/components/projectLabels';
import { STICKY_MIN_HEIGHT_PX, STICKY_TOP_PX } from '../src/sections/projects/stickyColumn';
import { PAGE_LOAD_TIMEOUT_MS, enableLargeFont, nextFrames } from './homeSupport';
import { expect, test } from './n8nGuard';
import { describePageContract, openPage, type PageContract } from './pageContract';

const FEATURED: PageContract = {
  path: '/projetos/dizpara',
  title: /^DizPara/,
  h1: 'DizPara',
  readyHeading: FEATURES_LABEL,
  hasFloatingClearance: true,
};
const REGULAR: PageContract = {
  path: '/projetos/travel-ia',
  title: /^Travel IA/,
  h1: 'Travel IA',
  readyHeading: TAGS_LABEL,
  hasFloatingClearance: true,
};
const HUB081: PageContract = {
  path: '/projetos/hub081',
  title: /^Hub081/,
  h1: 'Hub081',
  readyHeading: FEATURES_LABEL,
};
// The windows of a laptop and a desktop where the two columns sit side by side (lg and up), the short ones included:
// 1024x600 (a small tablet), 1280x600 and 1366x657 (a laptop with browser bars) are shorter than STICKY_MIN_HEIGHT_PX.
const SIDE_BY_SIDE_WINDOWS = [
  { width: 1024, height: 600 },
  { width: 1280, height: 600 },
  { width: 1366, height: 657 },
  { width: 1024, height: 768 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
];
const PIXEL_TOLERANCE = 2;
// Small enough for the column to stay inside its travel on DizPara at 1366 and 1440, where the gallery is about 157px
// shorter than the facts and so can travel only that far.
const SCROLL_STEP_PX = 10;

test.describe('case page of a featured project', () => {
  describePageContract(FEATURED);
});

test.describe('case page of a regular project', () => {
  describePageContract(REGULAR);
});

interface ColumnReport {
  /** Which column sticks: the first (facts) or the second (gallery). */
  stickyIndex: number;
  /** The viewport height and the `top` the sticky column keeps. */
  innerHeight: number;
  stickyTop: number;
  stickyHeight: number;
  bodyHeight: number;
  heights: [number, number];
}

function readColumns(page: Page): Promise<ColumnReport> {
  return page.evaluate(() => {
    const body = document.querySelector('[data-case-body]') as HTMLElement;
    const columns = Array.from(body.children) as HTMLElement[];
    const stickyIndex = columns.findIndex((column) => getComputedStyle(column).position === 'sticky');
    const sticky = columns[stickyIndex] ?? columns[0];
    return {
      stickyIndex,
      innerHeight: window.innerHeight,
      stickyTop: parseFloat(getComputedStyle(sticky).top),
      stickyHeight: sticky.getBoundingClientRect().height,
      bodyHeight: body.getBoundingClientRect().height,
      heights: [columns[0].getBoundingClientRect().height, columns[1].getBoundingClientRect().height],
    };
  });
}

interface Edges {
  top: number;
  bottom: number;
}

/** Scrolls so the body of the case sits `inside` the window by a step, or ends exactly at its bottom edge, and measures. */
async function boxesAt(page: Page, placeBody: 'inside' | 'end'): Promise<{ column: Edges; body: Edges }> {
  await page.evaluate(
    ({ place, step, stickyTop }) => {
      const body = document.querySelector('[data-case-body]') as HTMLElement;
      const rect = body.getBoundingClientRect();
      const bodyTop = rect.top + window.scrollY;
      // 'inside': the body starts just below the sticky offset by `step`, so the sticky column has just started to travel.
      const top = place === 'inside' ? bodyTop - stickyTop + step : bodyTop + rect.height - window.innerHeight;
      window.scrollTo({ top, behavior: 'instant' });
    },
    { place: placeBody, step: SCROLL_STEP_PX, stickyTop: STICKY_TOP_PX },
  );
  await nextFrames(page);
  return page.evaluate(() => {
    const body = document.querySelector('[data-case-body]') as HTMLElement;
    const columns = Array.from(body.children) as HTMLElement[];
    const sticky = columns.find((column) => getComputedStyle(column).position === 'sticky') as HTMLElement;
    const edges = (element: HTMLElement) => ({
      top: element.getBoundingClientRect().top,
      bottom: element.getBoundingClientRect().bottom,
    });
    return { column: edges(sticky), body: edges(body) };
  });
}

test.describe('the sticky column of a case page', () => {
  for (const contract of [FEATURED, HUB081, REGULAR]) {
    for (const size of SIDE_BY_SIDE_WINDOWS) {
      test(`${contract.path} at ${size.width}x${size.height}: the shorter column sticks only where it fits the window, and nothing is clipped`, async ({
        page,
      }, testInfo) => {
        test.skip(
          testInfo.project.name !== 'desktop',
          'the test sets its own viewport: it runs once, in the desktop project',
        );
        test.slow();
        await page.setViewportSize(size);
        await openPage(page, contract);
        const report = await readColumns(page);

        // In a window shorter than STICKY_MIN_HEIGHT_PX nothing sticks: the page scrolls as one, so no column can be
        // clipped at the bottom of the window.
        if (size.height < STICKY_MIN_HEIGHT_PX) {
          expect(report.stickyIndex, 'no column is sticky in a short window').toBe(-1);
          return;
        }

        // Exactly one column sticks, and it is the shorter of the two.
        expect(report.stickyIndex, 'one column is sticky').toBeGreaterThanOrEqual(0);
        const otherHeight = report.heights[report.stickyIndex === 0 ? 1 : 0];
        expect(report.stickyHeight, 'the sticky column is the shorter one').toBeLessThanOrEqual(
          otherHeight + PIXEL_TOLERANCE,
        );
        // It fits under the header, so no part of it is clipped at the bottom of the window.
        expect(report.stickyHeight + report.stickyTop, 'the sticky column fits the window').toBeLessThanOrEqual(
          report.innerHeight,
        );

        // Inside the body it keeps its place: its top stays at the sticky offset (112px) while the body scrolls.
        const first = await boxesAt(page, 'inside');
        const second = await page.evaluate((step) => {
          window.scrollBy({ top: step, behavior: 'instant' });
          const body = document.querySelector('[data-case-body]') as HTMLElement;
          const sticky = (Array.from(body.children) as HTMLElement[]).find(
            (column) => getComputedStyle(column).position === 'sticky',
          ) as HTMLElement;
          return sticky.getBoundingClientRect().top;
        }, SCROLL_STEP_PX);
        expect(Math.abs(first.column.top - second), 'the sticky column did not move').toBeLessThanOrEqual(
          PIXEL_TOLERANCE,
        );

        // With the end of the body at the bottom edge of the window the column is still whole and on screen: it followed
        // the scroll, so there is no empty space under the gallery and nothing is clipped at the bottom of the window.
        const end = await boxesAt(page, 'end');
        expect(end.column.top, 'not above the window').toBeGreaterThanOrEqual(-PIXEL_TOLERANCE);
        expect(end.column.bottom, 'not below the window').toBeLessThanOrEqual(report.innerHeight + PIXEL_TOLERANCE);
        expect(end.column.bottom, 'inside the body').toBeLessThanOrEqual(end.body.bottom + PIXEL_TOLERANCE);
      });
    }
  }
});

test.describe('the case pages', () => {
  test('at 280px with the font at 120 percent, "e-mail" in the lead of the hero does not wrap at its hyphen', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop',
      'the test sets its own viewport: it runs once, in the desktop project',
    );
    test.slow();
    await page.setViewportSize({ width: 280, height: 700 });
    await enableLargeFont(page);
    await openPage(page, REGULAR);

    const lead = await page.evaluate(() => {
      const paragraph = Array.from(document.querySelectorAll('main section:first-of-type p')).find((item) =>
        /e-mail/.test(item.textContent ?? ''),
      );
      const words = Array.from(paragraph?.querySelectorAll('span.whitespace-nowrap') ?? []).filter((span) =>
        /e-mail/.test(span.textContent ?? ''),
      );
      return {
        found: paragraph !== undefined,
        wordCount: words.length,
        wrapped: words.filter((word) => word.getClientRects().length > 1).length,
      };
    });

    expect(lead.found, 'the lead of the hero mentions e-mail').toBe(true);
    expect(lead.wordCount, 'the word is in a no-wrap span').toBeGreaterThan(0);
    expect(lead.wrapped).toBe(0);
  });

  test('an address of a project that left the list ends in /projetos', async ({ page }) => {
    await page.goto('/projetos/troco');

    await expect(page).toHaveURL(/\/projetos$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Projetos' })).toBeVisible({
      timeout: PAGE_LOAD_TIMEOUT_MS,
    });
  });

  test('the next project comes after the facts and the gallery, before the closing band, and it opens that case', async ({
    page,
  }) => {
    await openPage(page, FEATURED);

    const order = await page.evaluate(() => {
      const next = document.querySelector('a[href="/projetos/hub081"]') as HTMLElement;
      const body = document.querySelector('[data-case-body]') as HTMLElement;
      const band = Array.from(document.querySelectorAll('main section')).at(-1) as HTMLElement;
      const follows = (first: Node, second: Node) =>
        Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
      return {
        afterBody: follows(body, next),
        beforeBand: follows(next, band),
        bandIsLastSection: band.querySelector('a[href^="https://wa.me/"]') !== null,
      };
    });
    expect(order).toEqual({ afterBody: true, beforeBand: true, bandIsLastSection: true });

    await page.getByRole('link', { name: /^próximo projeto Hub081/i }).click();

    await expect(page).toHaveURL(/\/projetos\/hub081$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Hub081' })).toBeVisible({
      timeout: PAGE_LOAD_TIMEOUT_MS,
    });
  });
});
