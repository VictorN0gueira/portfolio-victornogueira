import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type KickerTone = 'light' | 'dark';

interface KickerProps {
  children: ReactNode;
  /** `light` for cream and white sections, `dark` for black ones. */
  tone?: KickerTone;
  className?: string;
}

const TONE_CLASSES: Record<KickerTone, string> = {
  light: 'text-vn-ink',
  dark: 'text-vn-white',
};

/** Mono caps label with the 64 by 3px rule below it, drawn in the text color at 40% opacity. */
export function Kicker({ children, tone = 'light', className }: KickerProps) {
  return (
    <p
      className={cn(
        'inline-flex flex-col gap-3 font-mono text-xs uppercase tracking-[.18em]',
        TONE_CLASSES[tone],
        className,
      )}
    >
      <span>{children}</span>
      <span aria-hidden="true" className="block h-[3px] w-[64px] bg-current opacity-40" />
    </p>
  );
}
