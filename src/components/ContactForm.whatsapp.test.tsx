import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { expectNoConsoleOutput } from '../test/consoleGuard';
import {
  TEST_PHONE_DISPLAY,
  TEST_PHONE_EVOLUTION,
  TEST_PHONE_TYPED,
  WHATSAPP_WEBHOOK,
  findWhatsappField,
  pickService,
  readCall,
  rejectUnexpectedFetch,
  stubFetch,
  submitButton,
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

type User = ReturnType<typeof userEvent.setup>;

async function openWhatsapp() {
  const user = userEvent.setup();
  renderWithProviders(<ContactForm />);
  await user.click(screen.getByRole('button', { name: 'Por WhatsApp' }));
  const whatsapp = (await findWhatsappField()) as HTMLInputElement;
  return { user, whatsapp };
}

const range = (input: HTMLInputElement) => [input.selectionStart, input.selectionEnd];

/** The rest of the form and the send: the number is whatever the field holds. */
async function sendWhatsappForm(user: User, fetchMock: ReturnType<typeof stubFetch>) {
  await user.type(screen.getByLabelText('Nome'), 'Ana Lima');
  await pickService(user);
  await user.type(screen.getByLabelText('Mensagem'), 'Quero automatizar notas fiscais');
  await user.click(screen.getByRole('checkbox'));
  await user.click(submitButton());
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  return readCall(fetchMock);
}

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

  // Ctrl+A, the select all of a Tab and a drag over the whole number reach past the prefix: they still replace it all.
  it.each([
    ['0 to 6', 0, 6],
    ['2 to 6', 2, 6],
    ['0 to the end', 0, 11],
  ])('leaves a range that reaches past the prefix alone (%s)', async (_label, start, end) => {
    const { user, whatsapp } = await openWhatsapp();
    await user.type(whatsapp, '11900');
    expect(whatsapp).toHaveValue('+55 11 9 00');

    whatsapp.setSelectionRange(start, end);
    fireEvent.click(whatsapp);
    fireEvent.keyUp(whatsapp);

    expect(range(whatsapp)).toEqual([start, end]);
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
});
