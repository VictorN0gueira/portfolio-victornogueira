import { describe, expect, it } from 'vitest';
import { formatBRL, formatBRLCompact, parseStat } from './format';

const NBSP = String.fromCharCode(0xa0);

describe('formatBRL', () => {
  it('formats pt-BR currency without fraction digits', () => {
    expect(formatBRL(1733)).toBe(`R$${NBSP}1.733`);
  });
});

describe('formatBRLCompact', () => {
  it('abbreviates thousands with K', () => {
    expect(formatBRLCompact(78000)).toBe('R$ 78K');
  });

  it('abbreviates millions with M and one decimal', () => {
    expect(formatBRLCompact(1_250_000)).toBe('R$ 1.3M');
  });

  it('falls back to the full format below 1000', () => {
    expect(formatBRLCompact(867)).toBe(formatBRL(867));
  });
});

describe('parseStat', () => {
  it('splits the number from its suffix', () => {
    expect(parseStat('500h+')).toEqual({ num: 500, suffix: 'h+' });
    expect(parseStat('85%')).toEqual({ num: 85, suffix: '%' });
    expect(parseStat('24h')).toEqual({ num: 24, suffix: 'h' });
  });

  it('returns null when the value has no leading number', () => {
    expect(parseStat('ilimitado')).toBeNull();
  });
});
