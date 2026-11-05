import AxeBuilder from '@axe-core/playwright';
import { devices, type Locator, type Page } from '@playwright/test';
import { a11yWidgetCopy } from '../src/components/a11yWidgetCopy';
import {
  A11Y_STORAGE_KEY,
  MIN_TOUCH_PX,
  PAGE_LOAD_TIMEOUT_MS,
  TOUCH_ROUNDING_PX,
  brokenWordsIn,
  countAccentBySection,
  enableLargeFont,
  measureOverflow,
  measureSmallTargets,
  nextFrames,
  walkPage,
} from './homeSupport';
import { expect, test } from './n8nGuard';

// The contract every inner page proves (items 1 to 7, 8 and 9 of "Contrato por página" in the plan of the inner pages):
// structure, no overflow, 44px targets, one accent per section, the floating buttons out of the way, reduced motion, axe
// and the head of the page. A spec gives its page to describePageContract and adds the cases that are only its own.
//
// The specs that call it take their `test` from ./n8nGuard like every spec (src/test/e2e-guard.test.ts reads the import),
// so they wrap the call in `test.describe(...)`. A page that mounts the contact form is covered by the same guard:
// nothing here fills a field or presses a submit button, and the Enviar button is only measured.

export interface PageContract {
  /** '/servicos' */
  path: string;
  /** The <title> of the page. */
  title: RegExp;
  h1: string | RegExp;
  /** A heading of level 2 that only exists once the page is ready (lazy sections included). A page with only its h1 (the 404) leaves it out. */
  readyHeading?: string | RegExp;
  /** The page mounts the contact form: the test waits for form[name="contact"] and measures the Enviar button. */
  hasContactForm?: boolean;
  /** Measures the floating buttons (WhatsApp and accessibility) against the footer and the form, at 320 and 390. */
  hasFloatingClearance?: boolean;
  /** A "not found" page: noindex and no canonical, instead of one canonical. */
  isNoindex?: boolean;
}

interface Viewport {
  width: number;
  height: number;
  /** Phones and tablets are touch screens, laptops and monitors are not. */
  isTouch: boolean;
}

// One test per width, at the five widths of the plan plus a phone held sideways. The tests set their own viewport and
// touch options (devices.spec.ts does the same), so the results do not depend on the Playwright project.
const VIEWPORTS: readonly Viewport[] = [
  { width: 320, height: 568, isTouch: true },
  { width: 390, height: 844, isTouch: true },
  { width: 768, height: 1024, isTouch: true },
  { width: 1024, height: 768, isTouch: true },
  { width: 1440, height: 900, isTouch: false },
  { width: 844, height: 390, isTouch: true },
];
const LARGE_FONT_WIDTHS = [320, 390];
const FLOATING_WIDTHS = [320, 390];
const AXE_WIDTHS = [390, 1440];
const AXE_HEIGHT = 900;
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const HEADINGS = 'h1, h2, h3';
const MAX_ACCENT_PER_SECTION = 1;
const SHOTS_DIR = 'e2e/__shots__';
const EDGE_MARGIN_PX = 8;
const TOUCH_AGENT = devices['Pixel 7'].userAgent;
const DESKTOP_AGENT = devices['Desktop Chrome'].userAgent;
const WHATSAPP_LANDMARK = 'Contato rápido';
const ONLY_IN_DESKTOP = 'the test sets its own viewport: it runs once, in the desktop project';

const slugOf = (path: string): string => (path === '/' ? 'home' : path.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-'));
const sizeLabel = (viewport: Viewport): string => `${viewport.width}x${viewport.height}`;

/** The page is ready when its h1, one heading of level 2 of the lazy part and (if it has one) the form are in the page. */
export async function openPage(page: Page, contract: PageContract): Promise<void> {
  await page.goto(contract.path);
  if (contract.hasContactForm) {
    await expect(page.locator('form[name="contact"]')).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT_MS });
  }
  await expect(page.getByRole('heading', { level: 1, name: contract.h1 })).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT_MS });
  if (contract.readyHeading !== undefined) {
    await expect(page.getByRole('heading', { level: 2, name: contract.readyHeading }).first()).toBeAttached({
      timeout: PAGE_LOAD_TIMEOUT_MS,
    });
  }
  await walkPage(page);
}

