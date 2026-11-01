import { devices } from '@playwright/test';
import { measureOverflow, openHome, waitForSettledMotion, walkPage } from './homeSupport';
import { expect, test } from './n8nGuard';

// A full page capture of the home at ten sizes, to be looked at by a person (e2e/__shots__ is not committed). The spec
// fails only on real errors: an error on the page, an error in the console, or content past the right edge. It never
// compares pixels. The home mounts the real form, so the test comes from ./n8nGuard, and nothing here sends the form.
//
// What makes a capture whole and the same every time:
//  - one project writes the files (the desktop one): both projects used to write the same name, and the mobile one
//    (pixel ratio 2.625) left tiles of the page blank at 768px and up;
//  - the pixel ratio is 1 for every size, so a tall page is one clean image;
//  - the context asks for reduced motion, so the reveals, the stat counts and the hero panel are at their end state
//    (the marquee and the panel are drawn in their static form); the shot waits until no finite animation is running,
//    the text of the stats has stopped changing and the page height is steady, never for a fixed time.

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
const SHOT_PROJECT = 'desktop';

for (const { width, height, isTouch } of CAPTURES) {
  test.describe(`${width}x${height}`, () => {
    test.use({
      viewport: { width, height },
      hasTouch: isTouch,
      isMobile: isTouch,
      deviceScaleFactor: 1,
      userAgent: isTouch ? devices['Pixel 7'].userAgent : devices['Desktop Chrome'].userAgent,
      contextOptions: { reducedMotion: 'reduce' },
    });

    test('is captured whole, with no error on the page, in the console or past the right edge', async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== SHOT_PROJECT, `the captures are written by the ${SHOT_PROJECT} project only`);
      const pageErrors: string[] = [];
      const consoleErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });

      await openHome(page);
      await walkPage(page);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await waitForSettledMotion(page);
      await page.screenshot({ fullPage: true, path: `${SHOTS_DIR}/home-${testInfo.project.name}-${width}x${height}.png` });
      const overflow = await measureOverflow(page, width);

      expect.soft(pageErrors, 'errors thrown on the page').toEqual([]);
      expect.soft(consoleErrors, 'errors written to the console').toEqual([]);
      expect.soft(overflow.documentExcess, 'scrollWidth past the viewport width').toBeLessThanOrEqual(0);
      expect.soft(overflow.elements, 'visible elements past the right edge').toEqual([]);
    });
  });
}
