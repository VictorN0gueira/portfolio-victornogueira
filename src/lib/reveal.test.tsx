import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SectionSkeleton } from './reveal';

describe('SectionSkeleton as a band of the new design', () => {
  const band = () => render(<SectionSkeleton heightClassName="min-h-[52rem] lg:min-h-[40rem]" />);

  it('holds the height classes it is given, so a late section does not move what sits under it', () => {
    const { container } = band();

    expect(container.firstElementChild).toHaveClass('min-h-[52rem]', 'lg:min-h-[40rem]');
  });

  it('is a cream band with the spinner near its top', () => {
    const { container } = band();

    expect(container.firstElementChild).toHaveClass('bg-vn-cream', 'items-start');
  });
});

describe('SectionSkeleton as the compact placeholder of the legacy pages', () => {
  it('is transparent, centered and has no height of its own, as it was before the redesign', () => {
    const { container } = render(<SectionSkeleton />);
    const root = container.firstElementChild as HTMLElement;

    expect(root).toHaveClass('items-center', 'py-24');
    expect(root.className).not.toMatch(/bg-|min-h-/);
  });

  it('draws its label dark enough for a cream page (gray-dark, 7.4:1), not gray-mid (3.1:1)', () => {
    render(<SectionSkeleton />);
    const label = screen.getByText('Carregando...');

    expect(label).toHaveClass('text-vn-gray-dark');
    expect(label.className).not.toContain('text-vn-gray-mid');
  });
});

describe('SectionSkeleton in both looks', () => {
  it.each([
    ['the band', <SectionSkeleton key="band" heightClassName="min-h-[10rem]" />],
    ['the compact one', <SectionSkeleton key="compact" />],
  ])('is hidden from assistive tech (%s), so a page of eight of them does not announce loading eight times', (_name, ui) => {
    const { container } = render(ui);

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('uses only VN One tokens: no dark variants, no zinc or numbered gray palette', () => {
    const { container } = render(<SectionSkeleton heightClassName="min-h-[10rem]" />);

    expect(container.innerHTML).not.toMatch(/dark:|zinc|slate|gray-\d/);
  });

  it('spins only when motion is welcome', () => {
    const { container } = render(<SectionSkeleton />);

    expect(container.innerHTML).toContain('motion-safe:animate-spin');
    expect(container.innerHTML).not.toMatch(/(?<!:)\banimate-spin/);
  });
});
