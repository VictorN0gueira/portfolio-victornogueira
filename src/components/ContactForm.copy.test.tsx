import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { WHATSAPP_FALLBACK_URL } from '../lib/constants';
import { findAccentElements } from '../test/accent';
import { expectNoConsoleOutput } from '../test/consoleGuard';
import {
  EMAIL_WEBHOOK,
  TEST_EMAIL,
  TEST_PHONE_DISPLAY,
  TEST_PHONE_EVOLUTION,
  TEST_PHONE_TYPED,
  WHATSAPP_WEBHOOK,
  pickService,
  readCall,
  rejectUnexpectedFetch,
  stubFetch,
  submitButton,
  submitEmailForm,
} from '../test/contactForm';
import { offPaletteClasses, offPaletteInHtml } from '../test/palette';
import { renderWithProviders } from '../test/render';
import ContactForm from './ContactForm';

// The legal line, copied character by character from the form as it was before the redesign.
const ORIGINAL_CONSENT_TEXT =
  'Li e concordo com a Política de Privacidade e autorizo o uso dos meus dados para retorno do contato.';
const ERROR_TEXT = 'Não deu pra enviar. Tenta de novo ou fala direto pelo WhatsApp.';
const SERVICE_TRIGGER_NAME = /selecione um serviço/i;

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

