import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/render';
import { ContactChannels } from './ContactChannels';

// The address and the number come from lib/constants. If one of them changes shape (an address with no @, a number written
// with no space), the card must still show it whole instead of losing the text it cannot split.
vi.mock('../../lib/constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/constants')>();
  return { ...actual, CONTACT_EMAIL: 'contato.vnone.com.br', WHATSAPP_DISPLAY: '81984451243' };
});

describe('ContactChannels when a constant is not in the shape it splits on', () => {
  it('shows an address without an @ whole, with no break hint', () => {
    renderWithProviders(<ContactChannels />);
    const link = screen.getByRole('link', { name: 'contato.vnone.com.br, E-mail' });

    expect(link.textContent).toBe('contato.vnone.com.br');
    expect(link.querySelectorAll('wbr')).toHaveLength(0);
    expect(link.childNodes).toHaveLength(1);
  });

  it('shows a number without a space whole, in one nowrap word', () => {
    renderWithProviders(<ContactChannels />);
    const link = screen.getByRole('link', { name: '81984451243, WhatsApp' });

    expect(link.textContent).toBe('81984451243');
    expect(link.childNodes).toHaveLength(2);
    expect(link.querySelector('.whitespace-nowrap')?.textContent).toBe('81984451243');
  });
});
