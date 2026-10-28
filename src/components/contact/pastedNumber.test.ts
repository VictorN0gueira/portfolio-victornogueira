import { describe, expect, it } from 'vitest';
import { formatWhatsappDisplay, toEvolutionFormat } from '../../lib/phone';
import { normalizePastedText, readPastedNumber } from './pastedNumber';

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
