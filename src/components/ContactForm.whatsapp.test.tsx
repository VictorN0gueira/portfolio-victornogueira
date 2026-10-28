import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { expectNoConsoleOutput } from '../test/consoleGuard';
import {
  TEST_PHONE_DISPLAY,
  TEST_PHONE_EVOLUTION,
  TEST_PHONE_TYPED,
  WHATSAPP_WEBHOOK,
  openWhatsappForm as openWhatsapp,
  rejectUnexpectedFetch,
  sendWhatsappForm,
  stubFetch,
} from '../test/contactForm';
import { renderWithProviders } from '../test/render';
import ContactForm from './ContactForm';

// The WhatsApp number is the one thing of a lead that cannot be wrong: a number that passes the validation but is not
// the one the visitor typed sends the lead to somebody else. These tests pin the two ways it used to go wrong (a caret
// inside the +55 prefix, and an international number pasted behind it).

expectNoConsoleOutput();

beforeEach(() => {
  rejectUnexpectedFetch();
});

const range = (input: HTMLInputElement) => [input.selectionStart, input.selectionEnd];

describe('ContactForm WhatsApp caret', () => {
  // Carets 2 and 3 are the ones that corrupt a lead: a digit typed at "+5|5 " gives "+585 ". All four must snap.
  it.each([0, 1, 2, 3])('snaps a caret at %i to just after the prefix on a click', async (caret) => {
    const { whatsapp } = await openWhatsapp();
    whatsapp.focus();

    whatsapp.setSelectionRange(caret, caret);
    fireEvent.click(whatsapp);

    expect(range(whatsapp)).toEqual([4, 4]);
  });

  it.each([0, 1, 2, 3])('snaps a caret at %i after a key (Home, the arrows) as well', async (caret) => {
    const { whatsapp } = await openWhatsapp();
    whatsapp.focus();

    whatsapp.setSelectionRange(caret, caret);
    fireEvent.keyUp(whatsapp);

    expect(range(whatsapp)).toEqual([4, 4]);
  });

  // React only raises onSelect when the selection differs from the last one it sampled, and our own setSelectionRange
  // does not refresh that sample: a second click at the same place raises no select event at all. A click event always
  // fires, so the click handler is what keeps the number from being corrupted then.
  it('snaps on a click alone, with no select or key event at all', async () => {
    const { whatsapp } = await openWhatsapp();
    whatsapp.focus();
    whatsapp.setSelectionRange(1, 1);

    fireEvent.click(whatsapp);

    expect(range(whatsapp)).toEqual([4, 4]);
  });

  it('keeps the digits in order when the visitor clicks at the same place inside the prefix twice', async () => {
    const { user, whatsapp } = await openWhatsapp();

    await user.pointer({ target: whatsapp, offset: 2, keys: '[MouseLeft]' });
    await user.pointer({ target: whatsapp, offset: 2, keys: '[MouseLeft]' });
    await user.keyboard(TEST_PHONE_TYPED);

    expect(whatsapp).toHaveValue(TEST_PHONE_DISPLAY);
  });

  it('types a digit after the prefix when the caret was put between the 5 and the 5', async () => {
    const { user, whatsapp } = await openWhatsapp();
    whatsapp.focus();

    whatsapp.setSelectionRange(2, 2);
    fireEvent.click(whatsapp);
    await user.keyboard('8');

    expect(whatsapp).toHaveValue('+55 8');
  });

  it('keeps a caret that is already after the prefix', async () => {
    const { user, whatsapp } = await openWhatsapp();
    await user.type(whatsapp, '11900');
    expect(whatsapp).toHaveValue('+55 11 9 00');

    for (const caret of [4, 6, 8, 11]) {
      whatsapp.setSelectionRange(caret, caret);
      fireEvent.click(whatsapp);
      fireEvent.keyUp(whatsapp);

      expect(range(whatsapp)).toEqual([caret, caret]);
    }
  });

  // A range that ends inside the prefix replaces nothing useful and would put the next digit in front of the country
  // code (a double click on "+" or "55", Home then Shift+Right): it collapses to the caret after the prefix.
  it.each([
    [0, 2],
    [0, 3],
    [1, 3],
    [0, 4],
    [2, 4],
  ])('collapses the range %i to %i, which ends inside the prefix, to the caret after it', async (start, end) => {
    const { whatsapp } = await openWhatsapp();
    whatsapp.focus();

    whatsapp.setSelectionRange(start, end);
    fireEvent.click(whatsapp);

    expect(range(whatsapp)).toEqual([4, 4]);
  });

  // A range that starts inside the prefix but reaches past it (Ctrl+A, the select all of a Tab, a drag over the number, a
  // Shift+Arrow that stops between the two 5s) starts just after the prefix and keeps its end: it still replaces the whole
  // number, but never a piece of the prefix. Left at (2, end) a typed digit joined the stray "5" and gave +55 51 9 1900.
  it.each([
    ['0 to 6', 0, 6, 4],
    ['1 to 11', 1, 11, 4],
    ['2 to 6', 2, 6, 4],
    ['2 to the end', 2, 11, 4],
    ['3 to the end', 3, 11, 4],
    ['0 to the end', 0, 11, 4],
  ])('clamps the range that starts inside the prefix and reaches past it (%s)', async (_label, start, end, clampedStart) => {
    const { user, whatsapp } = await openWhatsapp();
    await user.type(whatsapp, '11900');
    expect(whatsapp).toHaveValue('+55 11 9 00');

    whatsapp.setSelectionRange(start, end);
    fireEvent.click(whatsapp);

    expect(range(whatsapp)).toEqual([clampedStart, end]);
  });

  it.each([
    [4, 11],
    [5, 9],
    [6, 8],
  ])('leaves a range %i to %i that starts at or after the end of the prefix alone', async (start, end) => {
    const { user, whatsapp } = await openWhatsapp();
    await user.type(whatsapp, '11900');

    whatsapp.setSelectionRange(start, end);
    fireEvent.click(whatsapp);
    fireEvent.select(whatsapp);

    expect(range(whatsapp)).toEqual([start, end]);
  });

  it('keeps the direction of a backward selection when it clamps it, so Shift+Arrow goes on the same way', async () => {
    const { user, whatsapp } = await openWhatsapp();
    await user.type(whatsapp, '11900');

    whatsapp.setSelectionRange(2, 11, 'backward');
    fireEvent.click(whatsapp);

    expect(range(whatsapp)).toEqual([4, 11]);
    expect(whatsapp.selectionDirection).toBe('backward');
  });

  it('types the number in order over a selection that starts between the two 5s and reaches the end', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { user, whatsapp } = await openWhatsapp();
    await user.type(whatsapp, '11900');
    // What a mouse drag from between the two 5s to the end of the field leaves, with no select event at all.
    whatsapp.setSelectionRange(2, whatsapp.value.length);

    await user.keyboard(TEST_PHONE_TYPED);

    expect(whatsapp).toHaveValue(TEST_PHONE_DISPLAY);
    const { body } = await sendWhatsappForm(user, fetchMock);
    expect(body.whatsapp).toBe(TEST_PHONE_EVOLUTION);
  });

  // The guard must not depend on React's de-duplicated select event: it also reads the live selection on key down and on
  // before input, so a caret moved with no click and no key (a touch caret handle, the space bar swipe of a phone
  // keyboard) cannot take the next character into the prefix.
  it.each([0, 1, 2, 3])('snaps a caret at %i on key down, before the character is inserted', async (caret) => {
    const { whatsapp } = await openWhatsapp();
    whatsapp.focus();

    whatsapp.setSelectionRange(caret, caret);
    fireEvent.keyDown(whatsapp, { key: '1' });

    expect(range(whatsapp)).toEqual([4, 4]);
  });

  it('snaps a range that starts inside the prefix on key down', async () => {
    const { user, whatsapp } = await openWhatsapp();
    await user.type(whatsapp, '11900');

    whatsapp.setSelectionRange(2, 11);
    fireEvent.keyDown(whatsapp, { key: '1' });

    expect(range(whatsapp)).toEqual([4, 11]);
  });

  // The key down guard alone: a key that inserts nothing (Shift) raises no before input event, and React's own select
  // sample of this caret is the one the earlier click left, so React raises no select event either.
  it.each([0, 1, 2])('snaps a caret returned to offset %i on a key down that React raises no select event for', async (caret) => {
    const { user, whatsapp } = await openWhatsapp();
    await user.pointer({ target: whatsapp, offset: caret, keys: '[MouseLeft]' });
    expect(range(whatsapp)).toEqual([4, 4]);

    whatsapp.setSelectionRange(caret, caret);
    fireEvent.keyDown(whatsapp, { key: 'Shift' });

    expect(range(whatsapp)).toEqual([4, 4]);
  });

  // React builds onBeforeInput from the text input event of the browser, or from key press where there is none (jsdom).
  it.each([0, 1, 2, 3])('snaps a caret at %i before input as well', async (caret) => {
    const { whatsapp } = await openWhatsapp();
    whatsapp.focus();

    whatsapp.setSelectionRange(caret, caret);
    fireEvent.keyPress(whatsapp, { key: '1', charCode: 49, keyCode: 49, which: 49 });

    expect(range(whatsapp)).toEqual([4, 4]);
  });

  it.each([0, 1, 2])('types the number in order after a caret returned to offset %i with no click and no key', async (caret) => {
    const { user, whatsapp } = await openWhatsapp();

    await user.pointer({ target: whatsapp, offset: caret, keys: '[MouseLeft]' });
    expect(range(whatsapp)).toEqual([4, 4]);
    whatsapp.setSelectionRange(caret, caret);
    await user.keyboard(TEST_PHONE_TYPED);

    expect(whatsapp).toHaveValue(TEST_PHONE_DISPLAY);
  });

  it('keeps Backspace at the start of the number from trapping the visitor or corrupting it', async () => {
    const { user, whatsapp } = await openWhatsapp();
    await user.type(whatsapp, TEST_PHONE_TYPED);
    expect(whatsapp).toHaveValue(TEST_PHONE_DISPLAY);
    whatsapp.setSelectionRange(4, 4);

    await user.keyboard('{Backspace}');

    // The space of the prefix is deleted and the formatter puts it back: the value is the same, and React moves the caret
    // to the end of the field when it sets it (as it always did). Either way the caret is never inside the prefix.
    expect(whatsapp).toHaveValue(TEST_PHONE_DISPLAY);
    expect(whatsapp.selectionStart).toBeGreaterThanOrEqual(4);
  });

  it('puts the prefix back when the whole number is deleted, and lets the visitor type again', async () => {
    const { user, whatsapp } = await openWhatsapp();
    await user.type(whatsapp, TEST_PHONE_TYPED);
    whatsapp.setSelectionRange(0, whatsapp.value.length);
    fireEvent.click(whatsapp);

    await user.keyboard('{Backspace}');
    expect(whatsapp).toHaveValue('+55 ');
    await user.keyboard(TEST_PHONE_TYPED);

    expect(whatsapp).toHaveValue(TEST_PHONE_DISPLAY);
  });

  it('replaces a whole number selected with select all and retyped', async () => {
    const { user, whatsapp } = await openWhatsapp();
    await user.type(whatsapp, '218888');
    whatsapp.setSelectionRange(0, whatsapp.value.length);
    fireEvent.select(whatsapp);

    await user.keyboard(TEST_PHONE_TYPED);

    expect(whatsapp).toHaveValue(TEST_PHONE_DISPLAY);
  });

  it('sends the number that was typed, not a scrambled one, when the visitor clicked inside the prefix first', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { user, whatsapp } = await openWhatsapp();

    await user.pointer({ target: whatsapp, offset: 0, keys: '[MouseLeft]' });
    await user.keyboard(TEST_PHONE_TYPED);
    const { url, body } = await sendWhatsappForm(user, fetchMock);

    expect(url).toBe(WHATSAPP_WEBHOOK);
    expect(body.whatsapp).toBe(TEST_PHONE_EVOLUTION);
  });

  it('does not touch the caret of any other field', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);
    const nome = screen.getByLabelText('Nome') as HTMLInputElement;
    await user.type(nome, 'Ana');

    nome.setSelectionRange(1, 1);
    fireEvent.click(nome);
    fireEvent.keyUp(nome);

    expect(range(nome)).toEqual([1, 1]);
  });
});

