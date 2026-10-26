import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Logo from './Logo';

describe('Logo', () => {
  it('uses the dark artwork on light backgrounds', () => {
    render(<Logo variant="onLight" />);

    const img = screen.getByAltText('VN One');
    expect(img.getAttribute('src')).toMatch(/\/brand\/vn-one-logo-dark\.webp$/);
  });

  it('uses the chrome artwork on dark backgrounds', () => {
    render(<Logo variant="onDark" />);

    const img = screen.getByAltText('VN One');
    expect(img.getAttribute('src')).toMatch(/\/brand\/vn-one-logo-chrome\.webp$/);
  });

  it.each(['onLight', 'onDark'] as const)('sets intrinsic width and height for %s', (variant) => {
    render(<Logo variant={variant} />);

    const img = screen.getByAltText('VN One');
    expect(Number(img.getAttribute('width'))).toBeGreaterThan(0);
    expect(Number(img.getAttribute('height'))).toBeGreaterThan(0);
  });

  it('decodes asynchronously and lets className control the displayed size', () => {
    render(<Logo variant="onDark" className="h-8 w-auto" />);

    const img = screen.getByAltText('VN One');
    expect(img).toHaveAttribute('decoding', 'async');
    expect(img).toHaveClass('h-8', 'w-auto');
  });
});
