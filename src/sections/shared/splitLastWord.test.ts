import { describe, expect, it } from 'vitest';
import { splitLastWord } from './splitLastWord';

describe('splitLastWord', () => {
  it('splits a text of several words into the head with its trailing space and the last word', () => {
    expect(splitLastWord('a b c')).toEqual({ head: 'a b ', last: 'c' });
  });

  it('gives a single word as the last word with an empty head', () => {
    expect(splitLastWord('a')).toEqual({ head: '', last: 'a' });
  });

  it('keeps the spaces at the edges out of the last word', () => {
    expect(splitLastWord('  a b  ')).toEqual({ head: 'a ', last: 'b' });
  });

  it('gives an empty head and an empty last word for an empty text', () => {
    expect(splitLastWord('')).toEqual({ head: '', last: '' });
    expect(splitLastWord('   ')).toEqual({ head: '', last: '' });
  });

  it('keeps a hyphenated word whole', () => {
    expect(splitLastWord('bio Link-in-Bio')).toEqual({ head: 'bio ', last: 'Link-in-Bio' });
  });
});