interface StructureReport {
  h1Count: number;
  levels: number[];
  mainCount: number;
  brokenLabels: string[];
}

function readStructure(page: Page): Promise<StructureReport> {
  return page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const brokenLabels = Array.from(document.querySelectorAll('section[aria-labelledby]')).flatMap((section) =>
      (section.getAttribute('aria-labelledby') ?? '')
        .split(/\s+/)
        .filter((id) => id !== '' && document.getElementById(id) === null)
        .map((id) => `${section.tagName.toLowerCase()} points at #${id}`),
    );
    return {
      h1Count: document.querySelectorAll('h1').length,
      levels: headings.map((heading) => Number(heading.tagName.slice(1))),
      mainCount: document.querySelectorAll('main').length,
      brokenLabels,
    };
  });
}

/** The levels of the headings in the order of the DOM, as the first being 1 and each next one at most one deeper. */
export function findSkippedLevels(levels: readonly number[]): string[] {
  const problems = levels[0] === 1 ? [] : [`the first heading is an h${levels[0]}, not the h1`];
  levels.forEach((level, index) => {
    if (index > 0 && level > levels[index - 1] + 1) problems.push(`h${levels[index - 1]} is followed by h${level}`);
  });
  return problems;
}

async function expectStructure(page: Page): Promise<void> {
  const report = await readStructure(page);

  expect(report.h1Count, 'exactly one h1').toBe(1);
  expect(report.mainCount, 'a single main, the one of the layout').toBe(1);
  expect(findSkippedLevels(report.levels), `headings in order: ${report.levels.join(',')}`).toEqual([]);
  expect(report.brokenLabels, 'every section named by aria-labelledby points at an id that exists').toEqual([]);
}

async function expectHead(page: Page, contract: PageContract): Promise<void> {
  await expect(page).toHaveTitle(contract.title);
  await expect.poll(() => page.locator('head [data-static-seo]').count()).toBe(0);
  await expect(page.locator('meta[name="description"]')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(contract.isNoindex ? 0 : 1);
  if (contract.isNoindex) await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(1);
}

interface LayoutOptions {
  viewport: Viewport;
  contract: PageContract;
  /** Writes the full page capture to e2e/__shots__. */
  hasShot?: boolean;
}

/** Overflow, broken words in the titles, touch targets (on touch screens) and the accent count, then the capture. */
async function auditLayout(page: Page, { viewport, contract, hasShot = false }: LayoutOptions): Promise<void> {
  const small = new Map<string, string>();
  await openPage(page, contract);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await walkPage(page, async () => {
    if (!viewport.isTouch) return;
    for (const target of await measureSmallTargets(page, MIN_TOUCH_PX - TOUCH_ROUNDING_PX)) {
      small.set(`${target.element}|${Math.round(target.width)}x${Math.round(target.height)}`, `${target.element} ${target.width.toFixed(1)}x${target.height.toFixed(1)}`);
    }
  });
  const overflow = await measureOverflow(page, viewport.width);

  expect(overflow.documentExcess, 'no horizontal scroll').toBeLessThanOrEqual(0);
  expect(overflow.elements, 'nothing past the right edge').toEqual([]);
  expect(await brokenWordsIn(page, HEADINGS), 'no word of a title is broken in the middle').toEqual([]);
  expect([...small.values()], `no touch target under ${MIN_TOUCH_PX}px`).toEqual([]);
  for (const { name, hits } of await countAccentBySection(page)) {
    expect(hits.length, `${name}: ${hits.join(' | ')}`).toBeLessThanOrEqual(MAX_ACCENT_PER_SECTION);
  }
  if (hasShot) {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await nextFrames(page);
    await page.screenshot({ path: `${SHOTS_DIR}/${slugOf(contract.path)}-${sizeLabel(viewport)}.png`, fullPage: true });
  }
}

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

async function rectOf(target: Locator): Promise<Rect> {
  const box = await target.boundingBox();
  if (!box) throw new Error('the element has no box');
  return { left: box.x, top: box.y, right: box.x + box.width, bottom: box.y + box.height };
}

const overlaps = (first: Rect, second: Rect): boolean =>
  Math.min(first.right, second.right) > Math.max(first.left, second.left) &&
  Math.min(first.bottom, second.bottom) > Math.max(first.top, second.top);

// Found by the label of the landmark, not by role: the same locators of e2e/floating-layout.spec.ts, which this copies.
const whatsAppLink = (page: Page): Locator => page.locator(`aside[aria-label="${WHATSAPP_LANDMARK}"] a`);
const accessibilityTab = (page: Page): Locator =>
  page.locator(`aside[aria-label="${a11yWidgetCopy.panelLabel}"] button[aria-label="${a11yWidgetCopy.triggerLabel}"]`);

/** The boxes of the footer links, one per line a link takes. */
function footerLinkRects(page: Page): Promise<Array<Rect & { name: string }>> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('footer a')).flatMap((link) =>
      Array.from(link.getClientRects()).map((box) => ({
        name: (link.getAttribute('aria-label') ?? link.textContent ?? '').trim().slice(0, 40),
        left: box.left,
        top: box.top,
        right: box.right,
        bottom: box.bottom,
      })),
    ),
  );
}

