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
// The separators a number is written with: brackets, dots, hyphens, slashes and the typographic dashes.
const SEPARATORS = `().\\-/${TYPOGRAPHIC_DASHES}`;
// What a number is written with: digits, the separators above and spaces on the same line. A letter, a comma, a line
// break or any other character ends it, so "TEL:+55 11 90000-0000" followed by "REV:2026" never takes the digits of the
// next line and two numbers with a comma between them never merge.
const NUMBER_CHARACTER = `(?:[\\d${SEPARATORS}]|[^\\S\\r\\n])`;
// A separator with a space on both sides (a slash or a dash between two spaces) is the end of the number, not a part of
// it: what follows is another thing (a date, an amount, another number).
const SPACED_SEPARATOR = new RegExp(`\\s[${SEPARATORS.replace('().', '')}]\\s`);
// Stateless on purpose: they are applied to a slice of the text, so there is no lastIndex to share between calls.
const NUMBER_AT_PLUS = new RegExp(`^\\+${NUMBER_CHARACTER}*`);
const FIRST_RUN = new RegExp(`\\d${NUMBER_CHARACTER}*`);
// A text that is a number as a whole, on one line: digits (at least one), the separators and spaces, nothing else.
const WHOLE_DIALING_TEXT = new RegExp(`^(?=.*\\d)[\\d${SEPARATORS}\\t ]+$`);
// A run that starts with 55 and has more digits than a country coded number can have (55, a DDD and nine digits) is not
// one number: it is a number followed by something with digits. The field is left alone rather than guessed.
const COUNTRY_CODED_MAX_DIGITS = 13;

/**
 * The run of a match cut where a separator with a space on both sides begins, and whether the cut took digits away. A cut
 * that takes digits away is a doubt: the text may be one number written with a spaced separator inside (`55 11 90000 - 0000`)
 * or a number followed by something else (a DDD 55 number, a spaced slash, a day), and nothing but its structure tells them apart.
 */
function cutAtSpacedSeparator(match: string): { run: string; tookDigits: boolean } {
  const end = match.search(SPACED_SEPARATOR);
  const run = (end === -1 ? match : match.slice(0, end)).trim();
  return { run, tookDigits: digitsOf(run) !== digitsOf(match) };
}

const digitsOf = (text: string): string => text.replace(/\D/g, '');

/**
 * The text of the clipboard (or of a drop) ready to be read: invisible format characters removed, compatibility forms
 * folded (a fullwidth plus and fullwidth digits become the ordinary ones, a non breaking hyphen becomes a hyphen), trimmed.
 */
export function normalizePastedText(text: string): string {
  return text.replace(FORMAT_CHARACTERS, '').normalize('NFKC').trim();
}

/**
 * The run of the first "+" that is followed, after separators, by a digit; a "+" with no digit after it does not count.
 * A run that a spaced separator cut short is `ambiguous`: the number is not applied (see cutAtSpacedSeparator).
 */
function runAtPlus(text: string): { run: string; isAmbiguous: boolean } | undefined {
  for (let at = text.indexOf('+'); at !== -1; at = text.indexOf('+', at + 1)) {
    const { run, tookDigits } = cutAtSpacedSeparator(NUMBER_AT_PLUS.exec(text.slice(at))?.[0] ?? '');
    if (/\d/.test(run)) return { run, isAmbiguous: tookDigits };
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

/** True when a match is, or may be, a number with its country code: it starts with 00, or with 55 and has 12+ digits. */
function isCountryCoded(uncutMatch: string): boolean {
  const digits = digitsOf(uncutMatch);
  return digits.startsWith('00') || (digits.startsWith(COUNTRY_CODE) && digits.length >= WHOLE_NUMBER_MIN_DIGITS);
}

/**
 * The text of the clipboard as a pasted number, after normalizePastedText:
 * - a "+" followed (after separators) by a digit: the number that starts at the first such "+" (`tel: +55 ...`,
 *   `(+55) ...`, `+55/11/90000-0000`);
 * - no such plus, and no digit anywhere (`+`, `++`, `C++`): the paste is cancelled, the field is left alone;
 * - otherwise the FIRST run of digits and separators (a separator with a space on both sides ends it): a leading "00" is
 *   the plus (`00 55 11 ...` would read as the DDD 00; a bare `00` is cancelled); a run that starts with 55 and has 12 or
 *   13 digits is a whole number (`Tel: 55 11 ...`, `https://wa.me/5511...`, `Ana 5511... abc`); one with more than 13 is
 *   a number followed by something with digits (`55 3222-1234 12/10/2026`): cancelled, the field is left alone;
 * - a country coded number (a plus, 00, or 55 with 12 digits or more) that a spaced separator would cut is ambiguous: it
 *   may be one number written with a separator inside (`55 11 90000 - 0000`) or a number followed by something else
 *   (a DDD 55 number, a spaced slash, a day), and only its structure could tell, so the paste is cancelled and the field
 *   is left alone.
 *   Known limit: such a number is not applied, and neither is a country coded number followed by a spaced separator and
 *   more digits. Cutting it would hand the rest to the browser, which reads the number's own 55 as the DDD;
 * - everything else keeps the browser default: a local number, a DDD 55 local number (10 or 11 digits, `55 90000-0000`),
 *   whitespace only, any other text. A trunk zero (`0 11 90000-0000`) is not handled: it is pasted as the browser does.
 * Known limits, left to the browser on purpose: only the FIRST run is read, so a number that comes after a shorter run is
 * not found (`Ref 12 depois 5511900000000`, a short number and a slash before it, a footnote marker before the number, a
 * number split across two lines).
 */
export function readPastedNumber(clipboardText: string): PastedNumber {
  const text = normalizePastedText(clipboardText);

  const plus = runAtPlus(text);
  if (plus !== undefined) return plus.isAmbiguous ? LEAVE_FIELD : readCountryCodedNumber(plus.run.slice(1));

  const first = FIRST_RUN.exec(text)?.[0];
  if (first === undefined) return text.includes('+') ? LEAVE_FIELD : KEEP_DEFAULT;
  const { run, tookDigits } = cutAtSpacedSeparator(first);
  if (tookDigits && isCountryCoded(first)) return LEAVE_FIELD;
  if (run.startsWith('00')) return readCountryCodedNumber(run.slice(2));

  const digits = digitsOf(run);
  if (!digits.startsWith(COUNTRY_CODE) || digits.length < WHOLE_NUMBER_MIN_DIGITS) return KEEP_DEFAULT;
  return digits.length > COUNTRY_CODED_MAX_DIGITS ? LEAVE_FIELD : { action: 'replace', text: run };
}

/** True for a text that is a number as a whole (a local number, a number with its code): what a drop may set the field from. */
export function isWholeDialingText(text: string): boolean {
  return WHOLE_DIALING_TEXT.test(text);
}
