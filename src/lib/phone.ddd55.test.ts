import { describe, expect, it, vi } from 'vitest';
import { EIGHT_DIGIT_PARTS_INDEPENDENT as PARTS, typedDisplay } from '../test/phoneInputs';
import { validateContact } from './contact';
import { formatWhatsappDisplay, toEvolutionFormat } from './phone';

vi.setConfig({ testTimeout: 120_000 });

// F3: DDD 55 (Rio Grande do Sul) is also the country code, so its edits can be read as a typed country code. The shown 9
// deleted from "+55 55 9 8002" used to give "+55 80 9 02". The edits at the end of a complete number cannot be told from
// typing one more digit; they are measured and pinned here as a known limit.

const SHOWN_NINE_AT = 7;
const FIRST_CARET = 4;

function displayOfDigits(digits: string): string {
  const kept = digits.slice(0, 10);
  const number = kept.slice(2);
  return `+55 ${kept.slice(0, 2)} 9 ${number.length <= 4 ? number : `${number.slice(0, 4)}-${number.slice(4)}`}`;
}

function numberIndexOfCaret(display: string, caret: number): number {
  const digitsBefore = [...display.slice(FIRST_CARET, caret)].filter((char) => /\d/.test(char)).length;
  return caret > SHOWN_NINE_AT ? digitsBefore - 1 : digitsBefore;
}

const ok = { nome: 'Ana Lima', email: 'a@b.com', whatsapp: '', mensagem: 'Quero automatizar notas fiscais', servico: 'x' };
const isRefused = (display: string) => validateContact({ ...ok, whatsapp: display }, 'whatsapp').whatsapp !== undefined;

const numbers = PARTS.filter((_, index) => index % 3 === 0).map((part) => ({ part, display: typedDisplay(`559${part}`) }));

describe('F3: DDD 55 edits', () => {
  it('fixes the repro: the shown 9 deleted from +55 55 9 8002', () => {
    expect(formatWhatsappDisplay('+55 55  8002')).toBe('+55 55 9 8002');
    expect(formatWhatsappDisplay('+55 55  8002-1234')).toBe('+55 55 9 8002-1234');
  });

  it('keeps a short number too, and the threshold where a typed country code stops being possible', () => {
    expect(formatWhatsappDisplay('+55 55  80')).toBe('+55 55 9 80');
    // A country code typed by hand shows in the first digits: "55 8" and "55 81 9" are still read as 55 then the DDD.
    expect(formatWhatsappDisplay('+55 55 8')).toBe('+55 8');
    expect(formatWhatsappDisplay('+55 55 81 9')).toBe('+55 81 9');
    // From six digits after the prefix the text is a display the field made: DDD 55.
    expect(formatWhatsappDisplay('+55 55 81 98')).toBe('+55 55 9 8198');
  });

  it('keeps the digits when the shown 9 is deleted from any DDD 55 number', () => {
    const wrong = numbers
      .map(({ part, display }) => ({ part, after: formatWhatsappDisplay(`${display.slice(0, SHOWN_NINE_AT)}${display.slice(SHOWN_NINE_AT + 1)}`) }))
      // A number that starts with 9 reads that 9 as the field's own once the shown one is gone: the usual rule, not this one.
      .filter(({ part }) => !part.startsWith('9'))
      .filter(({ part, after }) => after !== displayOfDigits(`55${part}`))
      .map(({ part, after }) => `${part}: ${after}`);

    expect(wrong.slice(0, 20)).toEqual([]);
  });

  it('puts a digit typed before the last group of the number into the number, for every caret place', () => {
    const wrong: string[] = [];
    for (const { part, display } of numbers) {
      for (let caret = FIRST_CARET; caret < 14; caret += 1) {
        const index = numberIndexOfCaret(display, caret);
        for (const digit of '123456789') {
          const all = `55${part}`;
          const expected = displayOfDigits(all.slice(0, index) + digit + all.slice(index));
          const actual = formatWhatsappDisplay(`${display.slice(0, caret)}${digit}${display.slice(caret)}`);
          if (actual !== expected) wrong.push(`${display} + ${digit} at ${caret}: ${actual} (expected ${expected})`);
        }
      }
    }

    expect(wrong.slice(0, 20)).toEqual([]);
  });

  it('KNOWN LIMIT: a digit put into the last group of a complete number looks like typing one more digit', () => {
    // "+55 55 9 4259-9272" with a 4 put after the hyphen is the same text as the number typed to its end plus a digit: a
    // stateless formatter cannot tell them apart. Measured: the outcome is a valid looking number only when the reading
    // is a country code followed by a complete DDD number; it is shown on the screen, and never a number the field refuses.
    const changed: string[] = [];
    const silentWrong: string[] = [];
    for (const { part, display } of numbers) {
      for (let caret = 14; caret <= display.length; caret += 1) {
        const index = numberIndexOfCaret(display, caret);
        for (const digit of '123456789') {
          const all = `55${part}`;
          const expected = displayOfDigits(all.slice(0, index) + digit + all.slice(index));
          const actual = formatWhatsappDisplay(`${display.slice(0, caret)}${digit}${display.slice(caret)}`);
          if (actual === expected) continue;
          changed.push(actual);
          if (!isRefused(actual) && toEvolutionFormat(actual).startsWith('5555')) silentWrong.push(`${display} + ${digit} at ${caret}: ${actual}`);
        }
      }
    }

    expect(changed.length).toBeGreaterThan(0);
    // The reading as a country code always lands on a DDD that is not 55, so the sent value never starts with 5555.
    expect(silentWrong).toEqual([]);
  });
});
