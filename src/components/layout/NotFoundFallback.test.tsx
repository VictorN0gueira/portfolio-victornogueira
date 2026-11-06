import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { shellCopy } from '../../data/shellCopy';
import { NotFoundFallback } from './NotFoundFallback';

describe('NotFoundFallback', () => {
  it('is a status region named by the loading text, with the text inside for a screen reader', () => {
    render(<NotFoundFallback />);

    const status = screen.getByRole('status', { name: shellCopy.pageLoading });
    expect(status).toHaveTextContent(shellCopy.pageLoading);
    expect(screen.getByText(shellCopy.pageLoading)).toHaveClass('sr-only');
  });

  it('is the brand black at the full dynamic height, the same as the 404 it stands in for', () => {
    render(<NotFoundFallback />);
    const status = screen.getByRole('status');

    expect(status).toHaveClass('bg-vn-black', 'min-h-dvh');
    expect(status).not.toHaveClass('min-h-screen');
  });

  it('uses no color family outside the palette', () => {
    const { container } = render(<NotFoundFallback />);

    expect(container.innerHTML).not.toMatch(/zinc|gray-\d|slate|neutral/);
  });

  it('spins the picture only when motion is welcome, and hides it from assistive tech', () => {
    const { container } = render(<NotFoundFallback />);
    const spinner = container.querySelector('[aria-hidden="true"]') as HTMLElement;

    expect(spinner).toHaveClass('motion-safe:animate-spin');
    expect(spinner).not.toHaveClass('animate-spin');
  });
});
