import { describe, expect, it } from 'vitest';
import { formatBRL, formatBRLCompact, parseStat } from './format';

const NBSP = String.fromCharCode(0xa0);

describe('formatBRL', () => {
  it('formats pt-BR currency without fraction digits', () => {
    expect(formatBRL(1733)).toBe(`R$${NBSP}1.733`);
  });
});

describe('formatBRLCompact', () => {
  it('abbreviates thousands with mil, as pt-BR does', () => {
    expect(formatBRLCompact(78000)).toBe(`R$${NBSP}78${NBSP}mil`);
  });

  it('abbreviates millions with mi and a decimal comma', () => {
    expect(formatBRLCompact(1_250_000)).toBe(`R$${NBSP}1,3${NBSP}mi`);
  });

  it('falls back to the full format below 1000', () => {
    expect(formatBRLCompact(867)).toBe(formatBRL(867));
  });

  it('keeps mil up to the last value that still rounds to 999 mil', () => {
    expect(formatBRLCompact(999_499)).toBe(`R$${NBSP}999${NBSP}mil`);
  });

  it('switches to millions when the rounded thousands reach 1000', () => {
    expect(formatBRLCompact(999_500)).toBe(`R$${NBSP}1${NBSP}mi`);
    expect(formatBRLCompact(999_999)).toBe(`R$${NBSP}1${NBSP}mi`);
    expect(formatBRLCompact(1_000_000)).toBe(`R$${NBSP}1${NBSP}mi`);
  });

  it('keeps one decimal under 10 mil, so 1.500 is not shown as 2 mil', () => {
    expect(formatBRLCompact(1_000)).toBe(`R$${NBSP}1${NBSP}mil`);
    expect(formatBRLCompact(1_500)).toBe(`R$${NBSP}1,5${NBSP}mil`);
    expect(formatBRLCompact(1_499)).toBe(`R$${NBSP}1,5${NBSP}mil`);
    expect(formatBRLCompact(2_000)).toBe(`R$${NBSP}2${NBSP}mil`);
    expect(formatBRLCompact(9_949)).toBe(`R$${NBSP}9,9${NBSP}mil`);
    expect(formatBRLCompact(9_950)).toBe(`R$${NBSP}10${NBSP}mil`);
    expect(formatBRLCompact(15_500)).toBe(`R$${NBSP}16${NBSP}mil`);
  });

  it('shows the edges of the ROI range: zero, 999 and the 312 million maximum', () => {
    expect(formatBRLCompact(0)).toBe(`R$${NBSP}0`);
    expect(formatBRLCompact(999)).toBe(`R$${NBSP}999`);
    expect(formatBRLCompact(312_000_000)).toBe(`R$${NBSP}312${NBSP}mi`);
  });

  it('writes millions like thousands: the decimal only when it is not zero', () => {
    expect(formatBRLCompact(1_050_000)).toBe(`R$${NBSP}1,1${NBSP}mi`);
    expect(formatBRLCompact(1_040_000)).toBe(`R$${NBSP}1${NBSP}mi`);
    expect(formatBRLCompact(10_000_000)).toBe(`R$${NBSP}10${NBSP}mi`);
    expect(formatBRLCompact(249_600_000)).toBe(`R$${NBSP}249,6${NBSP}mi`);
  });

  it('puts a thousands separator in a number of millions of four digits', () => {
    expect(formatBRLCompact(1_000_000_000)).toBe(`R$${NBSP}1.000${NBSP}mi`);
  });

  it('never prints NaN or Infinity: a value that is not a finite number counts as zero', () => {
    expect(formatBRLCompact(Number.NaN)).toBe(`R$${NBSP}0`);
    expect(formatBRLCompact(Number.POSITIVE_INFINITY)).toBe(`R$${NBSP}0`);
    expect(formatBRLCompact(Number.NEGATIVE_INFINITY)).toBe(`R$${NBSP}0`);
  });

  it('leaves a negative value in the full format, with the sign', () => {
    expect(formatBRLCompact(-5_000)).toBe(formatBRL(-5_000));
    expect(formatBRLCompact(-5_000)).toContain('5.000');
  });
});

describe('parseStat', () => {
  it('splits the number from its suffix', () => {
    expect(parseStat('500h+')).toEqual({ num: 500, suffix: 'h+' });
    expect(parseStat('85%')).toEqual({ num: 85, suffix: '%' });
    expect(parseStat('24h')).toEqual({ num: 24, suffix: 'h' });
  });

  it('accepts a dot decimal', () => {
    expect(parseStat('1.5x')).toEqual({ num: 1.5, suffix: 'x' });
  });

  it('accepts a pt-BR comma decimal', () => {
    expect(parseStat('1,5x')).toEqual({ num: 1.5, suffix: 'x' });
    expect(parseStat('99,9%')).toEqual({ num: 99.9, suffix: '%' });
  });

  it('returns null when the value has no leading number', () => {
    expect(parseStat('ilimitado')).toBeNull();
  });
});
