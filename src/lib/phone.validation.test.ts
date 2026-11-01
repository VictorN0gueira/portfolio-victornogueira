import { describe, expect, it, vi } from 'vitest';
import {
  ALL_TWO_DIGIT_CODES,
  EIGHT_DIGIT_PARTS_INDEPENDENT as PARTS,
  EXISTING_DDDS,
  NUMBER_SHAPES,
  typedDisplay,
  whatsappError,
} from '../test/phoneInputs';
import { oracleHasValidLength, oracleToEvolution } from '../test/phoneOracle';
import { toEvolutionFormat } from './phone';

// What the whatsapp validation accepts, over the value the field really holds (the formatted display), compared with
// the old rule (ten or eleven local digits) through a frozen oracle.

// Many thousands of typed strings: the default 5 seconds is tight on a busy machine.
vi.setConfig({ testTimeout: 120_000 });

const MESSAGE = 'Coloca o número com DDD, por exemplo 81 99999-9999';

describe('P1: a number one digit short is not accepted just because the field adds the 9', () => {
  it('rejects the two numbers of the review: 818445124 and 813333444 typed key by key', () => {
    expect(typedDisplay('818445124')).toBe('+55 81 9 8445-124');
    expect(whatsappError(typedDisplay('818445124'))).toBe(MESSAGE);
    expect(whatsappError(typedDisplay('813333444'))).toBe(MESSAGE);
  });

  it('rejects every existing DDD typed with only seven digits after it', () => {
    const accepted = EXISTING_DDDS.flatMap((ddd) => PARTS.map((part) => `${ddd}${part.slice(0, 7)}`))
      .filter((text) => whatsappError(typedDisplay(text)) === undefined);

    expect(accepted.slice(0, 20)).toEqual([]);
  });

  it('rejects a ten digit number whose part starts with 9 (the field shows it one digit short)', () => {
    const accepted = EXISTING_DDDS.flatMap((ddd) => PARTS.filter((part) => part.startsWith('9')).map((part) => `${ddd}${part}`))
      .filter((text) => whatsappError(typedDisplay(text)) === undefined);

    expect(accepted.slice(0, 20)).toEqual([]);
  });

  it('accepts every complete number: eleven digits with the mobile 9, and the landline form with the 9 the field adds', () => {
    // DDD 55 followed by eight digits that start with 0, 1, 6, 7 or 8 is no real number: a typed 55 reads as the country code.
    const rejected = EXISTING_DDDS.flatMap((ddd) =>
      PARTS.flatMap((part) => [
        `${ddd}9${part}`,
        ...(part.startsWith('9') || (ddd === '55' && '01678'.includes(part[0])) ? [] : [`${ddd}${part}`]),
      ]),
    ).filter((text) => whatsappError(typedDisplay(text)) !== undefined);

    expect(rejected.slice(0, 20)).toEqual([]);
  });

  it('keeps accepting the raw values the unit tests and the old form used: ten digit landline, DDD 55, eleven digits', () => {
    for (const raw of ['8184451243', '81984451243', '55984451243', '5584451243', '+55 81 9 8445-1243', '(81) 98445-1243']) {
      expect(whatsappError(raw)).toBeUndefined();
    }
    for (const raw of ['', '+55 ', '+55 81', '+55 81 9 8445-124', '819844512430', '8198445124']) {
      expect(whatsappError(raw)).toBe(MESSAGE);
    }
  });

  it('changes nothing else: what the old rule accepted is still accepted, and sends the same value, except ten digits with a 9 third', () => {
    const changed: string[] = [];
    const differentValue: string[] = [];
    for (const ddd of EXISTING_DDDS) {
      for (const part of PARTS) {
        for (const shape of NUMBER_SHAPES.filter((entry) => !entry.name.includes('typed') && !entry.name.includes('trunk'))) {
          const display = typedDisplay(shape.text(ddd, part));
          const wasAccepted = oracleHasValidLength(display);
          const isAccepted = whatsappError(display) === undefined;
          if (wasAccepted !== isAccepted) changed.push(`${shape.text(ddd, part)} -> ${display}`);
          if (wasAccepted && isAccepted && oracleToEvolution(display) !== toEvolutionFormat(display)) differentValue.push(display);
        }
      }
    }
    // The only change is the rejection of a ten digit local number whose third digit is the 9 of the display.
    const onlyShortNines = changed.every((entry) => {
      const display = entry.split(' -> ')[1];
      return display.replace(/\D/g, '').slice(2).length === 10 && display.replace(/\D/g, '')[4] === '9';
    });

    expect(changed.length).toBeGreaterThan(0);
    expect(onlyShortNines).toBe(true);
    expect(differentValue).toEqual([]);
  });

  it('is about completeness, not about the DDD: any two digit code is judged the same on length', () => {
    const lengthOnly = ALL_TWO_DIGIT_CODES.map((code) => whatsappError(typedDisplay(`${code}9${PARTS[20]}`)) === undefined);

    expect(lengthOnly.length).toBe(90);
  });
});
