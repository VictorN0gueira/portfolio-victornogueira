// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { blockBody } from './css';

describe('blockBody', () => {
  it('returns the body of a flat rule and of an at-rule with nested rules', () => {
    const sample = '.a { color: red; }\n@media (x) {\n  .b {\n    color: blue;\n  }\n}\n.c { color: green; }';

    expect(blockBody(sample, '.a')).toContain('color: red');
    expect(blockBody(sample, '@media (x)')).toContain('.b {');
    expect(blockBody(blockBody(sample, '@media (x)'), '.b')).toContain('color: blue');
    expect(blockBody(sample, '.c')).toContain('color: green');
  });

  it('does not mistake a longer selector for the one asked for', () => {
    expect(blockBody('.a-b { color: red; }', '.a')).toBe('');
    expect(blockBody('.d .e { color: pink; }', '.e')).toBe('');
  });

  it('skips a selector that is only a later item of a selector list', () => {
    expect(blockBody('.a,\n.b { color: red; }\n.b { color: blue; }', '.b')).toContain('color: blue');
  });

  it('returns an empty string for a missing block and for a block that never closes', () => {
    expect(blockBody('.a { color: red; }', '.z')).toBe('');
    expect(blockBody('.a { color: red;', '.a')).toBe('');
  });

  describe('with mustContain', () => {
    const sample = '@media (x) {\n  .b {\n    color: blue;\n  }\n}\n@media (x) {\n  .c { color: green; }\n}\n.a { color: red; }';

    it('takes the first block with that header whose body holds the text, not simply the first', () => {
      expect(blockBody(sample, '@media (x)')).toContain('color: blue');
      expect(blockBody(sample, '@media (x)', '.c')).toContain('color: green');
      expect(blockBody(sample, '@media (x)', '.c')).not.toContain('color: blue');
    });

    it('returns an empty string when no block with that header holds the text', () => {
      expect(blockBody(sample, '@media (x)', '.nowhere')).toBe('');
    });

    it('still applies the selector list guard and the exact header match', () => {
      expect(blockBody('.a,\n.b { color: red; }', '.b', 'red')).toBe('');
      expect(blockBody('.x .b { color: red; }', '.b', 'red')).toBe('');
    });
  });
});
