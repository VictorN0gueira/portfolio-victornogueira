import { animate, useInView } from 'motion/react';
import { useEffect, useRef } from 'react';
import { useMotionAllowed } from '../../hooks/useMotionAllowed';
import { parseStat } from '../../lib/format';
import { cn } from '../../lib/utils';

const MS_PER_SECOND = 1000;
const LOCALE = 'pt-BR';
// Matches the decimals of the written value ('1,5x' has one), so the counting numbers have as many as the end text.
const DECIMALS_PATTERN = /^\d+[.,](\d+)/;

const easeOutCubic = (progress: number): number => 1 - (1 - progress) ** 3;

function countDecimals(value: string): number {
  return DECIMALS_PATTERN.exec(value)?.[1].length ?? 0;
}

function formatNumber(amount: number, decimals: number): string {
  return amount.toLocaleString(LOCALE, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

interface CountUpProps {
  /** A stat such as '500h+' or '85%'. The leading number counts up; the rest (the suffix) stays still. */
  value: string;
  durationMs?: number;
  className?: string;
}

/**
 * Counts a stat from 0 to its number when it enters the view. Values with no leading number, and any
 * value while motion is off (system preference or the accessibility toggle), render as the plain text.
 * The frames write the number straight to the DOM through a ref, so React never re-renders while it counts.
 * While counting the numbers use pt-BR separators; the count ends on the number exactly as written in
 * `value`, so the settled text always equals the no motion text.
 * Screen readers get the final value once, from a screen reader only copy; the counting pieces are hidden.
 * Needs AccessibilityProvider above it.
 */
export function CountUp({ value, durationMs = 1400, className }: CountUpProps) {
  const stat = parseStat(value);
  const isMotionAllowed = useMotionAllowed();

  if (!stat || !isMotionAllowed) {
    return <span className={className}>{value}</span>;
  }

  return <AnimatedCount value={value} num={stat.num} suffix={stat.suffix} durationMs={durationMs} className={className} />;
}

interface AnimatedCountProps {
  value: string;
  num: number;
  suffix: string;
  durationMs: number;
  className?: string;
}

function AnimatedCount({ value, num, suffix, durationMs, className }: AnimatedCountProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);
  const isInView = useInView(rootRef, { once: true });
  const decimals = countDecimals(value);
  const writtenNumber = value.slice(0, value.length - suffix.length);
  // The box fits the widest text it shows (the pt-BR grouped one may be longer than the written one),
  // so it does not jump when the count ends. A digit is 1ch with tabular figures.
  const boxWidthCh = Math.max(writtenNumber.length, formatNumber(num, decimals).length);

  useEffect(() => {
    const node = numberRef.current;
    if (!isInView || !node) return undefined;

    const controls = animate(0, num, {
      duration: durationMs / MS_PER_SECOND,
      ease: easeOutCubic,
      onUpdate: (latest) => {
        node.textContent = formatNumber(latest, decimals);
      },
      onComplete: () => {
        node.textContent = writtenNumber;
      },
    });

    return () => controls.stop();
  }, [isInView, num, decimals, durationMs, writtenNumber]);

  return (
    <span ref={rootRef} className={cn('relative inline-flex items-baseline tabular-nums', className)}>
      <span className="sr-only">{value}</span>
      <span ref={numberRef} aria-hidden="true" className="inline-block text-right" style={{ minWidth: `${boxWidthCh}ch` }}>
        {formatNumber(0, decimals)}
      </span>
      {suffix ? <span aria-hidden="true">{suffix}</span> : null}
    </span>
  );
}

export default CountUp;
