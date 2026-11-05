import type { Page } from '@playwright/test';
import { blogCopy } from '../src/sections/blog/blogCopy';
import { addressTitleArticles, routeNews, stressArticles } from './blogFixtures';
import {
  ACCENT_RGB,
  MIN_TOUCH_PX,
  TOUCH_ROUNDING_PX,
  brokenWordsIn,
  enableLargeFont,
  measureOverflow,
  measureSmallTargets,
  menuButton,
  walkPage,
} from './homeSupport';
import { expect, test } from './n8nGuard';
import { describePageContract, openPage } from './pageContract';

const SKIP_LINK_NAME = 'Pular para o conteúdo';
const DESKTOP_NAV_MIN_WIDTH = 1024;
const MAIN_ID = 'main-content';
const FOCUS_TIMEOUT_MS = 10_000;
const NARROWEST = { width: 280, height: 640 };
const HEADINGS = 'h1, h2, h3';

const CONTRACT = {
  path: '/blog',
  title: /^Blog/,
  h1: blogCopy.title,
  readyHeading: blogCopy.listHeading,
  hasFloatingClearance: true,
  // The blog stays out of Google (the owner's decision): noindex, no canonical.
  isNoindex: true,
  beforeOpen: (page: Page) => routeNews(page, stressArticles()),
};

const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) >= DESKTOP_NAV_MIN_WIDTH;

async function followHeaderLink(page: Page, name: string) {
  if (isDesktop(page)) {
    await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name }).click();
    return;
  }
  await menuButton(page).click();
  await page.getByRole('dialog', { name: 'Menu de navegação' }).getByRole('link', { name }).click();
}

test.describe('page contract of /blog', () => {
  describePageContract(CONTRACT);
});

test.describe('/blog inside the site layout', () => {
  test('has the header, the one main landmark, one skip link and the footer of the site', async ({ page }) => {
    await openPage(page, CONTRACT);

    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('link', { name: SKIP_LINK_NAME })).toHaveCount(1);
    await expect(page.locator('footer#rodape')).toBeAttached();
    await expect(page.getByRole('link', { name: 'Voltar para a VN One' })).toHaveCount(0);
  });

  test('leaves the first tab stop to the skip link when the blog is opened by a reload', async ({ page }) => {
    await openPage(page, CONTRACT);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: CONTRACT.h1 })).toBeAttached();

    await page.keyboard.press('Tab');

    await expect(page.getByRole('link', { name: SKIP_LINK_NAME })).toBeFocused();
  });

  test('moves the focus to main when the visitor arrives by a link of the header or the menu', async ({ page }) => {
    await routeNews(page, stressArticles());
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeAttached();

    await followHeaderLink(page, 'Blog');

    await expect(page).toHaveURL(/\/blog$/);
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.id ?? ''), { timeout: FOCUS_TIMEOUT_MS })
      .toBe(MAIN_ID);
  });

  // The rule of the other pages now: after a step back the layout puts the focus on main (the blog used to leave it to the
  // browser). This is the change of rule of the move into SiteLayout.
  test('puts the focus on main after a step back to the blog, like every page of the site', async ({ page }) => {
    await routeNews(page, stressArticles());
    await page.goto('/blog');
    await expect(page.getByRole('heading', { level: 1, name: CONTRACT.h1 })).toBeAttached();
    await followHeaderLink(page, 'Sobre');
    await expect(page).toHaveURL(/\/sobre$/);
    await expect.poll(() => page.evaluate(() => document.activeElement?.id ?? ''), { timeout: FOCUS_TIMEOUT_MS }).toBe(MAIN_ID);
    await page.evaluate(() => (document.activeElement as HTMLElement).blur());

    await page.goBack();

    await expect(page).toHaveURL(/\/blog$/);
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.id ?? ''), { timeout: FOCUS_TIMEOUT_MS })
      .toBe(MAIN_ID);
  });

  test('starts the next page at the top when the visitor leaves a scrolled blog', async ({ page }) => {
    await openPage(page, CONTRACT);
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await followHeaderLink(page, 'Sobre');

    await expect(page).toHaveURL(/\/sobre$/);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });
});