const tokensOf = (element: Element): string[] => (element.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
const togglePill = (name: string) => screen.getByRole('button', { name });

describe('ContactForm method toggle', () => {
  it('names the two methods Por e-mail and Por WhatsApp inside one labelled group', () => {
    renderWithProviders(<ContactForm />);
    const group = screen.getByRole('group', { name: 'Método de contato' });

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
    expect(await screen.findByLabelText('WhatsApp')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument());
  });

  it('gives each pill a 44px target', () => {
    renderWithProviders(<ContactForm />);

    expect(togglePill('Por e-mail')).toHaveClass('min-h-11');
    expect(togglePill('Por WhatsApp')).toHaveClass('min-h-11');
  });
});

describe('ContactForm labels, placeholders and attributes', () => {
  it('uses the final labels', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    expect(screen.getByLabelText('Nome')).toBeInTheDocument();
    expect(screen.getByText('Serviço de interesse')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(screen.getByLabelText('Mensagem')).toBeInTheDocument();
    await user.click(togglePill('Por WhatsApp'));
    expect(await screen.findByLabelText('WhatsApp')).toBeInTheDocument();
  });

  it('uses the final placeholders', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    expect(screen.getByPlaceholderText('Seu nome')).toBe(screen.getByLabelText('Nome'));
    expect(screen.getByPlaceholderText('voce@empresa.com.br')).toBe(screen.getByLabelText('E-mail'));
    expect(screen.getByPlaceholderText('Conta rapidinho o que você precisa')).toBe(screen.getByLabelText('Mensagem'));
    expect(screen.getByRole('button', { name: SERVICE_TRIGGER_NAME })).toBeInTheDocument();
    await user.click(togglePill('Por WhatsApp'));
    expect(await screen.findByPlaceholderText('+55 81 99999-9999')).toBe(screen.getByLabelText('WhatsApp'));
  });

  it('asks the browser to autofill the name, the e-mail and the phone', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    expect(screen.getByLabelText('Nome')).toHaveAttribute('autocomplete', 'name');
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('type', 'email');
    await user.click(togglePill('Por WhatsApp'));
    const whatsapp = await screen.findByLabelText('WhatsApp');
    expect(whatsapp).toHaveAttribute('autocomplete', 'tel');
    expect(whatsapp).toHaveAttribute('type', 'tel');
  });

  // The Enter key of a textarea inserts a new line, so its label must say so: "send" made a phone keyboard promise a
  // submit that never happens (ruling R58 overrides the brief here).
  it('opens the numeric keypad for the WhatsApp field and keeps the Enter key of the message a new line key', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    expect(screen.getByLabelText('Mensagem')).toHaveAttribute('enterkeyhint', 'enter');
    await user.click(togglePill('Por WhatsApp'));
    expect(await screen.findByLabelText('WhatsApp')).toHaveAttribute('inputmode', 'tel');
  });

  it('keeps every field required for assistive tech', () => {
    renderWithProviders(<ContactForm />);

    for (const label of ['Nome', 'E-mail', 'Mensagem']) {
      expect(screen.getByLabelText(label)).toBeRequired();
      expect(screen.getByLabelText(label)).toHaveAttribute('aria-required', 'true');
    }
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

describe('ContactForm consent', () => {
  it('keeps the legal text character for character', () => {
    renderWithProviders(<ContactForm />);
    const label = screen.getByRole('checkbox').closest('label') as HTMLElement;

    expect(label.textContent).toBe(ORIGINAL_CONSENT_TEXT);
  });

  it('keeps the link to the privacy policy inside the consent text', () => {
    renderWithProviders(<ContactForm />);
    const label = screen.getByRole('checkbox').closest('label') as HTMLElement;

    expect(within(label).getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacidade');
  });

  it('gives the policy link the white focus ring, since the default one is dark on the black', () => {
    renderWithProviders(<ContactForm />);
    const link = screen.getByRole('link', { name: 'Política de Privacidade' });

    expect(link).toHaveClass('underline', 'text-vn-white', 'focus-visible:outline-2', 'focus-visible:outline-vn-white');
  });

  it('draws the checkbox in white, with no green', () => {
    renderWithProviders(<ContactForm />);
    const box = screen.getByRole('checkbox');

    expect(box).toHaveClass('accent-white');
    expect(offPaletteClasses(box.className)).toEqual([]);
  });

  it('gives the whole consent row a 44px target', () => {
    renderWithProviders(<ContactForm />);

    expect((screen.getByRole('checkbox').closest('label') as HTMLElement).className).toContain('min-h-11');
  });
});

describe('ContactForm validation messages', () => {
  it('shows each message with an icon and the text, never by color alone', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    const messages = screen.getAllByRole('alert');
    expect(messages).toHaveLength(4);
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
    expect(nome).toHaveAttribute('aria-describedby', 'contact-nome-error');
    expect(nome).toHaveClass('border-vn-white');
    expect(offPaletteClasses(nome.className)).toEqual([]);
  });

  it('does not move the focus on a failed submit, like before', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    expect(submitButton()).toHaveFocus();
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

    expect(await screen.findByRole('heading', { level: 4, name: 'Recebemos sua mensagem' })).toBeInTheDocument();
    expect(screen.getByText('Obrigado! A gente responde pelo e-mail em breve.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar outra' })).toBeInTheDocument();
  });

  it('thanks the visitor by WhatsApp after a send by WhatsApp', async () => {
    stubFetch(() => Promise.resolve({ ok: true }));
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await user.click(togglePill('Por WhatsApp'));
    await user.type(screen.getByLabelText('Nome'), 'Ana Lima');
    await pickService(user);
    await user.type(await screen.findByLabelText('WhatsApp'), TEST_PHONE_TYPED);
    await user.type(screen.getByLabelText('Mensagem'), 'Quero automatizar notas fiscais');
    await user.click(screen.getByRole('checkbox'));
    await user.click(submitButton());

    expect(await screen.findByText('Obrigado! A gente responde pelo WhatsApp em breve.')).toBeInTheDocument();
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
    expect(submitButton()).toBeDisabled();

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

describe('ContactForm webhook contract', () => {
  it('still posts the e-mail payload to the e-mail webhook, with the final labels', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ ok: true }));
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await submitEmailForm(user);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const { url, init, body } = readCall(fetchMock);
    expect(url).toBe(EMAIL_WEBHOOK);
    expect(init.method).toBe('POST');
    expect(Object.keys(body).sort()).toEqual(['email', 'mensagem', 'nome', 'servico', 'timestamp']);
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
    await waitFor(() => expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument());
    expectOnlyPalette(container);
  });

  it('uses only the palette in the success state', async () => {
    stubFetch(() => Promise.resolve({ ok: true }));
    const user = userEvent.setup();
    const { container } = renderWithProviders(<ContactForm />);

    await submitEmailForm(user);
    await screen.findByRole('heading', { level: 4 });

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
