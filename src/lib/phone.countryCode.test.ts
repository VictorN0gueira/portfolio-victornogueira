import { describe, expect, it, vi } from 'vitest';
import { readPastedNumber } from '../components/contact/pastedNumber';
import {
  EIGHT_DIGIT_PARTS_INDEPENDENT as PARTS,
  EXISTING_DDDS,
  FIELD_START,
  NUMBER_SHAPES,
  handBuiltDisplay,
  handBuiltValue,
  pastedDisplay,
  typedDisplay,
} from '../test/phoneInputs';
import { oracleFormat, oracleToEvolution } from '../test/phoneOracle';
import { toEvolutionFormat } from './phone';

// Hundreds of thousands of typed strings: the default 5 seconds is tight on a busy machine.
vi.setConfig({ testTimeout: 120_000 });

// P2: the country code typed by hand ("55 81 98445-1243", "+55 81 98445-1243", 5581999998888) used to be read as the DDD
// 55 while pasting it was read right. Typing and pasting the same text must end the same, with the number the text holds.

const countryShapes = NUMBER_SHAPES.filter((shape) => shape.name.includes('55 typed'));
const localShapes = NUMBER_SHAPES.filter((shape) => !shape.name.includes('55 typed') && !shape.name.includes('trunk'));

/** A fixed line starts with 2 to 5: the shapes with no mobile 9 are only real numbers for such a part. */
const isRealNumber = (shape: { hasMobileNine: boolean }, part: string) => shape.hasMobileNine || '2345'.includes(part[0]);

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

const AMBIGUOUS_DDDS = ['92', '93', '94', '95'];
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

describe('P2: the known limit, DDD 92 to 95 typed with the country code by hand', () => {
  it('is read right when the digits do not also form a DDD 2x to 5x, and the pasted number is always right', () => {
    const rows = AMBIGUOUS_DDDS.flatMap((ddd) => PARTS.flatMap((part) => countryShapes.map((shape) => ({ ddd, part, shape }))))
      .filter(({ part, shape }) => isRealNumber(shape, part) && (shape.hasMobileNine || !part.startsWith('9')));
    const wrongWhenTyped = rows.filter(({ ddd, part, shape }) => typedDisplay(shape.text(ddd, part)) !== handBuiltDisplay(ddd, part));
    const wrongWhenPasted = rows.filter(({ ddd, part, shape }) => pastedDisplay(shape.text(ddd, part)) !== handBuiltDisplay(ddd, part));

    expect(wrongWhenPasted).toEqual([]);
    expect(wrongWhenTyped.length).toBeGreaterThan(0);
    // The share stays small: most of these numbers are read right.
    expect(wrongWhenTyped.length / rows.length).toBeLessThan(0.5);
    // DDD 94 with a mobile is the example: the same digits form DDD 49.
    expect(typedDisplay('55949' + '99999999')).toContain('+55 49');
  });
});

