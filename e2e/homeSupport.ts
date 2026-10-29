import type { Page } from '@playwright/test';
import { expect } from './n8nGuard';

// What the specs that open the whole home share: how it is opened, how it is walked from top to bottom (so every lazy
// section mounts and reveals) and the page side audits of overflow and touch targets. The specs that use it take their
// `test` from ./n8nGuard, because the home mounts the real contact form (see src/test/e2e-guard.test.ts).

export const STATEMENT_HEADING = 'O trabalho repetitivo vai para os fluxos. A equipe fica com o resto.';
export const FINAL_HEADING = 'Qual processo a gente automatiza primeiro?';
export const SECTION_HEADINGS = [
  'Comece pelo processo que mais pesa na rotina',
  'Três jeitos de tirar trabalho manual da sua frente',
  'Do primeiro papo ao fluxo rodando',
  'Quanto o trabalho manual custa por ano',
  'Quem já automatizou com a gente',
  'Perguntas que a gente sempre ouve',
  FINAL_HEADING,
];
export const MIN_TOUCH_PX = 44;
// A box of 44px can be measured as 43.99997 (floating point), which is not a smaller target.
export const TOUCH_ROUNDING_PX = 0.01;
export const PAGE_LOAD_TIMEOUT_MS = 20_000;
// Frames in a row with the same page height: the layout has stopped moving (images, fonts, late sections).
const STEADY_FRAMES = 30;
const MAX_WALK_STEPS = 200;

/** The home is ready when its last lazy section, the form, is in the page. */
export async function openHome(page: Page, path = '/') {
  await page.goto(path);
  await expect(page.locator('form[name="contact"]')).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT_MS });
  for (const name of [STATEMENT_HEADING, ...SECTION_HEADINGS]) {
    await expect(page.getByRole('heading', { level: 2, name })).toBeAttached();
  }
}

export async function enableLargeFont(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('a11y-preferences', JSON.stringify({ fontSize: true }));
  });
}

/** Two frames later: layout and any scroll the page started have been applied. */
export const nextFrames = (page: Page) =>
  page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

/** Waits until the page height has stayed the same for a run of frames. */
export async function waitForSteadyHeight(page: Page) {
  await page.evaluate(() => {
    delete (window as unknown as { __steady?: unknown }).__steady;
  });
  await page.waitForFunction(
    (frames) => {
      const state = window as unknown as { __steady?: { height: number; count: number } };
      const height = document.documentElement.scrollHeight;
      state.__steady = state.__steady?.height === height ? { height, count: state.__steady.count + 1 } : { height, count: 0 };
      return state.__steady.count >= frames;
    },
    STEADY_FRAMES,
    { timeout: PAGE_LOAD_TIMEOUT_MS },
  );
}

/**
 * Scrolls the page from the top to the end, one window height at a time, with an instant jump and two frames per step
 * (the page glides on its own, so the jump has to bypass it), calling `onStep` at each stop. The end is read again at
 * each step, because a lazy section that mounts makes the page taller. Ends with the layout steady.
 */
export async function walkPage(page: Page, onStep?: () => Promise<void>) {
  for (let step = 0; step < MAX_WALK_STEPS; step += 1) {
    const reachedEnd = await page.evaluate((index) => {
      window.scrollTo({ top: index * window.innerHeight, behavior: 'instant' });
      return (index + 1) * window.innerHeight >= document.documentElement.scrollHeight;
    }, step);
    await nextFrames(page);
    if (onStep) await onStep();
    if (reachedEnd) break;
  }
  await waitForSteadyHeight(page);
}

export interface OverflowReport {
  /** documentElement.scrollWidth minus the width the test asked for. */
  documentExcess: number;
  /** The visible elements whose right edge is past the width the test asked for. */
  elements: string[];
}

/**
 * The page against the width the viewport was set to. The configured width is used and not window.innerWidth: a
 * mobile browser widens the layout viewport to fit content that overflows, which would hide the very overflow sought.
 * Elements inside a container that clips or scrolls (the marquee, the tab strip) and elements the clipping hides are
 * left out: they are cut on purpose and cannot widen the page. So is an aria-hidden decoration on a fixed layer, such as
 * the ring that grows around the WhatsApp button once: it is drawn past the edge for a moment and cannot scroll the page.
 */
