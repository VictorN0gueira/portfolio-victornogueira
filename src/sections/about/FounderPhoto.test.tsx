import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { aboutCopy } from '../../data/aboutCopy';
import { FounderPhoto } from './FounderPhoto';
import { FOUNDER_PHOTO } from './founderPhotoSource';

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
    const image = screen.getByRole('img', { name: 'Victor Nogueira' });

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

    const image = screen.getByRole('img', { name: 'Victor Nogueira' });

    expect(image).toHaveAttribute('loading', 'eager');
    expect(image).toHaveAttribute('fetchpriority', 'high');
    expect(image).toHaveAttribute('decoding', 'async');
  });

  it('gives the sizes of the column the photo sits in, so the browser does not pick the big file for a phone', () => {
    const { container } = render(<FounderPhoto />);

    expect(container.querySelector('source')).toHaveAttribute('sizes');
    expect(screen.getByRole('img', { name: 'Victor Nogueira' })).toHaveAttribute('sizes');
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
