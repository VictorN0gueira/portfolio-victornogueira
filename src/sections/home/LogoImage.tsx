import { useState } from 'react';
import { cn } from '../../lib/utils';

type LogoFit = 'contain' | 'cover';

// Connectors of Brazilian company names: they do not give a letter to the initials.
const CONNECTORS = /^(de|da|do|das|dos|e)$/i;
const MAX_INITIALS = 2;

/** Up to two capital letters from a company name: its first two words, leaving out de, da, do, das, dos and e. */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter((word) => word !== '' && !CONNECTORS.test(word))
    .slice(0, MAX_INITIALS)
    .map((word) => Array.from(word)[0].toLocaleUpperCase('pt-BR'))
    .join('');
}

interface LogoImageProps {
  src: string;
  /** The company name: the alt text of the logo, and the text of the fallback. */
  name: string;
  /** True where the name is already written next to the logo: the alt is empty and the fallback shows the initials. */
  isDecorative?: boolean;
  /** `cover` for logos that bring their own opaque background. */
  fit?: LogoFit;
  width: number;
  height: number;
  /** Size and tone classes. The img and its fallback both take them, so the box never changes when the image fails. */
  className?: string;
}

/**
 * A client logo from a remote server. If the image fails to load it is replaced, in the same box, by the company name
 * as text (or by its initials, hidden from assistive tech, when the name is already on the page), so the visitor never
 * sees a broken image icon and nothing around it shifts. A new `src` is tried again.
 */
export function LogoImage({ src, name, isDecorative = false, fit = 'contain', width, height, className }: LogoImageProps) {
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

  // The same logos run on the live site with no-referrer (src/components/SocialProof.tsx), so it is known to load them.
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
      className={cn(fit === 'cover' ? 'object-cover' : 'object-contain', className)}
    />
  );
}

export default LogoImage;
