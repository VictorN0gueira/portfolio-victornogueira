import type { Page } from '@playwright/test';
import { PAGE_LOAD_TIMEOUT_MS, walkPage, waitForSteadyHeight } from './homeSupport';
import { expect } from './n8nGuard';

// The probe of the focus specs: Tab through a whole page and, for every focused element, check what is on top of it
// once the browser has scrolled it into view (shared by floating-focus.spec.ts and a11y-widget-focus.spec.ts).

export const MAX_TAB_PRESSES = 700;

/** What one focused element looked like once the page stopped scrolling. */
export interface FocusProbe {
  label: string;
  isOffscreen: boolean;
  isRepeat: boolean;
  covers: string[];
}

/** Runs in the page: waits for the scroll to settle, then samples the focused element at five points. */
function probeActiveElement(): Promise<FocusProbe | null> {
  const POINT_INSET_PX = 8;
  const POINT_INSET_RATIO = 0.2;
  const SETTLED_FRAMES = 6;
  const GIVE_UP_MS = 2500;

  const waitForScroll = () =>
    new Promise<void>((resolve) => {
      const started = performance.now();
      let last = Number.NaN;
      let same = 0;
      const tick = () => {
        same = window.scrollY === last ? same + 1 : 0;
        last = window.scrollY;
        if (same >= SETTLED_FRAMES || performance.now() - started > GIVE_UP_MS) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

  const describe = (node: Element) => {
    const text = (node.getAttribute('aria-label') ?? node.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
    return `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ''} "${text}"`;
  };

  return waitForScroll().then(() => {
    const active = document.activeElement;
    if (!active || active === document.body || active === document.documentElement) return null;

    const visited = ((window as unknown as { __visited?: WeakSet<Element> }).__visited ??= new WeakSet<Element>());
    const isRepeat = visited.has(active);
    visited.add(active);

    // The window the browser promises to bring a focused element into: the page minus the scroll padding the site sets
    // for its fixed header (top) and fixed buttons (bottom). A tall element is judged on the part inside it.
    const style = getComputedStyle(document.documentElement);
    // The fixed layers themselves (header, skip link, the two buttons) live inside that padding: they use the whole window.
    let isFixed = false;
    for (let node: Element | null = active; node !== null; node = node.parentElement) {
      if (getComputedStyle(node).position === 'fixed') isFixed = true;
    }
    const padTop = isFixed ? 0 : Number.parseFloat(style.scrollPaddingTop) || 0;
    // At the very end of the page nothing can scroll further, so the last controls sit in that zone and are judged in the whole window.
    const isAtPageEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1;
    const padBottom = isFixed || isAtPageEnd ? 0 : Number.parseFloat(style.scrollPaddingBottom) || 0;
    const box = active.getBoundingClientRect();
    const left = Math.max(box.left, 0);
    const right = Math.min(box.right, window.innerWidth);
    const top = Math.max(box.top, padTop);
    const bottom = Math.min(box.bottom, window.innerHeight - padBottom);
    const label = describe(active);
    if (right - left <= 0 || bottom - top <= 0) return { label, isOffscreen: true, isRepeat, covers: [] };

    const dx = Math.min(POINT_INSET_PX, (right - left) * POINT_INSET_RATIO);
    const dy = Math.min(POINT_INSET_PX, (bottom - top) * POINT_INSET_RATIO);
    const points: Array<[string, number, number]> = [
      ['centre', (left + right) / 2, (top + bottom) / 2],
      ['top left', left + dx, top + dy],
      ['top right', right - dx, top + dy],
      ['bottom left', left + dx, bottom - dy],
      ['bottom right', right - dx, bottom - dy],
    ];
    const label2 = (active as HTMLInputElement).labels?.[0];
    const covers = points.flatMap(([name, x, y]) => {
      const hit = document.elementFromPoint(x, y);
      // A visually hidden control (a custom checkbox) is hit through its own label.
      const isOwnLabel = hit !== null && label2 !== undefined && label2.contains(hit);
      // A hit on a parent of the element is a point inside its box but outside its painted shape (a round corner, the
      // gap between the lines of a link): nothing is on top of it, so it is not a cover.
      const isTheElement = hit !== null && (active.contains(hit) || hit.contains(active) || isOwnLabel);
      return isTheElement ? [] : [`${name} (${Math.round(x)},${Math.round(y)}) is covered by ${hit ? describe(hit) : 'nothing'}`];
    });
    return { label, isOffscreen: false, isRepeat, covers };
  });
}

/** Presses Tab through the whole page and collects every element that was covered or off screen. */
export async function tabThroughPage(page: Page) {
  const problems: string[] = [];
  let visited = 0;
  for (let press = 0; press < MAX_TAB_PRESSES; press += 1) {
    await page.keyboard.press('Tab');
    const probe = await page.evaluate(probeActiveElement);
    if (probe === null || probe.isRepeat) break;
    visited += 1;
    if (probe.isOffscreen) problems.push(`${probe.label}: has focus but is outside the window`);
    problems.push(...probe.covers.map((cover) => `${probe.label}: ${cover}`));
  }
  return { problems, visited };
}

export async function openForTabbing(page: Page, path: string, isHome: boolean) {
  await page.goto(path);
  await page.evaluate(() => document.fonts.ready);
  if (isHome) {
    // The home mounts its lazy sections while it is walked; tabbing starts from the top once everything is in.
    await expect(page.locator('form[name="contact"]')).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT_MS });
    await walkPage(page);
  } else {
    await waitForSteadyHeight(page);
  }
  await page.evaluate(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    (document.activeElement as HTMLElement | null)?.blur();
  });
}

