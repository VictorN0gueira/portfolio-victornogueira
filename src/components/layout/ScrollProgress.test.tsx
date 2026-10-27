import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../test/render';
import ScrollProgress from './ScrollProgress';

function renderBar(tone?: 'light' | 'dark') {
  const { container } = renderWithProviders(<ScrollProgress tone={tone} />);
  return container.firstElementChild as HTMLElement;
}

describe('ScrollProgress', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('draws a 2px ink bar fixed at the top, hidden from assistive tech', () => {
    const bar = renderBar();

    expect(bar).toHaveAttribute('aria-hidden', 'true');
    expect(bar).toHaveClass('fixed', 'top-0', 'h-0.5', 'bg-vn-ink', 'origin-left');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  describe('tone', () => {
    it('is ink for the light site, which is the default', () => {
      expect(renderBar()).toHaveClass('bg-vn-ink');
      expect(renderBar('light')).toHaveClass('bg-vn-ink');
    });

    it('is white at 80% for a dark page such as the blog, and then not ink', () => {
      const bar = renderBar('dark');

      expect(bar).toHaveClass('bg-white/80');
      expect(bar).not.toHaveClass('bg-vn-ink');
    });

    it('keeps the same 2px fixed shape in both tones', () => {
      for (const tone of ['light', 'dark'] as const) {
        expect(renderBar(tone)).toHaveClass('fixed', 'inset-x-0', 'top-0', 'h-0.5', 'origin-left');
      }
    });
  });

  it('still renders the bar, without the spring, when the visitor turned animations off', () => {
    localStorage.setItem('a11y-preferences', JSON.stringify({ noAnimations: true }));

    const bar = renderBar();

    expect(bar).toHaveClass('fixed', 'h-0.5', 'bg-vn-ink');
  });
});
