import { expect, test, type Page } from '@playwright/test';

const MAIN_NAV_NAME = 'Navegação principal';
const SKIP_LINK_NAME = 'Pular para o conteúdo';
const MENU_DIALOG_NAME = 'Menu de navegação';

const TABLET_PORTRAIT = { width: 768, height: 1024 };
const TABLET_LANDSCAPE = { width: 1024, height: 768 };
const SMALLEST_PHONE = { width: 280, height: 653 };
const ULTRA_WIDE = { width: 2560, height: 1080 };

const SCROLL_DISTANCE = 400;
const TAB_PRESSES_INSIDE_MENU = 10;

function siteHeader(page: Page) {
  return page.getByRole('banner');
}

function mainNav(page: Page) {
  return page.getByRole('navigation', { name: MAIN_NAV_NAME });
}

test.describe('floating header', () => {
  test('turns data-scrolled on only after the page scrolls', async ({ page }) => {
    await page.goto('/');
    const header = siteHeader(page);

    await expect(header).toBeVisible();
    await expect(header).not.toHaveAttribute('data-scrolled', 'true');

    await page.mouse.wheel(0, SCROLL_DISTANCE);

    await expect(header).toHaveAttribute('data-scrolled', 'true');
  });

  test('marks the current page in the desktop nav', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'the desktop nav is hidden on phones');

    await page.goto('/servicos');

    await expect(mainNav(page).getByRole('link', { name: 'Serviços' })).toHaveAttribute('aria-current', 'page');
    await expect(mainNav(page).getByRole('link', { name: 'Sobre' })).not.toHaveAttribute('aria-current', 'page');
  });
});

test.describe('header by breakpoint', () => {
  test.describe('tablet in portrait', () => {
    test.use({ viewport: TABLET_PORTRAIT });

    test('shows the menu button and hides the desktop nav', async ({ page }) => {
      await page.goto('/');

      await expect(page.getByRole('button', { name: 'Abrir menu' })).toBeVisible();
      await expect(mainNav(page)).toBeHidden();
    });
  });

  test.describe('tablet in landscape', () => {
    test.use({ viewport: TABLET_LANDSCAPE });

    test('shows the desktop nav and hides the menu button', async ({ page }) => {
      await page.goto('/');

      await expect(mainNav(page)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Abrir menu' })).toBeHidden();
    });
  });
});

test.describe('mobile menu', () => {
  test('opens as a dialog that traps focus and gives it back on Escape', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'the menu button only exists below 1024px');

    await page.goto('/');
    const menuButton = page.getByRole('button', { name: 'Abrir menu' });
    await menuButton.click();

    const dialog = page.getByRole('dialog', { name: MENU_DIALOG_NAME });
    await expect(dialog).toBeVisible();

    for (let press = 0; press < TAB_PRESSES_INSIDE_MENU; press += 1) {
      await page.keyboard.press('Tab');
      const isFocusInside = await dialog.evaluate((element) => element.contains(document.activeElement));
      expect(isFocusInside).toBe(true);
    }

    await page.keyboard.press('Escape');

    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: 'Abrir menu' })).toBeFocused();
  });

  test('closes after a link navigates to another page', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'the menu button only exists below 1024px');

    await page.goto('/');
    await page.getByRole('button', { name: 'Abrir menu' }).click();
    const dialog = page.getByRole('dialog', { name: MENU_DIALOG_NAME });

    await dialog.getByRole('link', { name: 'Sobre' }).click();

    await expect(page).toHaveURL(/\/sobre$/);
    await expect(dialog).toBeHidden();
  });
});

test.describe('keyboard and assistive tech', () => {
  test('the first Tab from the top of the page focuses the skip link', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#main-content')).toBeAttached();

    await page.keyboard.press('Tab');

    await expect(page.getByRole('link', { name: SKIP_LINK_NAME })).toBeFocused();
  });

  test('activating the skip link moves focus to the main landmark', async ({ page }) => {
    await page.goto('/');

    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    await expect(page.locator('main#main-content')).toBeFocused();
  });

  test('every page has a single main landmark', async ({ page }) => {
    await page.goto('/servicos');

    await expect(page.locator('main')).toHaveCount(1);
  });
});

test.describe('footer', () => {
  test('has the id rodape and the legal links', async ({ page }) => {
    await page.goto('/sobre');
    const footer = page.locator('footer#rodape');

    await expect(footer).toBeAttached();
    await expect(footer.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacidade');
    await expect(footer.getByRole('link', { name: 'LGPD' })).toHaveAttribute('href', '/lgpd');
  });

  for (const viewport of [SMALLEST_PHONE, ULTRA_WIDE]) {
    test(`keeps the wordmark inside its box at ${viewport.width}px`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'the viewport is set by this test');

      await page.setViewportSize(viewport);
      await page.goto('/sobre');
      const wordmark = page.locator('footer#rodape [data-footer-wordmark]');
      await wordmark.scrollIntoViewIfNeeded();

      // overflow: clip hides the excess, so the rendered text is measured against its box instead of scrollWidth.
      const { textWidth, boxWidth } = await wordmark.evaluate((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return { textWidth: range.getBoundingClientRect().width, boxWidth: element.getBoundingClientRect().width };
      });
      expect(textWidth).toBeLessThanOrEqual(boxWidth + 1);
      const pageOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(pageOverflow).toBeLessThanOrEqual(0);
    });
  }
});

test.describe('blog route', () => {
  test('does not render the new site header', async ({ page }) => {
    await page.goto('/blog');

    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(mainNav(page)).toHaveCount(0);
    await expect(page.getByRole('link', { name: SKIP_LINK_NAME })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Abrir menu' })).toHaveCount(0);
  });

  // The blog and the site have different layouts, so going back is a layout swap and SiteLayout never sees
  // the old scroll position: App resets it. (The blog resets its own scroll when it mounts.)
  test('the site starts at the top when the visitor comes back from a scrolled blog', async ({ page }) => {
    await page.goto('/blog');
    const backLink = page.getByRole('link', { name: 'Voltar ao portfólio' });
    await backLink.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    await backLink.click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('banner')).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });
});
