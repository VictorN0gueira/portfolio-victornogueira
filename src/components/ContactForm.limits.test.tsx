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
  const text = (max: number) => `Máximo de ${max} caracteres.`;
  // The live region of a field: always in the DOM, so a screen reader hears its text change.
  const region = (field: 'nome' | 'email' | 'mensagem') => document.getElementById(`contact-${field}-cap`) as HTMLElement;
  // The visible line: the same words, hidden from assistive tech so nothing is announced twice.
  const visibleLine = (max: number) => screen.queryAllByText(text(max)).filter((node) => node.getAttribute('aria-hidden') === 'true');

  it('keeps one empty polite live region per capped field while the fields are under their caps', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await user.type(screen.getByLabelText('Nome'), 'a'.repeat(99));

    for (const field of ['nome', 'email', 'mensagem'] as const) {
      expect(region(field)).toHaveAttribute('aria-live', 'polite');
      expect(region(field)).toBeEmptyDOMElement();
      expect(region(field)).toHaveClass('sr-only');
    }
    expect(visibleLine(100)).toHaveLength(0);
  });

  it('keeps the same live region node and only changes its text when a paste is cut at the cap of the message', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);
    const mensagem = screen.getByLabelText('Mensagem');
    const before = region('mensagem');

    await user.click(mensagem);
    await user.paste('b'.repeat(2500));

    expect(mensagem).toHaveValue('b'.repeat(2000));
    expect(region('mensagem')).toBe(before);
    expect(before).toHaveTextContent(text(2000));
    expect(visibleLine(2000)).toHaveLength(1);
    expect(visibleLine(2000)[0]).toBeVisible();
    expect(before.textContent).not.toMatch(/[–—/]/u);
  });

  it('empties the same live region when the text gets shorter again, and the visible line goes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);
    const nome = screen.getByLabelText('Nome');
    const before = region('nome');

    await user.type(nome, 'a'.repeat(100));
    expect(before).toHaveTextContent(text(100));
    expect(visibleLine(100)).toHaveLength(1);
    await user.type(nome, '{Backspace}');

    expect(region('nome')).toBe(before);
    expect(before).toBeEmptyDOMElement();
    expect(visibleLine(100)).toHaveLength(0);
  });

  it('does it for an e-mail cut at 254 characters', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);
    const email = screen.getByLabelText('E-mail');

    await user.click(email);
    await user.paste(`${'a'.repeat(260)}@example.com`);

    expect(email).toHaveValue(`${'a'.repeat(260)}@example.com`.slice(0, 254));
    expect(region('email')).toHaveTextContent(text(254));
  });

  it('is announced once: the visible line is hidden from assistive tech and is out of the layout flow', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await user.click(screen.getByLabelText('Mensagem'));
    await user.paste('b'.repeat(2500));

    const line = visibleLine(2000)[0];
    expect(line).toHaveAttribute('aria-hidden', 'true');
    expect(line).toHaveClass('absolute');
    // `absolute` only keeps the line out of the flow if its frame is the positioning parent (FieldFrame is `relative`).
    expect(line.parentElement).toHaveClass('relative');
    expect(line.parentElement).toContainElement(screen.getByLabelText('Mensagem'));
    expect(line).not.toHaveAttribute('role');
  });

  it('adds no alert and no status region: the one polite status of the form is still the thanks', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await user.click(screen.getByLabelText('Mensagem'));
    await user.paste('b'.repeat(2500));

    expect(screen.queryAllByRole('alert')).toHaveLength(0);
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });
});
