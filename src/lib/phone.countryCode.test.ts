import { describe, expect, it, vi } from 'vitest';
import { readPastedNumber } from '../components/contact/pastedNumber';
import {
  EIGHT_DIGIT_PARTS_INDEPENDENT as PARTS,
  EXISTING_DDDS,
  FIELD_START,
  NUMBER_SHAPES,
  handBuiltDisplay,
  handBuiltValue,
  isRealNumber,
  isRefused,
  pastedDisplay,
  typedDisplay,
  whatsappError,
} from '../test/phoneInputs';
import { oracleFormat, oracleToEvolution } from '../test/phoneOracle';
import { toEvolutionFormat } from './phone';

// Hundreds of thousands of typed strings: the default 5 seconds is tight on a busy machine.
vi.setConfig({ testTimeout: 120_000 });

// P2: the country code typed by hand ("55 81 98445-1243", "+55 81 98445-1243", 5581999998888) used to be read as the DDD
// 55 while pasting it was read right. Typing and pasting the same text must end the same, with the number the text holds.

const countryShapes = NUMBER_SHAPES.filter((shape) => shape.name.includes('55 typed'));
const localShapes = NUMBER_SHAPES.filter((shape) => !shape.name.includes('55 typed') && !shape.name.includes('trunk'));

/**
 * The DDDs 92 to 95 typed with the country code by hand can be read as the DDD 2x to 5x that the same digits form after a
 * DDD 55 reading (the display of "55 9" and of "55 2" is the same string): a known limit, kept apart from the rest.
 */
/**
 * The one class of numbers whose reading changed on purpose: DDD 55 followed by eight digits that start with 0, 1, 6, 7 or
 * 8 and no mobile 9. No line has such a number (fixed lines start with 2 to 5, mobiles have the 9 after the DDD), so a
 * typed 55 there is the country code. Everything else must read exactly as before.
 */
const isReadAsCountryCodeNow = (ddd: string, part: string, shape: { hasMobileNine: boolean; name: string }) =>
  ddd === '55' &&
  !shape.hasMobileNine &&
  '01678'.includes(part[0]) &&
  // A number pasted whole with its country code and no plus (twelve digits) says which 55 is which, so it is not in it.
  shape.name !== '55 typed, no nine';

// 49 and 91 to 99 typed with the country code and no plus: "55 9d ..." is the same text as a complete DDD 55 number plus one
// more digit, so the field clears it (N1, see phone.ddd55.extra.test.ts): a pasted text and a "+55" typed (swallowed by the
// field) are right. 49 and 94 are the F1 case below.
const AMBIGUOUS_DDDS = ['49', '91', '92', '93', '94', '95', '96', '97', '98', '99'];
const SURE_DDDS = EXISTING_DDDS.filter((ddd) => !AMBIGUOUS_DDDS.includes(ddd));

