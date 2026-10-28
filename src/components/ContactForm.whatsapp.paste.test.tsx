import { cleanup, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { toEvolutionFormat } from '../lib/phone';
import { expectNoConsoleOutput } from '../test/consoleGuard';
import {
  TEST_PHONE_DISPLAY,
  TEST_PHONE_EVOLUTION,
  TEST_PHONE_TYPED,
  WHATSAPP_WEBHOOK,
  openWhatsappForm,
  rejectUnexpectedFetch,
  sendWhatsappForm,
  stubFetch,
} from '../test/contactForm';
import { range } from '../test/range';
import { renderWithProviders } from '../test/render';
import ContactForm from './ContactForm';

// The adversarial paste matrix of the WhatsApp field, through the whole form: what a visitor can copy from WhatsApp, a
// vCard, a web page or a spreadsheet, and what the field and the webhook get. Fictitious numbers only (11 90000-0000 and
// DDD 55 90000-0000). Every invisible or typographic character is built from its code point, so this source holds none
// of them and no escape for one.

expectNoConsoleOutput();

beforeEach(() => {
  rejectUnexpectedFetch();
});

const char = (codePoint: number): string => String.fromCodePoint(codePoint);
const ZWSP = char(0x200b);
const LRM = char(0x200e);
const RLM = char(0x200f);
const LRE = char(0x202a);
const PDF = char(0x202c);
const NBSP = char(0x00a0);
const NON_BREAKING_HYPHEN = char(0x2011);
const EN_DASH = char(0x2013);

const DISPLAY_DDD_55 = '+55 55 9 0000-0000';
const EVOLUTION_DDD_55 = '555500000000';
const EMPTY_FIELD = '+55 ';

type Where = 'an empty field' | 'the caret before a typed number' | 'a typed number selected with select all';

/** Pastes `text` as the page sees it and says what the browser was told: false when the paste was cancelled. */
function dispatchPaste(whatsapp: HTMLInputElement, text: string): boolean {
  return fireEvent.paste(whatsapp, { clipboardData: { getData: () => text } });
}

/** Puts the field in one of the places a paste can land, with the number the visitor had typed first (or none). */
async function placeCaret(where: Where) {
  const { user, whatsapp } = await openWhatsappForm();
  if (where === 'an empty field') {
    await user.click(whatsapp);
  } else {
    await user.type(whatsapp, '21900000000');
    expect(whatsapp).toHaveValue('+55 21 9 0000-0000');
    const isCaret = where === 'the caret before a typed number';
    whatsapp.setSelectionRange(isCaret ? 4 : 0, isCaret ? 4 : whatsapp.value.length);
  }
  return { user, whatsapp };
}

const WHERE: Where[] = ['an empty field', 'the caret before a typed number', 'a typed number selected with select all'];

// With no default action in jsdom the field only changes when the page handles the paste itself, so a row that keeps the
// default is pasted with user.paste, which inserts the text the way the browser does.
describe('a whole number the field takes as it is (display and webhook number)', () => {
  const ROWS: Array<[string, string]> = [
    ['plus with spaces', '+55 11 90000-0000'],
    ['plus with no spaces', '+5511900000000'],
    ['13 digits with no plus', '5511900000000'],
    ['12 digits with no plus', '551100000000'],
    ['spaced digits with no plus', '55 11 90000-0000'],
    ['digits with no plus and the DDD in parentheses', '55 (11) 90000-0000'],
    ['plus with the DDD in parentheses', '+55 (11) 90000-0000'],
    ['a vCard phone line', 'TEL;TYPE=CELL:+55 11 90000-0000\n'],
    ['no break space separators', `+55${NBSP}11${NBSP}90000-0000`],
    ['a label before the number', 'tel: +55 11 90000-0000'],
    ['the name of the app before the number', 'WhatsApp +55 11 90000-0000'],
    ['the plus inside parentheses', '(+55) 11 90000-0000'],
    ['a left to right mark before the number', `${LRM}+55 11 90000-0000`],
    ['a right to left mark before the number', `${RLM}+55 11 90000-0000`],
    ['a zero width space before the number', `${ZWSP}+55 11 90000-0000`],
    ['bidi embedding controls around the number', `${LRE}+55 11 90000-0000${PDF}`],
    ['bidi controls around a number with no plus', `${LRE}5511900000000${PDF}`],
    ['a double zero for the plus', '00 55 11 90000 0000'],
    ['a compact double zero', '005511900000000'],
    ['spaces and newlines around the number', '  \n+55 11 90000-0000 \n'],
    ['a long text after the number', `+55 11 90000-0000 ${'x'.repeat(5000)}`],
    // A number with its country code but no plus, in a text with letters: the browser would paste it behind the "+55 "
    // of the field and read its own 55 as the DDD.
    ['a label before a number with no plus', 'Tel: 55 11 90000-0000'],
    ['a WhatsApp link', 'https://wa.me/5511900000000'],
    ['a name before a number with no plus', 'Ana 5511900000000'],
    ['words after a number with no plus', '5511900000000 abc'],
    ['an en dash inside a number with no plus', `55 11 90000${EN_DASH}0000`],
    // The separators of a plus number.
    ['a non breaking hyphen inside a plus number', `+55 11 90000${NON_BREAKING_HYPHEN}0000`],
    ['an en dash inside a plus number', `+55 11 90000${EN_DASH}0000`],
    ['slashes inside a plus number', '+55/11/90000-0000'],
  ];

  describe.each(WHERE)('over %s', (where) => {
    it.each(ROWS)('%s', async (_label, text) => {
      const { whatsapp } = await placeCaret(where);

      const wasNotCancelled = dispatchPaste(whatsapp, text);

      expect(wasNotCancelled).toBe(false);
      expect(whatsapp).toHaveValue(TEST_PHONE_DISPLAY);
      expect(toEvolutionFormat(whatsapp.value)).toBe(TEST_PHONE_EVOLUTION);
    });
  });

  it.each([
    ['a number with the plus', '+55 11 90000-0000'],
    ['bidi controls around the number', `${LRE}+55 11 90000-0000${PDF}`],
    ['a label before the number', 'tel: +55 11 90000-0000'],
    ['a double zero', '00 55 11 90000 0000'],
    ['a number with no plus', '5511900000000'],
    ['a label before a number with no plus', 'Tel: 55 11 90000-0000'],
    ['a WhatsApp link', 'https://wa.me/5511900000000'],
    ['a name before a number with no plus', 'Ana 5511900000000'],
    ['words after a number with no plus', '5511900000000 abc'],
    ['an en dash inside a number with no plus', `55 11 90000${EN_DASH}0000`],
  ])('over a typed number selected with select all, %s sends the right number to the WhatsApp webhook', async (_label, text) => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { user, whatsapp } = await placeCaret('a typed number selected with select all');
    await user.paste(text);

    const { url, body } = await sendWhatsappForm(user, fetchMock);

    expect(url).toBe(WHATSAPP_WEBHOOK);
    expect(body.whatsapp).toBe(TEST_PHONE_EVOLUTION);
    expect(whatsapp).toHaveValue(TEST_PHONE_DISPLAY);
  });

  it.each([
    ['+55 11 90000-0000'],
    ['5511900000000'],
    ['Tel: 55 11 90000-0000'],
    ['https://wa.me/5511900000000'],
  ])('over an empty field, %j sends the right number to the WhatsApp webhook', async (text) => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { user } = await placeCaret('an empty field');
    await user.paste(text);

    const { body } = await sendWhatsappForm(user, fetchMock);

    expect(body.whatsapp).toBe(TEST_PHONE_EVOLUTION);
  });

  it.each([
    ['a DDD 55 number with the country code, spaced', '55 55 90000 0000'],
    ['a DDD 55 number with the country code, compact', '5555900000000'],
    ['a DDD 55 number with the country code and a label', 'Tel: 55 55 90000-0000'],
  ])('keeps %s as DDD 55', async (_label, text) => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { user, whatsapp } = await placeCaret('an empty field');

    await user.paste(text);

    expect(whatsapp).toHaveValue(DISPLAY_DDD_55);
    const { body } = await sendWhatsappForm(user, fetchMock);
    expect(body.whatsapp).toBe(EVOLUTION_DDD_55);
  });

  it('sends a DDD 55 number with the plus as DDD 55', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { user } = await placeCaret('an empty field');
    await user.paste('+55 55 90000-0000');

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
    ['a DDD 55 local number with a label', 'Tel: (55) 90000-0000', DISPLAY_DDD_55],
    ['a DDD 55 landline, 10 digits', '5590000000', '+55 55 9 0000-000'],
    ['a left to right mark before a local number', `${LRM}11900000000`, TEST_PHONE_DISPLAY],
    ['a sentence with a local number in it', 'meu numero e 11 90000-0000', TEST_PHONE_DISPLAY],
    ['a local number and a stray plus after it', '11 90000-0000 +', TEST_PHONE_DISPLAY],
  ])('%s', async (_label, text, display) => {
    const { user, whatsapp } = await placeCaret('an empty field');
    whatsapp.focus();
    expect(dispatchPaste(whatsapp, text)).toBe(true);

    await user.paste(text);

    expect(whatsapp).toHaveValue(display);
  });

  it.each([
    ['an empty clipboard', ''],
    ['only spaces and newlines', '   \n \t '],
    ['only invisible characters', `${ZWSP}${LRM}${LRE}${PDF}`],
    ['a very long text', 'x'.repeat(5000)],
  ])('%s leaves the field empty', async (_label, text) => {
    const { whatsapp } = await placeCaret('an empty field');

    expect(dispatchPaste(whatsapp, text)).toBe(true);

    expect(whatsapp).toHaveValue(EMPTY_FIELD);
  });

  it('sends a local number the browser pasted to the right line', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { user } = await placeCaret('an empty field');
    await user.paste(TEST_PHONE_TYPED);

    const { body } = await sendWhatsappForm(user, fetchMock);

    expect(body.whatsapp).toBe(TEST_PHONE_EVOLUTION);
  });

  // DDD 55 (Rio Grande do Sul) is a local number that starts with 55: it must stay local, not be read as a country code.
  it.each(['55900000000', '55 90000-0000', '(55) 90000-0000'])('sends the DDD 55 local number %s as a local number', async (text) => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { user } = await placeCaret('an empty field');
    await user.paste(text);

    const { body } = await sendWhatsappForm(user, fetchMock);

    expect(body.whatsapp).toBe(EVOLUTION_DDD_55);
  });

  it('lets a local number replace a selected part of the number the usual way', async () => {
    const { user, whatsapp } = await placeCaret('an empty field');
    await user.type(whatsapp, '218888');
    whatsapp.setSelectionRange(4, whatsapp.value.length);

    await user.paste(TEST_PHONE_TYPED);

    expect(whatsapp).toHaveValue(TEST_PHONE_DISPLAY);
  });

  it('lets a local number replace the whole selected number the usual way', async () => {
    const { user, whatsapp } = await placeCaret('a typed number selected with select all');

    await user.paste(TEST_PHONE_TYPED);

    expect(whatsapp).toHaveValue(TEST_PHONE_DISPLAY);
  });
});

