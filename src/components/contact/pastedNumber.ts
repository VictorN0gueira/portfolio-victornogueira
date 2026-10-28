// What to do with the text a visitor pastes or drops into the WhatsApp field. The field is filled with "+55 " from the
// start and the formatter (lib/phone.ts) reads the digits of the whole value again after every change, so a number with
// its own country code that lands behind the "+55 " that is already there has its "55" read as the DDD: a wrong but
// plausible number that passes the validation and sends the lead to somebody else. This file only decides; it formats
// nothing, and it never changes what is sent: the text it hands back goes through the same formatter as typing.

/** The browser pastes the text as it always did (a local number, a DDD 55 local number, an empty clipboard, other text). */
const KEEP_DEFAULT = { action: 'default' } as const;
/** The paste is cancelled and the field stays as it is (a number that is not Brazilian, a bare plus, a bare "00"). */
const LEAVE_FIELD = { action: 'ignore' } as const;

export type PastedNumber =
  | typeof KEEP_DEFAULT
  | typeof LEAVE_FIELD
  /** The paste is cancelled and the whole field is set from `text`: a "+" number, or a long number with 55 first. */
  | { action: 'replace'; text: string };

const COUNTRY_CODE = '55';
// 55, a DDD and the eight or nine digits of the line: a DDD 55 local number has 10 or 11 digits, never 12.
const WHOLE_NUMBER_MIN_DIGITS = 12;
// Unicode format characters: the bidi controls (U+200E, U+200F, U+202A to U+202E), the zero width space and joiners, the
// word joiner, the byte order mark. A number copied from WhatsApp is often wrapped in them, and they are invisible.
const FORMAT_CHARACTERS = /\p{Cf}/gu;
// The dashes and the minus sign of typography, U+2010 to U+2015 and U+2212 (U+2011, the non breaking hyphen, becomes
// U+2010 under NFKC). They are built from their code points: this file holds none of them, not even as an escape.
const TYPOGRAPHIC_DASHES = String.fromCodePoint(0x2010, 0x2011, 0x2012, 0x2013, 0x2014, 0x2015, 0x2212);
// What a number is written with: digits, the separators ( ) . - / and the typographic dashes, and spaces on the same
// line. A letter, a comma, a line break or any other character ends it, so "TEL:+55 11 90000-0000" followed by
// "REV:2026" never takes the digits of the next line and two numbers with a comma between them never merge.
const NUMBER_CHARACTER = `(?:[\\d().\\-/${TYPOGRAPHIC_DASHES}]|[^\\S\\r\\n])`;
const RUN_AT_PLUS = new RegExp(`\\+${NUMBER_CHARACTER}*`, 'y');
const FIRST_RUN = new RegExp(`\\d${NUMBER_CHARACTER}*`);

const digitsOf = (text: string): string => text.replace(/\D/g, '');

/**
 * The text of the clipboard (or of a drop) ready to be read: invisible format characters removed, compatibility forms
 * folded (a fullwidth plus and fullwidth digits become the ordinary ones, a non breaking hyphen becomes a hyphen), trimmed.
 */
export function normalizePastedText(text: string): string {
  return text.replace(FORMAT_CHARACTERS, '').normalize('NFKC').trim();
}

/** The run of the first "+" that is followed, after separators, by a digit; a "+" with no digit after it does not count. */
function runAtPlus(text: string): string | undefined {
  for (let at = text.indexOf('+'); at !== -1; at = text.indexOf('+', at + 1)) {
    RUN_AT_PLUS.lastIndex = at;
    const run = RUN_AT_PLUS.exec(text)?.[0] ?? '';
    if (/\d/.test(run)) return run;
  }
  return undefined;
}

/**
 * A number written with its country code: a Brazilian one (55 and at least one digit after it) is taken whole, with the
 * separators between the plus and the first digit dropped. Anything else is a number from another country, or no number
 * at all (a bare "+55", "00", "0055"): it is not handed to the Brazilian formatter, which would turn it into a valid
 * looking Brazilian number, and it is not allowed to wipe the digits that are already in the field. The paste is cancelled
 * and the field is left as it was.
 */
function readCountryCodedNumber(afterPlus: string): PastedNumber {
  const text = `+${afterPlus.replace(/^\D+/, '')}`.trim();
  const digits = digitsOf(text);
  const isBrazilian = digits.startsWith(COUNTRY_CODE) && digits.length > COUNTRY_CODE.length;

  return isBrazilian ? { action: 'replace', text } : LEAVE_FIELD;
}

/**
 * The text of the clipboard as a pasted number, after normalizePastedText:
 * - a "+" followed (after separators) by a digit: the number that starts at the first such "+" (`tel: +55 ...`,
 *   `(+55) ...`, `+55/11/90000-0000`);
 * - no such plus, and no digit anywhere (`+`, `++`, `C++`): the paste is cancelled, the field is left alone;
 * - otherwise the FIRST run of digits and separators: a leading "00" is the plus (`00 55 11 ...` would read as the DDD
 *   00; a bare `00` is cancelled), 12 or more digits starting with 55 are a whole number, wherever the run sits in the
 *   text (`Tel: 55 11 ...`, `https://wa.me/5511...`, `Ana 5511... abc`);
 * - everything else keeps the browser default: a local number, a DDD 55 local number (10 or 11 digits, `55 90000-0000`),
 *   whitespace only, any other text. A trunk zero (`0 11 90000-0000`) is not handled: it is pasted as the browser does.
 */
export function readPastedNumber(clipboardText: string): PastedNumber {
  const text = normalizePastedText(clipboardText);

  const plusRun = runAtPlus(text);
  if (plusRun !== undefined) return readCountryCodedNumber(plusRun.slice(1));

  const run = FIRST_RUN.exec(text)?.[0].trim();
  if (run === undefined) return text.includes('+') ? LEAVE_FIELD : KEEP_DEFAULT;
  if (run.startsWith('00')) return readCountryCodedNumber(run.slice(2));

  const digits = digitsOf(run);
  const isWholeNumber = digits.startsWith(COUNTRY_CODE) && digits.length >= WHOLE_NUMBER_MIN_DIGITS;
  return isWholeNumber ? { action: 'replace', text: run } : KEEP_DEFAULT;
}
