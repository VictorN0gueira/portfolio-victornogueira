import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { rejectUnexpectedFetch } from '../test/contactForm';
import { renderWithProviders } from '../test/render';
import ContactForm from './ContactForm';

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
