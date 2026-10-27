import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../test/render';
import ScrollProgress from './ScrollProgress';

describe('ScrollProgress', () => {
  it('draws a 2px ink bar fixed at the top, hidden from assistive tech', () => {
    const { container } = renderWithProviders(<ScrollProgress />);

    const bar = container.firstElementChild as HTMLElement;
    expect(bar).toHaveAttribute('aria-hidden', 'true');
    expect(bar).toHaveClass('fixed', 'top-0', 'h-0.5', 'bg-vn-ink', 'origin-left');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('still renders the bar, without the spring, when the visitor turned animations off', () => {
    localStorage.setItem('a11y-preferences', JSON.stringify({ noAnimations: true }));

    const { container } = renderWithProviders(<ScrollProgress />);

    expect(container.firstElementChild).toHaveClass('fixed', 'h-0.5', 'bg-vn-ink');
    localStorage.clear();
  });
});
