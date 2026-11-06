import type { Page } from '@playwright/test';
import { PAGE_LOAD_TIMEOUT_MS, walkPage, waitForSteadyHeight } from './homeSupport';
import { expect } from './n8nGuard';
import { PANEL_NAME, TRIGGER_NAME } from './tabSupport';

// The probe of the focus specs: Tab through a whole page and, for every focused element, check what is on top of it
// once the browser has scrolled it into view (shared by floating-focus.spec.ts and a11y-widget-focus.spec.ts).
//
// The rule it holds the site to is the one of useTabDodge (WCAG 2.4.11): the accessibility tab steps aside for a control
// the keyboard focused and it covers, about 120 to 250 ms after the scroll stops. So the probe waits until the tab has
// stopped moving, and only then asks that the control is inside the window, that its box does not meet the box the tab
// really has now, and that nothing is on top of it at five points. At scroll 0 the page cannot move a control out from
// under the tab, so the old rule (a window that starts below the tab's band) is not asked any more.

export const MAX_TAB_PRESSES = 700;

/** What one focused element looked like once the page stopped scrolling. */
export interface FocusProbe {
  label: string;
  isOffscreen: boolean;
  isRepeat: boolean;
  covers: string[];
  /** The tab still meets the control's box once it has stopped moving. */
  isUnderTab: boolean;
}

/** What the page needs to find the tab: the labels of its aside and of its button. */
interface TabNames {
  panel: string;
  trigger: string;
}

/** Runs in the page: waits for the scroll to settle, then samples the focused element at five points. */
function probeActiveElement(names: TabNames): Promise<FocusProbe | null> {
  const POINT_INSET_PX = 8;
  const POINT_INSET_RATIO = 0.2;
  const SETTLED_FRAMES = 6;
  const GIVE_UP_MS = 2500;
  // The tab steps aside after the scroll has been quiet for ~100 ms and then slides: a covered control gets a long wait,
  // a free one a short check that the tab is not on its way.
  const COVERED_STEADY_FRAMES = 30;
  const FREE_STEADY_FRAMES = 8;
  const TAB_GIVE_UP_MS = 3000;

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

  const tab = document.querySelector(`aside[aria-label="${names.panel}"] button[aria-label="${names.trigger}"]`);
  const tabBox = () => (tab ? tab.getBoundingClientRect() : null);
  const meets = (a: DOMRect, b: DOMRect | null) =>
    b !== null && Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top);

  /** Resolves once the tab's box has not changed for `frames` frames in a row (or after TAB_GIVE_UP_MS). */
  const waitForTab = (frames: number) =>
    new Promise<void>((resolve) => {
      const started = performance.now();
      let last = '';
      let same = 0;
      const tick = () => {
        const box = tabBox();
        const now = box ? `${box.x},${box.y},${box.width},${box.height}` : '';
        same = now === last ? same + 1 : 0;
        last = now;
        if (same >= frames || performance.now() - started > TAB_GIVE_UP_MS) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

  const describe = (node: Element) => {
    const text = (node.getAttribute('aria-label') ?? node.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
    return `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ''} "${text}"`;
  };

  const settle = async () => {
    await waitForScroll();
    const active = document.activeElement;
    if (!active || active === document.body || active === document.documentElement) return;
    const isInWidget = active.closest('aside') !== null;
    const isCovered = !isInWidget && meets(active.getBoundingClientRect(), tabBox());
    await waitForTab(isCovered ? COVERED_STEADY_FRAMES : FREE_STEADY_FRAMES);
  };

  return settle().then(() => {
    const active = document.activeElement;
    if (!active || active === document.body || active === document.documentElement) return null;

    const visited = ((window as unknown as { __visited?: WeakSet<Element> }).__visited ??= new WeakSet<Element>());
    const isRepeat = visited.has(active);
    visited.add(active);

    // The window is the whole viewport: the header and the two floating buttons are judged by what is on top of the control
    // (below), and the tab by its real box, because the tab moves for the control and no scroll padding stands for it now.
    // The fixed layers themselves (header, skip link, the two buttons, the tab) are not asked to dodge each other.
    let isFixed = false;
    for (let node: Element | null = active; node !== null; node = node.parentElement) {
      if (getComputedStyle(node).position === 'fixed') isFixed = true;
    }
    const isInWidget = active.closest('aside') !== null;
    const box = active.getBoundingClientRect();
    const left = Math.max(box.left, 0);
    const right = Math.min(box.right, window.innerWidth);
    const top = Math.max(box.top, 0);
    const bottom = Math.min(box.bottom, window.innerHeight);
    const label = describe(active);
    if (right - left <= 0 || bottom - top <= 0) return { label, isOffscreen: true, isRepeat, covers: [], isUnderTab: false };
    const isUnderTab = !isFixed && !isInWidget && meets(box, tabBox());

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
    return { label, isOffscreen: false, isRepeat, covers, isUnderTab };
  });
}

/** Presses Tab through the whole page and collects every element that was covered or off screen. */
export async function tabThroughPage(page: Page) {
  const problems: string[] = [];
  let visited = 0;
  for (let press = 0; press < MAX_TAB_PRESSES; press += 1) {
    await page.keyboard.press('Tab');
    const probe = await page.evaluate(probeActiveElement, { panel: PANEL_NAME, trigger: TRIGGER_NAME });
    if (probe === null || probe.isRepeat) break;
    visited += 1;
    if (probe.isOffscreen) problems.push(`${probe.label}: has focus but is outside the window`);
    if (probe.isUnderTab) problems.push(`${probe.label}: the accessibility tab still covers it after it had time to step aside`);
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