/** The two floating buttons apart, inside the window and off the edges. */
async function checkButtons(page: Page): Promise<string[]> {
  const size = page.viewportSize();
  const whatsApp = await rectOf(whatsAppLink(page));
  const tab = await rectOf(accessibilityTab(page));
  const problems: string[] = [];

  if (overlaps(whatsApp, tab)) problems.push('the WhatsApp button and the tab overlap');
  if (size && (whatsApp.left < EDGE_MARGIN_PX || whatsApp.bottom > size.height - EDGE_MARGIN_PX)) {
    problems.push('the WhatsApp button hugs the edge of the window');
  }
  return problems;
}

/** With the form centred in the window, the Enviar button is clear of both buttons and no fixed layer is at its centre. */
async function checkEnviar(page: Page): Promise<string[]> {
  const submit = page.locator('form[name="contact"]').getByRole('button', { name: 'Enviar', exact: true });
  await submit.evaluate((button) => button.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await nextFrames(page);
  const problems: string[] = [];
  const box = await rectOf(submit);

  for (const [name, target] of [['WhatsApp button', whatsAppLink(page)], ['tab', accessibilityTab(page)]] as const) {
    if (overlaps(box, await rectOf(target))) problems.push(`Enviar (centred) is overlapped by the ${name}`);
  }
  const coveredBy = await submit.evaluate((button) => {
    const rect = button.getBoundingClientRect();
    const hit = document.elementFromPoint((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2);
    return hit?.closest('header, aside')?.tagName.toLowerCase() ?? null;
  });
  if (coveredBy) problems.push(`Enviar (centred): the point at its centre reaches the ${coveredBy}`);
  return problems;
}

/** At the end of the page no footer link is under a floating button. */
async function checkFooter(page: Page): Promise<string[]> {
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await nextFrames(page);
  const height = page.viewportSize()?.height ?? 0;
  const buttons = [
    ['WhatsApp button', await rectOf(whatsAppLink(page))],
    ['tab', await rectOf(accessibilityTab(page))],
  ] as const;
  const problems: string[] = [];

  for (const link of await footerLinkRects(page)) {
    if (link.right <= link.left || link.bottom <= 0 || link.top >= height) continue;
    for (const [name, box] of buttons) {
      if (overlaps(link, box)) problems.push(`footer link "${link.name}" is overlapped by the ${name} at the end of the page`);
    }
  }
  return problems;
}

/**
 * Whether the two floating buttons leave the page alone: they keep apart, clear of the Enviar button (when the page has
 * the form) and of the footer links at the end. The measurement of e2e/floating-layout.spec.ts, as a function.
 */
export async function measureFloatingClearance(page: Page, hasContactForm: boolean): Promise<string[]> {
  await expect(accessibilityTab(page)).toBeVisible();
  return [
    ...(await checkButtons(page)),
    ...(hasContactForm ? await checkEnviar(page) : []),
    ...(await checkFooter(page)),
  ];
}

/** The elements that hold content and are drawn with an opacity of 0 once the page was walked: nothing may stay hidden. */
function findInvisibleContent(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('body *'))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const hasContent = (element.textContent ?? '').trim() !== '' || element.querySelector('img, svg') !== null;
        const isDecoration = element.closest('[aria-hidden="true"], [hidden], .sr-only') !== null;
        return style.opacity === '0' && rect.width > 0 && rect.height > 0 && hasContent && !isDecoration;
      })
      .map((element) => `${element.tagName.toLowerCase()} "${(element.textContent ?? '').trim().slice(0, 40)}"`),
  );
}

