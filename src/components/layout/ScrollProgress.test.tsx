import { screen } from '@testing-library/react';
import * as motionReact from 'motion/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { A11Y_STORAGE_KEY } from '../../contexts/AccessibilityContext';
import { renderWithProviders } from '../../test/render';
import { ScrollProgress } from './ScrollProgress';

vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>();
  return { ...actual, useSpring: vi.fn(actual.useSpring) };
});

function renderBar(tone?: 'light' | 'dark') {
  const { container } = renderWithProviders(<ScrollProgress tone={tone} />);
  return container.firstElementChild as HTMLElement;
}

describe('ScrollProgress', () => {
  afterEach(() => {
    localStorage.clear();
    vi.mocked(motionReact.useSpring).mockClear();
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

    it('is white at 80% for a dark page, and then not ink', () => {
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
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify({ noAnimations: true }));

    const bar = renderBar();

    expect(bar).toHaveClass('fixed', 'h-0.5', 'bg-vn-ink');
  });

  it('creates the spring only when motion is welcome (R:M14)', () => {
    renderBar();
    expect(motionReact.useSpring).toHaveBeenCalledTimes(1);

    vi.mocked(motionReact.useSpring).mockClear();
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify({ noAnimations: true }));
    renderBar();

    expect(motionReact.useSpring).not.toHaveBeenCalled();
  });
});
