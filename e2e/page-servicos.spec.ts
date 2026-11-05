import { describePageContract } from './pageContract';
import { expect, test } from './n8nGuard';

const SLUG = 'sistema-web-sob-medida';
// The card sits under the fixed header (scroll-mt-28 is 112 px) and well inside the first screen.
const MIN_TOP_PX = 40;
const MAX_TOP_PX = 200;

test.describe('page contract of /servicos', () => {
  describePageContract({
    path: '/servicos',
    title: /^Serviços/,
    h1: 'Serviços',
    readyHeading: 'Combos',
    hasContactForm: false,
    hasFloatingClearance: true,
  });
});

test.describe('/servicos cases of its own', () => {
  test('puts the card of the hash under the header and moves focus to its name', async ({ page }) => {
    await page.goto(`/servicos#${SLUG}`);
    const card = page.locator(`#${SLUG}`);

    await expect(card).toBeVisible();
    await expect
      .poll(() => card.evaluate((element) => element.getBoundingClientRect().top))
      .toBeGreaterThan(MIN_TOP_PX);
    await expect.poll(() => card.evaluate((element) => element.getBoundingClientRect().top)).toBeLessThan(MAX_TOP_PX);
    await expect(card.getByRole('heading', { level: 2 })).toBeFocused();
  });

  test('shows the six services and the three combos with no percentage and no price', async ({ page }) => {
    await page.goto('/servicos');
    await expect(page.getByRole('heading', { level: 2, name: 'Combos' })).toBeAttached();

    await expect(page.locator('main article')).toHaveCount(6);
    const text = await page.locator('main').innerText();
    expect(text).not.toMatch(/\d\s*%/);
    expect(text).not.toMatch(/R\$/);
    expect(text).not.toMatch(/desconto/i);
  });
});
