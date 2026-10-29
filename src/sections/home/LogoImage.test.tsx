import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { testimonials } from '../../data/testimonials';
import { initialsOf, LOGO_HEIGHT, LOGO_WIDTH, LogoImage, LogoPlate } from './LogoImage';

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

  it('always contains the logo in its box and never crops it: the files are already trimmed and sized', () => {
    const { container } = renderLogo();

    expect(container.querySelector('img')).toHaveClass('object-contain');
    expect(container.querySelector('img')).not.toHaveClass('object-cover');
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

describe('LogoImage canvas', () => {
  it('has a 2 to 1 canvas, the 1x size of the 384x192 files that scripts/process-client-logos.mjs writes', () => {
    expect(LOGO_WIDTH).toBe(192);
    expect(LOGO_HEIGHT).toBe(96);
    expect(LOGO_WIDTH / LOGO_HEIGHT).toBe(2);
  });
});

describe('LogoPlate', () => {
  const SRC_LOCAL = '/clients/contador-de-padarias.webp';
  const renderPlate = (props: Partial<Parameters<typeof LogoPlate>[0]> = {}) =>
    render(<LogoPlate src={SRC_LOCAL} name="Contador de Padarias" {...props} />);

  it('is a fixed 2 to 1 plate on the cream surface, so every logo sits in the same box', () => {
    const { container } = renderPlate();
    const plate = container.firstElementChild as HTMLElement;

    expect(plate).toHaveClass('h-20', 'w-40', 'shrink-0', 'rounded-xl', 'bg-vn-cream');
    expect(plate.querySelector('img')).toHaveClass('size-full', 'object-contain');
  });

  it('draws the logo as decorative, sized like the canvas, lazy and async, because the company name is written next to it', () => {
    const { container } = renderPlate();
    const img = container.querySelector('img') as HTMLImageElement;

    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('width', String(LOGO_WIDTH));
    expect(img).toHaveAttribute('height', String(LOGO_HEIGHT));
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('decoding', 'async');
  });

  it('tones the logo only when asked, because the tone needs a host that wakes it up', () => {
    const plain = renderPlate();
    expect(plain.container.querySelector('img')).not.toHaveClass('vn-logo-tone');
    plain.unmount();

    const toned = renderPlate({ isToned: true });
    expect(toned.container.querySelector('img')).toHaveClass('vn-logo-tone');
  });

  it('swaps the logo for the initials, hidden from assistive tech, inside the same plate', () => {
    const { container } = renderPlate();
    const plate = container.firstElementChild as HTMLElement;

    fireEvent.error(container.querySelector('img') as HTMLImageElement);

    const fallback = plate.querySelector('[data-logo-fallback]') as HTMLElement;
    expect(container.querySelector('img')).toBeNull();
    expect(fallback).toHaveTextContent('CP');
    expect(fallback).toHaveAttribute('aria-hidden', 'true');
    expect(fallback).toHaveClass('size-full');
  });
});

describe('initialsOf', () => {
  it.each([
    ['Contador de Padarias', 'CP'],
    [testimonials[1].company, 'LK'],
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
