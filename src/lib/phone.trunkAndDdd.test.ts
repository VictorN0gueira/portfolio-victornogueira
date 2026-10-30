import { describe, expect, it, vi } from 'vitest';
import {
  ALL_TWO_DIGIT_CODES,
  EIGHT_DIGIT_PARTS_INDEPENDENT as PARTS,
  EXISTING_DDDS,
  NON_EXISTING_DDDS,
  NUMBER_SHAPES,
  handBuiltDisplay,
  handBuiltValue,
  pastedDisplay,
  typedDisplay,
} from '../test/phoneInputs';
import { oracleHasValidLength, oracleToEvolution } from '../test/phoneOracle';
import { validateContact } from './contact';
import { toEvolutionFormat } from './phone';

// Many thousands of typed strings: the default 5 seconds is tight on a busy machine.
vi.setConfig({ testTimeout: 120_000 });

// P3: a trunk zero ("0 81 98445-1243", 081984451243) used to be read as the DDD 08 and the number was valid and sent with
// it. Now the zero is dropped like the paste rules drop it, and a DDD that does not exist is refused.

const ok = {
  nome: 'Ana Lima',
  email: 'ana@empresa.com.br',
  whatsapp: '',
  mensagem: 'Quero automatizar notas fiscais',
  servico: 'Automação de processos',
};
const whatsappError = (whatsapp: string) => validateContact({ ...ok, whatsapp }, 'whatsapp').whatsapp;
const INCOMPLETE = 'Coloca o número com DDD, por exemplo 81 99999-9999';
const NO_SUCH_DDD = 'Esse DDD não existe, confere o número';

const trunkShapes = NUMBER_SHAPES.filter((shape) => shape.name.includes('trunk'));
/** A fixed line starts with 2 to 5: the shapes with no mobile 9 are only real numbers for such a part. */
const isRealNumber = (shape: { hasMobileNine: boolean }, part: string) => shape.hasMobileNine || '2345'.includes(part[0]);

describe('P3: a trunk zero is dropped, typed and pasted', () => {
  it('fixes the numbers of the review', () => {
    expect(typedDisplay('081984451243')).toBe('+55 81 9 8445-1243');
    expect(toEvolutionFormat(typedDisplay('081984451243'))).toBe('558184451243');
    expect(typedDisplay('0 81 98445-1243')).toBe('+55 81 9 8445-1243');
    expect(typedDisplay('08184451243')).toBe('+55 81 9 8445-1243');
  });

  it('ends on the number the text holds, typed and pasted, for every existing DDD and every trunk zero shape', () => {
    const wrong: string[] = [];
    for (const ddd of EXISTING_DDDS) {
      for (const part of PARTS) {
        for (const shape of trunkShapes) {
          if (!isRealNumber(shape, part) || (!shape.hasMobileNine && part.startsWith('9'))) continue;
          const text = shape.text(ddd, part);
          const typed = typedDisplay(text);
          if (typed !== handBuiltDisplay(ddd, part) || pastedDisplay(text) !== typed) wrong.push(`${text} -> ${typed}`);
          if (toEvolutionFormat(typed) !== handBuiltValue(ddd, part)) wrong.push(`${text} sends ${toEvolutionFormat(typed)}`);
        }
      }
    }

    expect(wrong.slice(0, 20)).toEqual([]);
  });

  it('types and pastes the same for the ten digit numbers whose part starts with 9 too', () => {
    const different = EXISTING_DDDS.flatMap((ddd) =>
      PARTS.filter((part) => part.startsWith('9')).flatMap((part) => trunkShapes.filter((shape) => !shape.hasMobileNine).map((shape) => shape.text(ddd, part))),
    ).filter((text) => typedDisplay(text) !== pastedDisplay(text));

    expect(different.slice(0, 20)).toEqual([]);
  });

  it('shows nothing for a lone zero, and a zero in the middle of a number is not a trunk zero', () => {
    expect(typedDisplay('0')).toBe('+55 ');
    expect(typedDisplay('00')).toBe('+55 ');
    expect(typedDisplay('8109')).toBe('+55 81 9 09');
    expect(typedDisplay('1099999999')).toBe('+55 10 9 9999-999');
  });

  // The carrier code after the zero has its own file (phone.carrier.test.ts).
});

