import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Logo, { LOGO_HEIGHT, LOGO_WIDTH } from './Logo';

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
    expect(Number(img.getAttribute('width'))).toBe(LOGO_WIDTH);
    expect(Number(img.getAttribute('height'))).toBe(LOGO_HEIGHT);
  });

  it('loads eagerly by default', () => {
    render(<Logo variant="onDark" />);

    expect(screen.getByAltText('VN One')).toHaveAttribute('loading', 'eager');
  });

  it('can be lazy loaded', () => {
    render(<Logo variant="onDark" loading="lazy" />);

    expect(screen.getByAltText('VN One')).toHaveAttribute('loading', 'lazy');
  });

  it('can be decorative, hidden from assistive tech with an empty alt', () => {
    const { container } = render(<Logo variant="onDark" decorative />);

    const img = container.querySelector('img');
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByAltText('VN One')).not.toBeInTheDocument();
  });

  it('is exposed to assistive tech by default', () => {
    render(<Logo variant="onDark" />);

    expect(screen.getByAltText('VN One')).not.toHaveAttribute('aria-hidden');
  });

  it('decodes asynchronously and lets className control the displayed size', () => {
    render(<Logo variant="onDark" className="h-8 w-auto" />);

    const img = screen.getByAltText('VN One');
    expect(img).toHaveAttribute('decoding', 'async');
    expect(img).toHaveClass('h-8', 'w-auto');
  });
});
