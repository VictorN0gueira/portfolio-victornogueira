import { measureOverflow, openHome, walkPage } from './homeSupport';
import { expect, test } from './n8nGuard';

// A full page capture of the home at ten sizes, to be looked at by a person (e2e/__shots__ is not committed). The spec
// fails only on real errors: an error on the page, an error in the console, or content past the right edge. It never
// compares pixels. The home mounts the real form, so the test comes from ./n8nGuard, and nothing here sends the form.

interface Capture {
  width: number;
  height: number;
  isTouch: boolean;
}

const CAPTURES: readonly Capture[] = [
  { width: 280, height: 653, isTouch: true },
  { width: 320, height: 568, isTouch: true },
  { width: 375, height: 667, isTouch: true },
  { width: 390, height: 844, isTouch: true },
  { width: 768, height: 1024, isTouch: true },
  { width: 1024, height: 768, isTouch: true },
  { width: 1440, height: 900, isTouch: false },
  { width: 1920, height: 1080, isTouch: false },
  { width: 2560, height: 1440, isTouch: false },
  { width: 844, height: 390, isTouch: true },
];
const SHOTS_DIR = 'e2e/__shots__';

for (const { width, height, isTouch } of CAPTURES) {
  test.describe(`${width}x${height}`, () => {
    test.use({ viewport: { width, height }, hasTouch: isTouch, isMobile: isTouch });

    test('is captured whole, with no error on the page, in the console or past the right edge', async ({ page }) => {
      const pageErrors: string[] = [];
      const consoleErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });

      await openHome(page);
      await walkPage(page);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.screenshot({ fullPage: true, path: `${SHOTS_DIR}/home-${width}x${height}.png` });
      const overflow = await measureOverflow(page, width);

      expect.soft(pageErrors, 'errors thrown on the page').toEqual([]);
      expect.soft(consoleErrors, 'errors written to the console').toEqual([]);
      expect.soft(overflow.documentExcess, 'scrollWidth past the viewport width').toBeLessThanOrEqual(0);
      expect.soft(overflow.elements, 'visible elements past the right edge').toEqual([]);
    });
  });
}
