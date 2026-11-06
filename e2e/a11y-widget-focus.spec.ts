import { TAB_POSITION_STORAGE_KEY } from '../src/lib/tabPositionStorage';
import { openForTabbing, tabThroughPage } from './focusProbe';
import { expect, test } from './n8nGuard';

// WCAG 2.4.11 after the accessibility tab was moved: nothing the keyboard reaches may be covered by a floating button
// wherever the visitor put the tab (low and high on the right, in the middle and low on the left). Same probe as
// floating-focus.spec.ts (it tabs through every stop of the page and samples the focused element at five points once the
// browser has scrolled it into view), with the stored place set before the page loads.

const WINDOWS = [
  { width: 390, height: 844 },
  { width: 320, height: 640 },
  { width: 844, height: 390 },
];
const PLACES = [
  { side: 'right', ratio: 0.9 },
  { side: 'right', ratio: 0.1 },
  { side: 'right', ratio: 0 },
  { side: 'left', ratio: 0.5 },
  { side: 'left', ratio: 1 },
];
const PAGES = [
  { name: 'services', path: '/servicos' },
  { name: 'contact', path: '/contato' },
  // The blog is inside the site layout: it has the footer of the site, like the other pages.
  { name: 'blog', path: '/blog' },
];
const MIN_STOPS = 8;
const TEST_TIMEOUT_MS = 240_000;

for (const viewport of WINDOWS) {
  for (const place of PLACES) {
    test.describe(`${viewport.width}x${viewport.height}, tab on the ${place.side} at ${place.ratio}`, () => {
      test.use({ viewport });

      for (const { name, path } of PAGES) {
        test(`nothing the keyboard reaches on the ${name} page is covered by a floating button`, async ({
          page,
        }, testInfo) => {
          test.skip(testInfo.project.name !== 'mobile', 'the fixed layers are measured with touch windows');
          test.setTimeout(TEST_TIMEOUT_MS);
          await page.addInitScript(
            ([key, value]) => window.localStorage.setItem(key, value),
            [TAB_POSITION_STORAGE_KEY, JSON.stringify(place)],
          );
          await openForTabbing(page, path, false);

          const { problems, visited } = await tabThroughPage(page);

          expect(visited).toBeGreaterThan(MIN_STOPS);
          expect(problems).toEqual([]);
        });
      }
    });
  }
}
