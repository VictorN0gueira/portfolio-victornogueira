import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { expectNoConsoleOutput } from '../test/consoleGuard';
import { rejectUnexpectedFetch } from '../test/contactForm';
import { renderWithProviders } from '../test/render';
import ContactForm from './ContactForm';

expectNoConsoleOutput();

beforeEach(() => {
  rejectUnexpectedFetch();
});

describe('ContactForm prefill', () => {
  it('starts with the message given by the parent', () => {
    renderWithProviders(<ContactForm initialMessage="Quero automatizar notas fiscais" />);

    expect(screen.getByLabelText('Mensagem')).toHaveValue('Quero automatizar notas fiscais');
  });

  it('applies a new message when the prop changes after mount', () => {
    const { rerender } = renderWithProviders(<ContactForm initialMessage="Primeira mensagem do simulador" />);

    rerender(<ContactForm initialMessage="Segunda mensagem do simulador" />);

    expect(screen.getByLabelText('Mensagem')).toHaveValue('Segunda mensagem do simulador');
  });

  it('overwrites what the visitor typed when a different message arrives', async () => {
    const user = userEvent.setup();
    const { rerender } = renderWithProviders(<ContactForm initialMessage="Primeira mensagem do simulador" />);
    await user.type(screen.getByLabelText('Mensagem'), ' mais um pouco');

    rerender(<ContactForm initialMessage="Segunda mensagem do simulador" />);

    expect(screen.getByLabelText('Mensagem')).toHaveValue('Segunda mensagem do simulador');
  });

  // Known limitation, kept as it is today: the effect depends on the string, so the same string again does not
  // run it. A visitor who edits the field and uses the simulator button twice with unchanged values keeps the edit.
  it('does not apply an identical message a second time (documented limitation)', async () => {
    const user = userEvent.setup();
    const { rerender } = renderWithProviders(<ContactForm initialMessage="Mesma mensagem do simulador" />);
    await user.type(screen.getByLabelText('Mensagem'), ' e mais um detalhe');

    rerender(<ContactForm initialMessage="Mesma mensagem do simulador" />);

    expect(screen.getByLabelText('Mensagem')).toHaveValue('Mesma mensagem do simulador e mais um detalhe');
  });

  it('applies an earlier message again once another one came in between', () => {
    const { rerender } = renderWithProviders(<ContactForm initialMessage="Mensagem A do simulador" />);

    rerender(<ContactForm initialMessage="Mensagem B do simulador" />);
    rerender(<ContactForm initialMessage="Mensagem A do simulador" />);

    expect(screen.getByLabelText('Mensagem')).toHaveValue('Mensagem A do simulador');
  });

  it('leaves the field alone when the prop goes back to nothing', () => {
    const { rerender } = renderWithProviders(<ContactForm initialMessage="Mensagem do simulador" />);

    rerender(<ContactForm />);

    expect(screen.getByLabelText('Mensagem')).toHaveValue('Mensagem do simulador');
  });
});