async function expectNothingHidden(page: Page, contract: PageContract): Promise<void> {
  await openPage(page, contract);
  expect(await findInvisibleContent(page), 'nothing stays at opacity 0').toEqual([]);
}

async function expectNoAxeViolation(page: Page, testInfo: { attach: (name: string, options: { body: string; contentType: string }) => Promise<void> }): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

  await testInfo.attach('axe-incomplete', {
    body: JSON.stringify(results.incomplete.map((item) => ({ id: item.id, nodes: item.nodes.length })), null, 2),
    contentType: 'application/json',
  });
  const summary = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    targets: violation.nodes.map((node) => node.target.join(' ')),
  }));
  expect(summary).toEqual([]);
}

function defineWidthTests(contract: PageContract): void {
  for (const viewport of VIEWPORTS) {
    test.describe(`at ${sizeLabel(viewport)}`, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
        hasTouch: viewport.isTouch,
        isMobile: viewport.isTouch,
        deviceScaleFactor: 1,
        userAgent: viewport.isTouch ? TOUCH_AGENT : DESKTOP_AGENT,
      });

      test('has no overflow, no broken title word, 44px targets and at most one accent per section', async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'desktop', ONLY_IN_DESKTOP);
        test.slow();
        await auditLayout(page, { viewport, contract, hasShot: true });
      });

      if (LARGE_FONT_WIDTHS.includes(viewport.width)) {
        test('holds the same with the font at 120 percent', async ({ page }, testInfo) => {
          test.skip(testInfo.project.name !== 'desktop', ONLY_IN_DESKTOP);
          test.slow();
          await enableLargeFont(page);
          await auditLayout(page, { viewport, contract });
          await expect(page.locator('html')).toHaveClass(/a11y-font-large/);
        });
      }

      if (contract.hasFloatingClearance && FLOATING_WIDTHS.includes(viewport.width)) {
        test('leaves the floating buttons clear of the page', async ({ page }, testInfo) => {
          test.skip(testInfo.project.name !== 'desktop', ONLY_IN_DESKTOP);
          test.slow();
          await openPage(page, contract);
          expect(await measureFloatingClearance(page, contract.hasContactForm === true)).toEqual([]);
        });
      }
    });
  }
}

function defineMotionTests(contract: PageContract): void {
  test.describe('with a preference for reduced motion', () => {
    test.use({ contextOptions: { reducedMotion: 'reduce' } });

    test('shows everything, with nothing at opacity 0', async ({ page }) => {
      test.slow();
      await expectNothingHidden(page, contract);
    });
  });

  test.describe('with the option to pause animations', () => {
    test('shows everything, with nothing at opacity 0', async ({ page }) => {
      test.slow();
      await page.addInitScript((key) => {
        localStorage.setItem(key, JSON.stringify({ noAnimations: true }));
      }, A11Y_STORAGE_KEY);
      await expectNothingHidden(page, contract);
      await expect(page.locator('html')).toHaveClass(/a11y-no-animations/);
    });
  });
}

function defineAxeTests(contract: PageContract): void {
  // Not a top level option: Playwright Test ignores `reducedMotion` there without a word, so it goes in contextOptions.
  test.describe('accessibility audit', () => {
    test.use({ contextOptions: { reducedMotion: 'reduce' } });

    for (const width of AXE_WIDTHS) {
      test(`has no axe violation at ${width}px`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'desktop', ONLY_IN_DESKTOP);
        test.slow();
        await page.setViewportSize({ width, height: AXE_HEIGHT });
        await openPage(page, contract);
        await expectNoAxeViolation(page, testInfo);
      });
    }
  });
}

/** Registers the tests of the contract of one page. Call it inside a `test.describe` of the spec. */
export function describePageContract(contract: PageContract): void {
  test.describe(`contract of ${contract.path}`, () => {
    test('has one h1 first, no skipped level, one main and sections that name themselves', async ({ page }) => {
      test.slow();
      await openPage(page, contract);
      await expectStructure(page);
    });

    test('has the title, one description and the canonical of the page in the head', async ({ page }) => {
      await openPage(page, contract);
      await expectHead(page, contract);
    });

    defineWidthTests(contract);
    defineMotionTests(contract);
    defineAxeTests(contract);
  });
}
