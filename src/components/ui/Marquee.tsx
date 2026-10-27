import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { useMotionAllowed } from '../../hooks/useMotionAllowed';
import { cn } from '../../lib/utils';

const DEFAULT_DURATION_S = 32;
// Anything a keyboard user can land on. The duplicate copy gets tabindex -1 on every match.
const FOCUSABLE_SELECTOR = 'a[href], area[href], button, input, select, textarea, summary, iframe, [tabindex], [contenteditable]';
// Each group ends with one trailing gap, so both groups have the same width and the loop has no seam.
// The space between items is --vn-marquee-gap: set it on the Marquee (className) to change it.
const GROUP_CLASS = 'flex shrink-0 items-center gap-[var(--vn-marquee-gap,2.5rem)] pr-[var(--vn-marquee-gap,2.5rem)]';

interface MarqueeProps {
  /** Names the region, so screen reader users know what the scrolling list is. */
  ariaLabel: string;
  /** Seconds one loop takes. */
  durationS?: number;
  className?: string;
  /** The items. Give it enough of them to be wider than the container, or a gap shows at the end of the loop. */
  children: ReactNode;
}

/**
 * Endless horizontal ticker. The children render twice inside one track that moves by half its width, so
 * the second copy (hidden from assistive tech, and out of the tab order) lands exactly where the first one
 * started. It pauses on hover and while focus is inside. The frame clips on x, so it never scrolls the page.
 * Without motion (system preference or the accessibility toggle) it renders a single copy in a wrapping row.
 * Needs AccessibilityProvider above it.
 */
export function Marquee({ ariaLabel, durationS = DEFAULT_DURATION_S, className, children }: MarqueeProps) {
  const isMotionAllowed = useMotionAllowed();
  const duplicateRef = useRef<HTMLDivElement>(null);

  // Runs after every render so focusable elements that appear later in the duplicate are caught too.
  useEffect(() => {
    duplicateRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR).forEach((element) => {
      element.setAttribute('tabindex', '-1');
    });
  });

  if (!isMotionAllowed) {
    return (
      <div
        role="region"
        aria-label={ariaLabel}
        className={cn('flex flex-wrap items-center gap-x-[var(--vn-marquee-gap,2.5rem)] gap-y-4', className)}
      >
        {children}
      </div>
    );
  }

  const trackStyle = { '--vn-marquee-duration': `${durationS}s` } as CSSProperties;

  return (
    <div role="region" aria-label={ariaLabel} className={cn('vn-marquee-frame', className)}>
      <div className="vn-marquee flex w-max" style={trackStyle}>
        <div className={GROUP_CLASS}>{children}</div>
        <div ref={duplicateRef} aria-hidden="true" className={GROUP_CLASS}>
          {children}
        </div>
      </div>
    </div>
  );
}
