import { describe, expect, it } from 'vitest';
import { EIGHT_DIGIT_PARTS, VALID_DDDS, expectedDisplay, expectedEvolution } from '../test/phoneCorpus';
import { formatWhatsappDisplay, toEvolutionFormat } from './phone';

// A number typed digit by digit must end exactly as the same number pasted. The field starts as "+55 ", every key adds one
// character at the end and the form formats the whole value again (formatWhatsappDisplay), so typing is a fold of the
// formatter over the digits, and a paste is the formatter applied once to the prefix and all the digits.

const FIELD_START = '+55 ';

const typeKeyByKey = (digits: string, from = FIELD_START): string =>
  [...digits].reduce((display, key) => formatWhatsappDisplay(display + key), from);

const pasteWhole = (digits: string): string => formatWhatsappDisplay(FIELD_START + digits);

/** The two ways a visitor writes one number: the mobile 9 and the eight digits, or the ten digits (no 9 typed). */
const numbers = VALID_DDDS.flatMap((ddd) =>
  EIGHT_DIGIT_PARTS.flatMap((part) => [
    { ddd, part, digits: `${ddd}9${part}`, hasMobileNine: true },
    { ddd, part, digits: `${ddd}${part}`, hasMobileNine: false },
  ]),
);

/**
 * A ten digit number whose eight digit part starts with 9 is the one real ambiguity: its first 9 is read as the mobile 9
 * (the field has always read it so). It must still type and paste the same, but its value is not the by hand one.
 */
const isAmbiguous = ({ part, hasMobileNine }: { part: string; hasMobileNine: boolean }) => !hasMobileNine && part.startsWith('9');

describe('a number typed key by key ends as the same number pasted', () => {
  it('covers every valid DDD and a corpus of eight digit parts, with and without the mobile 9', () => {
    expect(VALID_DDDS).toHaveLength(67);
    expect(numbers.length).toBeGreaterThan(10_000);
  });

  it('types and pastes to the same display for every number', () => {
    const different = numbers.filter(({ digits }) => typeKeyByKey(digits) !== pasteWhole(digits)).map(({ digits }) => digits);

    expect(different.slice(0, 20)).toEqual([]);
  });

  it('ends on +55 DD 9 NNNN-NNNN, with all eight digits, for every number that is not the ambiguous one', () => {
    const wrong = numbers
      .filter((entry) => !isAmbiguous(entry))
      .filter(({ ddd, part, digits }) => typeKeyByKey(digits) !== expectedDisplay(ddd, part))
      .map(({ digits, ...rest }) => `${digits} -> ${typeKeyByKey(digits)} (${rest.part})`);

    expect(wrong.slice(0, 20)).toEqual([]);
  });

  it('sends 55, the DDD and the eight digits for the number that was typed', () => {
    const wrong = numbers
      .filter((entry) => !isAmbiguous(entry))
      .filter(({ ddd, part, digits }) => toEvolutionFormat(typeKeyByKey(digits)) !== expectedEvolution(ddd, part))
      .map(({ digits }) => digits);

    expect(wrong.slice(0, 20)).toEqual([]);
  });

  it('keeps the example of the field itself: 81 99999-9999', () => {
    expect(typeKeyByKey('81999999999')).toBe('+55 81 9 9999-9999');
    expect(toEvolutionFormat(typeKeyByKey('81999999999'))).toBe('558199999999');
  });

  it('keeps the number of the issue: 81999998888 typed keeps every digit', () => {
    expect(typeKeyByKey('81999998888')).toBe('+55 81 9 9999-8888');
    expect(toEvolutionFormat(typeKeyByKey('81999998888'))).toBe('558199998888');
  });
});