describe('a paste that is cancelled and leaves the field as it is', () => {
  const ROWS: Array<[string, string]> = [
    ['a bare plus', '+'],
    ['two plus signs', '++'],
    ['a plus in a word', 'C++ developer'],
    ['the country code alone', '+55'],
    ['a plus with only invisible characters around', `${LRM}+${RLM}`],
    ['a United States number', '+1 415 555 2671'],
    ['a Japanese number', '+81 98445 1243'],
    ['a British number', '+44 7911 123456'],
    ['a foreign number with a double zero', '00 44 7911 123456'],
    ['a bare double zero', '00'],
    ['the country code with a double zero only', '0055'],
  ];

  it.each(ROWS)('%s keeps the empty field empty', async (_label, text) => {
    const { whatsapp } = await placeCaret('an empty field');

    expect(dispatchPaste(whatsapp, text)).toBe(false);

    expect(whatsapp).toHaveValue(EMPTY_FIELD);
  });

  // None of them may wipe the digits that are already there, even with all of them selected, and a foreign number must
  // never be turned into a valid looking Brazilian one.
  it.each(ROWS)('%s keeps a typed number untouched when it is pasted over all of it', async (_label, text) => {
    const { whatsapp } = await placeCaret('a typed number selected with select all');

    const wasNotCancelled = dispatchPaste(whatsapp, text);

    expect(wasNotCancelled).toBe(false);
    expect(whatsapp).toHaveValue('+55 21 9 0000-0000');
  });
});

