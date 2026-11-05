import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { aboutCopy } from '../../data/aboutCopy';
import { FounderPhoto } from './FounderPhoto';
import { FOUNDER_PHOTO } from './founderPhotoSource';

const ALT = 'Retrato de Victor Nogueira';
const REM_PX = 16;

/** The width of the slot for a viewport width, from a sizes attribute made of (min-width: Npx) lengths and a last length. */
function slotWidth(sizes: string, viewport: number): number {
  const toPx = (length: string): number =>
    length.endsWith('vw')
      ? (parseFloat(length) * viewport) / 100
      : length.endsWith('rem')
        ? parseFloat(length) * REM_PX
        : parseFloat(length);
  for (const entry of sizes.split(',').map((item) => item.trim())) {
    const media = /^\(min-width:\s*(\d+)px\)\s+(\S+)$/.exec(entry);
    if (!media) return toPx(entry);
    if (viewport >= Number(media[1])) return toPx(media[2]);
  }
  throw new Error(`no length in sizes: ${sizes}`);
}

describe('FounderPhoto', () => {
  it('is a figure with the photo and a caption that names the founder and the company', () => {
    render(<FounderPhoto />);

    const figure = screen.getByRole('figure');

    expect(figure).toHaveTextContent('Victor Nogueira, fundador da VN One');
    expect(aboutCopy.photoCaption).toBe('Victor Nogueira, fundador da VN One');
    expect(figure.querySelector('figcaption')).toHaveTextContent(aboutCopy.photoCaption);
  });

  it('offers AVIF first and WebP as the image, with the intrinsic size so nothing shifts when it loads', () => {
    const { container } = render(<FounderPhoto />);

    const source = container.querySelector('picture > source');
    const image = screen.getByRole('img', { name: ALT });

    expect(source).toHaveAttribute('type', 'image/avif');
    expect(source).toHaveAttribute('srcset', FOUNDER_PHOTO.avifSrcSet);
    expect(image.parentElement?.tagName).toBe('PICTURE');
    expect(image).toHaveAttribute('srcset', FOUNDER_PHOTO.webpSrcSet);
    expect(image).toHaveAttribute('src', FOUNDER_PHOTO.fallbackSrc);
    expect(image).toHaveAttribute('width', String(FOUNDER_PHOTO.width));
    expect(image).toHaveAttribute('height', String(FOUNDER_PHOTO.height));
  });

  it('is the picture of the first fold of /sobre: eager and high priority, decoded off the main thread', () => {
    render(<FounderPhoto />);

    const image = screen.getByRole('img', { name: ALT });

    expect(image).toHaveAttribute('loading', 'eager');
    expect(image).toHaveAttribute('fetchpriority', 'high');
    expect(image).toHaveAttribute('decoding', 'async');
  });

  it('maps a phone to the 480 file on a normal screen and to the 960 file only on a dense one', () => {
    const { container } = render(<FounderPhoto />);
    const sizes = container.querySelector('source')?.getAttribute('sizes') ?? '';

    expect(screen.getByRole('img', { name: ALT })).toHaveAttribute('sizes', sizes);
    // What a browser does: the slot width the first matching condition gives, times the density, and the smallest file
    // that is at least that wide.
    const pickedFile = (viewport: number, density: number): number => {
      const slot = slotWidth(sizes, viewport);
      return FOUNDER_PHOTO.sizes.find((width) => width >= slot * density) ?? Math.max(...FOUNDER_PHOTO.sizes);
    };

    expect(pickedFile(320, 1)).toBe(480);
    expect(pickedFile(390, 1)).toBe(480);
    expect(pickedFile(390, 2)).toBe(960);
    expect(pickedFile(768, 1)).toBe(480);
    expect(pickedFile(1440, 1)).toBe(480);
    expect(pickedFile(1440, 2)).toBe(960);
  });

  it('describes the photo as a portrait, so the alt does not repeat the caption right below it', () => {
    render(<FounderPhoto />);

    const image = screen.getByRole('img', { name: ALT });

    expect(FOUNDER_PHOTO.alt).toBe(ALT);
    expect(image.getAttribute('alt')).not.toBe(aboutCopy.photoCaption);
    expect(aboutCopy.photoCaption).not.toContain(ALT);
  });

  it('has no color filter and no hover effect: a grayscale that clears on hover does not exist on touch', () => {
    const { container } = render(<FounderPhoto />);

    expect(container.innerHTML).not.toMatch(/grayscale|hover:|zinc|italic|shadow-2xl/);
  });

  it('is framed with the card radius, a 1px gray border, 8px of white and the 3px ink rule below', () => {
    render(<FounderPhoto />);

    const frame = screen.getByRole('figure').firstElementChild as HTMLElement;

    expect(frame).toHaveClass('rounded-card', 'border', 'border-vn-gray-light', 'bg-vn-white', 'p-2');
    expect(frame.querySelector('[aria-hidden="true"].bg-vn-ink')).not.toBeNull();
  });
});
