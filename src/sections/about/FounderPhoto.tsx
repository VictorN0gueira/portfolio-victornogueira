import { aboutCopy } from '../../data/aboutCopy';
import { FOUNDER_PHOTO } from './founderPhotoSource';

// The photo is the width of its column: the whole row up to 28rem on a phone, 28rem at md and the aside column
// (5 of 12, at most 480px) from lg. The browser picks the 480 or the 960 file from it and from the pixel density.
const SIZES = '(min-width: 1024px) 480px, (min-width: 480px) 448px, 100vw';

/**
 * The founder in a frame: the card radius, a 1px gray border, 8px of white around the photo and the 3px ink rule below
 * it (the signature of the method cards), with the caption in mono. It is the picture of the first fold of /sobre from
 * lg, so it loads right away. No color filter and no hover effect: nothing in it depends on a pointer.
 */
export function FounderPhoto() {
  return (
    <figure className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
      <div className="rounded-card border border-vn-gray-light bg-vn-white p-2">
        <picture>
          <source type="image/avif" srcSet={FOUNDER_PHOTO.avifSrcSet} sizes={SIZES} />
          <img
            src={FOUNDER_PHOTO.fallbackSrc}
            srcSet={FOUNDER_PHOTO.webpSrcSet}
            sizes={SIZES}
            width={FOUNDER_PHOTO.width}
            height={FOUNDER_PHOTO.height}
            alt={FOUNDER_PHOTO.alt}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="block h-auto w-full rounded-[calc(var(--radius-card)-0.5rem)]"
          />
        </picture>
        <span aria-hidden="true" className="mx-2 mt-3 mb-1 block h-[3px] bg-vn-ink" />
      </div>
      <figcaption className="mt-3 font-mono text-xs text-vn-gray-dark">{aboutCopy.photoCaption}</figcaption>
    </figure>
  );
}