describe('a paste over what is already in the field, and a paste elsewhere', () => {
  it('replaces the whole field with a whole number even when part of it is selected', async () => {
    const { user, whatsapp } = await placeCaret('an empty field');
    await user.type(whatsapp, '218888');
    whatsapp.setSelectionRange(4, 8);

    await user.paste(`${LRE}+55 11 90000-0000${PDF}`);

    expect(whatsapp).toHaveValue(TEST_PHONE_DISPLAY);
  });

  it('pastes a local number after the prefix when the caret is inside it', async () => {
    const { user, whatsapp } = await placeCaret('an empty field');
    // A click at offset 1 leaves React's select sample at (1, 1), so the same caret again raises no select event.
    await user.pointer({ target: whatsapp, offset: 1, keys: '[MouseLeft]' });
    whatsapp.setSelectionRange(1, 1);

    await user.paste(TEST_PHONE_TYPED);

    expect(whatsapp).toHaveValue(TEST_PHONE_DISPLAY);
  });

  it('pastes a whole number as the whole number when the caret is inside the prefix', async () => {
    const { user, whatsapp } = await placeCaret('an empty field');
    whatsapp.setSelectionRange(2, 2);

    await user.paste('+55 11 90000-0000');

    expect(whatsapp).toHaveValue(TEST_PHONE_DISPLAY);
  });

  it('puts the selection after the prefix before a paste is handled, whatever the paste is', async () => {
    const { whatsapp } = await placeCaret('an empty field');
    whatsapp.setSelectionRange(1, 1);

    dispatchPaste(whatsapp, '+1 415 555 2671');

    expect(range(whatsapp)).toEqual([4, 4]);
  });

  it('does not touch a paste into the name or the message', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);
    const nome = screen.getByLabelText('Nome');
    const mensagem = screen.getByLabelText('Mensagem');

    expect(dispatchPaste(nome as HTMLInputElement, '+55 11 90000-0000')).toBe(true);
    expect(dispatchPaste(mensagem as HTMLInputElement, '+55 11 90000-0000')).toBe(true);
    await user.click(nome);
    await user.paste('+55 11 90000-0000');

    expect(nome).toHaveValue('+55 11 90000-0000');
  });

  // A script or an extension can dispatch a paste with no clipboard data: it used to throw a TypeError.
  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('does not throw and leaves the field alone when the clipboard data of the event is %s', async (_label, clipboardData) => {
    const { whatsapp } = await placeCaret('an empty field');
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: clipboardData });

    const wasNotCancelled = fireEvent(whatsapp, event);

    expect(wasNotCancelled).toBe(true);
    expect(whatsapp).toHaveValue(EMPTY_FIELD);
  });

  it.each([
    ['undefined', undefined],
    ['a number', 5],
    ['an object', {}],
  ])('treats a clipboard that gives %s instead of a string as an empty one', async (_label, given) => {
    const { whatsapp } = await placeCaret('an empty field');

    const wasNotCancelled = fireEvent.paste(whatsapp, { clipboardData: { getData: () => given } });

    expect(wasNotCancelled).toBe(true);
    expect(whatsapp).toHaveValue(EMPTY_FIELD);
  });
});

