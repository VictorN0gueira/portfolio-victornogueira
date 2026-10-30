import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formatWhatsappDisplay } from '../lib/phone';
import { expectedDisplay, expectedEvolution } from '../test/phoneCorpus';
import {
  WHATSAPP_WEBHOOK,
  openWhatsappForm,
  pickService,
  rejectUnexpectedFetch,
  sendWhatsappForm,
  stubFetch,
  submitButton,
} from '../test/contactForm';

// The WhatsApp field typed key by key, through the real input handler, must end as the number pasted. A number whose eight
// digit part starts with 9 (81 99999-9999, the example of the field itself) used to lose every 9 typed after the DDD.

// Typing a whole number key by key, many times, is slow: the default 5 seconds is not enough.
vi.setConfig({ testTimeout: 120_000 });

beforeEach(() => {
  rejectUnexpectedFetch();
});

// The pure test (lib/phone.typing.test.ts) covers every DDD and about a hundred parts; here the real input handler runs on
// a sample that has the shapes that matter: DDD 55 (the country code look alike), nines right after the DDD, and none.
const DDDS = ['55', '81'];
const PARTS = ['99999999', '99998888', '91234567', '84451243'];
const EMPTY_FIELD = '+55 ';

/** Empties the field the way a visitor does: Backspace until only the fixed +55 is left. */
async function clearField(user: ReturnType<typeof userEvent.setup>, field: HTMLInputElement) {
  await user.type(field, '{Backspace}'.repeat(30));
  expect(field).toHaveValue(EMPTY_FIELD);
}

describe('the WhatsApp field typed key by key', () => {
  it('ends as the number pasted, with all eight digits, for numbers with and without the mobile 9', async () => {
    const { user, whatsapp } = await openWhatsappForm();
    const wrong: string[] = [];

    for (const ddd of DDDS) {
      for (const part of PARTS) {
        for (const digits of [`${ddd}9${part}`, `${ddd}${part}`]) {
          // A ten digit number whose part starts with 9 reads that 9 as the mobile 9: the one ambiguity, left to the pure test.
          if (digits.length === 10 && part.startsWith('9')) continue;
          // DDD 55 then eight digits starting 0, 1, 6, 7 or 8 is no real number: the typed 55 is read as the country code (P2).
          if (digits.length === 10 && ddd === '55' && '01678'.includes(part[0])) continue;
          await clearField(user, whatsapp);
          await user.type(whatsapp, digits);
          const typed = whatsapp.value;
          await clearField(user, whatsapp);
          await user.click(whatsapp);
          await user.paste(digits);
          const pasted = whatsapp.value;
          if (typed !== expectedDisplay(ddd, part) || pasted !== typed) wrong.push(`${digits}: typed ${typed}, pasted ${pasted}`);
        }
      }
    }

    expect(wrong).toEqual([]);
  });

  it('keeps every 9 of the number 81 99999-9999, the one the field shows as its example', async () => {
    const { user, whatsapp } = await openWhatsappForm();

    await user.type(whatsapp, '81999999999');

    expect(whatsapp).toHaveValue('+55 81 9 9999-9999');
  });

  it.each([
    ['81999998888', '558199998888'],
    ['81999999999', '558199999999'],
    ['55999990000', '555599990000'],
    ['11984451243', '551184451243'],
  ])('sends the lead for %s as %s, the value pasting it gives', async (typedNumber, expected) => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { user, whatsapp } = await openWhatsappForm();
    await user.type(whatsapp, typedNumber);

    const { url, body } = await sendWhatsappForm(user, fetchMock);

    expect(url).toBe(WHATSAPP_WEBHOOK);
    expect(body.whatsapp).toBe(expected);
    expect(body.whatsapp).toBe(expectedEvolution(typedNumber.slice(0, 2), typedNumber.slice(3)));
    expect(Object.keys(body)).toEqual(['nome', 'whatsapp', 'servico', 'mensagem', 'timestamp']);
    expect(formatWhatsappDisplay(`+55 ${typedNumber}`)).toBe(whatsapp.value);
  });

  it('lets a visitor go back from the 9 that was typed and write a landline', async () => {
    const { user, whatsapp } = await openWhatsappForm();

    await user.type(whatsapp, '819');
    expect(whatsapp).toHaveValue('+55 81 9');
    await user.type(whatsapp, '{Backspace}');
    expect(whatsapp).toHaveValue('+55 81');
    await user.type(whatsapp, '32221234');

    expect(whatsapp).toHaveValue('+55 81 9 3222-1234');
  });

  it('tells a visitor in Portuguese when the DDD does not exist, and sends nothing', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const { user, whatsapp } = await openWhatsappForm();
    await user.type(whatsapp, '10984451243');
    await user.type(screen.getByLabelText('Nome'), 'Ana Lima');
    await pickService(user);
    await user.type(screen.getByLabelText('Mensagem'), 'Quero automatizar notas fiscais');
    await user.click(screen.getByRole('checkbox'));

    await user.click(submitButton());

    expect(await screen.findByText('Esse DDD não existe, confere o número')).toBeInTheDocument();
    expect(whatsapp).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('drops a trunk zero typed in front of the DDD, so 081984451243 is the number 81 98445-1243', async () => {
    const { user, whatsapp } = await openWhatsappForm();

    await user.type(whatsapp, '081984451243');

    expect(whatsapp).toHaveValue('+55 81 9 8445-1243');
  });
});

