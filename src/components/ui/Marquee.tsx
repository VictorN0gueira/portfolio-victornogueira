import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { useMotionAllowed } from '../../hooks/useMotionAllowed';
import { cn } from '../../lib/utils';

const DEFAULT_DURATION_S = 32;
// Anything a keyboard user can land on. The duplicate copy gets tabindex -1 on every match.
const FOCUSABLE_SELECTOR = 'a[href], area[href], button, input, select, textarea, summary, iframe, [tabindex], [contenteditable]';
// Each group ends with one trailing gap, so both groups have the same width and the loop has no seam.
// The space between items is --vn-marquee-gap: set it on the Marquee (className) to change it.
const ROW_CLASS = 'flex flex-wrap items-center gap-x-[var(--vn-marquee-gap,2.5rem)] gap-y-4';
const GROUP_CLASS = 'flex shrink-0 items-center gap-[var(--vn-marquee-gap,2.5rem)] pr-[var(--vn-marquee-gap,2.5rem)]';

/** What the groups of items are: plain boxes, or lists (then the children must be `li`). */
type MarqueeGroupTag = 'div' | 'ul';

interface MarqueeProps {
  /** Names the region, so screen reader users know what the scrolling list is. */
  ariaLabel: string;
  /** Seconds one loop takes. */
  durationS?: number;
  className?: string;
  /**
   * The visitor's pause (WCAG 2.2.2), kept by the parent because the toggle that sets it lives outside the track.
   * It stops the loop through an inline animation-play-state (and `data-paused` for tests), so no stylesheet is involved. The pause
   * by hover stays as it was (tokens.css). Without motion there is no loop, so it has no effect.
   */
  isPaused?: boolean;
  /** `ul` renders each group as a list: the children are then `li` and the duplicate group is an aria-hidden list. */
  groupAs?: MarqueeGroupTag;
  /**
   * The items. Give it enough of them to be wider than the container, or a gap shows at the end of the
   * loop. They render twice, so they must not carry ids or local state that has to stay unique.
   */
  children: ReactNode;
}

/**
 * Endless horizontal ticker. The children render twice inside one track that moves by half its width, so
 * the second copy (hidden from assistive tech, and out of the tab order) lands exactly where the first one
 * started. It pauses on hover and while the parent says so (`isPaused`, from a PauseToggle: hover alone is no
 * control for a keyboard or a touch screen). The frame clips on x, so it never scrolls the page.
 * Without motion (system preference or the accessibility toggle) it renders a single copy in a wrapping row.
 *
 * Width contract: the frame has inline size containment (it reports a width of zero to its ancestors, so the
 * wide track cannot stretch them) and fills its parent with `w-full min-w-0 max-w-full`. Its parent must
 * therefore give it a definite width: a block parent, a `flex-1` or `w-full` wrapper, or a `1fr` grid track.
 * A shrink to fit parent collapses it to zero: an `inline-block` or `w-fit` box, an absolutely positioned box
 * without a width, a wrapper that is a `flex` item without `flex-1` or a width, an `auto` grid track that does
 * not stretch (`justify-content` other than normal). Placed directly in a flex row or in a stretching grid
 * track it keeps the full width. A consumer `className` such as `mx-auto max-w-4xl` wins over the three
 * width utilities.
 *
 * Needs AccessibilityProvider above it.
 */
export function Marquee({ ariaLabel, durationS = DEFAULT_DURATION_S, className, isPaused = false, groupAs = 'div', children }: MarqueeProps) {
  const isMotionAllowed = useMotionAllowed();

  if (!isMotionAllowed) {
    return (
      <StaticMarquee ariaLabel={ariaLabel} className={className} groupAs={groupAs}>
        {children}
      </StaticMarquee>
    );
  }

  return (
    <div role="region" aria-label={ariaLabel} className={cn('vn-marquee-frame w-full min-w-0 max-w-full', className)}>
      <MarqueeTrack durationS={durationS} isPaused={isPaused} groupAs={groupAs}>
        {children}
      </MarqueeTrack>
    </div>
  );
}

interface StaticMarqueeProps {
  ariaLabel: string;
  className?: string;
  groupAs: MarqueeGroupTag;
  children: ReactNode;
}

/** Without motion: one copy of the items in a wrapping row. With a list the row lives on the list, inside the region. */
function StaticMarquee({ ariaLabel, className, groupAs, children }: StaticMarqueeProps) {
  return (
    <div role="region" aria-label={ariaLabel} className={cn(groupAs === 'div' && ROW_CLASS, className)}>
      {groupAs === 'ul' ? (
        // role="list" on purpose: with list-style none, Safari with VoiceOver stops reading a ul as a list.
        <ul role="list" className={ROW_CLASS}>
          {children}
        </ul>
      ) : (
        children
      )}
    </div>
  );
}

interface MarqueeTrackProps {
  durationS: number;
  isPaused: boolean;
  groupAs: MarqueeGroupTag;
  children: ReactNode;
}

/** The moving track: the items twice, the second copy hidden from assistive tech and out of the tab order. */
function MarqueeTrack({ durationS, isPaused, groupAs, children }: MarqueeTrackProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const Group = groupAs;
  const listRole = groupAs === 'ul' ? 'list' : undefined;

  // Runs after every render so focusable elements that appear later in the duplicate are caught too.
  useEffect(() => {
    // The duplicate is the last group of the track.
    trackRef.current?.lastElementChild?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR).forEach((element) => {
      element.setAttribute('tabindex', '-1');
    });
  });

  // The pause is an inline style: the `animation` shorthand of .vn-marquee is outside every cascade layer, so it beats the
  // layered utilities of Tailwind (an arbitrary animation-play-state class never applied) and resets the play state.
  const trackStyle = {
    '--vn-marquee-duration': `${durationS}s`,
    ...(isPaused ? { animationPlayState: 'paused' } : {}),
  } as CSSProperties;

  return (
    <div ref={trackRef} className="vn-marquee flex w-max" style={trackStyle} data-paused={isPaused ? 'true' : undefined}>
      <Group role={listRole} className={GROUP_CLASS}>
        {children}
      </Group>
      <Group role={listRole} aria-hidden="true" className={GROUP_CLASS}>
        {children}
      </Group>
    </div>
  );
}
