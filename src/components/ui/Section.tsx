import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type SectionTone = 'cream' | 'white' | 'black';

interface SectionProps {
  id?: string;
  tone?: SectionTone;
  children: ReactNode;
  className?: string;
  /** Id of the heading that names the section, exposed as aria-labelledby. */
  labelledBy?: string;
}

const TONE_CLASSES: Record<SectionTone, string> = {
  cream: 'bg-vn-cream text-vn-ink',
  white: 'bg-vn-white text-vn-ink',
  black: 'bg-vn-black text-vn-white',
};

/**
 * A page section with the tone's background and text color and a fluid vertical rhythm.
 * `relative isolate` makes it a stacking context, so a ScanGrid inside it can sit at -z-10:
 * above the section background and below the content.
 * It also scopes z-index: a non-portal popover that overflows the bottom edge could paint under the
 * next section (Radix popovers portal to the body, so they are fine).
 */
export function Section({ id, tone = 'cream', children, className, labelledBy }: SectionProps) {
  return (
    <section
      id={id}
      data-tone={tone}
      aria-labelledby={labelledBy}
      className={cn('relative isolate py-[clamp(4rem,3rem+5vw,9rem)]', TONE_CLASSES[tone], className)}
    >
      {children}
    </section>
  );
}
