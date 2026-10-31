import { describe, expect, it, vi } from 'vitest';
import { EIGHT_DIGIT_PARTS_INDEPENDENT as PARTS, EXISTING_DDDS, typedDisplay } from '../test/phoneInputs';
import { formatWhatsappDisplay } from './phone';

// Many thousands of edits: the default 5 seconds is tight on a busy machine.
vi.setConfig({ testTimeout: 120_000 });

// P4: the display always shows a 9 after the DDD. Deleting a DDD digit used to slide that 9 into the DDD ("+55 81 9 3333-4444"
// minus the 1 gave DDD 89). An edit of the field must keep the digits of the number, in order, and the 9 stays the field's own.

/** The display that digits give, written by hand (not through the formatter): DDD, the field's 9, the number, ten digits at most. */
function displayOfPartialDigits(digits: string): string {
  const kept = digits.slice(0, 10);
  if (kept.length === 0) return '+55 ';
  if (kept.length < 3) return `+55 ${kept}`;
  const number = kept.slice(2);
  return `+55 ${kept.slice(0, 2)} 9 ${number.length <= 4 ? number : `${number.slice(0, 4)}-${number.slice(4)}`}`;
}

/**
 * Where the digits of the number sit in the text after the "+55 ": the DDD and the digits after the field's 9, which is
 * left out (it is the field's, not a digit of the number).
 */
function numberPositions(body: string): number[] {
  const positions = [...body].flatMap((char, at) => (/\d/.test(char) ? [at] : []));
  return positions.length > 2 ? [positions[0], positions[1], ...positions.slice(3)] : positions;
}

/** Removes the nth digit of the number, as Backspace or Delete at the caret of that digit does. */
function deleteDigit(display: string, index: number): string {
  const body = display.slice('+55 '.length);
  const at = numberPositions(body)[index];
  return `+55 ${body.slice(0, at)}${body.slice(at + 1)}`;
}

/** Inserts a digit before the nth digit of the number. */
function insertDigit(display: string, index: number, digit: string): string {
  const body = display.slice('+55 '.length);
  const at = numberPositions(body)[index] ?? body.length;
  return `+55 ${body.slice(0, at)}${digit}${body.slice(at)}`;
}

/** The digits of a display that belong to the number: the DDD and the digits after the field's 9. */
function numberDigits(display: string): string {
  const [, ddd = '', , ...rest] = display.split(' ');
  return (ddd + rest.join('')).replace(/\D/g, '');
}

const numbers = EXISTING_DDDS.flatMap((ddd) =>
  PARTS.filter((_, index) => index % 4 === 0).map((part) => ({ ddd, part, display: typedDisplay(`${ddd}9${part}`) })),
);

describe('P4: deleting a DDD digit keeps the digits and the field’s own 9', () => {
  it('fixes the example of the review: +55 81 9 3333-4444 without the 1', () => {
    expect(formatWhatsappDisplay(deleteDigit('+55 81 9 3333-4444', 1))).toBe('+55 83 9 3334-444');
    expect(formatWhatsappDisplay(deleteDigit('+55 81 9 3333-4444', 0))).toBe('+55 13 9 3334-444');
  });

  it('keeps every digit but the deleted one, in order, for every DDD digit of every number', () => {
    const wrong: string[] = [];
    for (const { ddd, part, display } of numbers) {
      for (const index of [0, 1]) {
        const after = formatWhatsappDisplay(deleteDigit(display, index));
        const remaining = (ddd + part).slice(0, index) + (ddd + part).slice(index + 1);
        if (after !== displayOfPartialDigits(remaining)) wrong.push(`${display} minus digit ${index}: ${after}`);
      }
    }

    expect(wrong.slice(0, 20)).toEqual([]);
  });

  it('is the same as typing the remaining digits fresh, when they have no 9 in third place and do not start with 55', () => {
    const different = numbers
      .flatMap(({ ddd, part, display }) => [0, 1].map((index) => ({ display, index, remaining: (ddd + part).slice(0, index) + (ddd + part).slice(index + 1) })))
      // Typed fresh, a 9 in third place is the field's 9 and a leading 55 is a country code: not what an edit keeps.
      .filter(({ remaining }) => remaining[2] !== '9' && !remaining.startsWith('55'))
      .filter(({ display, index, remaining }) => formatWhatsappDisplay(deleteDigit(display, index)) !== typedDisplay(remaining))
      .map(({ display, index }) => `${display} minus ${index}`);

    expect(different.slice(0, 20)).toEqual([]);
  });

  it('does not slide the 9 into the DDD: the digits of the number are the remaining digits and no other', () => {
    const wrong = numbers
      .map(({ ddd, part, display }) => ({ display, after: formatWhatsappDisplay(deleteDigit(display, 1)), expected: (ddd[0] + part).slice(0, 10) }))
      .filter(({ after, expected }) => numberDigits(after) !== expected)
      .map(({ display, after }) => `${display}: ${after}`);

    expect(wrong.slice(0, 20)).toEqual([]);
  });

  it('deletes both DDD digits one after the other without losing a digit of the number', () => {
    const wrong: string[] = [];
    for (const { ddd, part, display } of numbers.filter((_, index) => index % 5 === 0)) {
      const once = formatWhatsappDisplay(deleteDigit(display, 0));
      const twice = formatWhatsappDisplay(deleteDigit(once, 0));
      if (twice !== displayOfPartialDigits((ddd + part).slice(2))) wrong.push(`${display}: ${twice}`);
    }

    expect(wrong.slice(0, 20)).toEqual([]);
  });

  it('deletes a digit of the number the way it always did', () => {
    const wrong: string[] = [];
    for (const { ddd, part, display } of numbers) {
      for (const index of [2, 3, 5, 7, 9]) {
        const after = formatWhatsappDisplay(deleteDigit(display, index));
        const all = ddd + part;
        if (after !== displayOfPartialDigits(all.slice(0, index) + all.slice(index + 1))) wrong.push(`${display} minus digit ${index}: ${after}`);
      }
    }

    expect(wrong.slice(0, 20)).toEqual([]);
  });

  it('puts a digit into the DDD without turning the 9 into a digit of the number', () => {
    const wrong: string[] = [];
    for (const { ddd, part, display } of numbers) {
      for (const index of [0, 1, 2]) {
        const all = ddd + part;
        const after = formatWhatsappDisplay(insertDigit(display, index, '5'));
        if (after !== displayOfPartialDigits(all.slice(0, index) + '5' + all.slice(index))) wrong.push(`${display} plus 5 at ${index}: ${after}`);
      }
    }

    expect(wrong.slice(0, 20)).toEqual([]);
  });
});

describe('P4: the displays that already worked are not touched', () => {
  it('formats every typed number the way it did, a complete display stays as it is', () => {
    const changed = numbers.filter(({ display }) => formatWhatsappDisplay(display) !== display);

    expect(changed).toEqual([]);
  });

  it('keeps the display of the DDD and the 9 alone, and a pasted display with the 9 as its own word', () => {
    expect(formatWhatsappDisplay('+55 81 9')).toBe('+55 81 9');
    expect(formatWhatsappDisplay('+55 81 9 9999-9999')).toBe('+55 81 9 9999-9999');
    expect(formatWhatsappDisplay('+55 11 9 0000-0000')).toBe('+55 11 9 0000-0000');
    expect(formatWhatsappDisplay('+55 11 90000-0000')).toBe('+55 11 9 0000-0000');
  });
});