describe('P3: a DDD that does not exist is refused', () => {
  it('lists the 67 DDDs and every other two digit code as not existing', () => {
    expect(EXISTING_DDDS).toHaveLength(67);
    expect(NON_EXISTING_DDDS).toHaveLength(ALL_TWO_DIGIT_CODES.length - 67);
  });

  it('refuses every complete number whose DDD does not exist, with its own message', () => {
    const accepted: string[] = [];
    const wrongMessage: string[] = [];
    for (const ddd of NON_EXISTING_DDDS) {
      for (const part of PARTS.filter((_, index) => index % 7 === 0)) {
        const display = typedDisplay(`${ddd}9${part}`);
        const error = whatsappError(display);
        if (error === undefined) accepted.push(display);
        else if (error !== NO_SUCH_DDD) wrongMessage.push(`${display}: ${error}`);
      }
    }

    expect(accepted.slice(0, 20)).toEqual([]);
    expect(wrongMessage.slice(0, 20)).toEqual([]);
  });

  it('refuses the raw number with the DDD 08 of the review', () => {
    expect(whatsappError('08184451243')).toBe(NO_SUCH_DDD);
    expect(whatsappError('+55 08 9 8445-1243')).toBe(NO_SUCH_DDD);
  });

  it('still asks for a complete number first: an incomplete number is not told about its DDD', () => {
    expect(whatsappError('+55 08')).toBe(INCOMPLETE);
    expect(whatsappError('')).toBe(INCOMPLETE);
  });

  it('accepts every existing DDD with a complete number (the e2e and unit numbers included)', () => {
    const refused = EXISTING_DDDS.filter((ddd) => whatsappError(typedDisplay(`${ddd}9${PARTS[7]}`)) !== undefined);

    expect(refused).toEqual([]);
    for (const raw of ['+55 11 9 0000-0000', '11900000000', '81984451243', '+55 81 9 8445-1243', '55984451243', '+55 55 9 8445-1243']) {
      expect(whatsappError(raw)).toBeUndefined();
    }
  });

  it('uses no dash and no slash in the new message', () => {
    expect(NO_SUCH_DDD).not.toMatch(/[–—/-]/u);
  });
});

describe('P3: what worked before is unchanged', () => {
  it('keeps accepting, and sending the same value for, every number of an existing DDD that the old rule accepted', () => {
    const changed: string[] = [];
    for (const ddd of EXISTING_DDDS) {
      for (const part of PARTS.filter((_, index) => index % 3 === 0)) {
        for (const shape of NUMBER_SHAPES.filter((entry) => !entry.name.includes('trunk') && !entry.name.includes('55 typed'))) {
          if (ddd === '55' && !shape.hasMobileNine && '01678'.includes(part[0])) continue;
          const display = typedDisplay(shape.text(ddd, part));
          // A number the P1 commit already refuses (one digit short) is not compared: only what is accepted both times is.
          if (oracleHasValidLength(display) && whatsappError(display) === undefined && oracleToEvolution(display) !== toEvolutionFormat(display)) changed.push(display);
        }
      }
    }

    expect(changed).toEqual([]);
  });

  it('refuses nothing new for an existing DDD: only the DDDs that do not exist change the outcome', () => {
    const changed: string[] = [];
    for (const ddd of [...EXISTING_DDDS, ...NON_EXISTING_DDDS]) {
      for (const part of PARTS.filter((_, index) => index % 11 === 0)) {
        const display = typedDisplay(`${ddd}9${part}`);
        const before = oracleHasValidLength(display);
        const after = whatsappError(display) === undefined;
        if (before !== after) changed.push(`${ddd}: ${before} -> ${after}`);
      }
    }

    expect(changed.length).toBeGreaterThan(0);
    expect(changed.every((entry) => NON_EXISTING_DDDS.includes(entry.slice(0, 2)))).toBe(true);
  });
});
