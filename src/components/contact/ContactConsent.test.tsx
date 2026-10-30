import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { rejectUnexpectedFetch } from '../../test/contactForm';
import { renderWithProviders } from '../../test/render';
import ContactForm from '../ContactForm';
import ContactConsent from './ContactConsent';

// The legal line, copied character by character from the form as it was before the redesign. It is legal text.
const LEGAL_SENTENCE =
  'Li e concordo com a Política de Privacidade e autorizo o uso dos meus dados para retorno do contato.';
const NEW_TAB_HINT = ' (abre em nova aba)';

beforeEach(() => {
  rejectUnexpectedFetch();
});

// jsdom's name computation trims the leading space of the hidden span; a browser keeps it, so the space is optional here.
const POLICY_LINK_NAME = /^Política de Privacidade ?\(abre em nova aba\)$/;
const policyLink = () => screen.getByRole('link', { name: POLICY_LINK_NAME });

/** What a sighted visitor reads: the text of the label without what is visually hidden. */
function visibleText(element: HTMLElement): string {
  const copy = element.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('.sr-only').forEach((hidden) => hidden.remove());
  return copy.textContent ?? '';
}

describe('ContactConsent privacy link', () => {
  it('opens the policy in a new tab and says so to a screen reader', () => {
    renderWithProviders(<ContactConsent checked={false} onChange={() => {}} />);

    const link = policyLink();
    expect(link).toHaveAttribute('href', '/privacidade');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    const hint = within(link).getByText(NEW_TAB_HINT.trim());
    expect(hint).toHaveClass('sr-only');
    expect(hint.textContent).toBe(NEW_TAB_HINT);
  });

  it('keeps the visible legal sentence exactly as it was, character by character', () => {
    renderWithProviders(<ContactConsent checked={false} onChange={() => {}} />);
    const label = screen.getByRole('checkbox').closest('label') as HTMLElement;

    expect(visibleText(label)).toBe(LEGAL_SENTENCE);
    expect([...visibleText(label)].map((char) => char.codePointAt(0))).toEqual(
      [...LEGAL_SENTENCE].map((char) => char.codePointAt(0)),
    );
  });

  it('keeps the router basename in the address', () => {
    render(
      <MemoryRouter basename="/portfolio-victornogueira" initialEntries={['/portfolio-victornogueira/']}>
        <ContactConsent checked={false} onChange={() => {}} />
      </MemoryRouter>,
    );

    expect(policyLink()).toHaveAttribute('href', '/portfolio-victornogueira/privacidade');
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
