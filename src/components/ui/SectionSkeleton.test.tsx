import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SectionSkeleton } from './SectionSkeleton';

describe('the skeleton file', () => {
  it('still draws the skeleton as a hidden band of the given height', () => {
    const { container } = render(<SectionSkeleton heightClassName="min-h-[10rem]" />);

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.firstElementChild).toHaveClass('min-h-[10rem]');
  });
});
