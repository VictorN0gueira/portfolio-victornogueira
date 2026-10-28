import { fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { toEvolutionFormat } from '../lib/phone';
import { expectNoConsoleOutput } from '../test/consoleGuard';
import {
  TEST_PHONE_DISPLAY,
  TEST_PHONE_EVOLUTION,
  WHATSAPP_WEBHOOK,
  openWhatsappForm,
  rejectUnexpectedFetch,
  sendWhatsappForm,
  stubFetch,
} from '../test/contactForm';

// The adversarial paste matrix of the WhatsApp field, through the whole form: what a visitor can copy from WhatsApp, a
// vCard, a web page or a spreadsheet, and what the field and the webhook get. Fictitious numbers only (11 90000-0000 and
// DDD 55 90000-0000). Invisible characters are escapes: U+200B ZWSP, U+200E LRM, U+200F RLM, U+202A LRE, U+202C PDF,
// U+2060 word joiner, U+00A0 no break space.

expectNoConsoleOutput();

beforeEach(() => {
  rejectUnexpectedFetch();
});

const DISPLAY_DDD_55 = '+55 55 9 0000-0000';
const EVOLUTION_DDD_55 = '555500000000';
const EMPTY_FIELD = '+55 ';

/** Pastes `text` at the caret after the prefix and says what the browser was told: false when the paste was cancelled. */
async function pasteInto(whatsapp: HTMLInputElement, text: string) {
  whatsapp.focus();
  whatsapp.setSelectionRange(whatsapp.value.length, whatsapp.value.length);
  return fireEvent.paste(whatsapp, { clipboardData: { getData: () => text } });
}

// With no default action in jsdom the field only changes when the page handles the paste itself, so a row that keeps
// the default is pasted with user.paste, which inserts the text the way the browser does.
describe('a whole number the field takes as it is (display and webhook number)', () => {
  it.each([
    ['plus with spaces', '+55 11 90000-0000'],
    ['plus with no spaces', '+5511900000000'],
    ['13 digits with no plus', '5511900000000'],
    ['12 digits with no plus', '551100000000'],
    ['spaced digits with no plus', '55 11 90000-0000'],
    ['plus with the DDD in parentheses', '+55 (11) 90000-0000'],
    ['a vCard phone line', 'TEL;TYPE=CELL:+55 11 90000-0000\n'],
    ['no break space separators', '+55\u00a011\u00a090000-0000'],
    ['a label before the number', 'tel: +55 11 90000-0000'],
    ['the name of the app before the number', 'WhatsApp +55 11 90000-0000'],
    ['the plus inside parentheses', '(+55) 11 90000-0000'],
    ['a left to right mark before the number', '\u200e+55 11 90000-0000'],
    ['a right to left mark before the number', '\u200f+55 11 90000-0000'],
    ['a zero width space before the number', '\u200b+55 11 90000-0000'],
    ['bidi embedding controls around the number', '\u202a+55 11 90000-0000\u202c'],
    ['a double zero for the plus', '00 55 11 90000 0000'],
    ['a compact double zero', '005511900000000'],
    ['bidi controls around a number with no plus', '\u202a5511900000000\u202c'],
    ['a mark before a double zero number', '\u200e00 55 11 90000 0000'],
    ['spaces and newlines around the number', '  \n+55 11 90000-0000 \n'],
    ['a long text after the number', `+55 11 90000-0000 ${'x'.repeat(5000)}`],
  ])('%s', async (_label, text) => {
    const { user, whatsapp } = await openWhatsappForm();
    await user.click(whatsapp);

    const wasNotCancelled = await pasteInto(whatsapp, text);

    expect(wasNotCancelled).toBe(false);
    expect(whatsapp).toHaveValue(TEST_PHONE_DISPLAY);
    expect(toEvolutionFormat(whatsapp.value)).toBe(TEST_PHONE_EVOLUTION);
  });

  it.each([
    ['a DDD 55 number with the country code, spaced', '55 55 90000 0000'],
    ['a DDD 55 number with the country code, compact', '5555900000000'],
  ])('keeps %s as DDD 55', async (_label, text) => {
    const { user, whatsapp } = await openWhatsappForm();
    await user.click(whatsapp);

    await pasteInto(whatsapp, text);

    expect(whatsapp).toHaveValue(DISPLAY_DDD_55);
    expect(toEvolutionFormat(whatsapp.value)).toBe(EVOLUTION_DDD_55);
  });

  // The rows above are checked on the display and on toEvolutionFormat, the function the payload is built with; these
  // send the form, so the webhook receives exactly that number.
  it.each([
    ['+55 11 90000-0000'],
    ['\u202a+55 11 90000-0000\u202c'],
    ['tel: +55 11 90000-0000'],
    ['00 55 11 90000 0000'],
    ['5511900000000'],
  ])('sends %j to the WhatsApp webhook as the right number', async (text) => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { user, whatsapp } = await openWhatsappForm();
    await user.click(whatsapp);
    await pasteInto(whatsapp, text);

    const { url, body } = await sendWhatsappForm(user, fetchMock);

    expect(url).toBe(WHATSAPP_WEBHOOK);
    expect(body.whatsapp).toBe(TEST_PHONE_EVOLUTION);
  });

  it('sends a DDD 55 number with the country code as DDD 55', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { user, whatsapp } = await openWhatsappForm();
    await user.click(whatsapp);
    await pasteInto(whatsapp, '+55 55 90000-0000');

    const { body } = await sendWhatsappForm(user, fetchMock);

    expect(body.whatsapp).toBe(EVOLUTION_DDD_55);
  });
});

