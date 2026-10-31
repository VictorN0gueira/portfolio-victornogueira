import type { Page } from '@playwright/test';
import { enableLargeFont, menuButton } from './homeSupport';
import { expect, test } from './n8nGuard';

const MAIN_NAV_NAME = 'Navegação principal';
const SKIP_LINK_NAME = 'Pular para o conteúdo';
const MENU_DIALOG_NAME = 'Menu de navegação';

const TABLET_PORTRAIT = { width: 768, height: 1024 };
const TABLET_LANDSCAPE = { width: 1024, height: 768 };
const SMALLEST_PHONE = { width: 280, height: 653 };
const FULL_HD = { width: 1920, height: 1080 };
const ULTRA_WIDE = { width: 2560, height: 1080 };
const PHONE_390 = { width: 390, height: 844 };
const PHONE_LANDSCAPE = { width: 844, height: 390 };
const NARROW_PHONE_DRAWER_PX = 390;
const DRAWER_FROM_420_PX = 384;
const HEADER_MIN_GUTTER_PX = 12;
const PHONE_320 = { width: 320, height: 640 };
const DESKTOP_1440 = { width: 1440, height: 900 };
const ACCESSIBILITY_TAB_NAME = 'Abrir opções de acessibilidade';
// Sub pixel rounding of text boxes.
const LAYOUT_TOLERANCE_PX = 1;
const FONT_SIZE_TOLERANCE_PX = 0.5;

const SCROLL_DISTANCE = 400;
const TAB_PRESSES_INSIDE_MENU = 10;
const MAIN_NAV_LINKS = 6;

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

      await expect(menuButton(page)).toBeVisible();
      await expect(mainNav(page)).toBeHidden();
    });
  });

  test.describe('tablet in landscape', () => {
    test.use({ viewport: TABLET_LANDSCAPE });

    test('shows the desktop nav and hides the menu button', async ({ page }) => {
      await page.goto('/');

      await expect(mainNav(page)).toBeVisible();
      await expect(menuButton(page)).toBeHidden();
    });
  });
});

test.describe('desktop nav with the large font', () => {
  for (const viewport of [TABLET_LANDSCAPE, DESKTOP_1440]) {
    test(`keeps every label on one line in the scrolled pill at ${viewport.width}px`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'the viewport is set by this test');

      await enableLargeFont(page);
      await page.setViewportSize(viewport);
      await page.goto('/');
      await expect(page.locator('html')).toHaveClass(/a11y-font-large/);
      const header = siteHeader(page);
      await page.mouse.wheel(0, SCROLL_DISTANCE);
      await expect(header).toHaveAttribute('data-scrolled', 'true');
      // The pill narrows with a max-width transition: measure once it has settled.
      await header.evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));

      const { tops, navRight, ctaLeft } = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('header nav a'));
        const lineTops = links.flatMap((link) => {
          const range = document.createRange();
          range.selectNodeContents(link);
          return Array.from(range.getClientRects()).map((rect) => rect.top);
        });
        const nav = document.querySelector('header nav') as HTMLElement;
        const cta = document.querySelector('header a[href="/contato"]') as HTMLElement;
        return {
          tops: lineTops,
          navRight: nav.getBoundingClientRect().right,
          ctaLeft: cta.getBoundingClientRect().left,
        };
      });

      expect(tops.length).toBeGreaterThanOrEqual(MAIN_NAV_LINKS);
      for (const top of tops) {
        expect(Math.abs(top - tops[0])).toBeLessThanOrEqual(LAYOUT_TOLERANCE_PX);
      }
      expect(navRight).toBeLessThanOrEqual(ctaLeft + LAYOUT_TOLERANCE_PX);
    });
  }
});

test.describe('mobile menu', () => {
  test('opens as a dialog that traps focus and gives it back on Escape', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'the menu button only exists below 1024px');

    await page.goto('/');
    await menuButton(page).click();

    const dialog = page.getByRole('dialog', { name: MENU_DIALOG_NAME });
    await expect(dialog).toBeVisible();

    for (let press = 0; press < TAB_PRESSES_INSIDE_MENU; press += 1) {
      await page.keyboard.press('Tab');
      const isFocusInside = await dialog.evaluate((element) => element.contains(document.activeElement));
      expect(isFocusInside).toBe(true);
    }

    await page.keyboard.press('Escape');

    await expect(dialog).toBeHidden();
    await expect(menuButton(page)).toBeFocused();
  });

  test('closes after a link navigates to another page', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'the menu button only exists below 1024px');

    await page.goto('/');
    await menuButton(page).click();
    const dialog = page.getByRole('dialog', { name: MENU_DIALOG_NAME });

    await dialog.getByRole('link', { name: 'Sobre' }).click();

    await expect(page).toHaveURL(/\/sobre$/);
    await expect(dialog).toBeHidden();
  });
});