export function measureOverflow(page: Page, width: number): Promise<OverflowReport> {
  return page.evaluate((limit) => {
    const clips = (style: CSSStyleDeclaration) => style.overflowX !== 'visible';
    const describe = (element: Element) => {
      const text = (element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
      const cls = typeof element.className === 'string' ? element.className.split(' ').slice(0, 3).join('.') : '';
      return `${element.tagName.toLowerCase()}${cls ? '.' + cls : ''} "${text}"`;
    };
    const isInsideClip = (element: Element) => {
      for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        if (clips(getComputedStyle(parent))) return true;
      }
      return false;
    };
    const isFixedDecoration = (element: Element) => {
      if (!element.closest('[aria-hidden="true"]')) return false;
      for (let node: Element | null = element; node; node = node.parentElement) {
        if (getComputedStyle(node).position === 'fixed') return true;
      }
      return false;
    };
    const elements: string[] = [];
    for (const element of document.body.querySelectorAll('*')) {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || rect.right <= limit + 1) continue;
      if (getComputedStyle(element).visibility === 'hidden' || isInsideClip(element) || isFixedDecoration(element)) continue;
      elements.push(`${describe(element)} right=${rect.right.toFixed(1)}`);
    }
    return { documentExcess: document.documentElement.scrollWidth - limit, elements };
  }, width);
}

export interface TargetFailure {
  element: string;
  width: number;
  height: number;
}

/**
 * Every visible button and link that is in the window now and is smaller than 44px in either side. A link that sits in
 * running text (inline, with text of its own around it) is left out, and so is anything a clipping ancestor hides,
 * the screen readers' skip link before it is focused (under 2px) and what is inert or aria-hidden.
 * The size is the box on the screen, except under a transform: the hero panel tilts with the scroll, which shrinks a
 * control drawn in it for a moment (the 44px pause button measured 40.6px high at 1024x768 mid scroll and is 44px flat),
 * so there the CSS size of the control is measured, which is what the page sets and what it shows at rest.
 */
export function measureSmallTargets(page: Page, min: number): Promise<TargetFailure[]> {
  return page.evaluate((limit) => {
    const clippedByAncestor = (element: Element, rect: DOMRect) => {
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        if (getComputedStyle(parent).overflowX === 'visible' && getComputedStyle(parent).overflowY === 'visible') continue;
        const box = parent.getBoundingClientRect();
        if (rect.right <= box.left || rect.left >= box.right || rect.bottom <= box.top || rect.top >= box.bottom) return true;
      }
      return false;
    };
    const sizeOf = (element: Element, rect: DOMRect) => {
      for (let node: Element | null = element; node; node = node.parentElement) {
        if (getComputedStyle(node).transform === 'none') continue;
        const style = getComputedStyle(element);
        const width = parseFloat(style.width);
        const height = parseFloat(style.height);
        return Number.isFinite(width) && Number.isFinite(height) ? { width, height } : rect;
      }
      return rect;
    };
    const isRunningText = (element: Element) =>
      getComputedStyle(element).display === 'inline' &&
      Array.from(element.parentElement?.childNodes ?? []).some(
        (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim().length > 0,
      );
    const failures: TargetFailure[] = [];
    for (const element of document.querySelectorAll('button, a[href]')) {
      const rect = element.getBoundingClientRect();
      const inWindow = rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
      if (!inWindow || rect.width < 2 || rect.height < 2) continue;
      if (getComputedStyle(element).visibility === 'hidden' || element.closest('[aria-hidden="true"], [inert]')) continue;
      if (clippedByAncestor(element, rect) || isRunningText(element)) continue;
      const size = sizeOf(element, rect);
      if (size.width >= limit && size.height >= limit) continue;
      const label = element.getAttribute('aria-label') ?? (element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
      failures.push({ element: `${element.tagName.toLowerCase()} "${label}"`, width: size.width, height: size.height });
    }
    return failures;
  }, min);
}
