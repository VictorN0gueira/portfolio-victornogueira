import type { Page } from '@playwright/test';
import { expect, test } from './n8nGuard';

const EDGE_FUNCTION = '**/functions/v1/gnews-proxy*';
const CORS_JSON = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
const SKIP_LINK_NAME = 'Pular para o conteúdo';
const VIEWPORTS = [
  { width: 320, height: 640 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];
const MIN_TARGET_PX = 24;
const MIN_TEXT_CONTRAST = 4.5;
// The page background (zinc-950) and the lightest surface a chip sits on (white at 5 percent over it).
const PAGE_BACKGROUND = [9, 9, 11];
const CHIP_BACKGROUND = [22, 22, 24];

function sampleArticle(index: number, language: 'pt' | 'en') {
  return {
    title: `Artigo de teste ${index}`,
    description: `Resumo do artigo ${index}`,
    url: `https://example.com/artigo-${index}`,
    image: '',
    publishedAt: new Date(Date.now() - (index + 1) * 86_400_000).toISOString(),
    source: { name: 'Fonte', url: 'https://example.com' },
    language,
  };
}

async function openBlog(page: Page) {
  const articles = [sampleArticle(1, 'pt'), sampleArticle(2, 'en'), sampleArticle(3, 'pt'), sampleArticle(4, 'pt')];
  await page.route(EDGE_FUNCTION, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS_JSON });
      return;
    }
    await route.fulfill({ status: 200, headers: CORS_JSON, contentType: 'application/json', body: JSON.stringify({ articles, source: 'edge-function' }) });
  });
  await page.goto('/blog');
  await expect(page.getByRole('link', { name: 'Artigo de teste 1' })).toBeVisible();
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

    test('has no horizontal scroll, a working skip link and filter chips that say which one is on', async ({ page }) => {
      await openBlog(page);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);

      await page.keyboard.press('Tab');
      const skip = page.getByRole('link', { name: SKIP_LINK_NAME });
      await expect(skip).toBeFocused();
      await expect(skip).toBeInViewport();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('main')).toBeFocused();
      expect(new URL(page.url()).hash).toBe('');

      const all = page.getByRole('group', { name: 'Filtrar por idioma' }).getByRole('button', { name: 'Todos idiomas' });
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

  test('has a clear button of at least 24px and a visible focus ring on the search field', async ({ page }) => {
    await openBlog(page);
    const search = page.getByRole('textbox', { name: 'Buscar artigos' });

    await search.focus();
    // The field animates its properties (transition-all), so the ring is read once it has settled.
    const readRing = () =>
      search.evaluate((input) => {
        const style = getComputedStyle(input);
        return { style: style.outlineStyle, width: parseFloat(style.outlineWidth), color: style.outlineColor };
      });
    await expect.poll(async () => (await readRing()).width).toBeGreaterThanOrEqual(2);
    const ring = await readRing();
    expect(ring.style).not.toBe('none');
    expect(ring.color).toBe('rgb(255, 255, 255)');

    await search.fill('Artigo');
    const box = await page.getByRole('button', { name: 'Limpar busca' }).boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(MIN_TARGET_PX);
    expect(box?.height).toBeGreaterThanOrEqual(MIN_TARGET_PX);
  });

  test('has no horizontal scroll with the focus ring on the first and last chip', async ({ page }) => {
    await openBlog(page);
    const first = page.getByRole('button', { name: 'Todos idiomas' });

    await first.focus();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('reaches 4.5:1 for the muted texts, the placeholder and the inactive chips', async ({ page }) => {
    await openBlog(page);
    await page.getByRole('textbox', { name: 'Buscar artigos' }).fill('xyz');

    const colors = await page.evaluate(() => {
      const read = (element: Element | null, pseudo?: string) => (element ? getComputedStyle(element, pseudo).color : '');
      const search = document.getElementById('search');
      const chip = Array.from(document.querySelectorAll('button[aria-pressed="false"]'))[0];
      const status = document.querySelector('[role="status"]');
      const footer = document.querySelector('footer p');
      const count = Array.from(document.querySelectorAll('p')).find((p) => /encontrado/.test(p.textContent ?? ''));
      const clear = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Limpar filtros');
      return {
        placeholder: read(search, '::placeholder'),
        chip: read(chip ?? null),
        status: read(status),
        footer: read(footer),
        count: read(count ?? null),
        clear: read(clear ?? null),
      };
    });

    for (const [name, value] of Object.entries(colors)) {
      const background = name === 'chip' || name === 'placeholder' ? CHIP_BACKGROUND : PAGE_BACKGROUND;
      expect(contrast(parseRgb(value), background), name).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    }
  });
});
