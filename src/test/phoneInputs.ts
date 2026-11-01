import { readPastedNumber } from '../components/contact/pastedNumber';
import { validateContact } from '../lib/contact';
import { formatWhatsappDisplay } from '../lib/phone';

/**
 * An independent corpus of Brazilian numbers for the phone tests, built on its own (not from phoneCorpus.ts): every two
 * digit DDD from 10 to 99, the DDDs that exist written as ranges, and eight digit parts that come from structure (runs of
 * nines, repeated and counting digits) plus a seeded xorshift generator. Deterministic: the same list on every run.
 */

const range = (from: number, to: number): string[] =>
  Array.from({ length: to - from + 1 }, (_, index) => String(from + index));

/** Every two digit string from 10 to 99, valid DDD or not. */
export const ALL_TWO_DIGIT_CODES: readonly string[] = range(10, 99);

/** The DDDs in use in Brazil, written the way ANATEL lists them. */
export const EXISTING_DDDS: readonly string[] = [
  ...range(11, 19),
  ...['21', '22', '24', '27', '28'],
  ...range(31, 35),
  ...['37', '38'],
  ...range(41, 49),
  ...['51', '53', '54', '55'],
  ...range(61, 69),
  ...['71', '73', '74', '75', '77', '79'],
  ...range(81, 89),
  ...range(91, 99),
];

export const NON_EXISTING_DDDS: readonly string[] = ALL_TWO_DIGIT_CODES.filter((code) => !EXISTING_DDDS.includes(code));

/** xorshift32: a different generator and seed from the other corpus on purpose. */
function xorshift(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}

function structuredParts(): string[] {
  const parts: string[] = [];
  for (let digit = 0; digit <= 9; digit += 1) parts.push(String(digit).repeat(8));
  parts.push('12345678', '23456789', '87654321', '98765432', '90123456', '10203040', '90909090', '99009900');
  // Runs of nines of every length at the start, then a different digit, then counting digits.
  for (let run = 1; run <= 7; run += 1) {
    for (const tail of ['1', '2', '5', '8']) {
      parts.push(`${'9'.repeat(run)}${tail}${'0123456789'.repeat(2)}`.slice(0, 8));
    }
  }
  // Every first digit with a plain tail, and every digit in the last place of a run of nines.
  for (let first = 0; first <= 9; first += 1) parts.push(`${first}${'4'.repeat(7)}`);
  for (let last = 0; last <= 9; last += 1) parts.push(`${'9'.repeat(7)}${last}`);
  return parts;
}

function randomParts(count: number): string[] {
  const next = xorshift(0x9e3779b1);
  return Array.from({ length: count }, () =>
    Array.from({ length: 8 }, () => String(Math.floor(next() * 10))).join(''),
  );
}

export const EIGHT_DIGIT_PARTS_INDEPENDENT: readonly string[] = [...new Set([...structuredParts(), ...randomParts(900)])];

export type NumberShape = {
  name: string;
  /** What a visitor types or pastes for the number with this DDD and eight digit part. */
  text: (ddd: string, part: string) => string;
  /** The shapes with no mobile 9 and a part that starts with 9 read that 9 as the mobile 9: a known ambiguity. */
  hasMobileNine: boolean;
};

const grouped = (part: string) => `${part.slice(0, 4)}-${part.slice(4)}`;

/** Local numbers, with the country code typed by hand, with the trunk zero, punctuated. */
export const NUMBER_SHAPES: readonly NumberShape[] = [
  { name: 'local 11 digits', text: (d, p) => `${d}9${p}`, hasMobileNine: true },
  { name: 'local 10 digits', text: (d, p) => `${d}${p}`, hasMobileNine: false },
  { name: 'punctuated', text: (d, p) => `(${d}) 9${grouped(p)}`, hasMobileNine: true },
  { name: 'spaced nine', text: (d, p) => `${d} 9 ${grouped(p)}`, hasMobileNine: true },
  { name: 'plus 55 typed', text: (d, p) => `+55${d}9${p}`, hasMobileNine: true },
  { name: 'plus 55 typed, spaced', text: (d, p) => `+55 ${d} 9 ${grouped(p)}`, hasMobileNine: true },
  { name: 'plus 55 typed, no nine', text: (d, p) => `+55${d}${p}`, hasMobileNine: false },
  { name: '55 typed', text: (d, p) => `55${d}9${p}`, hasMobileNine: true },
  { name: '55 typed, no nine', text: (d, p) => `55${d}${p}`, hasMobileNine: false },
  { name: 'trunk zero', text: (d, p) => `0${d}9${p}`, hasMobileNine: true },
  { name: 'trunk zero, no nine', text: (d, p) => `0${d}${p}`, hasMobileNine: false },
  { name: 'trunk zero, spaced', text: (d, p) => `0 ${d} 9 ${grouped(p)}`, hasMobileNine: true },
];

export const FIELD_START = '+55 ';

/** Typing: the field starts as "+55 " and the form formats the whole value again after every key. */
export const typedDisplay = (text: string, from = FIELD_START): string =>
  [...text].reduce((display, key) => formatWhatsappDisplay(display + key), from);

/**
 * Pasting: the guard of the field decides first (readPastedNumber), then a whole number replaces the field and any other
 * text is inserted behind the "+55 " by the browser; both go through the same formatter.
 */
export function pastedDisplay(text: string): string {
  const read = readPastedNumber(text);
  if (read.action === 'replace') return formatWhatsappDisplay(read.text);
  if (read.action === 'ignore') return FIELD_START;
  return formatWhatsappDisplay(FIELD_START + text);
}

/** The display a complete number has, built by hand: +55 DD 9 NNNN-NNNN. */
export const handBuiltDisplay = (ddd: string, part: string): string => `+55 ${ddd} 9 ${grouped(part)}`;

/** The value the lead channel gets, built by hand: 55, the DDD and the eight digits. */
export const handBuiltValue = (ddd: string, part: string): string => `55${ddd}${part}`;

/** "+55 81 9 ...": the 9 the field shows is the character at index 7. */
export const SHOWN_NINE_AT = 7;
/** The caret just after "+55 ". */
export const FIRST_CARET = 4;

/** The display that digits give, written by hand (not through the formatter): DDD, the field's 9, the number, ten digits at most. */
export function displayOfDigits(digits: string): string {
  const kept = digits.slice(0, 10);
  const number = kept.slice(2);
  return `+55 ${kept.slice(0, 2)} 9 ${number.length <= 4 ? number : `${number.slice(0, 4)}-${number.slice(4)}`}`;
}

/** The index, among the digits of the number (the shown 9 left out), that a caret at `caret` of a complete display points at. */
export function numberIndexOfCaret(display: string, caret: number): number {
  const digitsBefore = [...display.slice(FIRST_CARET, caret)].filter((char) => /\d/.test(char)).length;
  return caret > SHOWN_NINE_AT ? digitsBefore - 1 : digitsBefore;
}

/** A fixed line starts with 2 to 5: the shapes with no mobile 9 are only real numbers for such a part. */
export const isRealNumber = (shape: { hasMobileNine: boolean }, part: string): boolean => shape.hasMobileNine || '2345'.includes(part[0]);

/** The error the whatsapp validation of the form gives this display (the other fields of the draft are valid), if any. */
export const whatsappError = (display: string): string | undefined =>
  validateContact({ nome: 'Ana Lima', email: 'a@b.com', whatsapp: display, mensagem: 'Quero automatizar notas fiscais', servico: 'x' }, 'whatsapp').whatsapp;

/** True when the whatsapp validation of the form refuses this display. */
export const isRefused = (display: string): boolean => whatsappError(display) !== undefined;
