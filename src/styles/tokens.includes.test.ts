// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(__dirname, 'tokens.css'), 'utf8');

const BASE = '.vn-card-includes';
const GATE = '@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';
const HOVER = '.vn-spotlight:hover .vn-card-includes';
const RESET = '.a11y-no-animations .vn-card-includes';

/**
 * Body of the block whose header is exactly `header`, found by brace matching, so an at-rule with nested rules works
 * too. With `mustContain` it is the first such block that holds that text: the spotlight card has an at-rule with the
 * same header, and this file only cares about the one of the includes list. A header that only ends a longer selector
 * (for example `.x .vn-card-includes`) does not count.
 */
function blockBody(source: string, header: string, mustContain = ''): string {
  const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(^|\\n)[ \\t]*${escaped} \\{`, 'g');

  for (const match of source.matchAll(pattern)) {
    const open = match.index + match[0].length - 1;
    let depth = 0;
    for (let index = open; index < source.length; index += 1) {
      if (source[index] === '{') depth += 1;
      if (source[index] === '}') depth -= 1;
      if (depth > 0) continue;

      const body = source.slice(open + 1, index);
      if (body.includes(mustContain)) return body;
      break;
    }
  }
  return '';
}

/** The `property: value` declarations of a flat rule body, as trimmed strings. */
function declarations(body: string): string[] {
  return body
    .split(';')
    .map((line) => line.trim())
    .filter(Boolean);
}

const gated = blockBody(css, GATE, BASE);
const outsideGate = css.replace(gated, '');
const rules = [blockBody(css, BASE), blockBody(gated, BASE), blockBody(gated, HOVER), blockBody(css, RESET)];

describe('blockBody helper of this file', () => {
  const sample = '.a { color: red; }\n@media (x) {\n  .b {\n    color: blue;\n  }\n}\n@media (x) {\n  .c { color: green; }\n}\n.d .e { color: pink; }';

  it('finds a flat rule and a rule nested in an at-rule', () => {
    expect(blockBody(sample, '.a')).toContain('color: red');
    expect(blockBody(blockBody(sample, '@media (x)'), '.b')).toContain('color: blue');
  });

  it('takes the first at-rule with the same header that holds the wanted text', () => {
    expect(blockBody(sample, '@media (x)', '.c')).toContain('color: green');
    expect(blockBody(sample, '@media (x)', '.c')).not.toContain('color: blue');
  });

  it('ignores a longer selector and returns an empty string for a missing block', () => {
    expect(blockBody(sample, '.e')).toBe('');
    expect(blockBody(sample, '.z')).toBe('');
  });
});

describe('tokens.css card includes list', () => {
  it('has every rule: the transition, the gated resting offset, the gated hover settle and the animations off reset', () => {
    expect(gated).not.toBe('');
    for (const body of rules) {
      expect(body).not.toBe('');
    }
  });

  it('transitions transform alone, 300ms on the shared easing, in a rule outside the gate', () => {
    expect(declarations(blockBody(css, BASE))).toEqual(['transition: transform 300ms var(--ease-out)']);
    expect(outsideGate).toContain(`\n${BASE} {`);
  });

  it('rests 8px low only for a fine pointer with hover and no reduced motion preference', () => {
    expect(declarations(blockBody(gated, BASE))).toEqual(['transform: translateY(8px)']);
    expect(outsideGate).not.toContain('translateY(8px)');
  });

  it('settles into place when the pointer is over the spotlight card that holds the list', () => {
    expect(declarations(blockBody(gated, HOVER))).toEqual(['transform: none']);
    expect(outsideGate).not.toContain(HOVER);
  });

  it('is plain under .a11y-no-animations: no offset and no transition', () => {
    expect(declarations(blockBody(css, RESET)).sort()).toEqual(['transform: none', 'transition: none']);
  });

  it('declares nothing but transform and its transition: never opacity, display, visibility or a layout property', () => {
    for (const body of rules) {
      const properties = declarations(body).map((line) => line.split(':')[0].trim());

      for (const property of properties) {
        expect(['transform', 'transition'], property).toContain(property);
      }
    }
    expect(rules.join('\n')).not.toMatch(/opacity|display|visibility|height|margin|padding|position|clip|content-visibility/);
  });

  it('has no rule for focus: the card holds nothing that takes the focus', () => {
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const lines = withoutComments.split('\n').filter((line) => line.includes('vn-card-includes'));

    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line).not.toMatch(/focus|data-hover-reveal/);
    }
  });

  it('uses no color at all, so there is no way for the accent to get in', () => {
    expect(rules.join('\n')).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|accent/i);
  });
});
