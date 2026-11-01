// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(__dirname, 'skeleton.css'), 'utf8');
const homePage = readFileSync(resolve(__dirname, '../pages/HomePage.tsx'), 'utf8');
const SECTIONS = ['statement', 'use-cases', 'services', 'method', 'roi', 'testimonials', 'faq', 'final-cta'];
const MIN_REM = 20;
const MAX_REM = 260;
// The file has the normal font first and, after this line, the larger one.
const LARGER_FONT_MARKER = '/* Larger font (a11y-font-large) */';
// Far fewer than the file has today (21 and 39): a table that lost its bands would not pass for a table.
const MIN_MEDIA_RULES_PER_FONT = 10;

interface Rule {
  minWidth: number;
  props: Record<string, number>;
}

const readProps = (block: string): Record<string, number> =>
  Object.fromEntries([...block.matchAll(/--vn-skeleton-([a-z-]+): ([\d.]+)rem;/g)].map((match) => [match[1], Number(match[2])]));

/**
 * The rules of one font: the base one (no media query) and the media rules, in the order they are written.
 * The patterns are String.raw: a backslash in an ordinary template literal is eaten before the pattern exists, and the
 * media pattern would then match nothing at all (the test below counts the blocks of the file for that reason).
 */
function rulesOf(text: string, selector: string): Rule[] {
  const escaped = selector.replace('.', String.raw`\.`);
  const base = new RegExp(String.raw`^${escaped} \{([^}]*)\}`, 'm');
  const media = new RegExp(String.raw`@media \(min-width: (\d+)px\) \{\s*${escaped} \{([^}]*)\}`, 'g');
  const first = base.exec(text);
  const rules: Rule[] = first ? [{ minWidth: 0, props: readProps(first[1]) }] : [];
  for (const match of text.matchAll(media)) rules.push({ minWidth: Number(match[1]), props: readProps(match[2]) });
  return rules;
}

/** How many media blocks a text has, counted on the at-rule alone so it does not depend on the patterns above. */
const countMediaBlocks = (text: string): number => (text.match(/@media/g) ?? []).length;

const markerAt = css.indexOf(LARGER_FONT_MARKER);
const FONTS = [
  { name: 'the normal font', selector: ':root', text: css.slice(0, markerAt) },
  { name: 'the larger font', selector: 'html.a11y-font-large', text: css.slice(markerAt) },
];

describe('skeleton.css layout', () => {
  it('has the marker that tells the two fonts apart, once', () => {
    expect(markerAt).toBeGreaterThan(0);
    expect(css.indexOf(LARGER_FONT_MARKER, markerAt + 1)).toBe(-1);
  });

  it('is parsed whole: the media rules found are as many as the @media blocks of the file', () => {
    const parsed = FONTS.reduce((total, font) => total + rulesOf(font.text, font.selector).length - 1, 0);

    expect(countMediaBlocks(css)).toBeGreaterThan(0);
    expect(parsed).toBe(countMediaBlocks(css));
  });
});

describe.each(FONTS)('skeleton.css for $name', ({ selector, text }) => {
  const rules = rulesOf(text, selector);
  const mediaRules = rules.slice(1);

  it('parses every @media block of its half of the file, and has a table, not a handful of bands', () => {
    expect(mediaRules.length).toBe(countMediaBlocks(text));
    expect(mediaRules.length).toBeGreaterThanOrEqual(MIN_MEDIA_RULES_PER_FONT);
  });

  it('gives every section a height at the narrowest width', () => {
    expect(Object.keys(rules[0]?.props ?? {}).sort()).toEqual([...SECTIONS].sort());
  });

  it('keeps every height, in the base rule and in every media rule, between sane bounds, in rem', () => {
    for (const { minWidth, props } of rules) {
      expect(Object.keys(props).length, `a rule at ${minWidth}px has no height`).toBeGreaterThan(0);
      for (const [section, value] of Object.entries(props)) {
        expect(value, `${section} at ${minWidth}px`).toBeGreaterThanOrEqual(MIN_REM);
        expect(value, `${section} at ${minWidth}px`).toBeLessThanOrEqual(MAX_REM);
      }
    }
  });

  it('writes the media rules by growing width, so a wider rule wins', () => {
    const widths = rules.map((rule) => rule.minWidth);

    expect(widths).toEqual([...widths].sort((a, b) => a - b));
    expect(new Set(widths).size).toBe(widths.length);
  });
});

describe('skeleton.css and HomePage', () => {
  it('writes the larger font rules after the normal ones, so they win', () => {
    expect(css.lastIndexOf(':root {')).toBeLessThan(css.indexOf('html.a11y-font-large {'));
  });

  it.each(SECTIONS)('HomePage gives the %s skeleton the height of its property', (section) => {
    expect(homePage).toContain(`min-h-[var(--vn-skeleton-${section})]`);
  });
});