test.describe('/blog cards and accent', () => {
  test('opens every article in a new tab with noopener and noreferrer, and loads covers with no referrer', async ({
    page,
  }) => {
    await openPage(page, CONTRACT);

    const links = page.locator('main a[target="_blank"]');
    expect(await links.count()).toBe(stressArticles().length);
    for (const link of await links.all()) {
      expect((await link.getAttribute('rel'))?.split(' ').sort()).toEqual(['noopener', 'noreferrer']);
    }
    for (const cover of await page.locator('main a img').all()) {
      await expect(cover).toHaveAttribute('referrerpolicy', 'no-referrer');
    }
  });

  test('draws the accent once in the list: the NOVO pill of the featured article', async ({ page }) => {
    await openPage(page, CONTRACT);

    const accents = await page.evaluate((accent) => {
      const painted = (element: Element) => {
        const style = getComputedStyle(element);
        return style.backgroundColor === accent || style.color === accent || style.borderTopColor === accent;
      };
      return Array.from(document.querySelectorAll('main *'))
        .filter(painted)
        .map((element) => `${element.tagName.toLowerCase()} ${(element.textContent ?? '').trim().slice(0, 20)}`);
    }, ACCENT_RGB);

    expect(accents).toEqual(['span NOVO']);
  });

  test('shows the whole of a long title inside its card', async ({
    page,
  }) => {
    await openPage(page, CONTRACT);

    const cut = await page.evaluate(() =>
      Array.from(document.querySelectorAll('main h3')).flatMap((title) => {
        const card = title.closest('a')?.getBoundingClientRect();
        const box = title.getBoundingClientRect();
        // A clamp hides whole lines; the few pixels the descenders of a tight line reach are not that.
        const isCutByClamp = title.scrollHeight > title.clientHeight + 8;
        const leaves = card && (box.right > card.right + 0.5 || box.left < card.left - 0.5);
        const label = (title.textContent ?? '').slice(0, 30);
        return isCutByClamp || leaves ? [`${label} (${title.scrollHeight} of ${title.clientHeight}, ${Math.round(box.right)} of ${Math.round(card?.right ?? 0)})`] : [];
      }),
    );

    expect(cut).toEqual([]);
  });
});

test.describe('/blog with an address as the title', () => {
  for (const width of [280, 390, 1440]) {
    test(`wraps it inside the card at ${width}px: no horizontal scroll, nothing past the edge`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await routeNews(page, addressTitleArticles());
      await page.goto('/blog');
      await expect(page.locator('main a[target="_blank"]').first()).toBeVisible();

      const overflow = await measureOverflow(page, width);
      expect(overflow.documentExcess, 'no horizontal scroll').toBeLessThanOrEqual(0);
      expect(overflow.elements, 'nothing past the right edge').toEqual([]);
      const leaves = await page.evaluate(() =>
        Array.from(document.querySelectorAll('main a[target="_blank"]')).flatMap((card) => {
          const box = card.getBoundingClientRect();
          return Array.from(card.querySelectorAll('h3, p, span')).filter((part) => part.getBoundingClientRect().right > box.right + 0.5).map((part) => part.tagName);
        }),
      );
      expect(leaves, 'every part stays inside its card').toEqual([]);
    });
  }
});

test.describe('/blog at the narrowest phone', () => {
  test.use({ viewport: NARROWEST, hasTouch: true, isMobile: true });

  for (const hasLargeFont of [false, true]) {
    test(`has no overflow, no broken word and 44px targets${hasLargeFont ? ' with the font at 120 percent' : ''}`, async ({
      page,
    }, testInfo) => {
      test.skip(
        testInfo.project.name !== 'desktop',
        'the test sets its own viewport: it runs once, in the desktop project',
      );
      test.slow();
      if (hasLargeFont) await enableLargeFont(page);
      await openPage(page, CONTRACT);
      const small = new Map<string, string>();
      await walkPage(page, async () => {
        for (const target of await measureSmallTargets(page, MIN_TOUCH_PX - TOUCH_ROUNDING_PX)) {
          small.set(
            `${target.element}|${Math.round(target.width)}x${Math.round(target.height)}`,
            `${target.element} ${target.width.toFixed(1)}x${target.height.toFixed(1)}`,
          );
        }
      });

      const overflow = await measureOverflow(page, NARROWEST.width);
      expect(overflow.documentExcess, 'no horizontal scroll').toBeLessThanOrEqual(0);
      expect(overflow.elements, 'nothing past the right edge').toEqual([]);
      expect(await brokenWordsIn(page, HEADINGS), 'no title word is broken in the middle').toEqual([]);
      expect([...small.values()], `no touch target under ${MIN_TOUCH_PX}px`).toEqual([]);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.screenshot({
        path: `e2e/__shots__/blog-${NARROWEST.width}x${NARROWEST.height}${hasLargeFont ? '-font' : ''}.png`,
        fullPage: true,
      });
    });
  }
});
