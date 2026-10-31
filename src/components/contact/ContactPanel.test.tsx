import type { FormEvent } from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoConsoleOutput } from '../../test/consoleGuard';
import { renderWithProviders } from '../../test/render';
import ContactPanel from './ContactPanel';
import { useContactForm } from './useContactForm';

expectNoConsoleOutput();

/** The real form state with its submit swapped for a spy, so the panel's own wiring is what is measured. */
function PanelWithSpy({ handleSubmit }: { handleSubmit: (event: FormEvent) => Promise<void> }) {
  const form = useContactForm();
  return <ContactPanel form={{ ...form, handleSubmit }} />;
}

describe('ContactPanel submit wiring', () => {
  it('calls the submit of the form once for each submit event', () => {
    const handleSubmit = vi.fn((event: FormEvent) => {
      event.preventDefault();
      return Promise.resolve();
    });
    renderWithProviders(<PanelWithSpy handleSubmit={handleSubmit} />);
    const form = screen.getByRole('form', { name: 'Formulário de contato' });

    fireEvent.submit(form);
    expect(handleSubmit).toHaveBeenCalledTimes(1);

    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(handleSubmit).toHaveBeenCalledTimes(3);
  });

  it('hands the very event of the form to the submit, so its preventDefault still runs inside the event', () => {
    const handleSubmit = vi.fn((event: FormEvent) => {
      event.preventDefault();
      return Promise.resolve();
    });
    renderWithProviders(<PanelWithSpy handleSubmit={handleSubmit} />);

    const notCancelled = fireEvent.submit(screen.getByRole('form', { name: 'Formulário de contato' }));

    expect(notCancelled).toBe(false);
    expect(handleSubmit.mock.calls[0][0]).toMatchObject({ type: 'submit' });
  });
});
