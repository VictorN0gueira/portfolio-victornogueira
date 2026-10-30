import { describe, expect, it, vi } from 'vitest';
import { EIGHT_DIGIT_PARTS_INDEPENDENT as PARTS, typedDisplay } from '../test/phoneInputs';
import { validateContact } from './contact';
import { formatWhatsappDisplay, toEvolutionFormat } from './phone';

vi.setConfig({ testTimeout: 120_000 });

// N1: a complete DDD 55 number (Rio Grande do Sul) followed by one more digit, or with a digit put into its last group, used
// to be read as a country code typed without a plus ("55 91 ..."), and the result was a complete number of another DDD that
// the form accepted and sent. Whatever the visitor does to a complete DDD 55 number, the field must either keep the DDD 55
// reading (the extra digit is ignored, the digits stay) or leave a number the form refuses. It never sends another number.

const FIRST_CARET = 4;
const SHOWN_NINE_AT = 7;
const ALL_DIGITS = '0123456789';

const ok = { nome: 'Ana Lima', email: 'a@b.com', whatsapp: '', mensagem: 'Quero automatizar notas fiscais', servico: 'x' };
const isRefused = (display: string) => validateContact({ ...ok, whatsapp: display }, 'whatsapp').whatsapp !== undefined;

function displayOfDigits(digits: string): string {
  const kept = digits.slice(0, 10);
  const number = kept.slice(2);
  return `+55 ${kept.slice(0, 2)} 9 ${number.length <= 4 ? number : `${number.slice(0, 4)}-${number.slice(4)}`}`;
}

function numberIndexOfCaret(display: string, caret: number): number {
  const digitsBefore = [...display.slice(FIRST_CARET, caret)].filter((char) => /\d/.test(char)).length;
  return caret > SHOWN_NINE_AT ? digitsBefore - 1 : digitsBefore;
}

// DDD 55 numbers of the two shapes: the mobile (55 9 + eight digits) and the fixed line (55 + eight digits starting 2 to 5).
// `typed` is what the visitor keys in; `digits` is DDD 55 and the eight digits (the 9 of the mobile is the field's own).
const MOBILE = PARTS.filter((_, index) => index % 2 === 0).map((part) => ({ typed: `559${part}`, digits: `55${part}` }));
const FIXED = PARTS.filter((part) => '2345'.includes(part[0])).map((part) => ({ typed: `55${part}`, digits: `55${part}` }));
const NUMBERS = [...MOBILE, ...FIXED].map(({ typed, digits }) => ({ digits, display: typedDisplay(typed) }));

describe('N1: one more digit on a complete DDD 55 number', () => {
  it('ignores the extra digit of the reviewer repro 55910001697 + 7, as before the batch', () => {
    const before = typedDisplay('55910001697');
    expect(before).toBe('+55 55 9 1000-1697');

    expect(typedDisplay('559100016977')).toBe(before);
    expect(toEvolutionFormat(typedDisplay('559100016977'))).toBe('555510001697');
  });

  it('ignores the extra digit of 55981234567 + 8', () => {
    expect(typedDisplay('559812345678')).toBe('+55 55 9 8123-4567');
  });

  it('keeps the digits when a digit is put into the last group of the repro number', () => {
    expect(formatWhatsappDisplay('+55 55 9 1000-16797')).toBe('+55 55 9 1000-1679');
    expect(formatWhatsappDisplay('+55 55 9 1000-71697')).toBe('+55 55 9 1000-7169');
  });

  it('never sends another number: an appended digit is ignored or refused, for every DDD 55 number and every digit', () => {
    const wrong: string[] = [];
    for (const { digits, display } of NUMBERS) {
      for (const digit of ALL_DIGITS) {
        const after = formatWhatsappDisplay(display + digit);
        if (after !== display && !isRefused(after)) wrong.push(`${display} + ${digit}: ${after}`);
      }
    }

    expect(NUMBERS.length).toBeGreaterThan(800);
    expect(wrong.slice(0, 20)).toEqual([]);
  });

  it('never sends another number: a digit put at any place of the number is read as an insert, or refused', () => {
    const wrong: string[] = [];
    for (const { digits, display } of NUMBERS) {
      for (let caret = FIRST_CARET; caret <= display.length; caret += 1) {
        if (caret === SHOWN_NINE_AT || caret === SHOWN_NINE_AT + 1) continue;
        const index = numberIndexOfCaret(display, caret);
        for (const digit of ALL_DIGITS) {
          const expected = displayOfDigits(digits.slice(0, index) + digit + digits.slice(index));
          const after = formatWhatsappDisplay(`${display.slice(0, caret)}${digit}${display.slice(caret)}`);
          if (after !== expected && !isRefused(after)) wrong.push(`${display} + ${digit} at ${caret}: ${after} (expected ${expected})`);
        }
      }
    }

    expect(wrong.slice(0, 20)).toEqual([]);
  });

  it('still refuses, and never sends a DDD 55 guess, for the ambiguous 49 and 94 readings', () => {
    // 55 9 49xx and 55 94 9x are the same digits: the field leaves the number to be retyped (F1).
    expect(typedDisplay('55949876543')).toBe('+55 55 9 4987-6543');
    expect(typedDisplay('559498765432')).toBe('+55 ');
  });
});
