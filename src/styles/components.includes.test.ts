// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { blockBody, declarations } from '../test/css';
import { allStylesCss as css, stillBody } from '../test/styles';

const BASE = '.vn-card-includes';
const GATE = '@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';
const HOVER = '.vn-spotlight:hover .vn-card-includes';

const gated = blockBody(css, GATE, BASE);
const outsideGate = css.replace(gated, '');
const rules = [blockBody(css, BASE), blockBody(gated, BASE), blockBody(gated, HOVER), stillBody(BASE)];

describe('components.css card includes list', () => {
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
    // No rule outside the gate offsets the list, whatever its selector (a second rule, a hover or focus variant).
    expect(outsideGate).not.toMatch(/\.vn-card-includes[^{}]*\{[^}]*translateY/);
  });

  it('settles into place when the pointer is over the spotlight card that holds the list', () => {
    expect(declarations(blockBody(gated, HOVER))).toEqual(['transform: none']);
    expect(outsideGate).not.toContain(HOVER);
  });

  it('is plain with motion off: no offset and no transition (the list of motion.css)', () => {
    expect(declarations(stillBody(BASE)).sort()).toEqual(['transform: none', 'transition: none']);
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
