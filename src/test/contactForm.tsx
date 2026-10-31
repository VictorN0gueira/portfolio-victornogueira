import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, vi } from 'vitest';
import ContactForm from '../components/ContactForm';
import { serviceOptions } from '../data/services';
import { renderWithProviders } from './render';

export type User = ReturnType<typeof userEvent.setup>;

export const EMAIL_WEBHOOK = 'https://n8n.vnone.com.br/webhook/portfolio-vn-email';
export const WHATSAPP_WEBHOOK = 'https://n8n.vnone.com.br/webhook/portfolio-vn-whatsapp';

// Typed test data is fictitious on purpose: example.com is reserved and 11 90000-0000 is not a real line, so a mock
// that fails open can never put a fake lead on the real channel. The Evolution value is what toEvolutionFormat gives.
export const TEST_EMAIL = 'ana@example.com';
export const TEST_PHONE_TYPED = '11900000000';
export const TEST_PHONE_DISPLAY = '+55 11 9 0000-0000';
export const TEST_PHONE_EVOLUTION = '551100000000';

/**
 * Replaces fetch with a mock. Call it in a beforeEach with a rejecting implementation, so a regression in
 * validation can never reach the real n8n webhooks, and again in a test that needs a specific answer.
 */
export function stubFetch(impl: () => Promise<unknown>) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export function rejectUnexpectedFetch() {
  return stubFetch(() => Promise.reject(new Error('Unexpected network call in a form test')));
}

// The contact field swaps with a short exit and enter animation (AnimatePresence, mode wait): on a busy machine the
// default one second of the queries is not always enough, so every wait that follows a method swap takes this one.
export const SWAP_WAIT = { timeout: 3000 } as const;

/** The WhatsApp field once the method swap has finished. */
export const findWhatsappField = () => screen.findByLabelText('WhatsApp', undefined, SWAP_WAIT);

export const submitButton = () => screen.getByRole('button', { name: 'Enviar' });
// The trigger is named by its label and its own text ("Serviço de interesse Escolhe um serviço").
export const serviceTrigger = () => screen.getByRole('button', { name: /escolhe um serviço/i });

/**
 * The visible thanks paragraph. The same sentence also sits in the hidden status region (so a screen reader announces
 * it), which a plain getByText would find too: this leaves that copy out.
 */
export const visibleThanksText = (text: string) =>
  screen.getAllByText(text).filter((element) => element.closest('[role="status"]') === null);

export async function pickService(user: User) {
  await user.click(serviceTrigger());
  await user.click(await screen.findByRole('option', { name: serviceOptions[0] }));
  // The list animates out; wait until only the trigger (now showing the value) is left.
  await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument(), SWAP_WAIT);
}

/** Name, service, message, consent and the e-mail, ready to submit. */
async function fillEmailForm(user: User) {
  await user.type(screen.getByLabelText('Nome'), 'Ana Lima');
  await pickService(user);
  await user.type(screen.getByLabelText('E-mail'), TEST_EMAIL);
  await user.type(screen.getByLabelText('Mensagem'), 'Quero automatizar notas fiscais');
  await user.click(screen.getByRole('checkbox'));
}

export async function submitEmailForm(user: User) {
  await fillEmailForm(user);
  await user.click(submitButton());
}

export function readCall(fetchMock: ReturnType<typeof stubFetch>) {
  const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  return { url, init, body: JSON.parse(init.body as string) as Record<string, string> };
}

/** The form on the WhatsApp method, with the user and the number field ready. */
export async function openWhatsappForm() {
  const user = userEvent.setup();
  renderWithProviders(<ContactForm />);
  await user.click(screen.getByRole('button', { name: 'Por WhatsApp' }));
  const whatsapp = (await findWhatsappField()) as HTMLInputElement;
  return { user, whatsapp };
}

/** The rest of the WhatsApp form and the send: the number is whatever the field holds. */
export async function sendWhatsappForm(user: User, fetchMock: ReturnType<typeof stubFetch>) {
  await user.type(screen.getByLabelText('Nome'), 'Ana Lima');
  await pickService(user);
  await user.type(screen.getByLabelText('Mensagem'), 'Quero automatizar notas fiscais');
  await user.click(screen.getByRole('checkbox'));
  await user.click(submitButton());
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  return readCall(fetchMock);
}