describe('a number written with its country code or punctuation formats to the same display as typing it', () => {
  const written = (ddd: string, part: string) => [
    `+55 ${ddd} 9 ${part.slice(0, 4)}-${part.slice(4)}`,
    `+55 ${ddd} 9${part}`,
    `+55${ddd}9${part}`,
    `55${ddd}9${part}`,
    `(${ddd}) 9${part.slice(0, 4)}-${part.slice(4)}`,
    `${ddd}9${part}`,
  ];

  it('does it for every valid DDD and part, as a pasted or dropped text', () => {
    const different = VALID_DDDS.flatMap((ddd) =>
      EIGHT_DIGIT_PARTS.flatMap((part) =>
        written(ddd, part)
          .filter((text) => formatWhatsappDisplay(text) !== typeKeyByKey(`${ddd}9${part}`))
          .map((text) => text),
      ),
    );

    expect(different.slice(0, 20)).toEqual([]);
  });
});

describe('edits in the middle', () => {
  /** Puts `key` before the nth digit after the "+55 " prefix of the display (at the end when there is no such digit). */
  function insertBeforeDigit(display: string, digitIndex: number, key: string): string {
    const tail = display.slice(FIELD_START.length);
    const position = [...tail].reduce<number[]>((found, char, at) => (/\d/.test(char) ? [...found, at] : found), [])[digitIndex];
    const at = position ?? tail.length;
    return `${FIELD_START}${tail.slice(0, at)}${key}${tail.slice(at)}`;
  }

  const withoutAmbiguous = numbers.filter((entry) => !isAmbiguous(entry));

  it('a digit forgotten and put back in the middle gives the number pasted whole', () => {
    const different: string[] = [];
    for (const { digits, hasMobileNine } of withoutAmbiguous) {
      // The first digits that matter are the eight of the part: the DDD and the mobile 9 are not forgotten here.
      const firstPartDigit = hasMobileNine ? 3 : 2;
      for (let missing = firstPartDigit; missing < digits.length; missing += 1) {
        const partial = digits.slice(0, missing) + digits.slice(missing + 1);
        // Without its first part digit a ten digit number whose second part digit is 9 reads as DDD, the mobile 9 and the
        // rest: the field cannot know a digit is missing, so this is not an edit it could repair.
        if (!hasMobileNine && missing === 2 && partial[2] === '9') continue;
        // The display always shows DD, the 9, then the part: a ten digit number has one more display digit before it.
        const displayDigit = hasMobileNine ? missing : missing + 1;
        const fixed = formatWhatsappDisplay(insertBeforeDigit(typeKeyByKey(partial), displayDigit, digits[missing]));
        if (fixed !== pasteWhole(digits)) different.push(`${digits} missing ${missing}: ${fixed}`);
      }
    }

    expect(different.slice(0, 20)).toEqual([]);
  });

  it('a wrong last digit deleted with Backspace and typed again gives the number pasted whole', () => {
    const different: string[] = [];
    for (const { digits, hasMobileNine } of withoutAmbiguous.filter((_, index) => index % 7 === 0)) {
      // Only digits of the eight digit part: the field shows the 9 by itself, so the visitor never types a wrong 9 there.
      for (let atDigit = hasMobileNine ? 3 : 2; atDigit < digits.length; atDigit += 1) {
        const wrong = digits[atDigit] === '1' ? '2' : '1';
        const typedWrong = typeKeyByKey(digits.slice(0, atDigit) + wrong);
        const afterBackspace = formatWhatsappDisplay(typedWrong.slice(0, -1));
        const final = typeKeyByKey(digits.slice(atDigit), afterBackspace);
        if (final !== pasteWhole(digits)) different.push(`${digits} wrong at ${atDigit}: ${final}`);
      }
    }

    expect(different.slice(0, 20)).toEqual([]);
  });

  it('is stable: formatting a display again changes nothing', () => {
    const unstable = numbers
      .map(({ digits }) => typeKeyByKey(digits))
      .filter((display) => formatWhatsappDisplay(display) !== display);

    expect(unstable.slice(0, 20)).toEqual([]);
  });
});

describe('the Backspace that takes the nine away', () => {
  it('lets a visitor go back from +55 81 9 to +55 81 and then to a landline', () => {
    const afterNine = typeKeyByKey('819');
    expect(afterNine).toBe('+55 81 9');
    expect(formatWhatsappDisplay(afterNine.slice(0, -1))).toBe('+55 81');
    expect(typeKeyByKey('3', formatWhatsappDisplay(afterNine.slice(0, -1)))).toBe('+55 81 9 3');
  });
});
