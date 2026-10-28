import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { initialsOf, LogoImage } from './LogoImage';

const SRC = 'https://example.test/logo.png';

function renderLogo(props: Partial<Parameters<typeof LogoImage>[0]> = {}) {
  return render(<LogoImage src={SRC} name="Contador de Padarias" width={56} height={56} className="size-full" {...props} />);
}

describe('LogoImage', () => {
  it('draws an img with its size, lazy loading, async decoding and no referrer', () => {
    const { container } = renderLogo();
    const img = container.querySelector('img') as HTMLImageElement;

    expect(img).toHaveAttribute('src', SRC);
    expect(img).toHaveAttribute('width', '56');
    expect(img).toHaveAttribute('height', '56');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('decoding', 'async');
    expect(img).toHaveAttribute('referrerpolicy', 'no-referrer');
  });

  it('names the logo with the partner name by default', () => {
    renderLogo();

    expect(screen.getByRole('img', { name: 'Contador de Padarias' })).toBeInTheDocument();
  });

  it('has an empty alt when decorative, because the company name is already next to it', () => {
    const { container } = renderLogo({ isDecorative: true });

    expect(container.querySelector('img')).toHaveAttribute('alt', '');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('contains the logo by default and covers its box when asked', () => {
    const contained = renderLogo();
    expect(contained.container.querySelector('img')).toHaveClass('object-contain');
    expect(contained.container.querySelector('img')).not.toHaveClass('object-cover');
    contained.unmount();

    const covered = renderLogo({ fit: 'cover' });
    expect(covered.container.querySelector('img')).toHaveClass('object-cover');
    expect(covered.container.querySelector('img')).not.toHaveClass('object-contain');
  });

  it('puts the className of the caller on the img', () => {
    const { container } = renderLogo({ className: 'h-12 w-full vn-logo-tone' });

    expect(container.querySelector('img')).toHaveClass('h-12', 'w-full', 'vn-logo-tone');
  });

  describe('when the image fails to load', () => {
    it('swaps the img for the name as text, in the same box and with the same classes, so nothing shifts', () => {
      const { container } = renderLogo({ className: 'h-12 w-full vn-logo-tone' });

      fireEvent.error(container.querySelector('img') as HTMLImageElement);

      expect(container.querySelector('img')).toBeNull();
      const fallback = container.querySelector('[data-logo-fallback]') as HTMLElement;
      expect(fallback).toHaveTextContent('Contador de Padarias');
      expect(fallback).toHaveClass('h-12', 'w-full', 'vn-logo-tone');
      expect(fallback).not.toHaveAttribute('aria-hidden');
    });

    it('shows the initials, hidden from assistive tech, when the logo is decorative', () => {
      const { container } = renderLogo({ isDecorative: true });

      fireEvent.error(container.querySelector('img') as HTMLImageElement);

      const fallback = container.querySelector('[data-logo-fallback]') as HTMLElement;
      expect(fallback).toHaveTextContent('CP');
      expect(fallback).toHaveAttribute('aria-hidden', 'true');
    });

    it('keeps every class the fallback is built from, none dropped by tailwind-merge: size, weight, alignment and ink', () => {
      const initials = renderLogo({ isDecorative: true, className: 'size-full vn-logo-tone' });
      fireEvent.error(initials.container.querySelector('img') as HTMLImageElement);
      expect(initials.container.querySelector('[data-logo-fallback]')).toHaveClass(
        'grid', 'place-items-center', 'overflow-hidden', 'text-center', 'text-vn-ink', 'font-display', 'text-lg', 'font-bold', 'size-full', 'vn-logo-tone',
      );
      initials.unmount();

      const named = renderLogo({ className: 'h-12 w-full vn-logo-tone' });
      fireEvent.error(named.container.querySelector('img') as HTMLImageElement);
      expect(named.container.querySelector('[data-logo-fallback]')).toHaveClass(
        'grid', 'place-items-center', 'overflow-hidden', 'text-center', 'text-vn-ink', 'break-words', 'text-xs', 'leading-snug', 'h-12', 'w-full', 'vn-logo-tone',
      );
    });

    it('draws no broken image icon: nothing with a src is left', () => {
      const { container } = renderLogo();

      fireEvent.error(container.querySelector('img') as HTMLImageElement);

      expect(container.querySelectorAll('[src]')).toHaveLength(0);
    });

    it('tries again when the src changes', () => {
      const { container, rerender } = renderLogo();

      fireEvent.error(container.querySelector('img') as HTMLImageElement);
      rerender(<LogoImage src="https://example.test/other.png" name="Contador de Padarias" width={56} height={56} />);

      expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.test/other.png');
    });
  });
});

describe('initialsOf', () => {
  it.each([
    ['Contador de Padarias', 'CP'],
    ['Loja Karla Alvarés', 'LK'],
    ['Henrique França', 'HF'],
    ['ShipSmart', 'S'],
    ['Mercadinho Irmão Cruz', 'MI'],
    ['Contas IC', 'CI'],
    ['Casa da Maria e do João', 'CM'],
    ['  Criativa   Marketing ', 'CM'],
    ['Álvaro Éder', 'ÁÉ'],
    ['', ''],
  ])('turns %j into %j', (name, initials) => {
    expect(initialsOf(name)).toBe(initials);
  });
});
