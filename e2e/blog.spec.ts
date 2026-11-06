import type { Locator, Page } from '@playwright/test';
import { defaultArticles, routeNews, sampleArticle, type SampleArticle } from './blogFixtures';
import { expect, test } from './n8nGuard';

const SKIP_LINK_NAME = 'Pular para o conteúdo';
const VIEWPORTS = [
  { width: 320, height: 640 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];
const MIN_TARGET_PX = 44;
const MIN_TEXT_CONTRAST = 4.5;
// The cream of the hero and of the list, and the white of the filter band, where the chips and the field sit.
const CREAM = [242, 242, 242];
const WHITE_BAND = [255, 255, 255];
const INK_RING = 'rgb(26, 26, 26)';

async function openBlog(page: Page, articles: SampleArticle[] = defaultArticles()) {
  await routeNews(page, articles);
  await page.goto('/blog');
  await expect(page.locator('main a[target="_blank"]').first()).toBeVisible();
}

// These helpers look at the boxes themselves, so a box that sticks out is found even where the document does not scroll.
const VIEWPORT_SLACK_PX = 0.5;
const LAYOUT_TARGETS: Record<string, string> = {
  title: 'h1',
  'refresh button': 'main button[aria-disabled]',
  'data source line': 'main p[role="status"]',
  'search field': '#search',
  'language chips row': '[role="group"][aria-label="Filtrar por idioma"]',
  'topic chips row': '[role="group"][aria-label="Filtrar por tópico"]',
  'article cards': 'main a[target="_blank"]',
  footer: 'footer',
};

async function boxesOutsideViewport(page: Page): Promise<string[]> {
  return page.evaluate(
    ({ targets, slack }) => {
      const width = document.documentElement.clientWidth;
      return Object.entries(targets).flatMap(([name, selector]) =>
        Array.from(document.querySelectorAll(selector)).flatMap((element, index) => {
          const box = element.getBoundingClientRect();
          const outside = box.left < -slack || box.right > width + slack;
          return outside
            ? [`${name} #${index}: ${Math.round(box.left)} to ${Math.round(box.right)} in a ${width}px viewport`]
            : [];
        }),
      );
    },
    { targets: LAYOUT_TARGETS, slack: VIEWPORT_SLACK_PX },
  );
}

/** Where the focus ring of an element (its box grown by the outline width and offset) is cut off: by the viewport or by an ancestor that clips. */
async function clippedRingSides(element: Locator): Promise<string[]> {
  return element.evaluate((node) => {
    const style = getComputedStyle(node);
    const grow = parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
    const box = node.getBoundingClientRect();
    const ring = { left: box.left - grow, top: box.top - grow, right: box.right + grow, bottom: box.bottom + grow };
    const slack = 0.5;
    const sides: string[] = [];
    const check = (
      owner: string,
      area: { left: number; top: number; right: number; bottom: number },
      horizontal: boolean,
      vertical: boolean,
    ) => {
      if (horizontal && ring.left < area.left - slack) sides.push(owner + ' left');
      if (horizontal && ring.right > area.right + slack) sides.push(owner + ' right');
      if (vertical && ring.top < area.top - slack) sides.push(owner + ' top');
      if (vertical && ring.bottom > area.bottom + slack) sides.push(owner + ' bottom');
    };
    check('viewport', { left: 0, top: 0, right: document.documentElement.clientWidth, bottom: Infinity }, true, false);
    for (let ancestor = node.parentElement; ancestor; ancestor = ancestor.parentElement) {
      const overflow = getComputedStyle(ancestor);
      const clipsX = overflow.overflowX !== 'visible';
      const clipsY = overflow.overflowY !== 'visible';
      if (!clipsX && !clipsY) continue;
      const outer = ancestor.getBoundingClientRect();
      const left = outer.left + ancestor.clientLeft;
      const top = outer.top + ancestor.clientTop;
      check(
        ancestor.tagName.toLowerCase() + '.' + ancestor.className.split(' ')[0],
        { left, top, right: left + ancestor.clientWidth, bottom: top + ancestor.clientHeight },
        clipsX,
        clipsY,
      );
    }
    return sides;
  });
}

function luminance([red, green, blue]: number[]): number {
  const [r, g, b] = [red, green, blue].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: number[], background: number[]): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

function parseRgb(value: string): number[] {
  return (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
}

for (const viewport of VIEWPORTS) {
  test.describe(`blog at ${viewport.width}px`, () => {
    test.use({ viewport });

    test('has no horizontal scroll, a working skip link and filter chips that say which one is on', async ({
      page,
    }) => {
      await openBlog(page);

      expect(await boxesOutsideViewport(page)).toEqual([]);

      await page.keyboard.press('Tab');
      const skip = page.getByRole('link', { name: SKIP_LINK_NAME });
      await expect(skip).toBeFocused();
      await expect(skip).toBeInViewport();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('main')).toBeFocused();
      expect(new URL(page.url()).hash).toBe('');

      const all = page
        .getByRole('group', { name: 'Filtrar por idioma' })
        .getByRole('button', { name: 'Todos idiomas' });
      const english = page.getByRole('group', { name: 'Filtrar por idioma' }).getByRole('button', { name: 'English' });
      await expect(all).toHaveAttribute('aria-pressed', 'true');
      await expect(english).toHaveAttribute('aria-pressed', 'false');
      await english.click();
      await expect(english).toHaveAttribute('aria-pressed', 'true');
      await expect(all).toHaveAttribute('aria-pressed', 'false');
      await expect(page.getByRole('link', { name: 'Artigo de teste 2' })).toBeVisible();
    });
  });
}

test.describe('blog controls', () => {
  test.use({ viewport: VIEWPORTS[1] });

  test('has a clear button of at least 44px and a visible focus ring on the search field', async ({ page }) => {
    await openBlog(page);
    const search = page.getByRole('textbox', { name: 'Buscar artigos' });

    await search.focus();
    const readRing = () =>
      search.evaluate((input) => {
        const style = getComputedStyle(input);
        return { style: style.outlineStyle, width: parseFloat(style.outlineWidth), color: style.outlineColor };
      });
    await expect.poll(async () => (await readRing()).width).toBeGreaterThanOrEqual(2);
    const ring = await readRing();
    expect(ring.style).not.toBe('none');
    expect(ring.color).toBe(INK_RING);

    await search.fill('Artigo');
    const box = await page.getByRole('button', { name: 'Limpar busca' }).boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(MIN_TARGET_PX);
    expect(box?.height).toBeGreaterThanOrEqual(MIN_TARGET_PX);
  });
});

for (const viewport of VIEWPORTS) {
  test.describe(`blog focus rings at ${viewport.width}px`, () => {
    test.use({ viewport });

    test('shows the whole focus ring of the first and the last chip of each row, clipped by no ancestor', async ({
      page,
    }) => {
      await openBlog(page);

      for (const row of ['Filtrar por idioma', 'Filtrar por tópico']) {
        const chips = page.getByRole('group', { name: row }).getByRole('button');
        for (const chip of [chips.first(), chips.last()]) {
          await chip.focus();
          // The ring is read once its width has settled.
          await expect
            .poll(() => chip.evaluate((node) => parseFloat(getComputedStyle(node).outlineWidth)))
            .toBeGreaterThanOrEqual(2);
          expect(await clippedRingSides(chip), `${row}: ${await chip.textContent()}`).toEqual([]);
        }
      }
    });
  });
}

test.describe('blog controls, contrast', () => {
  test.use({ viewport: VIEWPORTS[1] });

  test('reaches 4.5:1 for the muted texts, the placeholder and the inactive chips', async ({ page }) => {
    await openBlog(page);
    await page.getByRole('textbox', { name: 'Buscar artigos' }).fill('xyz');
    // The empty block has the one Limpar filtros (on the cream list); the band shows none when nothing matches.
    await expect(page.getByText('Tenta outros filtros ou limpa a busca.')).toBeVisible();

    const colors = await page.evaluate(() => {
      const read = (element: Element | null, pseudo?: string) =>
        element ? getComputedStyle(element, pseudo).color : '';
      const search = document.getElementById('search');
      const chip = Array.from(document.querySelectorAll('button[aria-pressed="false"]'))[0];
      const status = document.querySelector('main [role="status"]');
      const note = Array.from(document.querySelectorAll('p')).find((p) =>
        /sites de terceiros/.test(p.textContent ?? ''),
      );
      const count = Array.from(document.querySelectorAll('p')).find((p) => /encontrado/.test(p.textContent ?? ''));
      const clear = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Limpar filtros',
      );
      return {
        placeholder: read(search, '::placeholder'),
        chip: read(chip ?? null),
        status: read(status),
        note: read(note ?? null),
        count: read(count ?? null),
        clear: read(clear ?? null),
      };
    });

    for (const [name, value] of Object.entries(colors)) {
      const background = ['status', 'note', 'clear'].includes(name) ? CREAM : WHITE_BAND;
      expect(contrast(parseRgb(value), background), name).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    }
  });
});

