import { describe, expect, it, vi } from 'vitest';
import { EIGHT_DIGIT_PARTS_INDEPENDENT as PARTS, EXISTING_DDDS, handBuiltDisplay, typedDisplay } from '../test/phoneInputs';
import { validateContact } from './contact';
import { formatWhatsappDisplay } from './phone';

vi.setConfig({ testTimeout: 120_000 });

// N1: a complete DDD 55 number (Rio Grande do Sul) followed by one more digit, or with a digit put into its last group, used
// to be read as a country code typed without a plus ("55 91 ..."), and the result was a complete number of another DDD that
// the form accepted and sent. Whatever the visitor does to a complete DDD 55 number, the field must clear the number or leave
// one the form refuses (the visitor retypes): a complete number that differs from the typed digits is never sent.

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

const CLEARED = '+55 ';
const LAST_GROUP_FIRST_CARET = 14;

describe('N1: one more digit on a complete DDD 55 number', () => {
  it('clears the field for the reviewer repro 55910001697 + 7: nothing is sent', () => {
    expect(typedDisplay('55910001697')).toBe('+55 55 9 1000-1697');

    expect(typedDisplay('559100016977')).toBe(CLEARED);
    expect(isRefused(typedDisplay('559100016977'))).toBe(true);
  });

  it('clears the field for 55981234567 + 8', () => {
    expect(typedDisplay('559812345678')).toBe(CLEARED);
  });

  it('clears the field when a digit is put into the last group of the repro number', () => {
    expect(formatWhatsappDisplay('+55 55 9 1000-16797')).toBe(CLEARED);
    expect(formatWhatsappDisplay('+55 55 9 1000-71697')).toBe(CLEARED);
  });

  it('never leaves an accepted number after an appended digit, for every DDD 55 number and every digit', () => {
    const counts = { cleared: 0, refused: 0 };
    const accepted: string[] = [];
    for (const { display } of NUMBERS) {
      for (const digit of ALL_DIGITS) {
        const after = formatWhatsappDisplay(display + digit);
        if (after === CLEARED) counts.cleared += 1;
        else if (isRefused(after)) counts.refused += 1;
        else accepted.push(`${display} + ${digit}: ${after}`);
      }
    }

    expect(NUMBERS.length).toBeGreaterThan(800);
    expect(accepted.slice(0, 20)).toEqual([]);
    // Measured: 836 numbers x 10 digits = 8,360 cases, 2,740 cleared and 5,620 refused (the altered digits stay on screen).
    expect(counts.cleared + counts.refused).toBe(NUMBERS.length * ALL_DIGITS.length);
    expect(counts.cleared).toBeGreaterThan(2_000);
  });

  it('puts a digit before the last group into the number and clears or refuses one put into the last group', () => {
    const wrong: string[] = [];
    let kept = 0;
    let stopped = 0;
    for (const { digits, display } of NUMBERS) {
      for (let caret = FIRST_CARET; caret <= display.length; caret += 1) {
        if (caret === SHOWN_NINE_AT || caret === SHOWN_NINE_AT + 1) continue;
        const index = numberIndexOfCaret(display, caret);
        for (const digit of ALL_DIGITS) {
          const expected = displayOfDigits(digits.slice(0, index) + digit + digits.slice(index));
          const after = formatWhatsappDisplay(`${display.slice(0, caret)}${digit}${display.slice(caret)}`);
          if (caret >= LAST_GROUP_FIRST_CARET) {
            stopped += 1;
            if (!isRefused(after)) wrong.push(`${display} + ${digit} at ${caret}: ${after} (must be cleared or refused)`);
          } else {
            kept += 1;
            if (after !== expected && !isRefused(after)) wrong.push(`${display} + ${digit} at ${caret}: ${after} (expected ${expected})`);
          }
        }
      }
    }

    expect(wrong.slice(0, 20)).toEqual([]);
    expect(kept).toBeGreaterThan(stopped);
    expect(stopped).toBeGreaterThan(5_000);
  });

  it('still clears the ambiguous 49 and 94 readings', () => {
    expect(typedDisplay('55949876543')).toBe('+55 55 9 4987-6543');
    expect(typedDisplay('559498765432')).toBe(CLEARED);
  });
});

describe('N1: the country code typed digit by digit without a plus, for every real DDD', () => {
  const countClasses = () => {
    const counts = { exact: 0, cleared: 0, refused: 0 };
    const wrong: string[] = [];
    for (const ddd of EXISTING_DDDS) {
      for (const part of PARTS.filter((_, index) => index % 4 === 0)) {
        // 13 digits with the mobile 9, 12 digits for a fixed line (eight digits starting 2 to 5).
        const shapes = ['2345'.includes(part[0]) ? `55${ddd}${part}` : null, `55${ddd}9${part}`].filter((text): text is string => text !== null);
        for (const text of shapes) {
          const after = typedDisplay(text);
          if (after === handBuiltDisplay(ddd, part)) counts.exact += 1;
          else if (after === CLEARED) counts.cleared += 1;
          else if (isRefused(after)) counts.refused += 1;
          else wrong.push(`${text}: ${after}`);
        }
      }
    }
    return { counts, wrong };
  };

  it('ends as the exact number, a cleared field or a refused one: never a sent number that differs from the typed digits', () => {
    const { counts, wrong } = countClasses();

    expect(wrong.slice(0, 20)).toEqual([]);
    // Measured over 20,000 strings: 'other' DDDs 18,704 exact; DDD 55 334 exact; DDD 49 and 91 to 99 1,920 exact (the mobiles whose
    // digits are not ambiguous), 581 cleared, 839 refused. No outcome is an accepted number that differs from the typed digits.
    expect(counts.exact).toBeGreaterThan(20_000);
    expect(counts.cleared).toBeGreaterThan(500);
    expect(counts.refused).toBeGreaterThan(800);
  });

  it('never ends as another number for a DDD 91 landline typed as 55 91 2222-2222, and keeps a DDD 81 one', () => {
    expect(isRefused(typedDisplay('559122222222'))).toBe(true);
    expect(typedDisplay('5581987654321')).toBe('+55 81 9 8765-4321');
  });
});
