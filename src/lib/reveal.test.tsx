import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SectionSkeleton } from './reveal';

describe('SectionSkeleton', () => {
  it('holds the height classes it is given, so a late section does not move what sits under it', () => {
    const { container } = render(<SectionSkeleton heightClassName="min-h-[52rem] lg:min-h-[40rem]" />);

    expect(container.firstElementChild).toHaveClass('min-h-[52rem]', 'lg:min-h-[40rem]');
    expect(container.firstElementChild).not.toHaveClass('min-h-[clamp(18rem,40vh,32rem)]');
  });

  it('has a default height of its own', () => {
    const { container } = render(<SectionSkeleton />);

    expect(container.firstElementChild).toHaveClass('min-h-[clamp(18rem,40vh,32rem)]');
  });

  it('says it is loading and uses only VN One tokens: no dark variants, no zinc palette', () => {
    const { container } = render(<SectionSkeleton />);
    const markup = container.innerHTML;

    expect(screen.getByText('Carregando...')).toBeInTheDocument();
    expect(markup).not.toMatch(/dark:|zinc|slate|gray-\d/);
    expect(markup).toContain('bg-vn-cream');
  });

  it('spins only when motion is welcome', () => {
    const { container } = render(<SectionSkeleton />);

    expect(container.innerHTML).toContain('motion-safe:animate-spin');
    expect(container.innerHTML).not.toMatch(/(?<!:)\banimate-spin/);
  });
});