describe('P2: a country code typed by hand is read like a pasted one', () => {
  it('fixes the numbers of the review', () => {
    expect(typedDisplay('5581999998888')).toBe('+55 81 9 9999-8888');
    expect(toEvolutionFormat(typedDisplay('5581999998888'))).toBe('558199998888');
    expect(typedDisplay('558184451243')).toBe('+55 81 9 8445-1243');
    expect(typedDisplay('+55 81 98445-1243')).toBe('+55 81 9 8445-1243');
    expect(toEvolutionFormat(typedDisplay('55 81 98445-1243'))).toBe('558184451243');
  });

  it('ends on the number the text holds, typed and pasted, for every DDD and every country coded shape', () => {
    const wrong: string[] = [];
    for (const ddd of SURE_DDDS) {
      for (const part of PARTS) {
        for (const shape of countryShapes) {
          // A ten digit number whose part starts with 9 reads that 9 as the mobile 9: shown one digit short, never a wrong DDD.
          if (!isRealNumber(shape, part) || (!shape.hasMobileNine && part.startsWith('9'))) continue;
          const text = shape.text(ddd, part);
          const typed = typedDisplay(text);
          if (typed !== handBuiltDisplay(ddd, part) || pastedDisplay(text) !== typed) wrong.push(`${text} -> ${typed}`);
        }
      }
    }

    expect(wrong.slice(0, 20)).toEqual([]);
  });

  it('sends 55, the DDD and the eight digits for the typed country code', () => {
    const wrong: string[] = [];
    for (const ddd of SURE_DDDS) {
      for (const part of PARTS) {
        for (const shape of countryShapes) {
          if (!isRealNumber(shape, part)) continue;
          const text = shape.text(ddd, part);
          if (toEvolutionFormat(typedDisplay(text)) !== handBuiltValue(ddd, part)) wrong.push(text);
        }
      }
    }

    expect(wrong.slice(0, 20)).toEqual([]);
  });

  it('types and pastes the same for the ten digit numbers whose part starts with 9 too', () => {
    const different = SURE_DDDS.flatMap((ddd) =>
      PARTS.filter((part) => part.startsWith('9')).flatMap((part) => countryShapes.filter((shape) => !shape.hasMobileNine).map((shape) => shape.text(ddd, part))),
    ).filter((text) => typedDisplay(text) !== pastedDisplay(text));

    expect(different.slice(0, 20)).toEqual([]);
  });
});

describe('P2: DDD 55 (Rio Grande do Sul) is not broken', () => {
  it('keeps every DDD 55 number: eleven digits with the 9 and the landline, typed, pasted and sent', () => {
    const wrong: string[] = [];
    for (const part of PARTS) {
      for (const shape of localShapes) {
        if (!isRealNumber(shape, part) || (!shape.hasMobileNine && part.startsWith('9'))) continue;
        const text = shape.text('55', part);
        if (typedDisplay(text) !== handBuiltDisplay('55', part) || toEvolutionFormat(typedDisplay(text)) !== handBuiltValue('55', part)) {
          wrong.push(text);
        }
      }
    }

    expect(wrong.slice(0, 20)).toEqual([]);
  });

  it('keeps the way DDD 55 reads a country coded DDD 55 number', () => {
    for (const part of PARTS.slice(0, 40)) {
      // DDD 55 typed after the country code: 55 55 9 + part, and the same with a plus and spaces.
      expect(typedDisplay(`5555${'9'}${part}`)).toBe(handBuiltDisplay('55', part));
      expect(typedDisplay(`+55 55 9${part}`)).toBe(handBuiltDisplay('55', part));
    }
  });
});

describe('P2: what worked before is unchanged', () => {
  /** The old typing and the old paste of a text, through the frozen oracle. */
  function oracleTyped(text: string): string {
    return [...text].reduce((display, key) => oracleFormat(display + key), FIELD_START);
  }
  function oraclePasted(text: string): string {
    const read = readPastedNumber(text);
    if (read.action === 'replace') return oracleFormat(read.text);
    return read.action === 'ignore' ? FIELD_START : oracleFormat(FIELD_START + text);
  }

  it('shows the same display and sends the same value for every local number that typed and pasted the same before', () => {
    const changed: string[] = [];
    let compared = 0;
    for (const ddd of EXISTING_DDDS) {
      for (const part of PARTS) {
        for (const shape of localShapes) {
          if (isReadAsCountryCodeNow(ddd, part, shape)) continue;
          const text = shape.text(ddd, part);
          const before = oracleTyped(text);
          if (before !== oraclePasted(text)) continue;
          compared += 1;
          const after = typedDisplay(text);
          if (after !== before || toEvolutionFormat(after) !== oracleToEvolution(before)) changed.push(`${text}: ${before} -> ${after}`);
        }
      }
    }

    expect(compared).toBeGreaterThan(50_000);
    expect(changed.slice(0, 20)).toEqual([]);
  });

  it('shows the same pasted display and sends the same value for every pasted text of the corpus', () => {
    const changed: string[] = [];
    for (const ddd of EXISTING_DDDS) {
      for (const part of PARTS.filter((_, index) => index % 5 === 0)) {
        for (const shape of NUMBER_SHAPES) {
          if (isReadAsCountryCodeNow(ddd, part, shape)) continue;
          const text = shape.text(ddd, part);
          if (shape.name.includes('trunk')) continue;
          const before = oraclePasted(text);
          const after = pastedDisplay(text);
          if (after !== before || toEvolutionFormat(after) !== oracleToEvolution(before)) changed.push(`${text}: ${before} -> ${after}`);
        }
      }
    }

    expect(changed.slice(0, 20)).toEqual([]);
  });
});

