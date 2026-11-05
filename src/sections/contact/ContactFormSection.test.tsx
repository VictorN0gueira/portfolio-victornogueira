import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { homeCopy } from '../../data/homeCopy';
import { renderWithProviders } from '../../test/render';
import { stubMatchMedia } from '../../test/matchMedia';
import { ContactFormSection } from './ContactFormSection';

describe('ContactFormSection', () => {
  it('is the anchor #contato, named by the heading of the home call to action', () => {
    stubMatchMedia();
    renderWithProviders(<ContactFormSection />);
    const section = document.getElementById('contato') as HTMLElement;
    const heading = screen.getByRole('heading', { level: 2, name: homeCopy.finalCta.heading });

    expect(section.tagName).toBe('SECTION');
    expect(section).toHaveAttribute('aria-labelledby', heading.id);
    expect(section).toHaveAttribute('data-tone', 'cream');
    expect(section).toHaveTextContent(homeCopy.finalCta.kicker);
  });

  it('holds one form and one message field, on a black panel with no accent', () => {
    stubMatchMedia();
    renderWithProviders(<ContactFormSection />);
    const section = document.getElementById('contato') as HTMLElement;
    const panel = section.querySelector('[data-contact-panel]') as HTMLElement;

    expect(section.querySelectorAll('form[name="contact"]')).toHaveLength(1);
    expect(section.querySelectorAll('textarea')).toHaveLength(1);
    expect(panel).toHaveClass('bg-vn-black', 'rounded-shell');
    expect(panel.querySelector('form')).not.toBeNull();
    expect(section.innerHTML).not.toMatch(/vn-accent/);
  });

  it('tells the page when the visitor types in the message, and only then', async () => {
    stubMatchMedia();
    const onMessageEdit = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<ContactFormSection onMessageEdit={onMessageEdit} />);

    await user.type(screen.getByRole('textbox', { name: 'Nome' }), 'Ana');
    expect(onMessageEdit).not.toHaveBeenCalled();

    await user.type(screen.getByRole('textbox', { name: 'Mensagem' }), 'oi');
    expect(onMessageEdit).toHaveBeenCalledTimes(2);
  });

  it('has exactly one textarea and it is the message, which is what the edit listener relies on', () => {
    stubMatchMedia();
    renderWithProviders(<ContactFormSection />);
    const section = document.getElementById('contato') as HTMLElement;
    const areas = section.querySelectorAll('textarea');

    expect(areas).toHaveLength(1);
    expect(areas[0]).toBe(screen.getByRole('textbox', { name: 'Mensagem' }));
    expect(areas[0].id).toMatch(/-mensagem$/);
  });

  it('does not take another textarea inside the panel for the message', () => {
    stubMatchMedia();
    const onMessageEdit = vi.fn();
    renderWithProviders(<ContactFormSection onMessageEdit={onMessageEdit} />);
    const stranger = document.createElement('textarea');
    stranger.id = 'something-else';
    (document.querySelector('[data-contact-panel]') as HTMLElement).appendChild(stranger);

    stranger.dispatchEvent(new Event('input', { bubbles: true }));

    expect(onMessageEdit).not.toHaveBeenCalled();
  });
});