describe('ContactForm WhatsApp paste', () => {
  const paste = (field: HTMLElement, text: string) => fireEvent.paste(field, { clipboardData: { getData: () => text } });

  async function openPasteTarget() {
    const { user, whatsapp } = await openWhatsapp();
    await user.click(whatsapp);
    return { user, whatsapp };
  }

  it.each([
    ['a number with the plus', '+55 11 90000-0000'],
    ['the same without spaces', '+5511900000000'],
    ['a long number with no plus', '5511900000000'],
    ['a long number with punctuation', '55 (11) 90000-0000'],
    ['a number with spaces and newlines around it', '  \n+55 11 90000-0000 \n'],
  ])('takes %s as the whole number and sends it to the right line', async (_label, text) => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { user, whatsapp } = await openPasteTarget();

    await user.paste(text);

    expect(whatsapp).toHaveValue(TEST_PHONE_DISPLAY);
    const { url, body } = await sendWhatsappForm(user, fetchMock);
    expect(url).toBe(WHATSAPP_WEBHOOK);
    expect(body.whatsapp).toBe(TEST_PHONE_EVOLUTION);
  });

  it('cancels the browser default for a whole international number, so it is not inserted behind the +55 prefix', async () => {
    const { whatsapp } = await openPasteTarget();

    expect(paste(whatsapp, '+55 11 90000-0000')).toBe(false);
    expect(whatsapp).toHaveValue(TEST_PHONE_DISPLAY);
  });

  it('keeps the browser default for a local number with no country code, which still gives the same number', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { user, whatsapp } = await openPasteTarget();
    expect(paste(whatsapp, TEST_PHONE_TYPED)).toBe(true);

    await user.paste(TEST_PHONE_TYPED);

    expect(whatsapp).toHaveValue(TEST_PHONE_DISPLAY);
    const { body } = await sendWhatsappForm(user, fetchMock);
    expect(body.whatsapp).toBe(TEST_PHONE_EVOLUTION);
  });

  // DDD 55 (Rio Grande do Sul) is a local number that starts with 55: it must stay local, not be read as a country code.
  it.each(['55900000000', '55 90000-0000', '(55) 90000-0000'])(
    'keeps the browser default for the DDD 55 local number %s and sends it as local',
    async (text) => {
      const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
      const { user, whatsapp } = await openPasteTarget();
      expect(paste(whatsapp, text)).toBe(true);

      await user.paste(text);

      expect(whatsapp).toHaveValue('+55 55 9 0000-0000');
      const { body } = await sendWhatsappForm(user, fetchMock);
      expect(body.whatsapp).toBe('555500000000');
    },
  );

  it('takes a DDD 55 number that already carries the country code as international', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { user, whatsapp } = await openPasteTarget();

    await user.paste('5555900000000');

    expect(whatsapp).toHaveValue('+55 55 9 0000-0000');
    const { body } = await sendWhatsappForm(user, fetchMock);
    expect(body.whatsapp).toBe('555500000000');
  });

  it('leaves an empty clipboard alone', async () => {
    const { whatsapp } = await openPasteTarget();

    expect(paste(whatsapp, '')).toBe(true);
    expect(paste(whatsapp, '   \n ')).toBe(true);
    expect(whatsapp).toHaveValue('+55 ');
  });

  it('leaves other text alone, such as a pasted note with a number in the middle of it', async () => {
    const { whatsapp } = await openPasteTarget();

    expect(paste(whatsapp, 'meu numero e 11 90000-0000')).toBe(true);
  });

  it('replaces the whole field with an international number even when part of it is selected', async () => {
    const { user, whatsapp } = await openPasteTarget();
    await user.type(whatsapp, '218888');
    expect(whatsapp).toHaveValue('+55 21 9 8888');
    whatsapp.setSelectionRange(4, 8);

    await user.paste('+55 11 90000-0000');

    expect(whatsapp).toHaveValue(TEST_PHONE_DISPLAY);
  });

  it('lets a local number replace a selected part of the field the usual way', async () => {
    const { user, whatsapp } = await openPasteTarget();
    await user.type(whatsapp, '218888');
    whatsapp.setSelectionRange(4, whatsapp.value.length);

    await user.paste(TEST_PHONE_TYPED);

    expect(whatsapp).toHaveValue(TEST_PHONE_DISPLAY);
  });

  it('does not touch a paste into the name or the message', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);
    const nome = screen.getByLabelText('Nome');
    const mensagem = screen.getByLabelText('Mensagem');

    expect(paste(nome, '+55 11 90000-0000')).toBe(true);
    expect(paste(mensagem, '+55 11 90000-0000')).toBe(true);
    await user.click(nome);
    await user.paste('+55 11 90000-0000');

    expect(nome).toHaveValue('+55 11 90000-0000');
  });

  // A script or an extension can dispatch a paste with no clipboard data: it used to throw a TypeError.
  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('does not throw and leaves the field alone when the clipboard data of the event is %s', async (_label, clipboardData) => {
    const { whatsapp } = await openPasteTarget();
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: clipboardData });

    const wasNotCancelled = fireEvent(whatsapp, event);

    expect(wasNotCancelled).toBe(true);
    expect(whatsapp).toHaveValue('+55 ');
  });

  // The paste goes after the prefix even when the caret was left inside it with no select event, and a local number
  // that the browser pastes lands there too.
  it('pastes a local number after the prefix when the caret is inside it', async () => {
    const { user, whatsapp } = await openPasteTarget();
    // A click at offset 1 leaves React's select sample at (1, 1), so the same caret again raises no select event.
    await user.pointer({ target: whatsapp, offset: 1, keys: '[MouseLeft]' });
    whatsapp.setSelectionRange(1, 1);

    await user.paste(TEST_PHONE_TYPED);

    expect(whatsapp).toHaveValue(TEST_PHONE_DISPLAY);
  });

  it('pastes an international number as the whole number when the caret is inside the prefix', async () => {
    const { user, whatsapp } = await openPasteTarget();
    whatsapp.setSelectionRange(2, 2);

    await user.paste('+55 11 90000-0000');

    expect(whatsapp).toHaveValue(TEST_PHONE_DISPLAY);
  });
});