describe('a paste the browser handles (the default is not cancelled)', () => {
  it.each([
    ['a local number with no country code', '11900000000', TEST_PHONE_DISPLAY],
    ['a local number with punctuation', '(11) 90000-0000', TEST_PHONE_DISPLAY],
    ['a DDD 55 local number, 11 digits', '55900000000', DISPLAY_DDD_55],
    ['a DDD 55 local number with punctuation', '(55) 90000-0000', DISPLAY_DDD_55],
    ['a DDD 55 local number with a space', '55 90000-0000', DISPLAY_DDD_55],
    ['a DDD 55 landline, 10 digits', '5590000000', '+55 55 9 0000-000'],
    ['a left to right mark before a local number', '\u200e11900000000', TEST_PHONE_DISPLAY],
    ['a sentence with a local number in it', 'meu numero e 11 90000-0000', TEST_PHONE_DISPLAY],
  ])('%s', async (_label, text, display) => {
    const { user, whatsapp } = await openWhatsappForm();
    await user.click(whatsapp);
    whatsapp.focus();
    expect(fireEvent.paste(whatsapp, { clipboardData: { getData: () => text } })).toBe(true);

    await user.paste(text);

    expect(whatsapp).toHaveValue(display);
  });

  it.each([
    ['an empty clipboard', ''],
    ['only spaces and newlines', '   \n \t '],
    ['only invisible characters', '\u200b\u200e\u202a\u202c'],
    ['a very long text', 'x'.repeat(5000)],
  ])('%s leaves the field empty', async (_label, text) => {
    const { user, whatsapp } = await openWhatsappForm();
    await user.click(whatsapp);

    expect(await pasteInto(whatsapp, text)).toBe(true);

    expect(whatsapp).toHaveValue(EMPTY_FIELD);
  });

  it('sends a DDD 55 local number as a local number, not as the country code', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { user, whatsapp } = await openWhatsappForm();
    await user.click(whatsapp);
    await user.paste('(55) 90000-0000');

    const { body } = await sendWhatsappForm(user, fetchMock);

    expect(body.whatsapp).toBe(EVOLUTION_DDD_55);
  });
});

describe('a paste that is cancelled and leaves the field as it is', () => {
  it.each([
    ['a bare plus', '+'],
    ['two plus signs', '++'],
    ['a plus in a word', 'C++ developer'],
    ['the country code alone', '+55'],
    ['a plus with only invisible characters around', '\u200e+\u200f'],
    ['a United States number', '+1 415 555 2671'],
    ['a Japanese number', '+81 98445 1243'],
    ['a British number', '+44 7911 123456'],
    ['a foreign number with a double zero', '00 44 7911 123456'],
  ])('%s keeps the empty field empty', async (_label, text) => {
    const { user, whatsapp } = await openWhatsappForm();
    await user.click(whatsapp);

    expect(await pasteInto(whatsapp, text)).toBe(false);

    expect(whatsapp).toHaveValue(EMPTY_FIELD);
  });

  // A bare "+55" or a foreign number must not wipe the digits that are already there, even with all of them selected, and
  // a foreign number must never be turned into a valid looking Brazilian one.
  it.each([['+55'], ['+'], ['+1 415 555 2671'], ['+81 98445 1243'], ['+44 7911 123456']])(
    'keeps a typed number untouched when %s is pasted over all of it',
    async (text) => {
      const { user, whatsapp } = await openWhatsappForm();
      await user.type(whatsapp, '11900000000');
      expect(whatsapp).toHaveValue(TEST_PHONE_DISPLAY);
      whatsapp.setSelectionRange(0, whatsapp.value.length);

      const wasNotCancelled = fireEvent.paste(whatsapp, { clipboardData: { getData: () => text } });

      expect(wasNotCancelled).toBe(false);
      expect(whatsapp).toHaveValue(TEST_PHONE_DISPLAY);
    },
  );
});

describe('a paste over what is already in the field', () => {
  it('replaces the whole field with a whole number even when part of it is selected', async () => {
    const { user, whatsapp } = await openWhatsappForm();
    await user.type(whatsapp, '218888');
    whatsapp.setSelectionRange(4, 8);

    await user.paste('\u202a+55 11 90000-0000\u202c');

    expect(whatsapp).toHaveValue(TEST_PHONE_DISPLAY);
  });

  it('lets a local number replace the selected number the usual way', async () => {
    const { user, whatsapp } = await openWhatsappForm();
    await user.type(whatsapp, '218888');
    whatsapp.setSelectionRange(0, whatsapp.value.length);

    await user.paste('11900000000');

    expect(whatsapp).toHaveValue(TEST_PHONE_DISPLAY);
  });
});
