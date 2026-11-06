// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FALLBACK_IMAGE } from '../sections/blog/coverFallback';

// jsdom paints nothing, so contrast cannot be measured there. What can be held is the choice of colors. The blog is on the
// system now: cream and white bands with ink text, one black featured card, and the pills over the covers on their own
// opaque black. Every color is a vn token, and the only pair that sits on somebody else's picture carries its own surface.
const BLOG_DIRECTORY = resolve(__dirname, '../sections/blog');
const TEST_FILE = /\.test\.tsx?$/;

const SOURCES = [
  { name: 'src/components/BlogPage.tsx', text: readFileSync(resolve(__dirname, 'BlogPage.tsx'), 'utf8') },
  ...readdirSync(BLOG_DIRECTORY)
    .filter((file) => /\.tsx?$/.test(file) && !TEST_FILE.test(file) && file !== 'articleFixtures.ts')
    .map((file) => ({ name: `src/sections/blog/${file}`, text: readFileSync(resolve(BLOG_DIRECTORY, file), 'utf8') })),
];

// Color families that are not the palette, in a class that paints (text, icon, fill, border, ring, placeholder, gradient stop).
const OFF_PALETTE_FAMILY =
  /(?:text|bg|border|ring|fill|stroke|from|via|to|outline|placeholder:text)-(?:zinc|gray|neutral|slate|stone|red|green|blue|purple|violet|cyan|emerald|teal|amber|orange|yellow|pink|rose|indigo|sky|lime|fuchsia)-\d/g;
// White or black text with its opacity reduced: the surface shows through, so the text is only as strong as the mix.
const TRANSLUCENT_TEXT = /(?:text|placeholder:text)-(?:white|black|vn-white|vn-black|vn-ink)\/(?:\[[\d.]+\]|\d+)/g;
// A gray-mid text falls under 4.5:1 on cream and on white at a small size.
const WEAK_GRAY_TEXT = /(?:text|placeholder:text)-vn-gray-mid/g;
const BANNED_VISUALS =
  /\bdark:|\bitalic\b|text-\[10px\]|bg-gradient|bg-linear|bg-\[radial|\bblur-|backdrop-blur|\bfrom-|\bvia-/g;
// The accent in any paint (text, fill of a shape, border, ring, outline, icon fill or stroke, gradient stop, shadow), or its hex.
const ACCENT =
  /(?<![\w-])(?:bg|text|border|ring|outline|fill|stroke|from|via|to|decoration|divide|shadow|caret|accent)-vn-accent(?![\w-])|#00e5a0/gi;

function findIn(pattern: RegExp): string[] {
  return SOURCES.flatMap(({ name, text }) => Array.from(text.matchAll(pattern), (match) => `${name}: ${match[0]}`));
}

describe('the blog colors', () => {
  it('reads the files of the blog: the page and every part', () => {
    const names = SOURCES.map((source) => source.name);

    expect(names).toContain('src/components/BlogPage.tsx');
    expect(names).toContain('src/sections/blog/ArticleCard.tsx');
    expect(names).toContain('src/sections/blog/FeaturedArticle.tsx');
    expect(names).toContain('src/sections/blog/BlogFilters.tsx');
    expect(names).toContain('src/sections/blog/BlogHero.tsx');
  });

  it('has no color of another family: no zinc, gray, neutral, slate, stone and no hue off the palette', () => {
    expect(findIn(OFF_PALETTE_FAMILY)).toEqual([]);
  });

  it('has no text with its opacity reduced, which falls under 4.5:1 on a light band', () => {
    expect(findIn(TRANSLUCENT_TEXT)).toEqual([]);
  });

  it('has no gray-mid text: the small text is gray-dark on the light bands and gray-light on the black card', () => {
    expect(findIn(WEAK_GRAY_TEXT)).toEqual([]);
  });

  it('has no dark: variant, no italic, no text of 10px, no gradient and no blur', () => {
    expect(findIn(BANNED_VISUALS)).toEqual([]);
  });

  it('draws the accent in one place only, the NOVO pill of the featured article', () => {
    expect(findIn(ACCENT)).toEqual(['src/sections/blog/FeaturedArticle.tsx: bg-vn-accent']);
  });

  it('uses a vn token for the placeholder of the search field', () => {
    const filters = SOURCES.find((source) => source.name.endsWith('BlogFilters.tsx'))?.text ?? '';

    expect(filters).toMatch(/placeholder:text-vn-gray-(?:light|dark)/);
  });

  it('catches what it is meant to catch', () => {
    for (const bad of [
      'text-zinc-400',
      'bg-purple-500',
      'border-emerald-500',
      'text-gray-500',
      'placeholder:text-slate-700',
    ]) {
      expect(bad.match(OFF_PALETTE_FAMILY), bad).not.toBeNull();
    }
    for (const fine of ['text-vn-gray-dark', 'bg-vn-black', 'border-vn-gray-light', 'text-vn-white']) {
      expect(fine.match(OFF_PALETTE_FAMILY), fine).toBeNull();
    }
    expect('text-white/40 text-vn-white/[0.4] placeholder:text-white/30'.match(TRANSLUCENT_TEXT)).toHaveLength(3);
    expect('text-vn-white text-vn-gray-light'.match(TRANSLUCENT_TEXT)).toBeNull();
    expect('text-vn-gray-mid'.match(WEAK_GRAY_TEXT)).not.toBeNull();
    for (const accent of [
      'bg-vn-accent',
      'border-vn-accent',
      'ring-vn-accent',
      'fill-vn-accent',
      'stroke-vn-accent',
      'text-[#00E5A0]',
    ]) {
      expect(accent.match(ACCENT), accent).not.toBeNull();
    }
  });
});

// Colors inside an inline SVG (the placeholder cover is a data URL) are not Tailwind classes, so the class scans cannot see them.
function channelLuminance(channel: number): number {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function hexLuminance(hex: string): number {
  const [r, g, b] = [0, 2, 4].map((start) => channelLuminance(parseInt(hex.slice(start, start + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hexContrast(foreground: string, background: string): number {
  const [light, dark] = [hexLuminance(foreground), hexLuminance(background)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

describe('the inline SVG colors of the blog', () => {
  const svg = decodeURIComponent(FALLBACK_IMAGE.slice(FALLBACK_IMAGE.indexOf(',') + 1));

  it('reads the placeholder cover from the module', () => {
    expect(svg).toContain('<svg');
    expect(svg).toContain('Imagem indisponível');
  });

  it('draws the text of the placeholder cover at 4.5:1 or more against its own background', () => {
    const background = svg.match(/<svg[^>]*\sfill="#([0-9a-f]{6})"/i)?.[1];
    const text = svg.match(/<text[^>]*\sfill="#([0-9a-f]{6})"/i)?.[1];

    expect(background).toBeDefined();
    expect(text).toBeDefined();
    expect(hexContrast(text as string, background as string)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the contrast helper honest: it knows 4.0:1 from 4.5:1', () => {
    expect(hexContrast('71717a', '18181b')).toBeLessThan(4.5);
    expect(hexContrast('ffffff', '000000')).toBeCloseTo(21, 0);
  });
});
