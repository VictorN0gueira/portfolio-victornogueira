import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SectionSkeleton as FromReveal } from '../../lib/reveal';
import { PageFallback as PageFallbackFromReveal } from '../../lib/reveal';
import { PageFallback } from '../layout/PageFallback';
import { SectionSkeleton } from './SectionSkeleton';

describe('the files the skeleton and the page fallback moved to', () => {
  it('keeps the old import path of lib/reveal working with the same components', () => {
    expect(FromReveal).toBe(SectionSkeleton);
    expect(PageFallbackFromReveal).toBe(PageFallback);
  });

  it('still draws the skeleton as a hidden band of the given height', () => {
    const { container } = render(<SectionSkeleton heightClassName="min-h-[10rem]" />);

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.firstElementChild).toHaveClass('min-h-[10rem]');
  });
});
