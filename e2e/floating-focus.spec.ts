import { enableLargeFont } from './homeSupport';
import { openForTabbing, tabThroughPage } from './focusProbe';
import { expect, test } from './n8nGuard';

// WCAG 2.4.11 (Focus Not Obscured): the two fixed layers of the site, the WhatsApp button at the bottom left and the
// accessibility tab at the right edge, must never hide the control that has the keyboard focus. The spec tabs through
// EVERY focusable element of the home, the services page and the contact page. Once the browser has scrolled the
// focused element into view (and the glide has stopped), elementFromPoint at its centre and at its four inner corners
// has to return the element itself or one of its descendants. Five phone widths plus a tablet and a phone on its side,
// where the tab is centred on the edge instead of over the bottom margin (the desktop project would only repeat the
// work), with the normal font and with the larger font preference.

const PHONE_WIDTHS = [
  { width: 280, height: 653 },
  { width: 320, height: 640 },
  { width: 360, height: 740 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 768, height: 1024 },
  { width: 844, height: 390 },
];
const PAGES = [
  { name: 'home', path: '/' },
  { name: 'services', path: '/servicos' },
  { name: 'contact', path: '/contato' },
];
const TEST_TIMEOUT_MS = 240_000;

for (const viewport of PHONE_WIDTHS) {
  for (const hasLargeFont of [false, true]) {
    test.describe(`${viewport.width}px${hasLargeFont ? ' with the larger font' : ''}`, () => {
      test.use({ viewport });

      for (const { name, path } of PAGES) {
        test(`nothing the keyboard reaches on the ${name} page is covered by a floating button`, async ({ page }, testInfo) => {
          test.skip(testInfo.project.name !== 'mobile', 'the fixed layers are measured with touch windows');
          test.setTimeout(TEST_TIMEOUT_MS);
          if (hasLargeFont) await enableLargeFont(page);
          await openForTabbing(page, path, name === 'home');

          const { problems, visited } = await tabThroughPage(page);

          // A page this size has dozens of stops: a run that saw only a few never really walked it.
          expect(visited).toBeGreaterThan(name === 'home' ? 30 : 8);
          expect(problems).toEqual([]);
        });
      }
    });
  }
}
