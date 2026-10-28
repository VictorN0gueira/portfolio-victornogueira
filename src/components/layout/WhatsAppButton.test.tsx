import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WHATSAPP_GREETING, WHATSAPP_NUMBER, whatsappUrl } from '../../lib/constants';
import { renderWithProviders } from '../../test/render';
import WhatsAppButton from './WhatsAppButton';

function renderButton() {
  renderWithProviders(<WhatsAppButton />);
  return screen.getByRole('link', { name: 'Falar no WhatsApp' });
}

describe('WhatsAppButton', () => {
  it('opens a chat with the official number and the greeting, in a new tab', () => {
    const link = renderButton();

    expect(link).toHaveAttribute('href', whatsappUrl('Olá! Vim pelo site da VN One e quero conversar sobre um projeto.'));
    expect(link.getAttribute('href')).toContain(`wa.me/${WHATSAPP_NUMBER}`);
    expect(WHATSAPP_GREETING).toBe('Olá! Vim pelo site da VN One e quero conversar sobre um projeto.');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('keeps 16px from the edges, or the safe area when it is larger, through inline styles', () => {
    const link = renderButton();

    expect(link.style.right).toBe('calc(max(16px, env(safe-area-inset-right)) + var(--removed-body-scroll-bar-size, 0px))');
    expect(link.style.bottom).toBe('max(16px, env(safe-area-inset-bottom))');
  });

  it('is a fixed 52px black circle that sits below the header and the menu dialog', () => {
    const link = renderButton();

    expect(link).toHaveClass('fixed', 'size-[52px]', 'rounded-full', 'bg-vn-black', 'z-40');
  });

  it('shows the white WhatsApp mark, hidden from assistive tech', () => {
    const link = renderButton();

    const icon = link.querySelector('svg');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon).toHaveClass('size-6');
    expect(link).toHaveClass('text-vn-white');
  });

  it('pulses once with the accent ring, never in a loop', () => {
    const link = renderButton();

    const ring = link.querySelector('.vn-pulse-once');
    expect(ring).toBeInTheDocument();
    expect(ring).toHaveAttribute('aria-hidden', 'true');
    expect(ring).toHaveClass('border-vn-accent');
    expect(ring?.className).not.toMatch(/animate-ping|animate-pulse/);
  });

  it('sits in its own landmark, so no content of the page is left outside a landmark', () => {
    const link = renderButton();
    const landmark = screen.getByRole('complementary', { name: 'Contato rápido' });

    expect(landmark).toContainElement(link);
  });
});
