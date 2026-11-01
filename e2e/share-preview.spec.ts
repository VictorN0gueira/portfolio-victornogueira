import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import { SITE } from '../src/lib/site';

const DASH_PATTERN = /[\u2014\u2013]/;
const BANNER_WIDTH = 1200;
const BANNER_HEIGHT = 630;

// WhatsApp, LinkedIn and Instagram do not run JavaScript: they read the raw
// HTML served at "/". Every assertion here parses that raw response.
function readMetaContent(html: string, attr: 'name' | 'property', key: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/g) ?? [];
  for (const tag of tags) {
    if (new RegExp(`${attr}="${key}"`).test(tag)) {
      return tag.match(/content="([^"]*)"/)?.[1] ?? null;
    }
  }
  return null;
}

test.describe('share preview without JavaScript', () => {
  test('raw HTML carries the VN One Open Graph tags', async ({ page }) => {
    const response = await page.request.get('/');
    expect(response.status()).toBe(200);
    const html = await response.text();

    expect(readMetaContent(html, 'property', 'og:title')).toBe(SITE.title);
    expect(readMetaContent(html, 'property', 'og:description')).toBe(SITE.description);
    expect(readMetaContent(html, 'property', 'og:site_name')).toBe(SITE.name);
    expect(readMetaContent(html, 'property', 'og:image')).toBe(SITE.ogImage);
    expect(readMetaContent(html, 'property', 'og:image')).toMatch(/og-banner\.png\?v=3$/);
    expect(readMetaContent(html, 'property', 'og:image:width')).toBe(String(BANNER_WIDTH));
    expect(readMetaContent(html, 'property', 'og:image:height')).toBe(String(BANNER_HEIGHT));
    expect(readMetaContent(html, 'property', 'og:image:alt')).toBe(SITE.ogImageAlt);
    expect(readMetaContent(html, 'name', 'twitter:title')).toBe(SITE.title);
    expect(readMetaContent(html, 'name', 'twitter:image')).toBe(SITE.ogImage);
  });

  test('raw HTML has the VN One title and no keywords meta', async ({ page }) => {
    const html = await (await page.request.get('/')).text();

    // The title carries data-static-seo, so that SEO.tsx can drop it once a page has its own.
    expect(html).toContain(`<title data-static-seo>${SITE.title}</title>`);
    expect(readMetaContent(html, 'name', 'description')).toBe(SITE.description);
    expect(readMetaContent(html, 'name', 'author')).toBe(SITE.name);
    expect(readMetaContent(html, 'name', 'keywords')).toBeNull();
  });

  test('no meta content carries an em or en dash', async ({ page }) => {
    const html = await (await page.request.get('/')).text();
    const tags = html.match(/<meta\b[^>]*>/g) ?? [];

    expect(tags.length).toBeGreaterThan(0);
    for (const tag of tags) {
      const content = tag.match(/content="([^"]*)"/)?.[1] ?? '';
      expect(content).not.toMatch(DASH_PATTERN);
    }
  });

  test('og-banner.png is served as a 1200x630 PNG', async ({ page }) => {
    const response = await page.request.get('/og-banner.png');

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/png');

    const metadata = await sharp(await response.body()).metadata();
    expect(metadata.width).toBe(BANNER_WIDTH);
    expect(metadata.height).toBe(BANNER_HEIGHT);
  });
});
