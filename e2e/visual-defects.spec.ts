import type { Page } from '@playwright/test';
import { NEW_TAB_HINT } from '../src/components/ui/NewTabHint';
import { homeCopy } from '../src/data/homeCopy';
import { WHATSAPP_DISPLAY } from '../src/lib/constants';
import { enableLargeFont, menuButton, openHome, waitForSettledMotion, walkPage } from './homeSupport';
import { expect, test } from './n8nGuard';

// The visual defects of the REA comparison (D1 to D14) that a real browser has to confirm: layout, stacking and pixels
// that jsdom cannot see. The specs set their own viewport, so they run once, in the desktop project.

// eslint-disable-next-line no-empty-pattern -- Playwright wants the destructuring pattern of the fixtures, and this hook uses none
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'the viewports are set by each spec: one project is enough');
});

const WIDE = { width: 1440, height: 900 };
const NARROW = { width: 390, height: 844 };
const LAPTOP = { width: 1024, height: 768 };
const ALIGN_TOLERANCE_PX = 1;
// A pixel of the black of the site is about rgb(10, 10, 10); cream is rgb(242, 242, 242).
const DARK_MAX_CHANNEL = 60;

/** The colors of the pixels at the given points of a screenshot of the viewport, read back in the page. */
async function pixelsAt(page: Page, points: readonly { x: number; y: number }[]): Promise<number[][]> {
  const base64 = (await page.screenshot()).toString('base64');
  return page.evaluate(
    async ({ data, wanted }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${data}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d') as CanvasRenderingContext2D;
      context.drawImage(image, 0, 0);
      return wanted.map(({ x, y }) => Array.from(context.getImageData(x, y, 1, 1).data));
    },
    { data: base64, wanted: points },
  );
}

async function scrollToTop(page: Page, selector: string, offset: number) {
  await page.evaluate(
    ({ sel, gap }) => {
      const top = (document.querySelector(sel) as HTMLElement).getBoundingClientRect().top;
      window.scrollTo({ top: window.scrollY + top - gap, behavior: 'instant' });
    },
    { sel: selector, gap: offset },
  );
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

test.describe('D1 header pill', () => {
  test.use({ viewport: WIDE });

  test('is opaque white with no blur, so a large heading never shows through the logo', async ({ page }) => {
    await openHome(page);
    await walkPage(page);
    await page.evaluate((heading) => {
      const top = (Array.from(document.querySelectorAll('h2')).find((h2) => h2.textContent === heading) as HTMLElement).getBoundingClientRect().top;
      window.scrollTo({ top: window.scrollY + top - 20, behavior: 'instant' });
    }, homeCopy.statement.heading);

    const pill = await page.evaluate(() => {
      const layers = Array.from(document.querySelectorAll('header [data-header-pill] > span')) as HTMLElement[];
      const white = layers[1];
      const style = getComputedStyle(white);
      return {
        background: style.backgroundColor,
        backdrop: getComputedStyle(document.querySelector('header') as HTMLElement).backdropFilter,
        layerBackdrop: style.backdropFilter,
      };
    });
    expect(pill.background).toBe('rgb(255, 255, 255)');
    expect(pill.backdrop).toBe('none');
    expect(pill.layerBackdrop).toBe('none');
  });

  test('narrows to 860px by clipping, not by animating its width, and the content slides in with it', async ({ page }) => {
    await openHome(page);
    const header = page.locator('header').first();
    const widthBefore = (await header.boundingBox())?.width ?? 0;

    await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));
    await expect(header).toHaveAttribute('data-scrolled', 'true');
    await page.waitForFunction(() => document.querySelector('header')?.getAnimations({ subtree: true }).every((a) => a.playState !== 'running'));

    expect((await header.boundingBox())?.width, 'the header element keeps its box').toBeCloseTo(widthBefore, 0);
    const logo = await page.getByRole('link', { name: 'VN One, página inicial' }).first().boundingBox();
    const cta = await page.getByRole('link', { name: 'vamos conversar' }).first().boundingBox();
    const headerBox = (await header.boundingBox()) as { x: number; width: number };
    const pillWidth = 860;
    const pillLeft = headerBox.x + (headerBox.width - pillWidth) / 2;
    expect(logo?.x ?? 0, 'the logo sits inside the narrower pill').toBeGreaterThanOrEqual(pillLeft);
    expect((cta?.x ?? 0) + (cta?.width ?? 0), 'the CTA sits inside the narrower pill').toBeLessThanOrEqual(pillLeft + pillWidth);
  });
});

