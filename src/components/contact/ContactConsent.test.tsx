import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { rejectUnexpectedFetch } from '../../test/contactForm';
import { renderWithProviders } from '../../test/render';
import ContactForm from '../ContactForm';
import Footer from '../layout/Footer';
import ContactConsent from './ContactConsent';

// The legal line, copied character by character from the form as it was before the redesign. It is legal text.
const LEGAL_SENTENCE =
  'Li e concordo com a Política de Privacidade e autorizo o uso dos meus dados para retorno do contato.';
const NEW_TAB_HINT = 'Abre em nova aba';

beforeEach(() => {
  rejectUnexpectedFetch();
});

const policyLink = () => screen.getByRole('link', { name: 'Política de Privacidade' });
const consentLabel = () => screen.getByRole('checkbox').closest('label') as HTMLElement;

describe('ContactConsent privacy link', () => {
  it('opens the policy in a new tab', () => {
    renderWithProviders(<ContactConsent checked={false} onChange={() => {}} />);

    const link = policyLink();
    expect(link).toHaveAttribute('href', '/privacidade');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('says so to a screen reader with a description outside the legal sentence, and keeps the name the visible text', () => {
    renderWithProviders(<ContactConsent checked={false} onChange={() => {}} />);

    const link = policyLink();
    expect(link).toHaveAccessibleName('Política de Privacidade');
    expect(link).toHaveAccessibleDescription(NEW_TAB_HINT);
    const hint = document.getElementById(link.getAttribute('aria-describedby') as string) as HTMLElement;
    expect(hint).toHaveClass('sr-only');
    expect(consentLabel().contains(hint)).toBe(false);
  });

  it('keeps the legal sentence, as selected and copied, character by character', () => {
    renderWithProviders(<ContactConsent checked={false} onChange={() => {}} />);

    // No stripping of hidden parts: the text of the whole label is the legal sentence and nothing else.
    expect(consentLabel().textContent).toBe(LEGAL_SENTENCE);
    expect([...(consentLabel().textContent as string)].map((char) => char.codePointAt(0))).toEqual(
      [...LEGAL_SENTENCE].map((char) => char.codePointAt(0)),
    );
  });

  it('is the same address as the privacy link of the footer, in the router the app mounts (no basename)', () => {
    // main.tsx mounts a plain BrowserRouter, so there is no basename even in the Pages build: every internal Link,
    // this one and the footer's, resolves the same way.
    renderWithProviders(
      <>
        <ContactConsent checked={false} onChange={() => {}} />
        <Footer />
      </>,
    );

    const inConsent = within(consentLabel()).getByRole('link', { name: 'Política de Privacidade' });
    const inFooter = within(screen.getByRole('contentinfo')).getByRole('link', { name: 'Política de Privacidade' });
    expect(inConsent.getAttribute('href')).toBe(inFooter.getAttribute('href'));
    expect(inConsent.getAttribute('href')).toBe('/privacidade');
  });

  it('does not leave the page, so what the visitor typed is not lost', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<ContactForm />} />
          <Route path="/privacidade" element={<p>Página de privacidade</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('Nome'), 'Ana Lima');
    await user.click(policyLink());

    expect(screen.queryByText('Página de privacidade')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('Ana Lima');
  });
});
