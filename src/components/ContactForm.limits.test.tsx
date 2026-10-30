import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { rejectUnexpectedFetch } from '../test/contactForm';
import { renderWithProviders } from '../test/render';
import ContactForm from './ContactForm';

// Typing 120 characters one by one is slow on a busy machine: the default 5 seconds is tight.
vi.setConfig({ testTimeout: 20_000 });

beforeEach(() => {
  rejectUnexpectedFetch();
});

describe('ContactForm length caps', () => {
  it('puts the caps on the name, the e-mail and the message', () => {
    renderWithProviders(<ContactForm />);

    expect(screen.getByLabelText('Nome')).toHaveAttribute('maxlength', '100');
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('maxlength', '254');
    expect(screen.getByLabelText('Mensagem')).toHaveAttribute('maxlength', '2000');
  });

  it('stops the typing at the cap', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);
    const nome = screen.getByLabelText('Nome');

    await user.type(nome, 'a'.repeat(120));

    expect(nome).toHaveValue('a'.repeat(100));
  });

  it('cuts a paste that is longer than the cap', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);
    const mensagem = screen.getByLabelText('Mensagem');

    await user.click(mensagem);
    await user.paste('b'.repeat(2500));

    expect(mensagem).toHaveValue('b'.repeat(2000));
  });

  it('leaves the WhatsApp field to its own formatting', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await user.click(screen.getByRole('button', { name: 'Por WhatsApp' }));

    expect(await screen.findByLabelText('WhatsApp', undefined, { timeout: 3000 })).not.toHaveAttribute('maxlength');
  });
});

describe('ContactForm cap hint', () => {
  const hint = (max: number) => screen.queryByText(`Máximo de ${max} caracteres.`);

  it('shows no hint while the fields are under their caps', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await user.type(screen.getByLabelText('Nome'), 'a'.repeat(99));

    expect(hint(100)).not.toBeInTheDocument();
    expect(hint(254)).not.toBeInTheDocument();
    expect(hint(2000)).not.toBeInTheDocument();
  });

  it('says so, politely and visibly, when a paste was cut at the cap of the message', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);
    const mensagem = screen.getByLabelText('Mensagem');

    await user.click(mensagem);
    await user.paste('b'.repeat(2500));

    expect(mensagem).toHaveValue('b'.repeat(2000));
    const note = hint(2000) as HTMLElement;
    expect(note).toBeVisible();
    expect(note).toHaveAttribute('role', 'status');
    expect(note).toHaveAttribute('aria-live', 'polite');
    expect(note.textContent).not.toMatch(/[–—/]/u);
  });

  it('shows it when the typing reaches the cap of the name, and takes it away when the name gets shorter', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);
    const nome = screen.getByLabelText('Nome');

    await user.type(nome, 'a'.repeat(100));
    expect(hint(100)).toBeInTheDocument();
    await user.type(nome, '{Backspace}');

    expect(hint(100)).not.toBeInTheDocument();
  });

  it('shows it for an e-mail cut at 254 characters', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);
    const email = screen.getByLabelText('E-mail');

    await user.click(email);
    await user.paste(`${'a'.repeat(260)}@example.com`);

    expect(email).toHaveValue(`${'a'.repeat(260)}@example.com`.slice(0, 254));
    expect(hint(254)).toBeInTheDocument();
  });

  it('is not an alert: the form still shows one alert per field in error', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await user.click(screen.getByLabelText('Mensagem'));
    await user.paste('b'.repeat(2500));

    expect(screen.queryAllByRole('alert')).toHaveLength(0);
  });
});