test.describe('D2 services cards', () => {
  for (const viewport of [WIDE, LAPTOP]) {
    test(`line up their dividers, lists and terms at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await openHome(page);
      await walkPage(page);
      await waitForSettledMotion(page);

      const tops = await page.evaluate((heading) => {
        const section = Array.from(document.querySelectorAll('h2'))
          .find((h2) => h2.textContent === heading)
          ?.closest('section') as HTMLElement;
        const cards = Array.from(section.querySelectorAll('article'));
        const part = (card: Element, selector: string) => (card.querySelector(selector) as HTMLElement).getBoundingClientRect().top;
        return {
          dividers: cards.map((card) => part(card, '.border-t')),
          names: cards.map((card) => part(card, 'h3')),
          terms: cards.map((card) => part(card, 'p.font-mono:last-of-type')),
        };
      }, homeCopy.services.heading);

      expect(tops.dividers.length).toBe(3);
      for (const group of [tops.dividers, tops.names, tops.terms]) {
        expect(Math.max(...group) - Math.min(...group)).toBeLessThanOrEqual(ALIGN_TOLERANCE_PX);
      }
    });
  }
});

test.describe('D3 client grid', () => {
  for (const viewport of [WIDE, NARROW]) {
    test(`has no empty cell at ${viewport.width}px: every row is filled edge to edge`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await openHome(page);
      await walkPage(page);

      const rows = await page.evaluate((kicker) => {
        const list = Array.from(document.querySelectorAll('ul')).find((ul) => {
          const label = ul.getAttribute('aria-labelledby');
          return label && document.getElementById(label)?.textContent === kicker;
        }) as HTMLElement;
        const box = list.getBoundingClientRect();
        const byRow = new Map<number, { width: number; hasLogo: boolean }[]>();
        for (const cell of Array.from(list.children) as HTMLElement[]) {
          const rect = cell.getBoundingClientRect();
          const row = byRow.get(Math.round(rect.top)) ?? [];
          row.push({ width: rect.width, hasLogo: cell.querySelector('img') !== null });
          byRow.set(Math.round(rect.top), row);
        }
        return { listWidth: box.width, rows: Array.from(byRow.values()) };
      }, homeCopy.clients.kicker);

      expect(rows.rows.length).toBeGreaterThan(1);
      for (const row of rows.rows) {
        expect(row.every((cell) => cell.hasLogo)).toBe(true);
        const total = row.reduce((sum, cell) => sum + cell.width, 0);
        expect(Math.abs(total - rows.listWidth)).toBeLessThanOrEqual(ALIGN_TOLERANCE_PX + 2);
      }
    });
  }
});

test.describe('D6 seam between the final CTA and the footer', () => {
  for (const viewport of [WIDE, NARROW]) {
    test(`shows no cream wedge at the corners of the footer at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await openHome(page);
      await walkPage(page);
      await scrollToTop(page, '#rodape', 300);

      const top = await page.evaluate(() => Math.round((document.querySelector('#rodape') as HTMLElement).getBoundingClientRect().top));
      const points = [
        { x: 1, y: top + 1 },
        { x: viewport.width - 2, y: top + 1 },
        { x: 3, y: top + 3 },
        { x: viewport.width - 4, y: top + 3 },
        { x: 1, y: top - 3 },
        { x: viewport.width - 2, y: top - 3 },
      ];
      const colors = await pixelsAt(page, points);

      for (const [index, color] of colors.entries()) {
        expect(Math.max(color[0], color[1], color[2]), `pixel ${JSON.stringify(points[index])} is ${color}`).toBeLessThanOrEqual(DARK_MAX_CHANNEL);
      }
    });
  }
});

