import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { WHATSAPP_FALLBACK_URL } from '../lib/constants';
import { findAccentElements } from '../test/accent';
import { expectNoConsoleOutput } from '../test/consoleGuard';
import {
  TEST_PHONE_TYPED,
  fieldError,
  pickService,
  rejectUnexpectedFetch,
  stubFetch,
  submitButton,
  submitEmailForm,
  SWAP_WAIT,
  findWhatsappField,
  togglePill,
  visibleThanksText,
} from '../test/contactForm';
import { offPaletteClasses, offPaletteInHtml } from '../test/palette';
import { renderWithProviders } from '../test/render';
import ContactForm from './ContactForm';
import { contactFormCopy } from './contact/contactFormCopy';

const { error: errorCopy, success: successCopy } = contactFormCopy;
const ERROR_TEXT = `${errorCopy.before}${errorCopy.link}${errorCopy.after}`;
const SERVICE_TRIGGER_NAME = /escolhe um serviço/i;

expectNoConsoleOutput();

beforeEach(() => {
  rejectUnexpectedFetch();
});

// Every class in the tree is a VN One token (or white, transparent, current, inherit), and the accent is not among
// them: the cursor owns the accent of FinalCta, the form adds none.
function expectOnlyPalette(container: HTMLElement) {
  expect(offPaletteInHtml(container.innerHTML)).toEqual([]);
  expect(findAccentElements(container)).toEqual([]);
}

describe('ContactForm validation messages', () => {
  it('shows each message with an icon and the text, never by color alone', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    // Each message is the description of its field (the focus lands on the first one), not an alert of its own.
    const messages = [...document.querySelectorAll('[id^="contact-"][id$="-error"]')];
    expect(messages).toHaveLength(4);
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
    for (const message of messages) {
      expect(message.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
      expect(message.textContent?.trim().length).toBeGreaterThan(0);
      expect(offPaletteClasses(message.className)).toEqual([]);
    }
  });

  it('marks an invalid field with a heavier white border as well as aria-invalid', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    const nome = screen.getByLabelText('Nome');
    expect(nome).toHaveAttribute('aria-invalid', 'true');
    expect(nome).toHaveAttribute('aria-describedby', fieldError('nome')?.id);
    expect(nome).toHaveClass('border-vn-white');
    expect(offPaletteClasses(nome.className)).toEqual([]);
  });

  it('moves the focus to the first invalid field on a failed submit', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    expect(screen.getByLabelText('Nome')).toHaveFocus();
  });
});

describe('ContactForm sending, success and error', () => {
  it('shows Enviar, disabled until the consent is given', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    expect(submitButton()).toBeDisabled();
    await user.click(screen.getByRole('checkbox'));
    expect(submitButton()).toBeEnabled();
  });

  it('says Enviando… and marks the button busy while the request is out', async () => {
    stubFetch(() => new Promise(() => undefined));
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await submitEmailForm(user);

    const busy = await screen.findByRole('button', { name: 'Enviando…' });
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(busy).toBeDisabled();
  });

  it('thanks the visitor by e-mail after a send by e-mail', async () => {
    stubFetch(() => Promise.resolve({ ok: true }));
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await submitEmailForm(user);

    expect(await screen.findByRole('heading', { level: 3, name: successCopy.title })).toBeInTheDocument();
    expect(visibleThanksText(successCopy.text('email'))).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Enviar outra' })).toBeInTheDocument();
  });

  it('thanks the visitor by WhatsApp after a send by WhatsApp', async () => {
    stubFetch(() => Promise.resolve({ ok: true }));
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await user.click(togglePill('Por WhatsApp'));
    await user.type(screen.getByLabelText('Nome'), 'Ana Lima');
    await pickService(user);
    await user.type(await findWhatsappField(), TEST_PHONE_TYPED);
    await user.type(screen.getByLabelText('Mensagem'), 'Quero automatizar notas fiscais');
    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    await screen.findByRole('heading', { level: 3, name: successCopy.title });
    expect(visibleThanksText(successCopy.text('whatsapp'))).toHaveLength(1);
  });

  it('clears the whole form with Enviar outra', async () => {
    stubFetch(() => Promise.resolve({ ok: true }));
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);
    await submitEmailForm(user);

    await user.click(await screen.findByRole('button', { name: 'Enviar outra' }));

    expect(screen.getByLabelText('Nome')).toHaveValue('');
    expect(screen.getByLabelText('E-mail')).toHaveValue('');
    expect(screen.getByLabelText('Mensagem')).toHaveValue('');
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByRole('button', { name: SERVICE_TRIGGER_NAME })).toBeInTheDocument();
  });

  it('shows the error with the WhatsApp link on the words fala direto pelo WhatsApp', async () => {
    stubFetch(() => Promise.resolve({ ok: false }));
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await submitEmailForm(user);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(ERROR_TEXT);
    expect(alert).toHaveAttribute('aria-live', 'assertive');
    const link = within(alert).getByRole('link', { name: 'fala direto pelo WhatsApp' });
    expect(link).toHaveAttribute('href', WHATSAPP_FALLBACK_URL);
    expect(link.getAttribute('href')).toContain('https://wa.me/5581984451243');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link).toHaveClass('underline', 'focus-visible:outline-2', 'focus-visible:outline-vn-white');
  });

  it('shows the error with an icon and no red', async () => {
    stubFetch(() => Promise.reject(new TypeError('Failed to fetch')));
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await submitEmailForm(user);

    const alert = await screen.findByRole('alert');
    expect(alert.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(offPaletteClasses(alert.className)).toEqual([]);
  });

  it('dismisses the error with Fechar, keeps the typed values and sends again', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: false }));
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);
    await submitEmailForm(user);
    const alert = await screen.findByRole('alert');
    // A failed send does not lock Enviar: the visitor can try again without closing the alert first.
    expect(submitButton()).toBeEnabled();

    await user.click(within(alert).getByRole('button', { name: 'Fechar' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('Ana Lima');
    expect(submitButton()).toBeEnabled();
    await user.click(submitButton());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it('gives Fechar a 44px target', async () => {
    stubFetch(() => Promise.resolve({ ok: false }));
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await submitEmailForm(user);

    expect(within(await screen.findByRole('alert')).getByRole('button', { name: 'Fechar' })).toHaveClass('min-h-11');
  });
});

describe('ContactForm palette', () => {
  it('uses only the palette in every state of the form', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<ContactForm />);

    expectOnlyPalette(container);
    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());
    expectOnlyPalette(container);
    await user.click(togglePill('Por WhatsApp'));
    await waitFor(() => expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument(), SWAP_WAIT);
    expectOnlyPalette(container);
  });

  it('uses only the palette in the success state', async () => {
    stubFetch(() => Promise.resolve({ ok: true }));
    const user = userEvent.setup();
    const { container } = renderWithProviders(<ContactForm />);

    await submitEmailForm(user);
    await screen.findByRole('heading', { level: 3 });

    expectOnlyPalette(container);
  });

  it('uses only the palette in the error state', async () => {
    stubFetch(() => Promise.resolve({ ok: false }));
    const user = userEvent.setup();
    const { container } = renderWithProviders(<ContactForm />);

    await submitEmailForm(user);
    await screen.findByRole('alert');

    expectOnlyPalette(container);
  });
});
