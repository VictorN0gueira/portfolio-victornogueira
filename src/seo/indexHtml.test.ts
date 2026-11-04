// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SITE } from '../lib/site';
import { routeMetaFor } from './routeMeta';

const START = '<!-- seo:start';
const END = '<!-- seo:end -->';
const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');

function seoBlock(): string {
  const start = html.indexOf(START);
  const end = html.indexOf(END);
  expect(start, 'seo:start marker').toBeGreaterThan(-1);
  expect(end, 'seo:end marker').toBeGreaterThan(start);
  return html.slice(html.indexOf('-->', start) + 3, end);
}

function tagsOf(source: string): string[] {
  return source.match(/<(?:title|meta|link|script)\b[^>]*>/g) ?? [];
}

describe('the seo block of index.html', () => {
  it('has each marker once, the start before the end', () => {
    expect(html.split(START)).toHaveLength(2);
    expect(html.split(END)).toHaveLength(2);
    expect(html.indexOf(START)).toBeLessThan(html.indexOf(END));
  });

  it('holds the title, the description, every og tag and every twitter tag, all marked data-static-seo, and nothing else', () => {
    const tags = tagsOf(seoBlock());

    expect(tags.length).toBeGreaterThan(15);
    for (const tag of tags) {
      expect(tag, tag).toMatch(/^<(?:title|meta)\b/);
      expect(tag, tag).toContain('data-static-seo');
    }
    expect(tags.filter((tag) => tag.startsWith('<title'))).toHaveLength(1);
    expect(tags.filter((tag) => /name="description"/.test(tag))).toHaveLength(1);
  });

  it('leaves outside the block what every route shares: the viewport, the preload, the author, the theme color and the icons', () => {
    const outside = html.slice(0, html.indexOf(START)) + html.slice(html.indexOf(END));

    expect(outside).toContain('name="viewport"');
    expect(outside).toContain('rel="preload"');
    expect(outside).toContain('name="author"');
    expect(outside).toContain('name="theme-color"');
    expect(outside).toContain('rel="apple-touch-icon"');
    expect(outside).toContain('rel="icon"');
    expect(outside).not.toMatch(/<title\b/);
    expect(outside).not.toMatch(/name="description"|property="og:|name="twitter:/);
  });

  it('says the home title, description and banner of SITE', () => {
    const block = seoBlock();
    const home = routeMetaFor('/');

    expect(block).toContain(`<title data-static-seo>${SITE.title}</title>`);
    expect(home?.title).toBe(SITE.title);
    expect(block).toContain(`property="og:title" content="${SITE.title}"`);
    expect(block).toContain(`name="twitter:title" content="${SITE.title}"`);
    expect(block).toContain(`name="description" content="${SITE.description}"`);
    expect(block).toContain(`property="og:image" content="${SITE.ogImage}"`);
    expect(block).toContain(`name="twitter:image" content="${SITE.ogImage}"`);
  });
});
