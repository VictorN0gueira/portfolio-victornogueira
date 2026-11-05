import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { contactCopy } from '../../data/contactCopy';
import { CONTACT_EMAIL, WHATSAPP_DISPLAY, WHATSAPP_GREETING, whatsappUrl } from '../../lib/constants';
import { NEW_TAB_HINT } from '../../components/ui/NewTabHint';
import { renderWithProviders } from '../../test/render';
import { ContactChannels } from './ContactChannels';

describe('ContactChannels', () => {
  it('lists the place first (not a control), then the e-mail and the WhatsApp, each with its label', () => {
    const { container } = renderWithProviders(<ContactChannels />);
    const terms = Array.from(container.querySelectorAll('dt')).map((term) => term.textContent);

    expect(container.querySelector('dl')).not.toBeNull();
    expect(terms).toEqual([contactCopy.channels.location, contactCopy.channels.email, contactCopy.channels.whatsapp]);
    expect(screen.getByText(contactCopy.channels.locationValue)).toBeInTheDocument();
  });

  it('takes the e-mail from the shared constants', () => {
    renderWithProviders(<ContactChannels />);

    expect(screen.getByRole('link', { name: CONTACT_EMAIL })).toHaveAttribute('href', `mailto:${CONTACT_EMAIL}`);
  });

  it('opens WhatsApp from the shared constants, in a new tab that a screen reader is told about', () => {
    renderWithProviders(<ContactChannels />);
    const link = screen.getByRole('link', { name: WHATSAPP_DISPLAY });

    expect(link).toHaveAttribute('href', whatsappUrl(WHATSAPP_GREETING));
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAccessibleDescription(NEW_TAB_HINT);
  });

  it('draws the WhatsApp icon hidden from assistive tech, in the text color and not in green', () => {
    renderWithProviders(<ContactChannels />);
    const icon = screen.getByRole('link', { name: WHATSAPP_DISPLAY }).querySelector('svg');

    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon?.getAttribute('class') ?? '').not.toMatch(/green|emerald|zinc/);
  });

  it('gives each link a 44px target and the ink focus ring of a light surface', () => {
    renderWithProviders(<ContactChannels />);
    const group = screen.getAllByRole('link');

    expect(group).toHaveLength(2);
    for (const link of group) {
      expect(link).toHaveClass('min-h-11', 'vn-focus-ring-ink');
    }
    expect(within(document.body).queryByText(/chat[\s-]?bot/i)).toBeNull();
  });

  it('writes no wa.me address and no phone number in its source', () => {
    const source = readFileSync(resolve(__dirname, 'ContactChannels.tsx'), 'utf8');

    expect(source).not.toMatch(/wa\.me/);
    expect(source).not.toMatch(/\d{4}-?\d{4}/);
  });
});
