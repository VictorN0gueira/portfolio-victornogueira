import AxeBuilder from '@axe-core/playwright';
import { enableLargeFont, openHome, walkPage } from './homeSupport';
import { expect, test } from './n8nGuard';

// Automated accessibility audit of the whole home in a real browser (colors and layout included, which jsdom cannot do),
// at a phone and at a desktop width, with the normal and the larger font. Reduced motion is on, so nothing is mid animation.
// Every `incomplete` result (axe could not decide) is attached to the test and listed in the report of the batch, to be
// triaged by hand. The page goes through the guard of ./n8nGuard like every spec that opens the real contact form.
const WIDTHS = [390, 1440];
const VIEWPORT_HEIGHT = 900;
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// Not a top level option: Playwright Test ignores `reducedMotion` there without a word, so it goes in contextOptions.
test.use({ contextOptions: { reducedMotion: 'reduce' } });

for (const width of WIDTHS) {
  for (const isLargeFont of [false, true]) {
    test(`has no axe violation on the home at ${width}px${isLargeFont ? ' with the larger font' : ''}`, async ({ page }, testInfo) => {
      // The widths are set here, so both Playwright projects would run the same four audits.
      test.skip(testInfo.project.name !== 'desktop', 'the audit sets its own widths: it runs once, in the desktop project');
      await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
      if (isLargeFont) await enableLargeFont(page);
      await openHome(page);
      await walkPage(page);

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
    });
  }
}
