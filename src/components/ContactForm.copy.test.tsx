import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { expectNoConsoleOutput } from '../test/consoleGuard';
import { EMAIL_WEBHOOK, readCall, rejectUnexpectedFetch, stubFetch, submitEmailForm } from '../test/contactForm';
import { offPaletteClasses } from '../test/palette';
import { renderWithProviders } from '../test/render';
import { ContactForm } from './ContactForm';

// The legal line, copied character by character from the form as it was before the redesign.
const ORIGINAL_CONSENT_TEXT =
  'Li e concordo com a Política de Privacidade e autorizo o uso dos meus dados para retorno do contato.';

expectNoConsoleOutput();

beforeEach(() => {
  rejectUnexpectedFetch();
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

    expect(link).toHaveClass('underline', 'text-vn-white', 'vn-focus-ring');
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
