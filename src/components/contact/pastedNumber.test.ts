import { describe, expect, it } from 'vitest';
import { formatWhatsappDisplay, toEvolutionFormat } from '../../lib/phone';
import { readPastedNumber } from './pastedNumber';

// Fictitious numbers only (11 90000-0000, DDD 55 90000-0000): see src/test/contactForm.ts. Invisible characters are
// written as escapes, so the source holds none: U+200B ZWSP, U+200E LRM, U+200F RLM, U+202A LRE, U+202C PDF, U+2060
// word joiner, U+00A0 no break space.
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
    ['no break space separators', '+55\u00a011\u00a090000-0000'],
    ['a label before the number', 'tel: +55 11 90000-0000'],
    ['the name of the app before it', 'WhatsApp +55 11 90000-0000'],
    ['the plus inside parentheses', '(+55) 11 90000-0000'],
    ['a left to right mark before it', '\u200e+55 11 90000-0000'],
    ['a right to left mark before it', '\u200f+55 11 90000-0000'],
    ['a zero width space before it', '\u200b+55 11 90000-0000'],
    ['a word joiner before it', '\u2060+55 11 90000-0000'],
    ['bidi embedding controls around it', '\u202a+55 11 90000-0000\u202c'],
    ['a double zero for the plus', '00 55 11 90000 0000'],
    ['a compact double zero', '005511900000000'],
    ['bidi controls around a number with no plus', '\u202a5511900000000\u202c'],
    ['a mark before a double zero number', '\u200e00 55 11 90000 0000'],
    ['words after the number', '+55 11 90000-0000 obrigado'],
    ['spaces and newlines around it', '  \n+55 11 90000-0000 \n'],
    ['a very long text after the number', `+55 11 90000-0000 ${'x'.repeat(5000)}`],
  ])('%s', (_label, text) => {
    expect(outcome(text)).toMatchObject({ action: 'replace', display: DISPLAY, evolution: EVOLUTION });
  });

  it.each([
    ['a DDD 55 number with the country code, spaced', '55 55 90000 0000'],
    ['a DDD 55 number with the country code, compact', '5555900000000'],
    ['a DDD 55 number with the plus', '+55 55 90000-0000'],
  ])('keeps a DDD 55 number as DDD 55: %s', (_label, text) => {
    expect(outcome(text)).toMatchObject({ action: 'replace', display: DISPLAY_DDD_55, evolution: EVOLUTION_DDD_55 });
  });

  it('starts the replacement text at the first plus, never before it', () => {
    expect(readPastedNumber('Ligue: +55 11 90000-0000')).toEqual({ action: 'replace', text: '+55 11 90000-0000' });
    expect(readPastedNumber('(+55) 11 90000-0000')).toEqual({ action: 'replace', text: '+55) 11 90000-0000' });
  });

  it('stops at the first character a phone number is not written with, so a line after it adds no digits', () => {
    expect(readPastedNumber('TEL:+55 11 90000-0000\nREV:20260101')).toEqual({ action: 'replace', text: '+55 11 90000-0000' });
    // A line of nothing but digits after the number is not part of it either.
    expect(readPastedNumber('+55 11 90000-0000\n20260101')).toEqual({ action: 'replace', text: '+55 11 90000-0000' });
  });
});

describe('readPastedNumber keeps the browser default', () => {
  it.each([
    ['a local number with no country code', '11900000000'],
    ['a local number with punctuation', '(11) 90000-0000'],
    ['a DDD 55 local number, 11 digits', '55900000000'],
    ['a DDD 55 local number with punctuation', '(55) 90000-0000'],
    ['a DDD 55 local number with a space', '55 90000-0000'],
    ['a DDD 55 landline, 10 digits', '5590000000'],
    ['an empty clipboard', ''],
    ['only spaces and newlines', '   \n \t '],
    ['only invisible characters', '\u200b\u200e\u202a\u202c'],
    ['a very long text', 'x'.repeat(5000)],
    ['a sentence with a local number in it', 'meu numero e 11 90000-0000'],
    ['a trunk zero before the DDD (a known limit)', '0 11 90000-0000'],
    ['a compact trunk zero (a known limit)', '011900000000'],
    ['a double zero and nothing else', '00'],
  ])('%s', (_label, text) => {
    expect(readPastedNumber(text)).toEqual({ action: 'default' });
  });
});

describe('readPastedNumber cancels the paste and leaves the field as it is', () => {
  it.each([
    ['a bare plus', '+'],
    ['two plus signs', '++'],
    ['a plus in a word', 'C++ developer'],
    ['a plus and the country code only', '+55'],
    ['a plus, a space and the country code only', '+ 55'],
    ['a plus with only invisible characters around', '\u200e+\u200f'],
    ['a plus and one digit that is not a 55', '+5'],
    ['a United States number', '+1 415 555 2671'],
    ['a Japanese number', '+81 98445 1243'],
    ['a British number', '+44 7911 123456'],
    ['a foreign number with a double zero', '00 44 7911 123456'],
    ['a compact foreign number with a double zero', '0044791112345'],
    ['a plus and a zero before the country code', '+055 11 90000-0000'],
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
