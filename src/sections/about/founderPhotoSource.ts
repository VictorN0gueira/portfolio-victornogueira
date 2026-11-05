import { assetUrl } from '../../lib/asset';

// The files of public/founder, written by scripts/process-founder-photo.mjs from the 982x1024 original.
const SIZES = [480, 960] as const;
const srcSetOf = (format: 'avif' | 'webp'): string =>
  SIZES.map((size) => `${assetUrl(`/founder/victor-${size}.${format}`)} ${size}w`).join(', ');

/** The photo of the founder: the 960 file is the intrinsic size, so the browser knows the ratio before it loads. */
export const FOUNDER_PHOTO = {
  width: 960,
  height: 1001,
  sizes: SIZES,
  avifSrcSet: srcSetOf('avif'),
  webpSrcSet: srcSetOf('webp'),
  fallbackSrc: assetUrl('/founder/victor-960.webp'),
  alt: 'Victor Nogueira',
} as const;
