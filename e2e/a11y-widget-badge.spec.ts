import AxeBuilder from '@axe-core/playwright';
import { enableLargeFont, openHome } from './homeSupport';
import { expect, test } from './n8nGuard';
import { trigger } from './tabSupport';

// WCAG 2.5.3 Label in Name (axe rule label-content-name-mismatch): with an option on, the count badge shows a digit on the
// tab, whose name is the constant label of the tab. The digit is drawn by CSS (data-count), so the button has no visible
// text that its name leaves out, and the digit is still on screen. The home mounts the real form: the guard of ./n8nGuard
// is on and nothing here sends it.

test('the count of options on is drawn by CSS: the tab has no visible text outside its name, and axe finds no mismatch', async ({
  page,
}) => {
  await enableLargeFont(page);
  await openHome(page);
  const tab = trigger(page);
  await expect(tab).toBeVisible();

  expect(await tab.evaluate((node) => node.textContent)).toBe('');
  const drawn = await tab.evaluate((node) => {
    const badge = node.querySelector('[data-count]');
    return badge ? getComputedStyle(badge, '::after').content : null;
  });
  expect(drawn).toBe('"1"');

  const results = await new AxeBuilder({ page })
    .include('aside button[aria-expanded]')
    .withRules(['label-content-name-mismatch'])
    .analyze();
  expect(results.violations).toEqual([]);
});
