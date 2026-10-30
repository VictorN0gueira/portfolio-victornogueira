import { describe, expect, it, vi } from 'vitest';
import { EIGHT_DIGIT_PARTS_INDEPENDENT as PARTS, EXISTING_DDDS, handBuiltDisplay, handBuiltValue, pastedDisplay, typedDisplay } from '../test/phoneInputs';
import { toEvolutionFormat } from './phone';

vi.setConfig({ testTimeout: 120_000 });

// F4: a carrier code after the trunk zero ("015 81 98445-1243") used to become the DDD 15 and the rest was cut: the number
// sent was 551581984451. Written or pasted whole, the carrier code is now dropped with the zero. Typed key by key the field
// sees one digit at a time and the zero is gone at the first key, so the carrier code is read as the DDD: a known limit.

const CARRIERS = ['15', '21', '23', '31', '41'];
const grouped = (part: string) => `${part.slice(0, 4)}-${part.slice(4)}`;
const carrierShapes = (carrier: string, ddd: string, part: string) => [
  `0${carrier}${ddd}9${part}`,
  `0${carrier} ${ddd} 9 ${grouped(part)}`,
  `0 ${carrier} ${ddd} 9${grouped(part)}`,
  `(0${carrier}) (${ddd}) 9${grouped(part)}`,
];

describe('F4: a carrier code after the trunk zero, pasted whole', () => {
  it('fixes the number of the review', () => {
    expect(pastedDisplay('015 81 98445-1243')).toBe('+55 81 9 8445-1243');
    expect(toEvolutionFormat(pastedDisplay('015 81 98445-1243'))).toBe('558184451243');
  });

  it('reads the number, not the carrier, for every existing DDD, five carriers and four shapes', () => {
    const wrong: string[] = [];
    for (const ddd of EXISTING_DDDS) {
      for (const part of PARTS.filter((_, index) => index % 9 === 0)) {
        for (const carrier of CARRIERS) {
          for (const text of carrierShapes(carrier, ddd, part)) {
            const display = pastedDisplay(text);
            if (display !== handBuiltDisplay(ddd, part) || toEvolutionFormat(display) !== handBuiltValue(ddd, part)) wrong.push(`${text} -> ${display}`);
          }
        }
      }
    }

    expect(wrong.slice(0, 20)).toEqual([]);
  });

  it('reads a landline with a carrier code too (zero, carrier, DDD, eight digits)', () => {
    expect(pastedDisplay('015 81 3333-4444')).toBe('+55 81 9 3333-4444');
    expect(pastedDisplay('0 21 11 2222-3333')).toBe('+55 11 9 2222-3333');
  });

  it('does not touch a number with only the zero, nor one with a country code', () => {
    expect(pastedDisplay('081 98445-1243')).toBe('+55 81 9 8445-1243');
    expect(pastedDisplay('081 3333-4444')).toBe('+55 81 9 3333-4444');
    expect(pastedDisplay('+55 81 98445-1243')).toBe('+55 81 9 8445-1243');
  });
});

describe('F4: a carrier code typed key by key (known limit)', () => {
  it('is read as the DDD, and the digits that do not fit are not kept: what is on the screen is what is sent', () => {
    expect(typedDisplay('015 81 98445-1243')).toBe('+55 15 9 8198-4451');
    expect(toEvolutionFormat(typedDisplay('015 81 98445-1243'))).toBe('551581984451');
  });
});
