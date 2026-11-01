import type { Locator, Page } from '@playwright/test';
import { contactFormCopy } from '../src/components/contact/contactFormCopy';
import { homeCopy } from '../src/data/homeCopy';
import { MENU_BUTTON_NAME } from '../src/data/navigation';
import { DEFAULT_HOURLY_RATE, buildQuoteMessage } from '../src/lib/roi';
import { expect } from './n8nGuard';

// What the specs that open the whole home share: how it is opened, how it is walked from top to bottom (so every lazy
// section mounts and reveals) and the page side audits of overflow, touch targets, accent and broken words. The specs
// that use it take their `test` from ./n8nGuard, because the home mounts the real contact form (see
// src/test/e2e-guard.test.ts). Nothing in this file presses a submit button or fills a field of the form.

// The copy the specs look for is read from the copy modules, so a new wording is one change in the module.
export const STATEMENT_HEADING = homeCopy.statement.heading;
export const FINAL_HEADING = homeCopy.finalCta.heading;
export const ROI_HEADING = homeCopy.roi.heading;
export const SECTION_HEADINGS = [
  homeCopy.useCases.heading,
  homeCopy.services.heading,
  homeCopy.method.heading,
  ROI_HEADING,
  homeCopy.testimonials.heading,
  homeCopy.faq.heading,
  FINAL_HEADING,
];
export const QUOTE_BUTTON = homeCopy.roi.cta;
// The words the quote opens with, up to the numbers: they come from the builder of the message.
export const QUOTE_START = buildQuoteMessage({ hoursPerWeek: 1, teamMultiplier: 1, hourlyRate: DEFAULT_HOURLY_RATE }).split(':')[0];
export const SERVICE_PLACEHOLDER = contactFormCopy.placeholders.servico;

/**
 * The button that opens the mobile menu, found by role and by MENU_BUTTON_NAME, the constant the Header uses, so a
 * rename is one change. The match is exact: the close button inside the open menu ("Fechar menu") does not match.
 */
export const menuButton = (page: Page) => page.getByRole('button', { name: MENU_BUTTON_NAME, exact: true });
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

/**
 * The localStorage key of the accessibility preferences. It is typed once here for every spec (the context cannot be
 * imported by this project); src/test/a11yStorageKey.test.ts checks that it is the context's key.
 */
export const A11Y_STORAGE_KEY = 'a11y-preferences';

export async function enableLargeFont(page: Page) {
  await page.addInitScript((key) => {
    localStorage.setItem(key, JSON.stringify({ fontSize: true }));
  }, A11Y_STORAGE_KEY);
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

/**
 * What the pause button of the hero panel lies on: the elements of the title bar that are not its ancestors (the three
 * dots, the title, the status) and the controls of the body, by the area of the overlap of their boxes with the box
 * the button has on the screen (the tilt counts). Empty when the 52px hit area touches nothing else.
 */
export function measurePauseOverlaps(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const button = document.querySelector('[data-flow-window] button[aria-label="Pausar animação"]');
    if (!button) return ['no pause button'];
    const own = button.getBoundingClientRect();
    const bar = button.parentElement?.parentElement as Element;
    const body = bar.nextElementSibling as Element;
    const others = [
      ...Array.from(bar.children).filter((child) => !child.contains(button)),
      ...Array.from(body.querySelectorAll('button, a[href], [tabindex]')),
    ];
    return others.flatMap((element) => {
      const rect = element.getBoundingClientRect();
      const width = Math.min(own.right, rect.right) - Math.max(own.left, rect.left);
      const height = Math.min(own.bottom, rect.bottom) - Math.max(own.top, rect.top);
      const text = (element.textContent ?? '').trim().slice(0, 20) || element.tagName.toLowerCase();
      return width > 0.5 && height > 0.5 ? [`${text} ${width.toFixed(1)}x${height.toFixed(1)}`] : [];
    });
  });
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
 * What is left out, and nothing else: the intentional clippers (the marquee frame and the boxes marked scrollbar-hide,
 * the step pills of the hero and the tab strip of the use cases) with everything inside them; the ring that grows around the
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
    // Only boxes that are scrollers on purpose: the marquee frame and the ones marked scrollbar-hide (the step pills of
    // the hero, the tab strip of the use cases). Another box with overflow auto or scroll is a clipper like any other:
    // overflow-y auto makes overflow-x compute to auto, and cut text inside it must still be reported.
    const isIntentional = (clipper: Element) =>
      clipper.classList.contains('vn-marquee-frame') || clipper.classList.contains('scrollbar-hide');
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

interface Border {
  color: string;
  width: number;
  style: string;
}

/** What the page reports about one element that has the accent among its colours; the verdict is made in the test. */
interface PaintRecord {
  label: string;
  /** Own text color, SVG fill and stroke and background. */
  own: Record<string, string>;
  borders: Border[];
  /** The same inherited properties on the parent, to count an inherited color where it starts only. */
  parent: Record<string, string>;
  hasText: boolean;
  isSvg: boolean;
  pseudos: Array<{ name: string; background: string; borders: Border[] }>;
}

