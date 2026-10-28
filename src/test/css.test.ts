// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { blockBody, declarations, ruleWithSelector } from './css';

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

describe('declarations', () => {
  it('splits a flat rule body into trimmed property: value strings', () => {
    expect(declarations('\n  filter: grayscale(1);\n  opacity: .7;\n')).toEqual(['filter: grayscale(1)', 'opacity: .7']);
  });

  it('keeps a value that holds a comma and skips empty pieces', () => {
    expect(declarations('transition: opacity 300ms var(--ease-out), filter 300ms var(--ease-out);;')).toEqual([
      'transition: opacity 300ms var(--ease-out), filter 300ms var(--ease-out)',
    ]);
    expect(declarations('')).toEqual([]);
  });
});

describe('ruleWithSelector', () => {
  const sample = '.a { color: red; }\n.b,\n.c,\n.d { animation: none !important; }\n@media (x) {\n  .e { color: blue; }\n}';

  it('finds a rule by any selector of its list, first, middle or last', () => {
    for (const selector of ['.b', '.c', '.d']) {
      expect(ruleWithSelector(sample, selector)).toContain('animation: none !important');
    }
  });

  it('finds a flat rule and a rule inside an at-rule body', () => {
    expect(ruleWithSelector(sample, '.a')).toContain('color: red');
    expect(ruleWithSelector(blockBody(sample, '@media (x)'), '.e')).toContain('color: blue');
  });

  it('matches whole selectors only', () => {
    expect(ruleWithSelector(sample, '.')).toBe('');
    expect(ruleWithSelector(sample, '.a-b')).toBe('');
    expect(ruleWithSelector(sample, '.z')).toBe('');
  });
});
