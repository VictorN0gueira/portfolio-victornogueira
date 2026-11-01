import { describe, expect, it } from 'vitest';
import { formatWhatsappDisplay, toEvolutionFormat } from '../../lib/phone';
import { isWholeDialingText, normalizePastedText, readPastedNumber } from './pastedNumber';

// Fictitious numbers only (11 90000-0000, DDD 55 90000-0000): see src/test/contactForm.tsx. Every invisible or typographic
// character is built from its code point, so this source holds none of them and no escape for one.
const char = (codePoint: number): string => String.fromCodePoint(codePoint);
const ZWSP = char(0x200b);
const LRM = char(0x200e);
const RLM = char(0x200f);
const LRE = char(0x202a);
const PDF = char(0x202c);
const WORD_JOINER = char(0x2060);
const NBSP = char(0x00a0);
const NON_BREAKING_HYPHEN = char(0x2011);
const EN_DASH = char(0x2013);
const EM_DASH = char(0x2014);
const MINUS_SIGN = char(0x2212);
const FULLWIDTH_PLUS = char(0xff0b);
const fullwidth = (digits: string): string => [...digits].map((digit) => char(0xff10 + Number(digit))).join('');

const DISPLAY = '+55 11 9 0000-0000';
const EVOLUTION = '551100000000';
const DISPLAY_DDD_55 = '+55 55 9 0000-0000';
const EVOLUTION_DDD_55 = '555500000000';

/** What the field would show after the paste is taken as a whole number, and the number the webhook would get. */
function outcome(text: string) {
  const read = readPastedNumber(text);
  if (read.action !== 'replace') return read;
  const display = formatWhatsappDisplay(read.text);
  return { ...read, display, evolution: toEvolutionFormat(display) };
}

describe('normalizePastedText', () => {
  it('removes the format characters, folds the compatibility forms and trims', () => {
    expect(normalizePastedText(`${LRE}${FULLWIDTH_PLUS}${fullwidth('55')} 11 90000${NON_BREAKING_HYPHEN}0000${PDF} `)).toBe(
      `+55 11 90000${char(0x2010)}0000`,
    );
  });
});

