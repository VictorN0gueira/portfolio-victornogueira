import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EMAIL_WEBHOOK,
  TEST_EMAIL,
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
import { ContactForm } from './ContactForm';

/**
 * The lead channel contract. The two n8n webhooks are the only way a lead reaches the business, so the exact bytes the
 * form sends are pinned here: URL, method, headers and the JSON body string (same keys, same order, same values, same
 * timestamp format). The literals were captured from the form BEFORE the lead channel hardening (batch L) and must
 * never change with it. Every request goes to a mock: no test reaches a real host.
 */

// Each test types a whole form: on a busy machine the default 5 seconds is tight, and this is the identity test of the
// lead channel, so it must never flake.
vi.setConfig({ testTimeout: 20_000 });

const FIXED_NOW = new Date('2026-10-29T12:00:00.000Z');

const EMAIL_BODY =
  '{"nome":"Ana Lima","email":"ana@example.com","servico":"Automação de processos","mensagem":"Quero automatizar notas fiscais","timestamp":"2026-10-29T12:00:00.000Z"}';
const WHATSAPP_BODY =
  '{"nome":"Ana Lima","whatsapp":"551100000000","servico":"Automação de processos","mensagem":"Quero automatizar notas fiscais","timestamp":"2026-10-29T12:00:00.000Z"}';

beforeEach(() => {
  rejectUnexpectedFetch();
  // Only the clock of `new Date()`: the timers stay real so the typing and the swaps run as usual.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function fillCommon(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nome'), 'Ana Lima');
  await pickService(user);
  await user.type(screen.getByLabelText('Mensagem'), 'Quero automatizar notas fiscais');
}

describe('the exact request the contact form sends', () => {
  it('sends the e-mail request byte for byte', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await fillCommon(user);
    await user.type(screen.getByLabelText('E-mail'), TEST_EMAIL);
    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const { url, init } = readCall(fetchMock);
    expect(url).toBe(EMAIL_WEBHOOK);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(init.body).toBe(EMAIL_BODY);
    // keepalive is an option of the request, never part of the body: the bytes above are what n8n reads.
    expect(init.keepalive).toBe(true);
    expect(Object.keys(JSON.parse(init.body as string))).toEqual(['nome', 'email', 'servico', 'mensagem', 'timestamp']);
  });

  it('sends the WhatsApp request byte for byte', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await user.click(screen.getByRole('button', { name: 'Por WhatsApp' }));
    await fillCommon(user);
    await user.type(await findWhatsappField(), TEST_PHONE_TYPED);
    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const { url, init } = readCall(fetchMock);
    expect(url).toBe(WHATSAPP_WEBHOOK);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(init.body).toBe(WHATSAPP_BODY);
    expect(init.keepalive).toBe(true);
    expect(Object.keys(JSON.parse(init.body as string))).toEqual(['nome', 'whatsapp', 'servico', 'mensagem', 'timestamp']);
  });
});
