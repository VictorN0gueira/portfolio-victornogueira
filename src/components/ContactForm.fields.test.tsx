import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { expectNoConsoleOutput } from '../test/consoleGuard';
import { fieldError, rejectUnexpectedFetch, submitButton, SWAP_WAIT, findWhatsappField, togglePill, whatsappHint } from '../test/contactForm';
import { offPaletteClasses } from '../test/palette';
import { renderWithProviders } from '../test/render';
import ContactForm from './ContactForm';
import { contactFormCopy } from './contact/contactFormCopy';
import { tokensOf } from '../test/dom';

const SERVICE_TRIGGER_NAME = /escolhe um serviço/i;

expectNoConsoleOutput();

beforeEach(() => {
  rejectUnexpectedFetch();
});

describe('ContactForm method toggle', () => {
  it('names the two methods Por e-mail and Por WhatsApp inside one group, which has one name', () => {
    renderWithProviders(<ContactForm />);
    const group = screen.getByRole('group', { name: contactFormCopy.method.legend });

    expect(screen.getAllByRole('group')).toHaveLength(1);

    expect(within(group).getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Por e-mail',
      'Por WhatsApp',
    ]);
  });

  it('presses the e-mail pill first and paints the active pill white on black, with no green', () => {
    renderWithProviders(<ContactForm />);

    expect(togglePill('Por e-mail')).toHaveAttribute('aria-pressed', 'true');
    expect(togglePill('Por WhatsApp')).toHaveAttribute('aria-pressed', 'false');
    expect(togglePill('Por e-mail')).toHaveClass('bg-vn-white', 'text-vn-black');
    expect(togglePill('Por WhatsApp')).not.toHaveClass('bg-vn-white');
    expect(offPaletteClasses(togglePill('Por WhatsApp').className)).toEqual([]);
  });

  it('moves the active pill and the field when the method changes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await user.click(togglePill('Por WhatsApp'));

    expect(togglePill('Por WhatsApp')).toHaveAttribute('aria-pressed', 'true');
    expect(togglePill('Por WhatsApp')).toHaveClass('bg-vn-white', 'text-vn-black');
    expect(togglePill('Por e-mail')).not.toHaveClass('bg-vn-white');
    expect(await findWhatsappField()).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument(), SWAP_WAIT);
  });

  it('gives each pill a 44px target', () => {
    renderWithProviders(<ContactForm />);

    expect(togglePill('Por e-mail')).toHaveClass('min-h-11');
    expect(togglePill('Por WhatsApp')).toHaveClass('min-h-11');
  });
});

describe('ContactForm labels, placeholders and attributes', () => {
  it('gives every field a visible label and a placeholder that says what goes in it', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);
    const { labels, placeholders } = contactFormCopy;

    expect(screen.getByPlaceholderText(placeholders.nome)).toBe(screen.getByLabelText(labels.nome));
    expect(screen.getByPlaceholderText(placeholders.email)).toBe(screen.getByLabelText(labels.email));
    expect(screen.getByPlaceholderText(placeholders.mensagem)).toBe(screen.getByLabelText(labels.mensagem));
    expect(screen.getByText(labels.servico)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: SERVICE_TRIGGER_NAME })).toBeInTheDocument();
    await user.click(togglePill('Por WhatsApp'));
    expect(await screen.findByPlaceholderText(placeholders.whatsapp, undefined, SWAP_WAIT)).toBe(
      screen.getByLabelText(labels.whatsapp),
    );
  });

  it('asks the browser to autofill the name, the e-mail and the phone', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    expect(screen.getByLabelText('Nome')).toHaveAttribute('autocomplete', 'name');
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('type', 'email');
    await user.click(togglePill('Por WhatsApp'));
    const whatsapp = await findWhatsappField();
    expect(whatsapp).toHaveAttribute('autocomplete', 'tel');
    expect(whatsapp).toHaveAttribute('type', 'tel');
  });

  // The Enter key of a textarea inserts a new line, so its label must say so: "send" made a phone keyboard promise a
  // submit that never happens.
  it('opens the numeric keypad for the WhatsApp field and keeps the Enter key of the message a new line key', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    expect(screen.getByLabelText('Mensagem')).toHaveAttribute('enterkeyhint', 'enter');
    await user.click(togglePill('Por WhatsApp'));
    expect(await findWhatsappField()).toHaveAttribute('inputmode', 'tel');
  });

  // `required` alone is exposed as required; aria-required on top of it only said it twice.
  it('keeps every field required for assistive tech with the native attribute only', () => {
    renderWithProviders(<ContactForm />);

    for (const label of ['Nome', 'E-mail', 'Mensagem']) {
      expect(screen.getByLabelText(label)).toBeRequired();
      expect(screen.getByLabelText(label)).not.toHaveAttribute('aria-required');
    }
  });

  it('shows how to type the WhatsApp number and describes the field by it', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await user.click(togglePill('Por WhatsApp'));
    const whatsapp = await findWhatsappField();

    expect(screen.getByText(contactFormCopy.whatsappHint)).toBeInTheDocument();
    expect(whatsapp).toHaveAccessibleDescription(contactFormCopy.whatsappHint);
  });

  it('keeps the hint ahead of the error in the description of the WhatsApp field', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);
    await user.click(togglePill('Por WhatsApp'));
    const whatsapp = await findWhatsappField();

    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    expect(whatsapp.getAttribute('aria-describedby')?.split(' ')).toEqual([whatsappHint()?.id, fieldError('whatsapp')?.id]);
  });
});

describe('ContactForm field sizing', () => {
  it('sets 16px text, a 44px height and a white focus ring on every text control, at every width', () => {
    renderWithProviders(<ContactForm />);
    const controls = [
      screen.getByLabelText('Nome'),
      screen.getByLabelText('E-mail'),
      screen.getByLabelText('Mensagem'),
      screen.getByRole('button', { name: SERVICE_TRIGGER_NAME }),
    ];

    for (const control of controls) {
      const tokens = tokensOf(control);

      expect(tokens, control.outerHTML).toContain('text-base');
      expect(tokens.filter((token) => /(^|:)text-(xs|sm)$/.test(token))).toEqual([]);
      expect(tokens).toContain('min-h-11');
      expect(tokens).toContain('text-vn-white');
      expect(tokens).toContain('focus-visible:outline-vn-white');
      expect(offPaletteClasses(control.className)).toEqual([]);
    }
  });

  it('keeps the radius, the side padding and the ellipsis of the fields after the class build', () => {
    renderWithProviders(<ContactForm />);

    for (const control of [screen.getByLabelText('Nome'), screen.getByLabelText('Mensagem')]) {
      expect(tokensOf(control)).toEqual(
        expect.arrayContaining(['rounded-xl', 'bg-vn-white/5', 'px-3.5', 'min-[360px]:px-4', 'text-ellipsis']),
      );
    }
  });

  it('keeps the message box from being resized by hand', () => {
    renderWithProviders(<ContactForm />);

    expect(screen.getByLabelText('Mensagem')).toHaveClass('resize-none');
    expect(screen.getByLabelText('Mensagem')).toHaveAttribute('rows', '4');
  });
});
