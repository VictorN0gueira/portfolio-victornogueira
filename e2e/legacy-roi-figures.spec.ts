import { expect, test } from './n8nGuard';

// The old calculator of /contato at its largest inputs prints "R$ 312 mi" and "R$ 249,6 mi". They must stay inside the
// card padding on the narrowest phones (before: 27 px past the box at 280 px, 7 px at 300 px).
const WIDTHS = [280, 300, 320, 360, 390];
const MAX_HOURS = '80';
const MAX_RATE = '5000';

for (const width of WIDTHS) {
  test(`keeps the big figures of the /contato calculator inside their box at ${width}px with the largest inputs`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'the viewport is set by this test');
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/contato');

    await page.locator('input[type="range"]').evaluate((range: HTMLInputElement, value: string) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(range, value);
      range.dispatchEvent(new Event('input', { bubbles: true }));
    }, MAX_HOURS);
    // The option is a native radio hidden behind its label, so the click goes to the label that draws it.
    await page.locator('label').filter({ hasText: /mais de 10 pessoas/ }).first().click();
    await page.getByLabel('Custo médio por hora da equipe em reais').fill(MAX_RATE);

    const figures = page.locator('p.tabular-nums').filter({ hasText: /mi$/ });
    await expect(figures).toHaveCount(2);
    await expect(figures.first()).toContainText('312');
    const overflow = await figures.evaluateAll((nodes) => nodes.map((node) => node.scrollWidth - node.clientWidth));

    expect(overflow).toEqual([0, 0]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
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
    await expect(page.getByRole('radiogroup', { name: 'Pessoas que executam essa tarefa' })).toBeVisible();

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
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
}
