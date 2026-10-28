import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, vi } from 'vitest';
import { serviceOptions } from '../data/services';

export type User = ReturnType<typeof userEvent.setup>;

export const EMAIL_WEBHOOK = 'https://n8n.vnone.com.br/webhook/portfolio-vn-email';
export const WHATSAPP_WEBHOOK = 'https://n8n.vnone.com.br/webhook/portfolio-vn-whatsapp';

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

export const submitButton = () => screen.getByRole('button', { name: 'Enviar' });
export const serviceTrigger = () => screen.getByRole('button', { name: 'Selecione um serviço' });

export async function pickService(user: User) {
  await user.click(serviceTrigger());
  await user.click(screen.getByRole('button', { name: serviceOptions[0] }));
  // The list animates out; wait until only the trigger (now showing the value) is left.
  await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
}

/** Name, service, message, consent and the e-mail, ready to submit. */
export async function fillEmailForm(user: User) {
  await user.type(screen.getByLabelText('Nome'), 'Ana Lima');
  await pickService(user);
  await user.type(screen.getByLabelText('E-mail'), 'ana@empresa.com.br');
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