describe('a text dropped on the field', () => {
  const drop = (whatsapp: HTMLElement, text: string) => fireEvent.drop(whatsapp, { dataTransfer: { getData: () => text } });

  it.each([
    ['a whole number with the plus', '+55 11 90000-0000'],
    ['bidi controls around a number', `${LRE}+55 11 90000-0000${PDF}`],
    ['a number with no plus and a label', 'Tel: 55 11 90000-0000'],
    ['a WhatsApp link', 'https://wa.me/5511900000000'],
    ['a local number', TEST_PHONE_TYPED],
    ['a local number with punctuation', '(11) 90000-0000'],
  ])('sets the whole field from %s', async (_label, text) => {
    const { whatsapp } = await placeCaret('a typed number selected with select all');

    const wasNotCancelled = drop(whatsapp, text);

    expect(wasNotCancelled).toBe(false);
    expect(whatsapp).toHaveValue(TEST_PHONE_DISPLAY);
  });

  it('keeps a DDD 55 local number as DDD 55', async () => {
    const { whatsapp } = await placeCaret('an empty field');

    drop(whatsapp, '(55) 90000-0000');

    expect(whatsapp).toHaveValue(DISPLAY_DDD_55);
  });

  it('sends the number that was dropped, not a scrambled one', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { user, whatsapp } = await placeCaret('an empty field');
    // Dropped with the pointer inside the prefix: the drop point must not decide where the text lands.
    whatsapp.setSelectionRange(1, 1);
    drop(whatsapp, '+55 11 90000-0000');

    const { body } = await sendWhatsappForm(user, fetchMock);

    expect(body.whatsapp).toBe(TEST_PHONE_EVOLUTION);
  });

  it.each([
    ['a number from another country', '+1 415 555 2671'],
    ['a bare plus', '+'],
    ['letters only', 'meu numero'],
    ['nothing', ''],
    ['a sentence with digits and a date', 'Pedido 123 de 2026-10-28 total 4500'],
    ['a sentence with a time', 'Reuniao dia 12 as 15h'],
    ['a number and a date after it', '55 3222-1234 12/10/2026'],
  ])('leaves a typed number untouched when %s is dropped, and still cancels the drop', async (_label, text) => {
    const { whatsapp } = await placeCaret('a typed number selected with select all');

    const wasNotCancelled = drop(whatsapp, text);

    expect(wasNotCancelled).toBe(false);
    expect(whatsapp).toHaveValue('+55 21 9 0000-0000');
  });
});

