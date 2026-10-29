// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(__dirname, 'skeleton.css'), 'utf8');
const homePage = readFileSync(resolve(__dirname, '../pages/HomePage.tsx'), 'utf8');
const SECTIONS = ['statement', 'use-cases', 'services', 'method', 'roi', 'testimonials', 'faq', 'final-cta'];
const MIN_REM = 20;
const MAX_REM = 260;

/** The rules of one font: the base one (no media query) and the media rules, in the order they are written. */
function rulesOf(selector: string): Array<{ minWidth: number; props: Record<string, number> }> {
  const escaped = selector.replace('.', '\.');
  const base = new RegExp(`^${escaped} \{([^}]*)\}`, 'm');
  const media = new RegExp(`@media \(min-width: (\d+)px\) \{\s*${escaped} \{([^}]*)\}`, 'g');
  const read = (block: string) =>
    Object.fromEntries([...block.matchAll(/--vn-skeleton-([a-z-]+): ([\d.]+)rem;/g)].map((match) => [match[1], Number(match[2])]));
  const first = base.exec(css);
  const rules = first ? [{ minWidth: 0, props: read(first[1]) }] : [];
  for (const match of css.matchAll(media)) rules.push({ minWidth: Number(match[1]), props: read(match[2]) });
  return rules;
}

describe.each([
  ['the normal font', ':root'],
  ['the larger font', 'html.a11y-font-large'],
])('skeleton.css for %s', (_name, selector) => {
  const rules = rulesOf(selector);

  it('gives every section a height at the narrowest width', () => {
    expect(Object.keys(rules[0]?.props ?? {}).sort()).toEqual([...SECTIONS].sort());
  });

  it('keeps every height between sane bounds, in rem', () => {
    for (const { props } of rules) {
      for (const value of Object.values(props)) {
        expect(value).toBeGreaterThanOrEqual(MIN_REM);
        expect(value).toBeLessThanOrEqual(MAX_REM);
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