test.describe('D7 scan line of the final CTA', () => {
  test.use({ viewport: WIDE });

  /** Screenshots of the content column with the line at one height, and with the line taken out. */
  async function columnWithAndWithoutLine(page: Page, progress: number, mask: 'keep' | 'remove') {
    return page.evaluate(
      ({ ratio, maskMode }) => {
        const section = document.getElementById('contato') as HTMLElement;
        const line = section.querySelector('.vn-scan-line') as HTMLElement;
        line.style.animation = 'none';
        line.style.transform = `translateY(${(ratio - 1) * 100}%)`;
        if (maskMode === 'remove') {
          line.style.maskImage = 'none';
          line.style.webkitMaskImage = 'none';
        }
        const column = section.querySelector('[class*="max-w-[1216px]"]') as HTMLElement;
        const rect = column.getBoundingClientRect();
        const pageTop = rect.top + window.scrollY;
        return { x: rect.left + 48, y: pageTop, width: rect.width - 96, height: rect.height, lineY: section.getBoundingClientRect().top + window.scrollY + ratio * section.getBoundingClientRect().height };
      },
      { ratio: progress, maskMode: mask },
    );
  }

  async function prepare(page: Page) {
    await openHome(page);
    await walkPage(page);
    await waitForSettledMotion(page);
    await page.addStyleTag({
      content: '.vn-cursor{animation:none!important} #contato [class*="max-w-[1216px]"]{visibility:hidden!important}',
    });
  }

  test('adds no pixel inside the column of the heading and the form, wherever the sweep is', async ({ page }) => {
    await prepare(page);
    const section = page.locator('#contato');
    await section.scrollIntoViewIfNeeded();

    for (const progress of [0.2, 0.4, 0.6, 0.8]) {
      const clip = await columnWithAndWithoutLine(page, progress, 'keep');
      const withLine = await page.screenshot({ fullPage: true, clip });
      await page.evaluate(() => {
        ((document.querySelector('#contato .vn-scan-line') as HTMLElement).style.display = 'none');
      });
      const withoutLine = await page.screenshot({ fullPage: true, clip });
      await page.evaluate(() => {
        ((document.querySelector('#contato .vn-scan-line') as HTMLElement).style.display = '');
      });

      expect(Buffer.compare(withLine, withoutLine), `the line at ${progress * 100}% of the section`).toBe(0);
    }
  });

  test('the check can see the line: with the mask removed the line shows inside the column', async ({ page }) => {
    await prepare(page);
    await page.locator('#contato').scrollIntoViewIfNeeded();

    const clip = await columnWithAndWithoutLine(page, 0.5, 'remove');
    const withLine = await page.screenshot({ fullPage: true, clip });
    await page.evaluate(() => {
      ((document.querySelector('#contato .vn-scan-line') as HTMLElement).style.display = 'none');
    });
    const withoutLine = await page.screenshot({ fullPage: true, clip });

    expect(Buffer.compare(withLine, withoutLine)).not.toBe(0);
  });
});

test.describe('D10 hero sentence', () => {
  const FIRST_WIDTH = 280;
  const LAST_WIDTH = 1100;
  const WIDTH_STEP = 20;
  const widths = Array.from({ length: (LAST_WIDTH - FIRST_WIDTH) / WIDTH_STEP + 1 }, (_, index) => FIRST_WIDTH + index * WIDTH_STEP);

  /**
   * The rows of the h1, word by word (a piece of several words may wrap inside itself, so the pieces are not enough),
   * the words that a line break cut in the middle, and whether the page grew sideways.
   */
  async function readHeading(page: Page) {
    return page.getByRole('heading', { level: 1 }).evaluate((h1) => {
      const boxes: { center: number; word: string | null }[] = [];
      const brokenWords: string[] = [];
      for (const item of Array.from(h1.querySelectorAll('[data-reveal-item]')) as HTMLElement[]) {
        const isWordItem = item.querySelector('button') === null && !/\d|R\$/.test(item.textContent ?? '');
        if (!isWordItem) {
          for (const rect of Array.from(item.getClientRects())) boxes.push({ center: rect.top + rect.height / 2, word: null });
          continue;
        }
        const text = item.firstChild as Text;
        for (const match of (text.data ?? '').matchAll(/\S+/g)) {
          const range = document.createRange();
          range.setStart(text, match.index ?? 0);
          range.setEnd(text, (match.index ?? 0) + match[0].length);
          const rects = Array.from(range.getClientRects());
          if (rects.length > 1) brokenWords.push(match[0]);
          boxes.push({ center: rects[0].top + rects[0].height / 2, word: match[0] });
        }
      }
      boxes.sort((first, second) => first.center - second.center);
      // Boxes whose centers are less than a pill apart (a pill is taller than a word) are on the same line.
      const rows: { word: string | null }[][] = [];
      let previous = -Infinity;
      for (const box of boxes) {
        if (box.center - previous > 22) rows.push([]);
        rows[rows.length - 1].push(box);
        previous = box.center;
      }
      const page = document.documentElement;
      return { rows, brokenWords, overflows: page.scrollWidth > page.clientWidth };
    });
  }

  for (const hasLargeFont of [false, true]) {
    test(`leaves no plain word alone on a line, and nothing overflows, every ${WIDTH_STEP}px from ${FIRST_WIDTH} to ${LAST_WIDTH}px (${hasLargeFont ? 'larger font' : 'normal font'})`, async ({ page }) => {
      if (hasLargeFont) await enableLargeFont(page);
      await page.setViewportSize({ width: FIRST_WIDTH, height: 844 });
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await waitForSettledMotion(page);

      const problems: string[] = [];
      for (const width of widths) {
        await page.setViewportSize({ width, height: 844 });
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const { rows, brokenWords, overflows } = await readHeading(page);
        for (const row of rows) {
          if (row.length === 1 && row[0].word !== null) problems.push(`${width}px: a line holds only "${row[0].word}"`);
        }
        if (brokenWords.length > 0) problems.push(`${width}px: a line break cut ${brokenWords.join(', ')} in the middle`);
        if (overflows) problems.push(`${width}px: the page grew sideways`);
      }
      expect(problems).toEqual([]);
    });
  }
});

