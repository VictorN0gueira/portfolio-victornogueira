import { describe, expect, it } from 'vitest';
import { formatWhatsappDisplay, toEvolutionFormat } from './phone';

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
