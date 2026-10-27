// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(__dirname, 'tokens.css'), 'utf8');

const BASE = '.vn-card-includes';
const RESTING = '[data-hover-reveal] .vn-card-includes';
const REVEALED = '[data-hover-reveal]:hover .vn-card-includes,\n[data-hover-reveal]:focus-within .vn-card-includes';
// Properties that would take the list out of the page or out of the accessibility tree, or move the card below it.
const HIDING_OR_LAYOUT_PROPERTIES =
  /\b(display|visibility|height|max-height|min-height|width|margin[a-z-]*|padding[a-z-]*|position|top|left|clip|clip-path|content-visibility|overflow[a-z-]*)\s*:/;

/** The declarations of the flat rule whose header is exactly `header`, or an empty string when it is missing. */
function ruleBody(header: string): string {
  const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return new RegExp(`(?:^|\\n)${escaped} \\{([^}]*)\\}`).exec(css)?.[1] ?? '';
}

describe('tokens.css card includes list', () => {
  it('has the three rules: the transition, the resting state and the revealed state', () => {
    expect(ruleBody(BASE)).not.toBe('');
    expect(ruleBody(RESTING)).not.toBe('');
    expect(ruleBody(REVEALED)).not.toBe('');
  });

  it('slides and fades over 300ms on the shared easing, and animates nothing else', () => {
    const base = ruleBody(BASE);

    expect(base).toContain('transition: opacity 300ms var(--ease-out), transform 300ms var(--ease-out)');
    expect(base.match(/transition:/g)).toHaveLength(1);
    expect(base).not.toMatch(HIDING_OR_LAYOUT_PROPERTIES);
  });

  it('rests 12px low and transparent only while the card carries data-hover-reveal', () => {
    const resting = ruleBody(RESTING);

    expect(resting).toMatch(/opacity:\s*0\s*;/);
    expect(resting).toMatch(/transform:\s*translateY\(12px\)/);
    // The base rule only declares the transition: it never sets the resting state itself.
    expect(ruleBody(BASE)).not.toMatch(/(^|[\s;])(opacity|transform)\s*:/);
  });

  it('rises into place on hover and when the focus is inside the card', () => {
    const revealed = ruleBody(REVEALED);

    expect(revealed).toMatch(/opacity:\s*1\s*;/);
    expect(revealed).toMatch(/transform:\s*none/);
  });

  it('never hides the list from assistive tech and never changes the height of the card: only opacity and transform are set', () => {
    for (const body of [ruleBody(BASE), ruleBody(RESTING), ruleBody(REVEALED)]) {
      expect(body).not.toMatch(HIDING_OR_LAYOUT_PROPERTIES);
    }
    for (const body of [ruleBody(RESTING), ruleBody(REVEALED)]) {
      const properties = [...body.matchAll(/([a-z-]+)\s*:/g)].map((match) => match[1]).sort();

      expect(properties).toEqual(['opacity', 'transform']);
    }
  });

  it('has no rule of its own for touch, reduced motion or .a11y-no-animations: the component leaves the mark off there', () => {
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const lines = withoutComments.split('\n').filter((line) => line.includes('vn-card-includes'));

    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line).not.toMatch(/a11y-no-animations|prefers-reduced-motion|@media/);
    }
  });

  it('uses no color at all, so there is no way for the accent to get in', () => {
    const rules = [ruleBody(BASE), ruleBody(RESTING), ruleBody(REVEALED)].join('\n');

    expect(rules).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|accent/i);
  });
});