test.describe('D2 menu on demand', () => {
  test.use({ viewport: NARROW });

  test('loads the menu code when the pointer reaches the button, before the tap', async ({ page }) => {
    const chunks: string[] = [];
    page.on('request', (request) => {
      if (/MobileMenu/.test(request.url())) chunks.push(request.url());
    });
    await page.goto('/');
    await expect(menuButton(page)).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(chunks, 'nothing of the menu before the button is touched').toEqual([]);

    await menuButton(page).hover();
    await expect.poll(() => chunks.length).toBeGreaterThan(0);
    await menuButton(page).click();

    await expect(page.getByRole('dialog', { name: 'Menu de navegação' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(menuButton(page)).toBeFocused();
  });

  test('underlines the current page in the menu', async ({ page }) => {
    await page.goto('/sobre');
    await menuButton(page).click();

    const current = page.getByRole('dialog').getByRole('link', { name: 'Sobre' });
    await expect(current).toHaveAttribute('aria-current', 'page');
    await expect(current).toHaveCSS('text-decoration-line', 'underline');
    await expect(page.getByRole('dialog').getByRole('link', { name: 'Serviços' })).toHaveCSS('text-decoration-line', 'none');
  });

  test('keeps the page and offers the same links when the menu chunk cannot be loaded', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.route(/MobileMenu.*\.js/, (route) => route.abort());
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await menuButton(page).hover();
    await menuButton(page).click();

    const panel = page.getByRole('navigation', { name: 'Menu principal' });
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('link', { name: 'Sobre' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeAttached();
    expect(pageErrors, 'the failed chunk is not an uncaught error').toEqual([]);

    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(menuButton(page)).toBeFocused();

    await menuButton(page).click();
    await panel.getByRole('link', { name: 'Sobre' }).click();
    await expect(page).toHaveURL(/\/sobre$/);
    await expect(panel).toBeHidden();
  });
});

test.describe('D2 menu fallback in a phone held sideways', () => {
  test.use({ viewport: { width: 863, height: 360 }, hasTouch: true });

  test('keeps every link and the call to action reachable when the chunk cannot be loaded', async ({ page }) => {
    await page.route(/MobileMenu.*\.js/, (route) => route.abort());
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await menuButton(page).tap();

    const nav = page.getByRole('navigation', { name: 'Menu principal' });
    await expect(nav).toBeVisible();
    const panel = page.locator('[id]', { has: nav }).last();
    const metrics = await panel.evaluate((node) => {
      const box = node.getBoundingClientRect();
      return { bottom: box.bottom, overflowY: getComputedStyle(node).overflowY, canScroll: node.scrollHeight > node.clientHeight };
    });
    expect(metrics.bottom, 'the panel ends inside the window').toBeLessThanOrEqual(360);
    expect(metrics.overflowY).toBe('auto');
    expect(metrics.canScroll, 'what does not fit scrolls inside the panel').toBe(true);

    const cta = panel.getByRole('link', { name: 'vamos conversar' });
    await cta.scrollIntoViewIfNeeded();
    const ctaBox = await cta.boundingBox();
    expect((ctaBox?.y ?? 0) + (ctaBox?.height ?? 0)).toBeLessThanOrEqual(360);
    await expect(cta).toBeInViewport();
  });
});

test.describe('the new tab hint in the accessibility tree', () => {
  test.use({ viewport: NARROW });

  test('is the description of the links that open a tab, and never a loose sentence of the page', async ({ page }) => {
    await openHome(page);
    await walkPage(page);

    const tree = await page.locator('body').ariaSnapshot();
    expect(tree, 'no node of the tree reads the hint on its own').not.toContain(`text: ${NEW_TAB_HINT}`);

    const footer = page.getByRole('contentinfo');
    await expect(footer.getByRole('link', { name: WHATSAPP_DISPLAY })).toHaveAccessibleDescription(NEW_TAB_HINT);
    await expect(footer.getByRole('link', { name: 'Instagram' })).toHaveAccessibleDescription(NEW_TAB_HINT);
    await expect(page.getByRole('link', { name: 'Falar no WhatsApp' }).first()).toHaveAccessibleDescription(NEW_TAB_HINT);
  });
});