describe('a text dropped on an empty field', () => {
  it.each([
    ['a sentence with digits and a date', 'Pedido 123 de 2026-10-28 total 4500'],
    ['a sentence with a time', 'Reuniao dia 12 as 15h'],
    ['a number from another country', '+1 415 555 2671'],
  ])('keeps the field empty when %s is dropped', async (_label, text) => {
    const { whatsapp } = await placeCaret('an empty field');

    const wasNotCancelled = fireEvent.drop(whatsapp, { dataTransfer: { getData: () => text } });

    expect(wasNotCancelled).toBe(false);
    expect(whatsapp).toHaveValue(EMPTY_FIELD);
  });
});

// R72: a number followed by something with digits. The DDD 55 numbers that were right before the run widened keep their
// number; a run of 55 and more than 13 digits is never guessed, the field is left as it is.
describe('a country coded number with a spaced separator, or followed by something with digits', () => {
  it.each([
    ['a spaced slash and a day', '(55) 99999-9999 / 12'],
    ['a spaced slash and a second number', '55 99999-9999 / 55 98888-7777'],
    ['a spaced dash and a day', 'Tel 55 99999-9999 - 12'],
    ['one number with a spaced dash inside', '55 11 90000 - 0000'],
    ['one number with a spaced slash inside', '55 11 99999 / 9999'],
    ['one number with a spaced en dash inside', `55 11 90000 ${EN_DASH} 0000`],
  ])('cancels the paste and keeps what is in the field for %s (ambiguous, never a guessed number)', async (_label, text) => {
    for (const where of ['an empty field', 'the caret before a typed number', 'a typed number selected with select all'] as const) {
      const { whatsapp } = await placeCaret(where);
      const before = whatsapp.value;

      expect(dispatchPaste(whatsapp, text)).toBe(false);

      expect(whatsapp).toHaveValue(before);
      cleanup();
    }
  });

  it.each([
    ['a date with slashes', '55 99999-9999 12/10/2026'],
    ['a date after a landline', '55 3222-1234 12/10/2026'],
  ])('cancels the paste and keeps what is in the field for %s', async (_label, text) => {
    for (const where of ['an empty field', 'the caret before a typed number', 'a typed number selected with select all'] as const) {
      const { whatsapp } = await placeCaret(where);
      const before = whatsapp.value;

      expect(dispatchPaste(whatsapp, text)).toBe(false);

      expect(whatsapp).toHaveValue(before);
      cleanup();
    }
  });
});
