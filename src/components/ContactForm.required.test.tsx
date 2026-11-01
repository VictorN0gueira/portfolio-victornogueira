import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { expectNoConsoleOutput } from '../test/consoleGuard';
import { rejectUnexpectedFetch, submitButton } from '../test/contactForm';
import { renderWithProviders } from '../test/render';
import { ContactForm } from './ContactForm';
import { contactFormCopy } from './contact/contactFormCopy';

expectNoConsoleOutput();

beforeEach(() => {
  rejectUnexpectedFetch();
});

describe('ContactForm required fields (3.3.2)', () => {
  it('says once, in plain text, that every field is required', () => {
    renderWithProviders(<ContactForm />);

    expect(contactFormCopy.requiredNote).toBe('Todos os campos são obrigatórios');
    expect(screen.getAllByText(contactFormCopy.requiredNote)).toHaveLength(1);
  });

  it('puts the line above the first field and gives it to the form as its description', () => {
    renderWithProviders(<ContactForm />);
    const form = screen.getByRole('form', { name: contactFormCopy.formLabel });
    const note = screen.getByText(contactFormCopy.requiredNote);

    expect(form).toHaveAccessibleDescription(contactFormCopy.requiredNote);
    expect(note.compareDocumentPosition(screen.getByLabelText('Nome')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps the line at the same contrast as the other hints of the panel', () => {
    renderWithProviders(<ContactForm />);

    expect(screen.getByText(contactFormCopy.requiredNote)).toHaveClass('text-vn-gray-light');
  });
});

describe('ContactForm disabled Enviar and its hint', () => {
  it('stays off until the consent, is described by the visible hint, and the hint follows the button in reading order', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);
    const button = submitButton();
    const hint = screen.getByText(contactFormCopy.consentHint);

    expect(button).toBeDisabled();
    expect(button.getAttribute('aria-describedby')).toBe(hint.id);
    expect(button.compareDocumentPosition(hint) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(hint).toBeVisible();

    await user.click(screen.getByRole('checkbox'));

    expect(button).toBeEnabled();
  });
});
