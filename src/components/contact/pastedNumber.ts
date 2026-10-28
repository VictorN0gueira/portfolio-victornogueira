// What to do with the text a visitor pastes into the WhatsApp field. The field is filled with "+55 " from the start and
// the formatter (lib/phone.ts) reads the digits of the whole value again after every change, so a number pasted with its
// own country code lands behind the "+55 " that is already there and its "55" is read as the DDD: a wrong but plausible
// number that passes the validation and sends the lead to somebody else. This file only decides; it formats nothing, and
// it never changes what is sent: the text it hands back goes through the same formatter as typing.

/** The browser pastes the text as it always did (a local number, a DDD 55 local number, an empty clipboard, any other text). */
const KEEP_DEFAULT = { action: 'default' } as const;
/** The paste is cancelled and the field stays as it is (a number that is not Brazilian, a bare plus). */
const LEAVE_FIELD = { action: 'ignore' } as const;

export type PastedNumber =
  | typeof KEEP_DEFAULT
  | typeof LEAVE_FIELD
  /** The paste is cancelled and the whole field is set from `text`, which starts with "+" or is a long number with 55 first. */
  | { action: 'replace'; text: string };

const COUNTRY_CODE = '55';
// 55, a DDD and the eight or nine digits of the line: a DDD 55 local number has 10 or 11 digits, never 12.
const WHOLE_NUMBER_MIN_DIGITS = 12;
// Unicode format characters: the bidi controls (U+200E, U+200F, U+202A to U+202E), the zero width space and joiners, the
// word joiner, the byte order mark. A number copied from WhatsApp is often wrapped in them, and they are invisible.
const FORMAT_CHARACTERS = /\p{Cf}/gu;
// Only what a phone number is written with: digits, spaces and newlines, dashes, dots and parentheses.
const DIALING_TEXT = /^[\d\s\-().]+$/;
// The number that starts at a plus: digits, brackets, dashes, dots and spaces on the same line. A word or a new line
// ends it, so "TEL:+55 11 90000-0000" followed by "REV:2026" never takes the digits of the next line.
const NUMBER_AT_PLUS = /^\+(?:[\d().-]|[^\S\r\n])*/;
const DOUBLE_ZERO = /^00/;

const digitsOf = (text: string): string => text.replace(/\D/g, '');

/**
 * A text that starts with "+": a Brazilian number (55 and at least one digit after it) is taken whole. Anything else is a
 * number from another country, or no number at all (a bare "+", "+55" alone, "C++"): it is not handed to the Brazilian
 * formatter, which would turn it into a valid looking Brazilian number, and it is not allowed to wipe the digits that
 * are already in the field. The paste is cancelled and the field is left as it was.
 */
function readPlusNumber(candidate: string): PastedNumber {
  const digits = digitsOf(candidate);
  const isBrazilian = digits.startsWith(COUNTRY_CODE) && digits.length > COUNTRY_CODE.length;

  return isBrazilian ? { action: 'replace', text: candidate.trim() } : LEAVE_FIELD;
}

/**
 * The text of the clipboard as a pasted number: invisible format characters removed, then
 * - anything with a "+" in it: the number that starts at the first "+" (so "tel: +55 ..." and "(+55) ..." work);
 * - a leading "00" is the plus (`00 55 11 ...`, which would otherwise read as the DDD 00);
 * - a number written with dialing characters only, with 12 or more digits starting with 55: a whole number;
 * - everything else keeps the browser default: a local number, a DDD 55 local number (10 or 11 digits, "55 90000-0000"),
 *   whitespace only, any other text. A trunk zero (`0 11 90000-0000`) is not handled: it is pasted as the browser does.
 */
export function readPastedNumber(clipboardText: string): PastedNumber {
  const text = clipboardText.replace(FORMAT_CHARACTERS, '').trim();
  if (text === '') return KEEP_DEFAULT;

  const plusAt = text.indexOf('+');
  if (plusAt !== -1) return readPlusNumber((NUMBER_AT_PLUS.exec(text.slice(plusAt)) ?? [''])[0]);
  if (!DIALING_TEXT.test(text)) return KEEP_DEFAULT;

  if (DOUBLE_ZERO.test(text)) {
    const rest = text.slice(2).trim();
    return digitsOf(rest) === '' ? KEEP_DEFAULT : readPlusNumber(`+${rest}`);
  }

  const digits = digitsOf(text);
  const isWholeNumber = digits.startsWith(COUNTRY_CODE) && digits.length >= WHOLE_NUMBER_MIN_DIGITS;
  return isWholeNumber ? { action: 'replace', text } : KEEP_DEFAULT;
}
