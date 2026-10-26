import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { brandIcons, type BrandIconId } from '../../data/brandIcons';
import { renderWithProviders } from '../../test/render';
import BrandIcon from './BrandIcon';

describe('BrandIcon', () => {
  it('draws the path of the requested brand in a 24 by 24 currentColor svg', () => {
    const { container } = renderWithProviders(<BrandIcon id="whatsapp" />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('fill', 'currentColor');
    expect(svg?.querySelector('path')).toHaveAttribute('d', brandIcons.whatsapp.path);
  });

  it('is hidden from assistive tech without a title', () => {
    const { container } = renderWithProviders(<BrandIcon id="n8n" />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('role');
    expect(svg).not.toHaveAttribute('aria-label');
  });

  it('becomes a labelled image when a title is given', () => {
    renderWithProviders(<BrandIcon id="n8n" title="Automacao no n8n" />);

    const svg = screen.getByRole('img', { name: 'Automacao no n8n' });
    expect(svg).not.toHaveAttribute('aria-hidden');
  });

  it('passes className to the svg', () => {
    const { container } = renderWithProviders(<BrandIcon id="claude" className="size-6" />);

    expect(container.querySelector('svg')).toHaveClass('size-6');
  });

  it.each(Object.keys(brandIcons) as BrandIconId[])('renders a path for %s', (id) => {
    const { container } = renderWithProviders(<BrandIcon id={id} />);

    expect(container.querySelector('path')?.getAttribute('d')).toBe(brandIcons[id].path);
  });
});
