import { animate, useInView } from 'motion/react';
import { useEffect, useRef } from 'react';
import { useMotionAllowed } from '../../hooks/useMotionAllowed';
import { parseStat } from '../../lib/format';
import { cn } from '../../lib/utils';

const MS_PER_SECOND = 1000;
const LOCALE = 'pt-BR';
// Matches the decimals of the written value ('1,5x' has one) so the count and the end state agree.
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
  const finalText = formatNumber(num, decimals);

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
        node.textContent = finalText;
      },
    });

    return () => controls.stop();
  }, [isInView, num, decimals, durationMs, finalText]);

  // role="img" is what makes the aria-label count on a span: assistive tech reads the final value once
  // while the counting pieces stay hidden. The number box reserves the width of the final text (a digit is
  // 1ch with tabular figures), so the suffix does not slide while it counts.
  return (
    <span ref={rootRef} role="img" aria-label={value} className={cn('inline-flex items-baseline tabular-nums', className)}>
      <span
        ref={numberRef}
        aria-hidden="true"
        className="inline-block text-right"
        style={{ minWidth: `${finalText.length}ch` }}
      >
        {formatNumber(0, decimals)}
      </span>
      {suffix ? <span aria-hidden="true">{suffix}</span> : null}
    </span>
  );
}
