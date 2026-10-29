import type { Locator, Page } from '@playwright/test';
import { expect } from './n8nGuard';

// What the specs that open the whole home share: how it is opened, how it is walked from top to bottom (so every lazy
// section mounts and reveals) and the page side audits of overflow, touch targets, accent and broken words. The specs
// that use it take their `test` from ./n8nGuard, because the home mounts the real contact form (see
// src/test/e2e-guard.test.ts). Nothing in this file presses a submit button or fills a field of the form.

export const STATEMENT_HEADING = 'O trabalho repetitivo vai para os fluxos. A equipe fica com o resto.';
export const FINAL_HEADING = 'Qual processo a gente automatiza primeiro?';
export const ROI_HEADING = 'Quanto o trabalho manual custa por ano';
export const SECTION_HEADINGS = [
  'Comece pelo processo que mais pesa na rotina',
  'Três jeitos de tirar trabalho manual da sua frente',
  'Do primeiro papo ao fluxo rodando',
  ROI_HEADING,
  'Quem já automatizou com a gente',
  'Perguntas que a gente sempre ouve',
  FINAL_HEADING,
];
export const MIN_TOUCH_PX = 44;
// A box of 44px can be measured as 43.99997 (floating point), which is not a smaller target.
export const TOUCH_ROUNDING_PX = 0.01;
export const PAGE_LOAD_TIMEOUT_MS = 20_000;
// The accent of the palette, as the browser serializes a computed color.
export const ACCENT_RGB = 'rgb(0, 229, 160)';
export const HOURS_PILL_NAME = /^Horas por semana/;
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

