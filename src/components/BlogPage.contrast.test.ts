// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FALLBACK_IMAGE } from '../sections/blog/coverFallback';

// jsdom paints nothing, so contrast cannot be measured there. What can be held is the choice of colors: the blog sits on
// near black, where the muted zinc greys (500 to 700) fall under 4.5:1 and the old green and blue badges under white text
// fall under it too. Text uses the vn tokens (gray-light on dark) and the accent only as a color on black.
const SOURCE = readFileSync(resolve(__dirname, 'BlogPage.tsx'), 'utf8');

// The greys that fall under 4.5:1 on the near black page: steps 500 and darker of every Tailwind grey, for the text, the icons
// (a lucide icon takes the text color) and the placeholder.
const DARK_GREY_TEXT = /(?:text|placeholder:text|fill|stroke)-(?:zinc|gray|neutral|slate|stone)-(?:500|600|700|800|900|950)(?![\d])/g;
// White text with its opacity reduced: the page color shows through, so the text is only as strong as the mix.
const WHITE_TEXT_WITH_OPACITY = /(?:text|placeholder:text)-white\/(?:\[([\d.]+)\]|(\d+))/g;
const PAGE_BACKGROUND_LUMINANCE = 0.0027; // zinc-950, #09090b
const MIN_TEXT_CONTRAST = 4.5;

function whiteOverPageContrast(opacity: number): number {
  const channel = Math.round(opacity * 255 + (1 - opacity) * 9);
  const value = channel / 255;
  const luminance = value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  return (luminance + 0.05) / (PAGE_BACKGROUND_LUMINANCE + 0.05);
}

function weakWhiteTexts(source: string): string[] {
  return Array.from(source.matchAll(WHITE_TEXT_WITH_OPACITY)).flatMap((match) => {
    const opacity = match[1] !== undefined ? Number(match[1]) : Number(match[2]) / 100;
    return whiteOverPageContrast(opacity) < MIN_TEXT_CONTRAST ? [match[0]] : [];
  });
}

describe('BlogPage colors', () => {
  it('has no zinc 500, 600 or 700 on the dark page, for text, icons or the placeholder', () => {
    const found = SOURCE.match(/(?:text|placeholder:text)-zinc-(?:500|600|700)/g);

    expect(found).toBeNull();
  });

  it('has no dark grey of any family (zinc, gray, neutral, slate, stone) from step 500 down, for text, icons or fills', () => {
    expect(SOURCE.match(DARK_GREY_TEXT)).toBeNull();
  });

  it('has no white text so transparent that it falls under 4.5:1 on the page', () => {
    expect(weakWhiteTexts(SOURCE)).toEqual([]);
  });

  it('catches what it is meant to catch: the other greys, and white text at 40 percent', () => {
    for (const bad of ['text-gray-500', 'text-neutral-600', 'text-slate-700', 'text-stone-500', 'placeholder:text-zinc-800', 'fill-gray-600']) {
      expect(bad.match(DARK_GREY_TEXT), bad).not.toBeNull();
    }
    for (const fine of ['text-zinc-400', 'text-gray-300', 'text-stone-200', 'text-zinc-50']) {
      expect(fine.match(DARK_GREY_TEXT), fine).toBeNull();
    }
    expect(weakWhiteTexts('text-white/40 text-white/[0.4] placeholder:text-white/30')).toHaveLength(3);
    expect(weakWhiteTexts('text-white/60 text-white/[0.7] text-white')).toEqual([]);
  });

  it('has no white text on a green or blue badge, and no amber or cyan accent outside the vn accent', () => {
    const found = SOURCE.match(/(?:from|to|text)-(?:amber|cyan|emerald|teal|blue)-\d+|bg-emerald-\d+/g);

    expect(found).toBeNull();
  });

  it('uses a vn token for the placeholder of the search field', () => {
    expect(SOURCE).toMatch(/placeholder:text-vn-gray-(?:light|mid)/);
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

describe('BlogPage inline SVG colors', () => {
  const svg = decodeURIComponent(FALLBACK_IMAGE.slice(FALLBACK_IMAGE.indexOf(',') + 1));

  it('reads the placeholder cover from the source', () => {
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
