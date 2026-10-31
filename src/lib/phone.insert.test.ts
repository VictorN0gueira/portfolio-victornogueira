import { describe, expect, it, vi } from 'vitest';
import {
  EIGHT_DIGIT_PARTS_INDEPENDENT as PARTS,
  EXISTING_DDDS,
  FIRST_CARET,
  SHOWN_NINE_AT,
  displayOfDigits,
  numberIndexOfCaret,
  typedDisplay,
} from '../test/phoneInputs';
import { formatWhatsappDisplay } from './phone';

// Many hundreds of thousands of edits: the default 5 seconds is tight on a busy machine.
vi.setConfig({ testTimeout: 120_000 });

// F2: a digit typed with the caret anywhere in a complete number must land in the number, where the caret is. The shown 9 is
// the field's own: a digit typed between the space and the 9 used to turn that 9 into a digit of the number.

const LAST_GROUP_CARET = 14; // just after the hyphen of "+55 DD 9 NNNN-NNNN"

const numbers = EXISTING_DDDS.flatMap((ddd) =>
  PARTS.filter((_, index) => index % 6 === 0).map((part) => ({ ddd, part, display: typedDisplay(`${ddd}9${part}`) })),
);

/** An insert at the very start with a 0 is a trunk zero, and a 5 in front of a DDD 5x forms a 55: other readings, other tests. */
const isOtherReading = (index: number, digit: string, ddd: string) => index === 0 && (digit === '0' || (digit === '5' && ddd[0] === '5'));

describe('F2: a digit typed at any caret place of a complete number lands in the number', () => {
  it('fixes the repro: a 4 typed between the space and the shown 9', () => {
    const display = '+55 81 9 9999-8888';
    const typed = `${display.slice(0, SHOWN_NINE_AT)}4${display.slice(SHOWN_NINE_AT)}`;

    expect(formatWhatsappDisplay(typed)).toBe('+55 81 9 4999-9888');
  });

  it('puts every digit at every caret place into the number, in order, for every DDD and number of the corpus', () => {
    const wrong: string[] = [];
    for (const { ddd, part, display } of numbers) {
      for (let caret = FIRST_CARET; caret <= display.length; caret += 1) {
        // DDD 55 can also be the country code: a digit put into the last group of its number is a known limit (phone.ddd55.test.ts).
        if (ddd === '55' && caret >= LAST_GROUP_CARET) continue;
        const index = numberIndexOfCaret(display, caret);
        for (const digit of '0123456789') {
          if (isOtherReading(index, digit, ddd)) continue;
          const all = ddd + part;
          const expected = displayOfDigits(all.slice(0, index) + digit + all.slice(index));
          const actual = formatWhatsappDisplay(`${display.slice(0, caret)}${digit}${display.slice(caret)}`);
          if (actual !== expected) wrong.push(`${display} + ${digit} at ${caret}: ${actual} (expected ${expected})`);
        }
      }
    }

    expect(wrong.slice(0, 20)).toEqual([]);
  });

  it('keeps the 9 as the field’s own when the caret is just before or just after it', () => {
    expect(formatWhatsappDisplay('+55 81 79 9999-8888')).toBe('+55 81 9 7999-9888');
    expect(formatWhatsappDisplay('+55 81 97 9999-8888')).toBe('+55 81 9 7999-9888');
  });
});