/** Page side: the sections of the main content with the visible elements whose colours mention the channels of the accent. */
function collectPaint(page: Page): Promise<Array<{ name: string; records: PaintRecord[] }>> {
  return page.evaluate((channels) => {
    const sides = ['Top', 'Right', 'Bottom', 'Left'];
    const bordersOf = (style: CSSStyleDeclaration): Border[] =>
      sides.map((side) => {
        const values = style as unknown as Record<string, string>;
        return { color: values[`border${side}Color`], width: parseFloat(values[`border${side}Width`]), style: values[`border${side}Style`] };
      });
    const inherited = (style: CSSStyleDeclaration) => ({ color: style.color, fill: style.fill, stroke: style.stroke });
    const mentions = (...values: string[]) => values.some((value) => value.replace(/\s+/g, '').includes(channels));
    const recordOf = (element: Element): PaintRecord | null => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if ((rect.width === 0 && rect.height === 0) || style.display === 'none' || style.visibility === 'hidden') return null;
      const borders = bordersOf(style);
      const pseudos = ['::before', '::after']
        .map((name) => ({ name, style: getComputedStyle(element, name) }))
        .filter((pseudo) => pseudo.style.content !== 'none')
        .map((pseudo) => ({ name: pseudo.name, background: pseudo.style.backgroundColor, borders: bordersOf(pseudo.style) }));
      const own = { ...inherited(style), background: style.backgroundColor };
      const found =
        mentions(...Object.values(own), ...borders.map((border) => border.color)) ||
        pseudos.some((pseudo) => mentions(pseudo.background, ...pseudo.borders.map((border) => border.color)));
      if (!found) return null;
      const label = `${element.tagName.toLowerCase()} "${(element.textContent ?? '').trim().slice(0, 30)}"`;
      const parent = element.parentElement ? inherited(getComputedStyle(element.parentElement)) : { color: '', fill: '', stroke: '' };
      const hasText = (element.textContent ?? '').trim().length > 0 || element.querySelector('svg') !== null;
      return { label, own, borders, parent, hasText, isSvg: element instanceof SVGElement, pseudos };
    };
    return Array.from(document.querySelectorAll('main section')).map((section, index) => {
      const headingId = section.getAttribute('aria-labelledby');
      const name = headingId ? (document.getElementById(headingId)?.textContent ?? '') : `section ${index}`;
      const all = [section, ...Array.from(section.querySelectorAll('*'))];
      return { name, records: all.map(recordOf).filter((record): record is PaintRecord => record !== null) };
    });
  }, ACCENT_RGB.replace(/rgb\(|\)|\s/g, ''));
}

/** True when the colour is the accent: its three channels, whatever the alpha (rgb, or rgba with an alpha above 0). */
export function isAccentColor(value: string | undefined, accent = ACCENT_RGB): boolean {
  const parse = (text: string) => /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+%?))?\s*\)$/.exec(text);
  const match = value ? parse(value) : null;
  const target = parse(accent)?.slice(1, 4).join(',');
  return match !== null && match.slice(1, 4).join(',') === target && (match[4] === undefined || parseFloat(match[4]) > 0);
}

/** Test side: the elements of a record that draw the accent themselves (an inherited color counts where it starts). */
function accentHitsOf(record: PaintRecord): string[] {
  const isBorder = (border: Border) => isAccentColor(border.color) && border.width > 0 && border.style !== 'none';
  const paintsBox = (background: string, borders: Border[]) => isAccentColor(background) || borders.some(isBorder);
  const { own, parent } = record;
  const startsColor = isAccentColor(own.color) && !isAccentColor(parent.color) && record.hasText;
  const startsFill = record.isSvg && isAccentColor(own.fill) && !isAccentColor(parent.fill);
  const startsStroke = record.isSvg && isAccentColor(own.stroke) && !isAccentColor(parent.stroke);
  const hits = paintsBox(own.background, record.borders) || startsColor || startsFill || startsStroke ? [record.label] : [];
  const pseudoHits = record.pseudos
    .filter((pseudo) => paintsBox(pseudo.background, pseudo.borders))
    .map((pseudo) => record.label.replace(' "', `${pseudo.name} "`));
  return [...hits, ...pseudoHits];
}

/**
 * For every section of the main content, the elements that draw the accent (#00E5A0) themselves. The accent is matched
 * by its three channels, whatever the alpha (rgb, or rgba with an alpha above 0), so a translucent accent counts too.
 * An element counts once when its own text color, background, border (a side with width and style), SVG fill or SVG
 * stroke is the accent, or when its ::before or ::after has the accent as background or border (a pseudo element
 * counts as an element of its own). Text color, fill and stroke are inherited, so they are counted where they start,
 * never again on the descendants. Gradients and shadows are not counted. The page reports only the elements whose
 * colours mention the three channels; the verdict (alpha, borders that draw, inheritance) is made here.
 */
export async function countAccentBySection(page: Page): Promise<AccentSection[]> {
  const sections = await collectPaint(page);
  return sections.map(({ name, records }) => ({ name, hits: records.flatMap(accentHitsOf) }));
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
