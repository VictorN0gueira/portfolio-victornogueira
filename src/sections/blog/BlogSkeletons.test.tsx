import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../test/render';
import { BlogSkeletons } from './BlogSkeletons';

describe('BlogSkeletons', () => {
  it('is one status named Carregando artigos, with a text for the screen readers and the picture hidden from them', () => {
    const { container } = renderWithProviders(<BlogSkeletons />);

    const status = screen.getByRole('status', { name: 'Carregando artigos' });
    expect(status).toHaveTextContent('Carregando artigos');
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('draws the featured card and six cards, pulsing only where motion is welcome', () => {
    const { container } = renderWithProviders(<BlogSkeletons />);

    expect(container.querySelectorAll('[data-skeleton="card"]')).toHaveLength(6);
    expect(container.querySelectorAll('[data-skeleton="featured"]')).toHaveLength(1);
    const pulses = container.querySelectorAll('[class*="animate-pulse"]');
    expect(pulses.length).toBeGreaterThan(0);
    for (const pulse of pulses) expect(pulse.className).toContain('motion-safe:animate-pulse');
  });

  it('uses only the tokens of the system', () => {
    const { container } = renderWithProviders(<BlogSkeletons />);

    expect(container.innerHTML).not.toMatch(/zinc|purple|cyan|gradient|blur|italic|dark:|bg-white\/|border-white\//);
  });
});
