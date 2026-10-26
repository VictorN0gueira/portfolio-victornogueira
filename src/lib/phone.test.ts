import { describe, expect, it } from 'vitest';
import { formatWhatsappDisplay, toEvolutionFormat, toLocalDigits } from './phone';

describe('toEvolutionFormat', () => {
  it('converts a fully formatted display number', () => {
    expect(toEvolutionFormat('+55 81 9 8445-1243')).toBe('558184451243');
  });

  it('drops the extra 9 from an 11 digit local number', () => {
    expect(toEvolutionFormat('81984451243')).toBe('558184451243');
  });

  it('keeps a 10 digit local number and prefixes 55', () => {
    expect(toEvolutionFormat('8184451243')).toBe('558184451243');
  });
});

describe('formatWhatsappDisplay', () => {
  it('formats a full local number with the automatic 9', () => {
    expect(formatWhatsappDisplay('81984451243')).toBe('+55 81 9 8445-1243');
  });

  it('returns only the country code for empty input', () => {
    expect(formatWhatsappDisplay('')).toBe('+55 ');
  });

  it('keeps a lone DDD after the country code', () => {
    expect(formatWhatsappDisplay('5581')).toBe('+55 81');
  });
});

describe('DDD 55 (Rio Grande do Sul)', () => {
  it('reads a leading 55 as the DDD when the number has no country prefix', () => {
    expect(formatWhatsappDisplay('55984451243')).toBe('+55 55 9 8445-1243');
    expect(toEvolutionFormat('55984451243')).toBe('555584451243');
  });

  it('still drops the country code when the formatted prefix is present', () => {
    expect(formatWhatsappDisplay('+55 8')).toBe('+55 8');
    expect(formatWhatsappDisplay('+55 55')).toBe('+55 55');
    expect(toEvolutionFormat('+55 55 9 8445-1243')).toBe('555584451243');
  });
});

describe('toLocalDigits', () => {
  it('strips the 55 when the raw value starts with +55', () => {
    expect(toLocalDigits('+55 81 9 8445-1243')).toBe('81984451243');
    expect(toLocalDigits('+55 8')).toBe('8');
    expect(toLocalDigits('+55 55 9 8445-1243')).toBe('55984451243');
  });

  it('strips the 55 when there are 12 or more digits', () => {
    expect(toLocalDigits('558184451243')).toBe('8184451243');
    expect(toLocalDigits('5581984451243')).toBe('81984451243');
  });

  it('keeps a leading 55 as DDD for a complete 10 or 11 digit number', () => {
    expect(toLocalDigits('55984451243')).toBe('55984451243');
    expect(toLocalDigits('5584451243')).toBe('5584451243');
  });

  it('keeps the old reading for short partial input', () => {
    expect(toLocalDigits('5581')).toBe('81');
    expect(toLocalDigits('')).toBe('');
  });

  it('leaves numbers that do not start with 55 untouched', () => {
    expect(toLocalDigits('81984451243')).toBe('81984451243');
    expect(toLocalDigits('(81) 98445-1243')).toBe('81984451243');
  });
});