test.describe('mobile menu drawer width', () => {
  test.describe('phone 390x844', () => {
    test.use({ viewport: PHONE_390 });

    test('fills the whole screen, with no strip of page beside it', async ({ page }) => {
      await page.goto('/');
      await menuButton(page).click();

      const dialog = page.getByRole('dialog', { name: MENU_DIALOG_NAME });
      await expect(dialog).toBeVisible();
      await expect.poll(async () => (await dialog.boundingBox())?.x).toBe(0);
      expect((await dialog.boundingBox())?.width).toBe(NARROW_PHONE_DRAWER_PX);
    });
  });

  test.describe('tablet 768x1024', () => {
    test.use({ viewport: TABLET_PORTRAIT });

    test('is 24rem wide and docked to the right edge', async ({ page }) => {
      await page.goto('/');
      await menuButton(page).click();

      const dialog = page.getByRole('dialog', { name: MENU_DIALOG_NAME });
      await expect(dialog).toBeVisible();
      // The panel slides in, so the right edge is polled until it settles on the screen edge.
      await expect
        .poll(async () => {
          const box = await dialog.boundingBox();
          return (box?.x ?? 0) + (box?.width ?? 0);
        })
        .toBe(TABLET_PORTRAIT.width);
      expect((await dialog.boundingBox())?.width).toBe(DRAWER_FROM_420_PX);
    });
  });
});

test.describe('header on a phone held sideways', () => {
  test.use({ viewport: PHONE_LANDSCAPE });

  test('sits 8px higher, stays centered and keeps its side gutters', async ({ page }) => {
    await page.goto('/');

    const box = await page.getByRole('banner').boundingBox();
    expect(box?.y).toBe(HEADER_MIN_GUTTER_PX - 8);
    expect(box?.x).toBe(HEADER_MIN_GUTTER_PX);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBe(PHONE_LANDSCAPE.width - HEADER_MIN_GUTTER_PX);
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

  // fontSize is the site's "fonte maior" toggle: the root font grows to 120%, and the wordmark has to
  // keep fitting the box, which does not grow with it.
  const WORDMARK_CASES = [
    { viewport: SMALLEST_PHONE, isLargeFont: false },
    { viewport: ULTRA_WIDE, isLargeFont: false },
    { viewport: SMALLEST_PHONE, isLargeFont: true },
    { viewport: FULL_HD, isLargeFont: true },
    { viewport: ULTRA_WIDE, isLargeFont: true },
  ];

  for (const { viewport, isLargeFont } of WORDMARK_CASES) {
    const label = isLargeFont ? 'with the large font' : 'at the normal font';
    test(`keeps the wordmark inside its box at ${viewport.width}px ${label}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'the viewport is set by this test');

      if (isLargeFont) await enableLargeFont(page);
      await page.setViewportSize(viewport);
      await page.goto('/sobre');
      if (isLargeFont) await expect(page.locator('html')).toHaveClass(/a11y-font-large/);
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

  // The accessibility tab is fixed to the right edge, so on a narrow screen it can sit over the last letter.
  for (const viewport of [SMALLEST_PHONE, PHONE_320]) {
    test(`keeps the wordmark clear of the accessibility tab at ${viewport.width}px with the large font`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'the viewport is set by this test');

      await enableLargeFont(page);
      await page.setViewportSize(viewport);
      await page.goto('/sobre');
      await expect(page.locator('html')).toHaveClass(/a11y-font-large/);
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
      const wordmark = page.locator('footer#rodape [data-footer-wordmark]');
      await expect(wordmark).toBeInViewport();

      const textRight = await wordmark.evaluate((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return range.getBoundingClientRect().right;
      });
      const tab = await page.getByRole('button', { name: ACCESSIBILITY_TAB_NAME }).boundingBox();

      expect(tab).not.toBeNull();
      expect(textRight).toBeLessThanOrEqual((tab?.x ?? 0) + LAYOUT_TOLERANCE_PX);
    });
  }

  // The design size is clamp(4.5rem, 22vw, 20rem): the 72px floor at 320px (22vw would be 70.4px), then 22vw at 390px and 1440px.
  for (const { viewport, expectedFontSizePx } of [
    { viewport: PHONE_320, expectedFontSizePx: 72 },
    { viewport: PHONE_390, expectedFontSizePx: 85.8 },
    { viewport: DESKTOP_1440, expectedFontSizePx: 316.8 },
  ]) {
    test(`keeps the design size of the wordmark at ${viewport.width}px with the normal font`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'the viewport is set by this test');

      await page.setViewportSize(viewport);
      await page.goto('/sobre');
      const wordmark = page.locator('footer#rodape [data-footer-wordmark]');

      // Computed lengths are serialized differently per engine, so the number is compared with a tolerance.
      const fontSizePx = await wordmark.evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
      expect(Math.abs(fontSizePx - expectedFontSizePx)).toBeLessThanOrEqual(FONT_SIZE_TOLERANCE_PX);
    });
  }
});

test.describe('blog route', () => {
  test('does not render the new site header', async ({ page }) => {
    await page.goto('/blog');

    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(mainNav(page)).toHaveCount(0);
    await expect(page.getByRole('link', { name: SKIP_LINK_NAME })).toHaveCount(0);
    await expect(menuButton(page)).toHaveCount(0);
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