describe('readPastedNumber replaces the field with a whole number', () => {
  it.each([
    ['plus with spaces', '+55 11 90000-0000'],
    ['plus without spaces', '+5511900000000'],
    ['13 digits with no plus', '5511900000000'],
    ['12 digits with no plus', '551100000000'],
    ['spaced digits with no plus', '55 11 90000-0000'],
    ['plus with the DDD in parentheses', '+55 (11) 90000-0000'],
    ['a vCard phone line', 'TEL;TYPE=CELL:+55 11 90000-0000\n'],
    ['a whole vCard', 'BEGIN:VCARD\nVERSION:3.0\nTEL;TYPE=CELL:+55 11 90000-0000\nREV:20260101\nEND:VCARD\n'],
    ['no break space separators', `+55${NBSP}11${NBSP}90000-0000`],
    ['a label before the number', 'tel: +55 11 90000-0000'],
    ['the name of the app before it', 'WhatsApp +55 11 90000-0000'],
    ['the plus inside parentheses', '(+55) 11 90000-0000'],
    ['a left to right mark before it', `${LRM}+55 11 90000-0000`],
    ['a right to left mark before it', `${RLM}+55 11 90000-0000`],
    ['a zero width space before it', `${ZWSP}+55 11 90000-0000`],
    ['a word joiner before it', `${WORD_JOINER}+55 11 90000-0000`],
    ['bidi embedding controls around it', `${LRE}+55 11 90000-0000${PDF}`],
    ['bidi controls around a number with no plus', `${LRE}5511900000000${PDF}`],
    ['a double zero for the plus', '00 55 11 90000 0000'],
    ['a compact double zero', '005511900000000'],
    ['a mark before a double zero number', `${LRM}00 55 11 90000 0000`],
    ['a label before a double zero number', 'Tel: 0055 11 90000-0000'],
    ['words after the number', '+55 11 90000-0000 obrigado'],
    ['spaces and newlines around it', '  \n+55 11 90000-0000 \n'],
    ['a very long text after the number', `+55 11 90000-0000 ${'x'.repeat(5000)}`],
    ['a space between the plus and the number', '+ 55 11 90000-0000'],
  ])('%s', (_label, text) => {
    expect(outcome(text)).toMatchObject({ action: 'replace', display: DISPLAY, evolution: EVOLUTION });
  });

  // B1: a number with its country code but no plus, in a text that has letters. The browser would paste it behind the
  // "+55 " of the field, and its own 55 would be read as the DDD.
  it.each([
    ['a label before it', 'Tel: 55 11 90000-0000'],
    ['a WhatsApp link', 'https://wa.me/5511900000000'],
    ['a WhatsApp link with a text', 'https://wa.me/5511900000000?text=Ola'],
    ['a name before it', 'Ana 5511900000000'],
    ['words after it', '5511900000000 abc'],
    ['a name and a label in parentheses', 'Ana: 55 (11) 90000-0000 (WhatsApp)'],
    ['an en dash inside it', `55 11 90000${EN_DASH}0000`],
    ['a comma and a second number after it', '55 11 90000-0000, 55 21 91111-1111'],
    ['a second line with another number', '5511900000000\n5521911111111'],
    ['a mark before it and words after', `${LRM}55 11 90000-0000 (Ana)`],
  ])('takes a number with no plus and letters around it: %s', (_label, text) => {
    expect(outcome(text)).toMatchObject({ action: 'replace', display: DISPLAY, evolution: EVOLUTION });
  });

  // B2: the separators of a number. The plus numbers that were right before the run stopped at the first odd character.
  it.each([
    ['a non breaking hyphen', `+55 11 90000${NON_BREAKING_HYPHEN}0000`],
    ['an en dash', `+55 11 90000${EN_DASH}0000`],
    ['an em dash', `+55 11 90000${EM_DASH}0000`],
    ['a minus sign', `+55 11 90000${MINUS_SIGN}0000`],
    ['slashes', '+55/11/90000-0000'],
    ['dots', '+55.11.90000.0000'],
    ['a fullwidth plus', `${FULLWIDTH_PLUS}55 11 90000-0000`],
    ['fullwidth digits', `+${fullwidth('55')} 11 90000-0000`],
  ])('keeps a plus number written with %s whole', (_label, text) => {
    expect(outcome(text)).toMatchObject({ action: 'replace', display: DISPLAY, evolution: EVOLUTION });
  });

  it.each([0x2010, 0x2011, 0x2012, 0x2013, 0x2014, 0x2015, 0x2212].map((codePoint) => [codePoint.toString(16), codePoint] as const))(
    'runs through the dash U+%s',
    (_hex, codePoint) => {
      expect(outcome(`55 11 90000${char(codePoint)}0000 ola`)).toMatchObject({ action: 'replace', display: DISPLAY });
      expect(outcome(`+55 11 90000${char(codePoint)}0000`)).toMatchObject({ action: 'replace', display: DISPLAY });
    },
  );

  it.each([
    ['a DDD 55 number with the country code, spaced', '55 55 90000 0000'],
    ['a DDD 55 number with the country code, compact', '5555900000000'],
    ['a DDD 55 number with the plus', '+55 55 90000-0000'],
    ['a DDD 55 number with the country code and a label', 'Tel: 55 55 90000-0000'],
  ])('keeps a DDD 55 number as DDD 55: %s', (_label, text) => {
    expect(outcome(text)).toMatchObject({ action: 'replace', display: DISPLAY_DDD_55, evolution: EVOLUTION_DDD_55 });
  });

  it('starts the replacement text at the first plus that has a digit after it, never before it', () => {
    expect(readPastedNumber('Ligue: +55 11 90000-0000')).toEqual({ action: 'replace', text: '+55 11 90000-0000' });
    expect(readPastedNumber('(+55) 11 90000-0000')).toEqual({ action: 'replace', text: '+55) 11 90000-0000' });
    expect(readPastedNumber('C++ +55 11 90000-0000')).toEqual({ action: 'replace', text: '+55 11 90000-0000' });
  });

  it('stops at the first character a phone number is not written with, so a line after it adds no digits', () => {
    expect(readPastedNumber('TEL:+55 11 90000-0000\nREV:20260101')).toEqual({ action: 'replace', text: '+55 11 90000-0000' });
    // A line of nothing but digits after the number is not part of it either.
    expect(readPastedNumber('+55 11 90000-0000\n20260101')).toEqual({ action: 'replace', text: '+55 11 90000-0000' });
    expect(readPastedNumber('55 11 90000-0000\n20260101')).toEqual({ action: 'replace', text: '55 11 90000-0000' });
  });

  it('takes the number of the first run, so two numbers with a comma between them never merge', () => {
    expect(readPastedNumber('+55 11 90000-0000, +55 21 91111-1111')).toEqual({ action: 'replace', text: '+55 11 90000-0000' });
  });
});

