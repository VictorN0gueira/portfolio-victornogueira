import { A11Y_STORAGE_KEY, PAGE_LOAD_TIMEOUT_MS } from './homeSupport';
import { expect, test } from './n8nGuard';
import { describePageContract, openPage, type PageContract } from './pageContract';

const UNKNOWN_PATH = '/rota-que-nao-existe';
const CONTRACT: PageContract = {
  path: UNKNOWN_PATH,
  title: /^Página não encontrada/,
  h1: /página não encontrada/i,
  hasFloatingClearance: true,
  isNoindex: true,
};
const GLITCH_LAYERS = ['.vn-glitch-a', '.vn-glitch-b'];
// The layers rest fully clipped: nothing of them is drawn.
const CLIPPED_AWAY = /inset\(0px 0px 100%/;

/** The animation a layer or the cursor runs, as the browser computed it. */
function animationOf(page: import('@playwright/test').Page, selector: string): Promise<string> {
  return page
    .locator(selector)
    .first()
    .evaluate((element) => getComputedStyle(element).animationName);
}

test.describe('the 404 page', () => {
  describePageContract(CONTRACT);

  test('is out of the index: noindex, no canonical and no structured data', async ({ page }) => {
    await openPage(page, CONTRACT);

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
  });

  test('gives the way back to the home page', async ({ page }) => {
    await openPage(page, CONTRACT);
    await page.getByRole('link', { name: 'Voltar ao início' }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(/página não encontrada/i);
  });

  test('plays the cursor and the glitch when motion is welcome', async ({ page }) => {
    await openPage(page, CONTRACT);

    await expect(page.locator('.vn-cursor').first()).toBeVisible();
    expect(await animationOf(page, '.vn-cursor')).toBe('vn-blink');
    expect(await animationOf(page, '.vn-glitch-a')).toBe('vn-glitch-a');
    expect(await animationOf(page, '.vn-glitch-b')).toBe('vn-glitch-b');
  });

  test.describe('with a preference for reduced motion', () => {
    test.use({ contextOptions: { reducedMotion: 'reduce' } });

    test('shows the title at once, the cursor visible and still, and the glitch layers clipped and still', async ({
      page,
    }) => {
      await openPage(page, CONTRACT);

      await expect(page.getByRole('heading', { level: 1 })).toHaveText(/página não encontrada/i);
      await expect(page.locator('[data-title-display]')).toHaveText('Página não encontrada');
      await expect(page.locator('.vn-cursor').first()).toBeVisible();
      expect(await animationOf(page, '.vn-cursor')).toBe('none');
      for (const layer of GLITCH_LAYERS) {
        expect(await animationOf(page, layer)).toBe('none');
        expect(await page.locator(layer).evaluate((element) => getComputedStyle(element).clipPath)).toMatch(
          CLIPPED_AWAY,
        );
      }
    });
  });

  test.describe('with the option to pause animations', () => {
    test('shows the title at once, the cursor visible and still, and the glitch layers clipped and still', async ({
      page,
    }) => {
      await page.addInitScript((key) => {
        localStorage.setItem(key, JSON.stringify({ noAnimations: true }));
      }, A11Y_STORAGE_KEY);
      await openPage(page, CONTRACT);

      await expect(page.locator('html')).toHaveClass(/a11y-no-animations/);
      await expect(page.locator('[data-title-display]')).toHaveText('Página não encontrada', {
        timeout: PAGE_LOAD_TIMEOUT_MS,
      });
      expect(await animationOf(page, '.vn-cursor')).toBe('none');
      for (const layer of GLITCH_LAYERS) {
        expect(await animationOf(page, layer)).toBe('none');
        expect(await page.locator(layer).evaluate((element) => getComputedStyle(element).clipPath)).toMatch(
          CLIPPED_AWAY,
        );
      }
    });
  });
});
