import { homeCopy } from '../src/data/homeCopy';
import { enableLargeFont } from './homeSupport';
import { expect, test } from './n8nGuard';

// The simulator of /contato at its largest inputs (80 hours, more than 10 people, R$ 5.000 an hour) prints two figures
// in full: "R$ 312.000.000" for the cost of a year and "R$ 249.600.000" for the savings. Both must stay inside their box
// on the narrowest phones, and also with the font at 120 percent (the option of the accessibility widget) at 320 and 390.
// The page mounts the real form, so this file takes its `test` from the guard: nothing here fills the form or sends anything.
const WIDTHS = [280, 300, 320, 360, 390];
const LARGE_FONT_WIDTHS = [320, 390];
const MAX_HOURS = '80';
const MAX_RATE = '5000';
const LARGEST_TEAM = /mais de 10 pessoas/;
const TEAM_GROUP = { name: homeCopy.roi.labels.team };
const EXPECTED_FIGURES = ['312.000.000', '249.600.000'];
const FIGURE_TOLERANCE_PX = 0.5;

// The figures are in the hidden-from-assistive-tech block of the result panel, written in full (14 characters at most).
const BIG_FIGURES = '[aria-hidden="true"] .tabular-nums';

interface FiguresCase {
  width: number;
  hasLargeFont: boolean;
}

const CASES: FiguresCase[] = [
  ...WIDTHS.map((width) => ({ width, hasLargeFont: false })),
  ...LARGE_FONT_WIDTHS.map((width) => ({ width, hasLargeFont: true })),
];

for (const { width, hasLargeFont } of CASES) {
  const font = hasLargeFont ? ' with the font at 120 percent' : '';
  test(`keeps both big figures of the /contato simulator inside their box at ${width}px${font} with the largest inputs`, async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'the viewport is set by this test');
    if (hasLargeFont) await enableLargeFont(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/contato');

    await page.locator('input[type="range"]').evaluate((range: HTMLInputElement, value: string) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(range, value);
      range.dispatchEvent(new Event('input', { bubbles: true }));
    }, MAX_HOURS);
    // The option is a native radio hidden behind its label, so the click goes to the label that draws it.
    await page.locator('label').filter({ hasText: LARGEST_TEAM }).first().click();
    await page.getByLabel(homeCopy.roi.labels.rate).fill(MAX_RATE);

    const figures = page.locator(BIG_FIGURES).filter({ hasText: /^R\$/ });
    await expect(figures).toHaveCount(EXPECTED_FIGURES.length);
    // The count runs to its final value in a fraction of a second: wait for both.
    for (const [index, figure] of EXPECTED_FIGURES.entries()) await expect(figures.nth(index)).toContainText(figure);
    if (hasLargeFont) await expect(page.locator('html')).toHaveClass(/a11y-font-large/);
    const overflow = await figures.evaluateAll((nodes) => nodes.map((node) => node.scrollWidth - node.clientWidth));
    const past = await figures.evaluateAll((nodes) =>
      nodes.map((node) => {
        const box = node.getBoundingClientRect();
        const container = node.closest('.\\@container')?.getBoundingClientRect();
        return container ? Math.max(0, box.right - container.right) : Number.NaN;
      }),
    );

    expect(overflow).toEqual([0, 0]);
    expect(past.every((value) => value <= FIGURE_TOLERANCE_PX)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(
      0,
    );
  });
}

// The team size options are two columns of labels. At 280 px the word "pessoas" (about 52 px) sits in a box of about the
// same width, so a label can clip or push its word out of the pill. Each pill must hold its text inside the padding box.
const TEAM_WIDTHS = [280, 320, 360];

for (const width of TEAM_WIDTHS) {
  test(`keeps the text of the team size options inside their pills at ${width}px`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'the viewport is set by this test');
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/contato');
    await expect(page.getByRole('radiogroup', TEAM_GROUP)).toBeVisible();

    const pills = await page.locator('[role="radiogroup"] label > span').evaluateAll((nodes) =>
      nodes.map((node) => {
        const pill = node as HTMLElement;
        const style = getComputedStyle(pill);
        const box = pill.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(pill);
        const text = range.getBoundingClientRect();
        const innerLeft = box.left + parseFloat(style.paddingLeft);
        const innerRight = box.right - parseFloat(style.paddingRight);
        return {
          label: pill.textContent,
          clippedBy: pill.scrollWidth - pill.clientWidth,
          pokesOutLeft: Math.max(0, innerLeft - text.left),
          pokesOutRight: Math.max(0, text.right - innerRight),
          boxRight: box.right,
        };
      }),
    );

    expect(pills).toHaveLength(4);
    for (const pill of pills) {
      expect(pill.clippedBy, `${pill.label} is clipped`).toBeLessThanOrEqual(0);
      expect(pill.pokesOutLeft, `${pill.label} leaves the padding on the left`).toBeLessThanOrEqual(0.5);
      expect(pill.pokesOutRight, `${pill.label} leaves the padding on the right`).toBeLessThanOrEqual(0.5);
      expect(pill.boxRight, `${pill.label} is past the viewport`).toBeLessThanOrEqual(width);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(
      0,
    );
  });
}