describe('readPastedNumber keeps the browser default', () => {
  it.each([
    ['a local number with no country code', '11900000000'],
    ['a local number with punctuation', '(11) 90000-0000'],
    ['a DDD 55 local number, 11 digits', '55900000000'],
    ['a DDD 55 local number with punctuation', '(55) 90000-0000'],
    ['a DDD 55 local number with a space', '55 90000-0000'],
    ['a DDD 55 local number with a label', 'Tel: (55) 90000-0000'],
    ['a DDD 55 landline, 10 digits', '5590000000'],
    ['an empty clipboard', ''],
    ['only spaces and newlines', '   \n \t '],
    ['only invisible characters', `${ZWSP}${LRM}${LRE}${PDF}`],
    ['a very long text', 'x'.repeat(5000)],
    ['a sentence with a local number in it', 'meu numero e 11 90000-0000'],
    ['a trunk zero before the DDD (a known limit)', '0 11 90000-0000'],
    ['a compact trunk zero (a known limit)', '011900000000'],
    ['a local number and a stray plus after it', '11 90000-0000 +'],
    ['a local number after C++', 'C++ developer 11 90000-0000'],
  ])('%s', (_label, text) => {
    expect(readPastedNumber(text)).toEqual({ action: 'default' });
  });
});

describe('readPastedNumber cancels the paste and leaves the field as it is', () => {
  it.each([
    ['a bare plus', '+'],
    ['two plus signs', '++'],
    ['a plus in a word', 'C++ developer'],
    ['a plus and a space', '+ '],
    ['the country code alone', '+55'],
    ['a plus, a space and the country code only', '+ 55'],
    ['a plus with only invisible characters around', `${LRM}+${RLM}`],
    ['a plus and one digit that is not a 55', '+5'],
    ['a United States number', '+1 415 555 2671'],
    ['a Japanese number', '+81 98445 1243'],
    ['a British number', '+44 7911 123456'],
    ['a foreign number with a double zero', '00 44 7911 123456'],
    ['a compact foreign number with a double zero', '0044791112345'],
    ['a plus and a zero before the country code', '+055 11 90000-0000'],
    ['a bare double zero', '00'],
    ['a double zero and separators only', '00 -'],
    ['a double zero and the country code only', '0055'],
  ])('%s', (_label, text) => {
    expect(readPastedNumber(text)).toEqual({ action: 'ignore' });
  });

  // A +55 number is a Brazilian one: a number from another country pushed through the Brazilian formatter would become a
  // valid looking Brazilian number that belongs to somebody else.
  it('never hands a foreign number to the formatter', () => {
    for (const text of ['+1 415 555 2671', '+81 98445 1243', '+44 7911 123456']) {
      expect(readPastedNumber(text).action).not.toBe('replace');
    }
  });
});