// A one pixel white PNG: the cover the third party might send, the worst case for a pill that has no surface of its own.
const WHITE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC',
  'base64',
);
const WHITE_COVER = 'https://images.unsplash.com/photo-white-cover?w=800';
const WHITE = [255, 255, 255];

/** Mixes a color that may be transparent over an opaque one, the way the browser paints it. */
function paintOver(foreground: number[], alpha: number, background: number[]): number[] {
  return foreground.map((channel, index) => channel * alpha + background[index] * (1 - alpha));
}

function parseRgba(value: string): { rgb: number[]; alpha: number } {
  const numbers = (value.match(/[\d.]+/g) ?? []).map(Number);
  return { rgb: numbers.slice(0, 3), alpha: numbers.length > 3 ? numbers[3] : 1 };
}

test.describe('blog tag pills on a white cover', () => {
  for (const viewport of [VIEWPORTS[0], VIEWPORTS[3]]) {
    test.describe(`at ${viewport.width}px`, () => {
      test.use({ viewport });

      test('reads white text at 4.5:1 or more on the language pill and on the topic pill, even over a white picture', async ({
        page,
      }) => {
        await page.route(WHITE_COVER, (route) =>
          route.fulfill({ status: 200, contentType: 'image/png', body: WHITE_PNG }),
        );
        const articles = [1, 2, 3].map((index) => ({ ...sampleArticle(index, 'pt'), image: WHITE_COVER }));
        await openBlog(page, articles);
        await expect
          .poll(() =>
            page.evaluate(() =>
              Array.from(document.querySelectorAll('a img')).every(
                (img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0,
              ),
            ),
          )
          .toBe(true);

        const pills = await page.evaluate(() =>
          Array.from(document.querySelectorAll('[id$="-tags"] > span')).map((pill) => {
            const style = getComputedStyle(pill);
            return { text: pill.textContent?.trim() ?? '', color: style.color, background: style.backgroundColor };
          }),
        );

        expect(pills.length).toBeGreaterThanOrEqual(6);
        for (const pill of pills) {
          const background = parseRgba(pill.background);
          const surface = paintOver(background.rgb, background.alpha, WHITE);
          expect(contrast(parseRgb(pill.color), surface), pill.text).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
        }
      });
    });
  }
});

// The pills sit on the cover, the NOVO pill at its top right corner: with the longest tags at the narrowest widths they must
// not touch each other, and the pills must stay inside the cover.
const NARROW_VIEWPORTS = [320, 360, 390];
const FRESH = () => new Date(Date.now() - 30 * 60 * 1000).toISOString();

function tagStressArticles(): SampleArticle[] {
  const base = {
    description: 'Resumo do artigo',
    image: '',
    source: { name: 'Uma fonte com nome bem comprido', url: 'https://example.com' },
  };
  return [
    { ...sampleArticle(0, 'pt'), title: 'O destaque da lista' },
    {
      ...sampleArticle(1, 'en'),
      ...base,
      title: 'Machine learning in production: a title long enough to wrap onto three lines of the card',
      publishedAt: FRESH(),
    },
    {
      ...sampleArticle(2, 'en'),
      ...base,
      title: 'Automação de processos para equipes pequenas, com um título que quebra em várias linhas',
      publishedAt: FRESH(),
    },
    { ...sampleArticle(3, 'pt'), ...base, title: 'Workflow n8n do começo ao fim', publishedAt: FRESH() },
    { ...sampleArticle(4, 'en'), ...base, title: 'Autonomous agent loop', publishedAt: FRESH() },
    {
      ...sampleArticle(5, 'pt'),
      ...base,
      title: 'Machine learning em produção',
      publishedAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    },
  ];
}

async function overlappingCardParts(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const intersects = (a: DOMRect, b: DOMRect) =>
      a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    const problems: string[] = [];
    const cards = Array.from(document.querySelectorAll<HTMLElement>('main a[target="_blank"]')).slice(1);
    cards.forEach((card, cardIndex) => {
      const label = `card ${cardIndex + 1} (${card.querySelector('h3')?.textContent?.slice(0, 24)})`;
      const cover = card.querySelector('img')?.parentElement?.getBoundingClientRect();
      const pills = Array.from(card.querySelectorAll<HTMLElement>('[id$="-tags"] > span'));
      const novo = card.querySelector<HTMLElement>('[id$="-new"]');
      const parts = [
        ...pills.map((pill, index) => ({
          name: `pill ${index} ${pill.textContent?.trim()}`,
          box: pill.getBoundingClientRect(),
        })),
        ...(novo ? [{ name: 'NOVO', box: novo.getBoundingClientRect() }] : []),
      ];
      parts.forEach((part, index) => {
        parts.slice(index + 1).forEach((other) => {
          if (intersects(part.box, other.box)) problems.push(`${label}: ${part.name} touches ${other.name}`);
        });
        if (cover && (part.box.left < cover.left || part.box.right > cover.right))
          problems.push(`${label}: ${part.name} leaves the cover`);
      });
      const meta = Array.from(card.querySelectorAll<HTMLElement>('[id$="-meta"] > div'));
      if (meta.length === 2 && intersects(meta[0].getBoundingClientRect(), meta[1].getBoundingClientRect()))
        problems.push(`${label}: the time and the source touch`);
      const metaBox = card.querySelector('[id$="-meta"]')?.getBoundingClientRect();
      meta.forEach((part) => {
        if (metaBox && part.getBoundingClientRect().right > metaBox.right + 0.5)
          problems.push(`${label}: the meta line spills out of its card`);
      });
    });
    return problems;
  });
}

for (const width of NARROW_VIEWPORTS) {
  test.describe(`blog card tags at ${width}px`, () => {
    test.use({ viewport: { width, height: 800 } });

    test('keeps the language and topic pills, the NOVO pill and the meta line from touching each other', async ({
      page,
    }) => {
      await openBlog(page, tagStressArticles());
      await expect(page.getByRole('link', { name: /Machine learning in production/ })).toBeVisible();
      await expect(page.getByText('NOVO').first()).toBeVisible();

      expect(await overlappingCardParts(page)).toEqual([]);
    });
  });
}