/** Opens a choice pill (the hours or the task of the hero) and picks one option of its list. */
export async function choosePillOption(page: Page, pillName: RegExp, optionName: string) {
  await page.getByRole('button', { name: pillName }).click();
  await page.getByRole('option', { name: optionName }).click();
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

/**
 * Waits until what moves by itself has come to rest: no finite animation or transition is still running (the endless
 * ones, like a blinking cursor, are left alone), the text of the statement section (the stats count up there) has not
 * changed for a run of frames, and the page height is steady. Conditions only, no sleeps.
 */
export async function waitForSettledMotion(page: Page) {
  await page.waitForFunction(
    ({ frames, heading }) => {
      const state = window as unknown as { __rest?: { text: string; count: number } };
      const running = document
        .getAnimations()
        .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
        .some((animation) => animation.playState === 'running' || animation.pending);
      const section = Array.from(document.querySelectorAll('h2'))
        .find((h2) => h2.textContent === heading)
        ?.closest('section');
      const text = section?.textContent ?? '';
      state.__rest = running || state.__rest?.text !== text ? { text, count: 0 } : { text, count: state.__rest.count + 1 };
      return state.__rest.count >= frames;
    },
    { frames: STEADY_FRAMES, heading: STATEMENT_HEADING },
    { timeout: PAGE_LOAD_TIMEOUT_MS },
  );
  await waitForSteadyHeight(page);
}

/** Waits until the box of an element has not moved or changed size for a run of frames (an opening panel, a slide). */
export function waitForStableBox(target: Locator, frames = STEADY_FRAMES) {
  return target.evaluate(
    (element, run) =>
      new Promise<void>((resolve) => {
        let last = '';
        let count = 0;
        const tick = () => {
          const { x, y, width, height } = element.getBoundingClientRect();
          const now = `${x},${y},${width},${height}`;
          count = now === last ? count + 1 : 0;
          last = now;
          if (count >= run) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    frames,
    { timeout: PAGE_LOAD_TIMEOUT_MS },
  );
}

export interface OverflowReport {
  /** documentElement.scrollWidth minus the width the test asked for. */
  documentExcess: number;
  /** The visible elements past the right edge of the page, or past the right edge of the box that clips them. */
  elements: string[];
}

/**
 * The page against the width the viewport was set to. The configured width is used and not window.innerWidth: a
 * mobile browser widens the layout viewport to fit content that overflows, which would hide the very overflow sought.
 * What is left out, and nothing else: the intentional clippers (the marquee frame and any box that scrolls, such as the
 * step pills of the hero and the tab strip of the use cases) with everything inside them; the ring that grows around the
 * WhatsApp button once (fixed and aria-hidden, it cannot scroll the page); and aria-hidden decoration inside a box that
 * clips. Any other box that clips (the hero, the ROI panel, the cards) must hold its content: an element that is not
 * decoration and ends past the right edge of such a box is reported as cut.
 */
export function measureOverflow(page: Page, width: number): Promise<OverflowReport> {
  return page.evaluate((limit) => {
    const describe = (element: Element) => {
      const text = (element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
      const cls = typeof element.className === 'string' ? element.className.split(' ').slice(0, 3).join('.') : '';
      return `${element.tagName.toLowerCase()}${cls ? '.' + cls : ''} "${text}"`;
    };
    const clippersOf = (element: Element) => {
      const list: Element[] = [];
      for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        if (getComputedStyle(parent).overflowX !== 'visible') list.push(parent);
      }
      return list;
    };
    const isIntentional = (clipper: Element) =>
      ['auto', 'scroll'].includes(getComputedStyle(clipper).overflowX) || clipper.classList.contains('vn-marquee-frame');
    const isWhatsAppRing = (element: Element) =>
      element.closest('aside[aria-label="Contato rápido"]') !== null && element.closest('[aria-hidden="true"]') !== null;
    const problemOf = (element: Element, rect: DOMRect): string | null => {
      const clippers = clippersOf(element);
      if (clippers.some(isIntentional)) return null;
      if (clippers.length === 0) return rect.right > limit + 1 ? `right=${rect.right.toFixed(1)}` : null;
      if (element.closest('[aria-hidden="true"]')) return null;
      const cut = clippers.find((clipper) => rect.right > clipper.getBoundingClientRect().right + 1);
      return cut ? `right=${rect.right.toFixed(1)} cut by ${describe(cut)}` : null;
    };
    const elements: string[] = [];
    for (const element of document.body.querySelectorAll('*')) {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || getComputedStyle(element).visibility === 'hidden') continue;
      if (isWhatsAppRing(element)) continue;
      const problem = problemOf(element, rect);
      if (problem) elements.push(`${describe(element)} ${problem}`);
    }
    return { documentExcess: document.documentElement.scrollWidth - limit, elements };
  }, width);
}

export interface TargetFailure {
  element: string;
  width: number;
  height: number;
}

const TARGET_SELECTOR = 'button, a[href], input:not([type="hidden"]), textarea, select, [role="slider"]';

/**
 * Every visible control that is in the window now and is smaller than the minimum in either side, measured by the box
 * it has on the screen (a tilt or a scale counts, because that is what a finger meets). Controls are buttons, links,
 * fields, selects and sliders. A checkbox or radio inside a label is measured by the label (the whole label is the
 * target). Left out: a link in running text (inline, with text of its own around it), anything a clipping ancestor
 * hides, the skip link before it is focused (under 2px) and what is inert or aria-hidden.
 */
export function measureSmallTargets(page: Page, min: number): Promise<TargetFailure[]> {
  return page.evaluate(
    ({ limit, selector }) => {
      const clippedByAncestor = (element: Element, rect: DOMRect) => {
        for (let parent = element.parentElement; parent; parent = parent.parentElement) {
          const style = getComputedStyle(parent);
          if (style.overflowX === 'visible' && style.overflowY === 'visible') continue;
          const box = parent.getBoundingClientRect();
          if (rect.right <= box.left || rect.left >= box.right || rect.bottom <= box.top || rect.top >= box.bottom) return true;
        }
        return false;
      };
      const isRunningText = (element: Element) =>
        getComputedStyle(element).display === 'inline' &&
        Array.from(element.parentElement?.childNodes ?? []).some(
          (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim().length > 0,
        );
      const targetOf = (element: Element): Element => {
        const isToggle = element instanceof HTMLInputElement && ['checkbox', 'radio'].includes(element.type);
        return (isToggle ? element.closest('label') : null) ?? element;
      };
      const nameOf = (element: Element) =>
        element.getAttribute('aria-label') ?? (element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
      const failures: TargetFailure[] = [];
      for (const element of document.querySelectorAll(selector)) {
        const target = targetOf(element);
        const rect = target.getBoundingClientRect();
        const inWindow = rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
        if (!inWindow || rect.width < 2 || rect.height < 2) continue;
        if (getComputedStyle(element).visibility === 'hidden' || element.closest('[aria-hidden="true"], [inert]')) continue;
        if (clippedByAncestor(target, rect) || isRunningText(element) || (rect.width >= limit && rect.height >= limit)) continue;
        const label = nameOf(target) || element.getAttribute('name') || element.getAttribute('type') || '';
        failures.push({ element: `${element.tagName.toLowerCase()} "${label}"`, width: rect.width, height: rect.height });
      }
      return failures;
    },
    { limit: min, selector: TARGET_SELECTOR },
  );
}

export interface AccentSection {
  name: string;
  hits: string[];
}

/**
 * For every section of the main content, the elements that draw the accent (#00E5A0) themselves. The accent is matched
 * by its three channels, whatever the alpha (rgb, or rgba with an alpha above 0), so a translucent accent counts too.
 * An element counts once when its own text color, background, border (a side with width and style), SVG fill or SVG
 * stroke is the accent, or when its ::before or ::after has the accent as background or border (a pseudo element
 * counts as an element of its own). Text color, fill and stroke are inherited, so they are counted where they start,
 * never again on the descendants. Gradients and shadows are not counted.
 */
export function countAccentBySection(page: Page): Promise<AccentSection[]> {
  return page.evaluate((accent) => {
    const channels = (value: string) => /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+%?))?\s*\)$/.exec(value);
    const target = channels(accent)?.slice(1, 4).join(',');
    const isAccent = (value: string | undefined) => {
      const match = value ? channels(value) : null;
      return match !== null && match.slice(1, 4).join(',') === target && (match[4] === undefined || parseFloat(match[4]) > 0);
    };
    const visible = (element: Element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return (rect.width > 0 || rect.height > 0) && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const hasBorder = (style: CSSStyleDeclaration) =>
      ['Top', 'Right', 'Bottom', 'Left'].some((side) => {
        const values = style as unknown as Record<string, string>;
        return (
          isAccent(values[`border${side}Color`]) &&
          parseFloat(values[`border${side}Width`]) > 0 &&
          values[`border${side}Style`] !== 'none'
        );
      });
    const paintsBox = (style: CSSStyleDeclaration) => isAccent(style.backgroundColor) || hasBorder(style);
    const startsInherited = (element: Element, style: CSSStyleDeclaration) => {
      const parent = element.parentElement ? getComputedStyle(element.parentElement) : null;
      const hasText = (element.textContent ?? '').trim().length > 0 || element.querySelector('svg') !== null;
      const isSvg = element instanceof SVGElement;
      const textColor = isAccent(style.color) && !isAccent(parent?.color) && hasText;
      const fill = isSvg && isAccent(style.fill) && !isAccent(parent?.fill);
      const stroke = isSvg && isAccent(style.stroke) && !isAccent(parent?.stroke);
      return textColor || fill || stroke;
    };
    const label = (element: Element, extra = '') =>
      `${element.tagName.toLowerCase()}${extra} "${(element.textContent ?? '').trim().slice(0, 30)}"`;
    const hitsIn = (section: Element) => {
      const hits: string[] = [];
      for (const element of [section, ...Array.from(section.querySelectorAll('*'))]) {
        if (!visible(element)) continue;
        const style = getComputedStyle(element);
        if (paintsBox(style) || startsInherited(element, style)) hits.push(label(element));
        for (const pseudo of ['::before', '::after']) {
          const pseudoStyle = getComputedStyle(element, pseudo);
          if (pseudoStyle.content !== 'none' && paintsBox(pseudoStyle)) hits.push(label(element, pseudo));
        }
      }
      return hits;
    };
    return Array.from(document.querySelectorAll('main section')).map((section, index) => {
      const headingId = section.getAttribute('aria-labelledby');
      const name = headingId ? (document.getElementById(headingId)?.textContent ?? '') : `section ${index}`;
      return { name, hits: hitsIn(section) };
    });
  }, ACCENT_RGB);
}

/**
 * The words of the elements matching the selector that are drawn on more than one line box: a word broken in the
 * middle (an e-mail address, a long word cut by overflow-wrap).
 */
export function brokenWordsIn(page: Page, selector: string): Promise<string[]> {
  return page.evaluate((target) => {
    const broken = new Set<string>();
    for (const element of document.querySelectorAll(target)) {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        for (const match of (node.textContent ?? '').matchAll(/\S+/g)) {
          const range = document.createRange();
          range.setStart(node, match.index ?? 0);
          range.setEnd(node, (match.index ?? 0) + match[0].length);
          const lines = new Set(Array.from(range.getClientRects()).map((rect) => Math.round(rect.top)));
          if (lines.size > 1) broken.add(match[0]);
        }
      }
    }
    return [...broken];
  }, selector);
}