// R72: a number followed by something that has digits (a date, an amount, another number). For a number that is
// not country coded, a separator with a space on both sides ends the number (a country coded number with one inside is
// ignored, see R75 below); a run of 55 and more than 13 digits is not one number and is never guessed.
describe('readPastedNumber with something that has digits after the number', () => {
  // A DDD 55 number with a label or words around it, and no spaced separator inside: right as before.
  it.each([
    ['a label and words after a DDD 55 number', 'Ligue (55) 99999-9999 oi'],
    ['a DDD 55 number alone', '55 99999-9999'],
  ])('keeps the browser default for a DDD 55 local number: %s', (_label, text) => {
    expect(readPastedNumber(text)).toEqual({ action: 'default' });
  });

  // R75: a spaced separator inside a country coded run (55 and 12 digits or more) is ambiguous. A DDD 55 number followed by a
  // spaced slash and a day, and `55 11 90000 - 0000`, have the same digits and the same structure; cutting either one
  // would hand the rest to the browser, which reads the number's own 55 as the DDD (555511900000). The paste is cancelled,
  // the field is left alone.
  it.each([
    ['a number and a spaced slash and a day', '(55) 99999-9999 / 12'],
    ['a DDD 55 number and a spaced slash and a second number', '55 99999-9999 / 55 98888-7777'],
    ['a DDD 55 number and a spaced dash and a day', 'Tel 55 99999-9999 - 12'],
    ['a spaced en dash and a day', `Tel 55 99999-9999 ${EN_DASH} 12`],
    ['a spaced minus sign and a day', `Tel 55 99999-9999 ${MINUS_SIGN} 12`],
    ['one number with a spaced dash inside', '55 11 90000 - 0000'],
    ['one number with a spaced slash inside', '55 11 99999 / 9999'],
    ['one number with a spaced en dash inside', `55 11 90000 ${EN_DASH} 0000`],
    ['one number with the DDD in parentheses and a spaced dash', '55 (11) 90000 - 0000'],
    ['a label and a spaced dash inside', 'Tel 55 11 99999 - 9999'],
    ['a DDD 51 number with a spaced dash inside', '55 51 99999 - 9999'],
    ['a label and a spaced dash after the whole number', 'Tel 55 11 90000-0000 - 12'],
    ['a label and a spaced slash after the whole number', 'Tel 55 11 90000-0000 / 12'],
    ['a double zero number with a spaced dash inside', '00 55 11 99999 - 9999'],
    ['a plus number with the DDD in parentheses and a spaced dash', '+55 (11) 99999 - 9999'],
    ['a plus number with a label and a spaced slash inside', 'tel: +55 11 99999 / 9999'],
    ['a plus number and a spaced slash after it', '+55 11 90000-0000 / 12'],
    ['a plus number and a spaced en dash inside', `+55 11 90000 ${EN_DASH} 0000`],
  ])('cancels and leaves the field alone for a country coded number cut by a spaced separator: %s', (_label, text) => {
    expect(readPastedNumber(text)).toEqual({ action: 'ignore' });
  });

  // A spaced separator after a number that is NOT country coded does not make it ambiguous.
  it.each([
    ['a local number and a spaced slash and a day', '(11) 90000-0000 / 12'],
    ['a DDD 55 number of 11 digits and a spaced dash and words', 'Tel 55 99999-9999 - Ana'],
  ])('keeps the browser default when the cut takes no country coded number: %s', (_label, text) => {
    expect(readPastedNumber(text)).toEqual({ action: 'default' });
  });

  it.each([
    ['a date with slashes after a DDD 55 number', '55 99999-9999 12/10/2026'],
    ['a date after a DDD 55 landline', '55 3222-1234 12/10/2026'],
    ['two numbers with only a space between them', '5511900000000 5521911111111'],
    ['14 digits in one run', '55119000000001'],
  ])('cancels and leaves the field alone when the run has more than 13 digits: %s', (_label, text) => {
    expect(readPastedNumber(text)).toEqual({ action: 'ignore' });
  });

  it.each([
    ['12 digits', '551100000000'],
    ['13 digits', '5511900000000'],
    ['a label and a trailing separator with no digits after it', 'Tel 55 11 90000-0000 - Ana'],
  ])('replaces the field for a run of 12 or 13 digits: %s', (_label, text) => {
    expect(outcome(text)).toMatchObject({ action: 'replace', display: DISPLAY, evolution: EVOLUTION });
  });

  it('keeps the dash without spaces inside the number (it is one run)', () => {
    expect(outcome(`55 11 90000${EN_DASH}0000`)).toMatchObject({ action: 'replace', display: DISPLAY });
  });

  // Only the first run is read: a short first run decides, so a later full number is NOT looked for. These are the
  // known limits, left to the browser on purpose; the digits of the whole text must never be counted.
  it.each([
    ['a short first run and a later full number', '55 e 5521911111111'],
    ['a short number before the number', 'Ref 12 depois 5511900000000'],
    ['a short number and a slash before the number', '7 / 5511900000000'],
    ['a footnote marker before the number', '1 5511900000000'],
    ['a number split across two lines', '5511900\n000000'],
  ])('does not look past the first run: %s', (_label, text) => {
    expect(readPastedNumber(text)).toEqual({ action: 'default' });
  });
});

describe('isWholeDialingText', () => {
  it.each(['11900000000', '(11) 90000-0000', '55 11 90000-0000', `11 90000${EN_DASH}0000`, '55/11/90000.0000'])('is true for %j', (text) => {
    expect(isWholeDialingText(text)).toBe(true);
  });

  it.each([
    ['letters', 'Reuniao dia 12 as 15h'],
    ['a sentence with a date', 'Pedido 123 de 2026-10-28 total 4500'],
    ['a plus', '11 90000-0000 +'],
    ['no digit', '- / ()'],
    ['nothing', ''],
    ['two lines', '11900000000\n21911111111'],
  ])('is false for %s', (_label, text) => {
    expect(isWholeDialingText(text)).toBe(false);
  });
});
