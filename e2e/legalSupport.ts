import type { Locator, Page } from '@playwright/test';
import { legalCopy } from '../src/data/legalCopy';
import { ANCHOR_BOUNDS } from './headerBounds';
import { expect } from './n8nGuard';
import type { PageContract } from './pageContract';

export const PRIVACY: PageContract = {
  path: '/privacidade',
  title: /^Política de Privacidade/,
  h1: 'Política de Privacidade',
  readyHeading: '1. Quem é o controlador',
  hasFloatingClearance: true,
};
export const LGPD: PageContract = {
  path: '/lgpd',
  title: /^LGPD/,
  h1: 'LGPD',
  readyHeading: 'Victor Nogueira',
  hasFloatingClearance: true,
};
export const PAGES = [PRIVACY, LGPD];

export const ONLY_IN_DESKTOP = 'the test sets its own viewport: it runs once, in the desktop project';
export const DESKTOP = { width: 1440, height: 900 };
export const PHONE = { width: 390, height: 844 };
export const NARROWEST = { width: 280, height: 560 };
export const TOC_NAV = `nav[aria-label="${legalCopy.tocLabel}"]`;
/** The legal text, and the navigation that is its table of contents. */
export const PAGE_BODY_SELECTOR = `[data-legal-body], ${TOC_NAV}`;
export const STICKY_TOP_PX = 112;
export const POSITION_TOLERANCE_PX = 1.5;
export const SCROLL_STEP_PX = 1600;
export const PRIVACY_HASH_TARGET = '7-seus-direitos-art-18-da-lgpd';
export const TITLES = 'h1, h2, h3';
// The palette of the site as the browser reports a computed color: white, cream, gray light, mid and dark, ink and black.
export const PALETTE_RGB = new Set([
  'rgb(255, 255, 255)',
  'rgb(242, 242, 242)',
  'rgb(199, 199, 199)',
  'rgb(138, 138, 138)',
  'rgb(77, 77, 77)',
  'rgb(26, 26, 26)',
  'rgb(10, 10, 10)',
]);
export const TRANSPARENT = 'rgba(0, 0, 0, 0)';
export const INK_RGB = 'rgb(26, 26, 26)';
export const WHITE_RGB = 'rgb(255, 255, 255)';
export const MIN_SMALL_PRINT_PX = 12;
// A scroll has settled when the top of the title did not move for this many frames in a row (about 200ms).
export const SETTLED_FRAMES = 12;
export const SETTLE_TIMEOUT_MS = 8000;
export const MAX_BODY_SHIFT = 0.01;
export const MIN_RING_CONTRAST = 3;
export const CONTROLLER_KICKER = 'Controlador dos dados';

// An id may start with a digit ("7-seus-direitos"), which a #selector cannot.
export const byId = (page: Page, id: string) => page.locator(`[id="${id}"]`);
export const tocLinks = (page: Page) => page.locator(`${TOC_NAV} a`);

/**
 * Where the top of the title is once the scroll to it has finished: sampled every frame until it holds still. Reading it
 * while the scroll is still going (or polling until it is first inside the bounds) says nothing about where it lands.
 */
export function settledTop(heading: Locator): Promise<number> {
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
export async function entriesToTry(page: Page): Promise<number[]> {
  const count = await tocLinks(page).count();
  return [...new Set([0, Math.floor(count / 2), count - 1])];
}

/** The title under the header, and not past it: both bounds on the position it settled at. */
export function expectJustBelowHeader(top: number, label: string): void {
  expect(top, `${label}: below the header`).toBeGreaterThan(ANCHOR_BOUNDS.minTopPx);
  expect(top, `${label}: not far down the screen`).toBeLessThan(ANCHOR_BOUNDS.maxTopPx);
}

export interface ShiftRecord {
  value: number;
  /** The shift moved a part of the legal text or of its contents (not the footer, which a lazy page moves site wide). */
  isPageBody: boolean;
}

/** Records the layout shifts from the first paint in window.__legalShifts, telling the ones that touch the page body. */
export async function watchShifts(page: Page): Promise<void> {
  // Only the legal text and its own contents count. The footer and the header are left out: a lazy page moves the footer
  // when its fallback is replaced, on every page of the site, and that is not the matter of this frame.
  await page.addInitScript((bodySelector) => {
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
          if (element === null || element.closest('footer, header') !== null) return false;
          return element.closest(bodySelector) !== null;
        });
        shifts.push({ value: entry.value, isPageBody });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  }, PAGE_BODY_SELECTOR);
}

export const readShifts = (page: Page): Promise<ShiftRecord[]> =>
  page.evaluate(() => (window as unknown as { __legalShifts: ShiftRecord[] }).__legalShifts.slice());
