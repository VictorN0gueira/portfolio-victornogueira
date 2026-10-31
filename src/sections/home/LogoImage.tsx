import { useState } from 'react';
import { cn } from '../../lib/utils';
import { initialsOf } from './logoInitials';

// The 1x size of the logo files in public/clients: 2:1 canvases of 384x192 (2x, for high density screens) that
// scripts/process-client-logos.mjs writes, each logo trimmed and sized on its own so all of them weigh the same.
export const LOGO_WIDTH = 192;
export const LOGO_HEIGHT = 96;

interface LogoImageProps {
  src: string;
  /** The company name: the alt text of the logo, and the text of the fallback. */
  name: string;
  /** True where the name is already written next to the logo: the alt is empty and the fallback shows the initials. */
  isDecorative?: boolean;
  width: number;
  height: number;
  /** Size and tone classes. The img and its fallback both take them, so the box never changes when the image fails. */
  className?: string;
}

/**
 * A client logo. If the image fails to load it is replaced, in the same box, by the company name as text (or by its
 * initials, hidden from assistive tech, when the name is already on the page), so the visitor never sees a broken image
 * icon and nothing around it shifts. A new `src` is tried again. The logo is always contained, never cropped.
 */
export function LogoImage({ src, name, isDecorative = false, width, height, className }: LogoImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (failedSrc === src) {
    return (
      <span
        data-logo-fallback=""
        aria-hidden={isDecorative ? 'true' : undefined}
        className={cn(
          'grid place-items-center overflow-hidden text-center text-vn-ink',
          isDecorative ? 'font-display text-lg font-bold' : 'break-words text-xs leading-snug',
          className,
        )}
      >
        {isDecorative ? initialsOf(name) : name}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={isDecorative ? '' : name}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(src)}
      className={cn('object-contain', className)}
    />
  );
}

interface LogoPlateProps {
  src: string;
  /** The company name, used for the initials of the fallback. The logo is decorative: the name is written next to it. */
  name: string;
  /** True inside a host of the logo tone (see .vn-logo-tone): the logo rests gray and takes its color on hover. */
  isToned?: boolean;
}

/**
 * The logo of a testimonial on a fixed 2:1 plate of the cream surface, the same box for every company, so the logos
 * that were trimmed and sized by the script sit in the same frame instead of floating in a box of their own.
 */
export function LogoPlate({ src, name, isToned = false }: LogoPlateProps) {
  return (
    <div className="h-20 w-40 shrink-0 overflow-hidden rounded-xl bg-vn-cream">
      <LogoImage
        src={src}
        name={name}
        isDecorative
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        className={cn('size-full', isToned && 'vn-logo-tone')}
      />
    </div>
  );
}
