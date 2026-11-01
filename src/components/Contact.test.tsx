import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { stubMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/render';
import { NEW_TAB_HINT } from './ui/NewTabHint';
import Contact from './Contact';

/** The small caps label of a contact line: the first paragraph of the block the link sits in. */
function labelOf(link: HTMLElement): HTMLElement {
  return link.closest('div')?.querySelector('p') as HTMLElement;
}

describe('Contact (the contact block of /contato)', () => {
  beforeEach(() => {
    stubMatchMedia();
  });

  it('tells a screen reader that the WhatsApp link opens a new tab', () => {
    renderWithProviders(<Contact />);

    const link = screen.getByRole('link', { name: /\+55 \(81\) 98445-1243/ });

    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAccessibleDescription(NEW_TAB_HINT);
  });

  it('spells E-mail like the form, and says where the work happens like the footer', () => {
    renderWithProviders(<Contact />);

    expect(labelOf(screen.getByRole('link', { name: 'contato@vnone.com.br' }))).toHaveTextContent('E-mail');
    expect(screen.queryByText('Email')).toBeNull();
    expect(screen.getByText('Recife e remoto')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Brasil & Remoto/);
  });

  it('asks what the visitor needs instead of the "algo juntos" filler', () => {
    renderWithProviders(<Contact />);

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Conta o que você precisa.');
    expect(document.body.textContent).not.toMatch(/algo juntos/);
  });

  it('keeps the small labels on the black off the zinc 500 gray', () => {
    renderWithProviders(<Contact />);

    const labels = [
      labelOf(screen.getByRole('link', { name: 'contato@vnone.com.br' })),
      labelOf(screen.getByRole('link', { name: /\+55 \(81\)/ })),
      screen.getByText('Localização'),
    ];
    for (const label of labels) {
      expect(label.className).not.toMatch(/zinc-[3-6]00/);
    }
  });
});
