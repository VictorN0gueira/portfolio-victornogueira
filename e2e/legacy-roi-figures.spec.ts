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
