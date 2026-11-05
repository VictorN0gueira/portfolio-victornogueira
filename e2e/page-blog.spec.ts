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
  nextFrames,
  waitForSteadyHeight,
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
const MIN_SCROLLED_PX = 200;

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
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.id ?? ''), { timeout: FOCUS_TIMEOUT_MS })
      .toBe(MAIN_ID);
    await page.evaluate(() => (document.activeElement as HTMLElement).blur());

    await page.goBack();

    await expect(page).toHaveURL(/\/blog$/);
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.id ?? ''), { timeout: FOCUS_TIMEOUT_MS })
      .toBe(MAIN_ID);
  });

  test('starts the next page at the top when the visitor leaves a scrolled blog by a link of the header', async ({
    page,
  }) => {
    await openPage(page, CONTRACT);
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    // The visitor really is down the page when the link is pressed: the scroll is not reset before the click.
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(MIN_SCROLLED_PX);

    await followHeaderLink(page, 'Sobre');

    await expect(page).toHaveURL(/\/sobre$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Sobre mim' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });

  test('starts the site at the top when the visitor comes back from a scrolled blog', async ({ page }) => {
    await routeNews(page, stressArticles());
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
    await followHeaderLink(page, 'Blog');
    await expect(page.getByRole('heading', { level: 1, name: CONTRACT.h1 })).toBeAttached();
    await expect(page.locator('main a[target="_blank"]').first()).toBeVisible();
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(MIN_SCROLLED_PX);

    await page.goBack();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('banner')).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });
});

test.describe('/blog keeps the keyboard focus when a clear button goes away (WCAG 2.4.3)', () => {
  const searchField = (page: Page) => page.getByRole('textbox', { name: blogCopy.filters.searchLabel });
  const focusedId = (page: Page) =>
    page.evaluate(() => document.activeElement?.id ?? document.activeElement?.tagName ?? '');

  test('Limpar busca, pressed with the keyboard, leaves the focus in the search field', async ({ page }) => {
    await openPage(page, CONTRACT);
    await searchField(page).focus();
    await page.keyboard.type('Automação');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: blogCopy.filters.clearSearch })).toBeFocused();

    await page.keyboard.press('Enter');

    await expect(searchField(page)).toHaveValue('');
    await expect(searchField(page)).toBeFocused();
  });

  test('Limpar filtros of the band, pressed with the keyboard, leaves the focus in the search field', async ({
    page,
  }) => {
    await openPage(page, CONTRACT);
    await page.getByRole('button', { name: 'English' }).focus();
    await page.keyboard.press('Enter');
    const clear = page.getByRole('button', { name: blogCopy.filters.clear });
    await clear.focus();

    await page.keyboard.press('Enter');

    await expect(clear).toHaveCount(0);
    expect(await focusedId(page)).toBe('search');
    await expect(page.getByRole('button', { name: 'Todos idiomas' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('Limpar filtros of the empty block, pressed with the keyboard, leaves the focus in the search field', async ({
    page,
  }) => {
    await openPage(page, CONTRACT);
    await searchField(page).fill('nada disso existe');
    const clear = page.getByRole('button', { name: blogCopy.filters.clear });
    await expect(clear).toHaveCount(1);
    await clear.focus();

    await page.keyboard.press('Enter');

    await expect(searchField(page)).toHaveValue('');
    expect(await focusedId(page)).toBe('search');
    await expect(page.locator('main a[target="_blank"]').first()).toBeVisible();
  });
});

// The layout-shift entries of the page, from the moment the skeleton is on the screen: the list arriving must not push
// what the visitor already sees. (The jump of the footer when ANY lazy page replaces its fallback is a site-wide matter and
// happens before this point.)
test.describe('/blog does not move when the list arrives', () => {
  const MAX_SHIFT = 0.01;
  const readShifts = (page: Page) =>
    page.evaluate(() => (window as unknown as { __shifts: number[] }).__shifts.slice());

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    test(`shifts the layout by less than ${MAX_SHIFT} at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.addInitScript(() => {
        const shifts: number[] = [];
        (window as unknown as { __shifts: number[] }).__shifts = shifts;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as unknown as Array<{ value: number; hadRecentInput: boolean }>) {
            if (!entry.hadRecentInput) shifts.push(entry.value);
          }
        }).observe({ type: 'layout-shift', buffered: true });
      });
      let release: () => void = () => undefined;
      await routeNews(page, stressArticles(), new Promise<void>((resolve) => (release = resolve)));
      await page.goto('/blog');
      await expect(page.getByRole('status', { name: blogCopy.loadingLabel })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await nextFrames(page);
      const before = (await readShifts(page)).length;

      release();
      await expect(page.locator('main a[target="_blank"]').first()).toBeVisible();
      await waitForSteadyHeight(page);
      const shifts = (await readShifts(page)).slice(before);

      expect(
        shifts.reduce((sum, value) => sum + value, 0),
        `layout shifts: ${shifts.join(', ')}`,
      ).toBeLessThan(MAX_SHIFT);
    });
  }

  test('keeps the filter band in place while Atualizar loads again', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openPage(page, CONTRACT);
    const field = page.getByRole('textbox', { name: blogCopy.filters.searchLabel });
    // Its place in the document, not in the window: the walk of the page left the window at the bottom.
    const placeOf = () => field.evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
    const before = await placeOf();
    // The second answer waits, so the page can be looked at while it loads (a route added later wins over the first).
    let release: () => void = () => undefined;
    await routeNews(page, stressArticles(), new Promise<void>((resolve) => (release = resolve)));

    await page.getByRole('button', { name: new RegExp(blogCopy.refresh) }).click();

    await expect(field).toBeDisabled();
    expect(await placeOf()).toBe(before);
    release();
    await expect(page.locator('main a[target="_blank"]').first()).toBeVisible();
    await expect(field).toBeEnabled();
    expect(await placeOf()).toBe(before);
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

  test('shows the whole title of the featured card and keeps every title inside its card', async ({ page }) => {
    await openPage(page, CONTRACT);

    const cut = await page.evaluate(() =>
      Array.from(document.querySelectorAll('main h3')).flatMap((title, index) => {
        const card = title.closest('a')?.getBoundingClientRect();
        const box = title.getBoundingClientRect();
        // The featured card never clamps; a clamp hides whole lines, the few pixels the descenders of a tight line reach are not
        // that. The cards of the list clamp the title to three lines on purpose (the whole text stays in the link).
        const isCutByClamp = index === 0 && title.scrollHeight > title.clientHeight + 8;
        const leaves = card && (box.right > card.right + 0.5 || box.left < card.left - 0.5);
        const label = (title.textContent ?? '').slice(0, 30);
        return isCutByClamp || leaves
          ? [
              `${label} (${title.scrollHeight} of ${title.clientHeight}, ${Math.round(box.right)} of ${Math.round(card?.right ?? 0)})`,
            ]
          : [];
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
          return Array.from(card.querySelectorAll('h3, p, span'))
            .filter((part) => part.getBoundingClientRect().right > box.right + 0.5)
            .map((part) => part.tagName);
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
