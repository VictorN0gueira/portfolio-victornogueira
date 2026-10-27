import type { JSX, ReactNode } from 'react';
import { useFinePointer } from '../../hooks/useFinePointer';
import { useMotionAllowed } from '../../hooks/useMotionAllowed';
import { usePointerSpotlight } from '../../hooks/usePointerSpotlight';
import { cn } from '../../lib/utils';

type SpotlightCardTone = 'light' | 'dark';

interface SpotlightCardProps {
  /** The tag to render. Intrinsic tags only, so the ref and the pointer handler that drive the glow reach the element. */
  as?: keyof JSX.IntrinsicElements;
  /** `dark` for cards on black sections: the glow turns white instead of ink. */
  tone?: SpotlightCardTone;
  className?: string;
  children?: ReactNode;
}

/**
 * Card with a glow that follows the cursor and a ring that rotates around its edge on hover and focus.
 * The effects are drawn by `.vn-spotlight` in tokens.css, only on a fine pointer with motion allowed; on
 * touch and under reduced motion the card is static. This component also stops writing the pointer
 * variables (--mx and --my) in those cases, so nothing runs for an effect that cannot show.
 * Radius, padding and surface come from the className. Needs AccessibilityProvider above it.
 */
export function SpotlightCard({ as = 'article', tone = 'light', className, children }: SpotlightCardProps) {
  // Typed as div only to keep TypeScript from building a union of every tag: all of them accept these props.
  const Tag = as as 'div';
  const { ref, onPointerMove } = usePointerSpotlight<HTMLDivElement>();
  const isFinePointer = useFinePointer();
  const isMotionAllowed = useMotionAllowed();

  return (
    <Tag
      ref={ref}
      onPointerMove={isFinePointer && isMotionAllowed ? onPointerMove : undefined}
      className={cn('vn-spotlight relative isolate', tone === 'dark' && 'vn-spotlight--dark', className)}
    >
      {children}
    </Tag>
  );
}

export default SpotlightCard;
