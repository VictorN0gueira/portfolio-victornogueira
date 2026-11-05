import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
});
