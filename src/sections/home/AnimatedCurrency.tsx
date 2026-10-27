import { animate } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useMotionAllowed } from '../../hooks/useMotionAllowed';
import { formatBRL } from '../../lib/format';
import { cn } from '../../lib/utils';
import { largestAmountWithDigitsOf } from './amountFit';

const COUNT_DURATION_S = 0.55;
// The design system easing, as the cubic bezier points motion expects.
const EASE_OUT = [0.22, 1, 0.36, 1] as const;
// Tabular figures keep every digit the same width, and the amount never wraps onto a second line. transition-none
// because the reduced motion reset of the site gives every element a near zero transition on every property: it holds
// the old font size for a frame, and the new, longer text would be drawn at it and spill out of its box.
const AMOUNT_CLASSES = 'tabular-nums whitespace-nowrap transition-none';

interface AnimatedCurrencyProps {
  /** An amount in whole reais. */
  value: number;
  /** Size, color and display: the component only adds tabular figures and no wrapping. */
  className?: string;
}

/**
 * An amount in reais that counts from the number on screen to its new value in 0.55s when `value` changes, and ends
 * on exactly formatBRL(value). The number on screen is capped at the digits of the new value (62.400 after 7.800.000
 * starts the count at 99.999), because the parent sizes the text to fit the final value and a longer number would
 * outgrow its box. On the first render it shows the value at once, it never counts up from zero.
 * Without motion (system preference or the accessibility toggle) it always shows the value as it comes, in the same
 * render. Only the text changes while it counts, so the box stays the same size (tabular figures, no wrapping).
 * It is hidden from assistive tech: its parent exposes the final values once, in a status region, instead of
 * having a screen reader read every digit of the count. Needs AccessibilityProvider above it.
 */
export function AnimatedCurrency({ value, className }: AnimatedCurrencyProps) {
  const isMotionAllowed = useMotionAllowed();

  if (!isMotionAllowed) {
    return (
      <span aria-hidden="true" className={cn(AMOUNT_CLASSES, className)}>
        {formatBRL(value)}
      </span>
    );
  }
  return <CountingCurrency value={value} className={className} />;
}

/**
 * The frames write the text straight to the DOM through a ref, so React never re-renders while it counts. The text
 * React renders never changes after mount (the first value), so React never overwrites a frame either.
 */
function CountingCurrency({ value, className }: AnimatedCurrencyProps) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const [initialText] = useState(() => formatBRL(value));
  // The number on screen right now: the next count starts from it (capped at the digits of the new value), also when
  // the last one was cut short.
  const shownRef = useRef(value);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node || shownRef.current === value) return undefined;

    const show = (amount: number) => {
      shownRef.current = amount;
      node.textContent = formatBRL(Math.round(amount));
    };
    // Written before the count starts, so no frame is painted with the old, longer text at the new, larger size.
    const start = Math.min(shownRef.current, largestAmountWithDigitsOf(value));
    show(start);
    const controls = animate(start, value, {
      duration: COUNT_DURATION_S,
      ease: EASE_OUT,
      onUpdate: show,
      onComplete: () => show(value),
    });
    return () => controls.stop();
  }, [value]);

  return (
    <span ref={nodeRef} aria-hidden="true" className={cn(AMOUNT_CLASSES, className)}>
      {initialText}
    </span>
  );
}

export default AnimatedCurrency;
