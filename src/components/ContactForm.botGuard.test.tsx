import { act, fireEvent, screen, waitFor } from '@testing-library/react';
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
import { serviceOptions } from '../data/services';
import { renderWithProviders } from '../test/render';
import ContactForm from './ContactForm';

// The test setup turns the time trap and the cooldown off; the form here runs with the real ones.
vi.mock('./contact/botGuard', async (importOriginal) => importOriginal());

const FIXED_NOW = new Date('2026-10-29T12:00:00.000Z');
const THANKS = 'A gente recebeu sua mensagem';
const COOLDOWN_TEXT = 'A gente já recebeu a sua mensagem. Espera alguns segundos para enviar outra.';

// These flows type a whole form and some wait for a real 2 second timer: on a busy machine the default 5 seconds is tight.
vi.setConfig({ testTimeout: 20_000 });

beforeEach(() => {
  rejectUnexpectedFetch();
  // Only the clock of Date.now(): the typing and the animations keep their real timers. The test moves the clock by hand.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const wait = (ms: number) => act(() => void vi.setSystemTime(Date.now() + ms));

async function fillTheForm(user: User) {
  await user.type(screen.getByLabelText('Nome'), 'Ana Lima');
  await pickService(user);
  await user.type(screen.getByLabelText('E-mail'), TEST_EMAIL);
  await user.type(screen.getByLabelText('Mensagem'), 'Quero automatizar notas fiscais');
  await user.click(screen.getByRole('checkbox'));
}

describe('the time trap in the rendered form', () => {
  it('shows Enviando, holds a fast Enviar for the rest of the 2 seconds, then really sends it', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await fillTheForm(user);
    await user.click(submitButton());

    expect(screen.getByRole('button', { name: 'Enviando…' })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
    // The clock of Date is frozen here, so the whole 2 seconds are the real wait of the form.
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1), { timeout: 4_000 });
    expect(await screen.findByRole('heading', { name: THANKS })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows the real error, with the WhatsApp fallback, when the held request fails', async () => {
    stubFetch(() => Promise.resolve({ ok: false }));
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await fillTheForm(user);
    await user.click(submitButton());

    expect(await screen.findByText(/não deu pra enviar/i, undefined, { timeout: 4_000 })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: THANKS })).not.toBeInTheDocument();
  });

  it('sends when two seconds have passed since the first key', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await fillTheForm(user);
    wait(2_000);
    await user.click(submitButton());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('heading', { name: THANKS })).toBeInTheDocument();
  });
});

describe('the Enter key in the rendered form', () => {
  it('is not a gesture: autofill then Enter on a form that has been open a while is not held', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    renderWithProviders(<ContactForm />);
    wait(60_000);

    // No key and no pointer on the fields: change and click events only, like an autofill and a script would give.
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ana Lima' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: TEST_EMAIL } });
    fireEvent.change(screen.getByLabelText('Mensagem'), { target: { value: 'Quero automatizar notas fiscais' } });
    fireEvent.click(screen.getByRole('button', { name: /escolhe um serviço/i }));
    fireEvent.click(await screen.findByRole('option', { name: serviceOptions[0] }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.keyDown(screen.getByLabelText('Nome'), { key: 'Enter' });
    fireEvent.submit(document.querySelector('form[name="contact"]') as HTMLFormElement);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1), { timeout: 500 });
  });
});

describe('the cooldown in the rendered form', () => {
  /** Sent once, Enviar outra, and the form filled again. */
  async function sentOnceAndFilledAgain() {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);
    await fillTheForm(user);
    wait(2_000);
    await user.click(submitButton());
    await user.click(await screen.findByRole('button', { name: 'Enviar outra' }));
    await fillTheForm(user);
    return { user, fetchMock };
  }

  it('shows the friendly line and sends nothing for a second send inside 30 seconds', async () => {
    const { user, fetchMock } = await sentOnceAndFilledAgain();
    wait(10_000);

    await user.click(submitButton());

    expect(await screen.findByText(COOLDOWN_TEXT)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(submitButton()).toBeEnabled();
  });

  it('lets Enviar outra and the typing through, and sends once the 30 seconds are over', async () => {
    const { user, fetchMock } = await sentOnceAndFilledAgain();
    await user.click(submitButton());
    expect(await screen.findByText(COOLDOWN_TEXT)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Nome'), ' Souza');
    expect(screen.queryByText(COOLDOWN_TEXT)).not.toBeInTheDocument();
    wait(30_000);
    await user.click(submitButton());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
