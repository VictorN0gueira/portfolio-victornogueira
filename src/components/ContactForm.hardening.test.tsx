import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TEST_EMAIL,
  pickService,
  rejectUnexpectedFetch,
  stubFetch,
  submitButton,
  type User,
} from '../test/contactForm';
import { renderWithProviders } from '../test/render';
import ContactForm from './ContactForm';

// The lead channel hardening, seen through the rendered form. Every request goes to a mock.

const QUOTE = 'Simulei a economia no ROI e quero automatizar o financeiro';

beforeEach(() => {
  rejectUnexpectedFetch();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Name, service, e-mail and consent: the message is whatever the field already holds. */
async function fillAllButMessage(user: User) {
  await user.type(screen.getByLabelText('Nome'), 'Ana Lima');
  await pickService(user);
  await user.type(screen.getByLabelText('E-mail'), TEST_EMAIL);
  await user.click(screen.getByRole('checkbox'));
}

describe('Enviar outra after a ROI quote', () => {
  it('shows the quote again in the message field', async () => {
    stubFetch(() => Promise.resolve({ ok: true }));
    const user = userEvent.setup();
    renderWithProviders(<ContactForm initialMessage={QUOTE} />);
    expect(screen.getByLabelText('Mensagem')).toHaveValue(QUOTE);

    await fillAllButMessage(user);
    await user.click(submitButton());
    await user.click(await screen.findByRole('button', { name: 'Enviar outra' }));

    expect(screen.getByLabelText('Mensagem')).toHaveValue(QUOTE);
    expect(screen.getByLabelText('Nome')).toHaveValue('');
  });
});

describe('a request that never answers', () => {
  it('ends in the error state with the WhatsApp fallback, and Enviar works again after Fechar', async () => {
    const controller = new AbortController();
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);
    const fetchMock = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<never>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('timed out', 'TimeoutError')));
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderWithProviders(<ContactForm initialMessage={QUOTE} />);

    await fillAllButMessage(user);
    await user.click(submitButton());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Enviando…' })).toBeDisabled();

    act(() => controller.abort());

    expect(await screen.findByText(/não deu pra enviar/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /fala direto pelo whatsapp/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(submitButton()).toBeEnabled();
  });
});