describe('P2: the one reading that changed on purpose', () => {
  it('reads 55 followed by eight digits that no DDD 55 line has as the country code and a number', () => {
    expect(typedDisplay('5581984451')).toBe('+55 81 9 8445-1');
    expect(typedDisplay('5511111111')).toBe('+55 11 9 1111-11');
    // The real DDD 55 numbers around it are untouched: a fixed line (2 to 5) and a mobile (the 9).
    expect(typedDisplay('5533334444')).toBe('+55 55 9 3333-4444');
    expect(typedDisplay('55999999999')).toBe('+55 55 9 9999-9999');
  });
});

describe('F5: a landline of DDD 92 to 95 typed with the country code by hand', () => {
  it('is read right when pasted, and cleared when typed digit by digit without a plus (N1)', () => {
    for (const [typed, sent] of [
      ['+55 92 3333-4444', '559233334444'],
      ['+55 92 5555-4444', '559255554444'],
      ['+55 95 2222-3333', '559522223333'],
      ['55 92 3333-4444', '559233334444'],
      ['55 95 2222-3333', '559522223333'],
    ]) {
      expect(toEvolutionFormat(pastedDisplay(typed))).toBe(sent);
    }
    // Typed, the 12th digit of "55 92 3333 4444" is one more digit on the complete DDD 55 number 55 9 2333-3444: the field
    // cannot tell the two readings apart, so it clears and the visitor retypes (nothing is sent).
    expect(typedDisplay('559233334444')).toBe('+55 ');
  });
});

describe('F1 (formatter): a hand typed country code never silently sends a wrong DDD', () => {
  const isAccepted = (display: string) => !isRefused(display);

  it('does not choose between DDD 49 and DDD 94 (the same digits read both ways): what is left is refused, never sent', () => {
    for (const text of ['5594987654321', '55 94 98765-4321', '+55 94 98765-4321', '5549987654321', '55 49 98765-4321']) {
      const display = typedDisplay(text);
      expect(isAccepted(display)).toBe(false);
      expect(whatsappError(display)).toBe('Coloca o número com DDD, por exemplo 81 99999-9999');
    }
  });

  it('pasting the same numbers is right: the pasted text carries every digit and its country code', () => {
    expect(pastedDisplay('+55 94 98765-4321')).toBe('+55 94 9 8765-4321');
    expect(pastedDisplay('55 49 98765-4321')).toBe('+55 49 9 8765-4321');
    expect(toEvolutionFormat(pastedDisplay('+55 94 98765-4321'))).toBe('559487654321');
  });

  it('sends no wrong DDD for any existing DDD, any part and any country coded shape: right, refused or cleared', () => {
    const silentWrong: string[] = [];
    for (const ddd of EXISTING_DDDS) {
      for (const part of PARTS.filter((_, index) => index % 7 === 0)) {
        for (const shape of countryShapes.filter((entry) => entry.hasMobileNine)) {
          const text = shape.text(ddd, part);
          const display = typedDisplay(text);
          if (isAccepted(display) && toEvolutionFormat(display) !== handBuiltValue(ddd, part)) silentWrong.push(`${text} -> ${display}`);
        }
      }
    }

    expect(silentWrong.slice(0, 20)).toEqual([]);
  });
});
