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
import { range } from '../test/range';
import { renderWithProviders } from '../test/render';
import { ContactForm } from './ContactForm';

// The WhatsApp number is the one thing of a lead that cannot be wrong: a number that passes the validation but is not
// the one the visitor typed sends the lead to somebody else. These tests pin the two ways it used to go wrong (a caret
// inside the +55 prefix, and an international number pasted behind it).

expectNoConsoleOutput();

beforeEach(() => {
  rejectUnexpectedFetch();
});

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

  // The next three blocks move a selection out of the prefix when a key goes down. In jsdom React raises its own select
  // event on key down as well, so the three blocks (the first two and the Shift rows) pass with or without the onKeyDown
  // handler: that handler is pinned by the isolated row "guards the selection on onKeyDown" in whatsappInput.test.ts, and
  // the behavior in a real browser by e2e/contact-form.spec.ts (the caret that returns inside the prefix with no click).
  it.each([0, 1, 2, 3])('snaps a caret at %i when a key goes down', async (caret) => {
    const { whatsapp } = await openWhatsapp();
    whatsapp.focus();

    whatsapp.setSelectionRange(caret, caret);
    fireEvent.keyDown(whatsapp, { key: '1' });

    expect(range(whatsapp)).toEqual([4, 4]);
  });

  it('clamps a range that starts inside the prefix when a key goes down', async () => {
    const { user, whatsapp } = await openWhatsapp();
    await user.type(whatsapp, '11900');

    whatsapp.setSelectionRange(2, 11);
    fireEvent.keyDown(whatsapp, { key: '1' });

    expect(range(whatsapp)).toEqual([4, 11]);
  });

  // A caret that returns to the offset of an earlier click, then a key that inserts nothing (Shift) goes down.
  it.each([0, 1, 2])('snaps a caret returned to offset %i when a key that inserts nothing (Shift) goes down', async (caret) => {
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

  // The prefix is protected on purpose: a select all selects the number only, so a copy or a cut gives the number
  // without "+55 ". It still replaces the whole number when the visitor types over it.
  it('turns a select all of the whole field into the range 4 to the end, so the number is selected and the prefix is not', async () => {
    const { user, whatsapp } = await openWhatsapp();
    await user.type(whatsapp, TEST_PHONE_TYPED);
    expect(whatsapp).toHaveValue(TEST_PHONE_DISPLAY);

    whatsapp.select();
    fireEvent.select(whatsapp);

    expect(range(whatsapp)).toEqual([4, TEST_PHONE_DISPLAY.length]);
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
