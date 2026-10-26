import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../test/render';
import ScanGrid from './ScanGrid';

function renderGrid(tone?: 'light' | 'dark'): HTMLElement {
  const { container } = renderWithProviders(<ScanGrid tone={tone} />);
  return container.firstElementChild as HTMLElement;
}

describe('ScanGrid', () => {
  it('is decorative, ignores the pointer and fills its parent', () => {
    const grid = renderGrid();

    expect(grid).toHaveAttribute('aria-hidden', 'true');
    expect(grid).toHaveClass('pointer-events-none', 'absolute', 'inset-0');
  });

  it('clips the scan line so it never adds page overflow', () => {
    expect(renderGrid()).toHaveClass('overflow-hidden');
  });

  it('draws the 64px grid and keeps it behind the section content', () => {
    expect(renderGrid()).toHaveClass('vn-scan-grid', '-z-10');
  });

  it('has no dark modifier on light surfaces', () => {
    expect(renderGrid('light')).not.toHaveClass('vn-scan-grid--dark');
    expect(renderGrid()).not.toHaveClass('vn-scan-grid--dark');
  });

  it('adds the dark modifier when tone is dark', () => {
    expect(renderGrid('dark')).toHaveClass('vn-scan-grid', 'vn-scan-grid--dark');
  });

  it('contains one scan line child that adds no layout classes of its own', () => {
    const lines = renderGrid().querySelectorAll('.vn-scan-line');

    expect(lines).toHaveLength(1);
    expect(lines[0].className).toBe('vn-scan-line');
  });

  it('merges a consumer className', () => {
    const { container } = renderWithProviders(<ScanGrid className="opacity-60" />);

    expect(container.firstElementChild).toHaveClass('opacity-60', 'vn-scan-grid');
  });
});
