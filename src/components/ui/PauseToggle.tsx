import { Pause, Play } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

/** `dark` for a dark surface (a window title bar), `light` for cream and white sections. */
export type PauseToggleTone = 'dark' | 'light';

// The look of each tone: the focus ring that shows on its surface, the icon button inside the hit area and the icon size.
const TONE_CLASSES: Record<PauseToggleTone, { ring: string; disc: string; icon: string }> = {
  dark: {
    ring: 'focus-visible:outline-2 focus-visible:outline-vn-white',
    disc: 'size-7 border-vn-gray-mid text-vn-gray-light group-hover:bg-vn-gray-dark',
    icon: 'size-3.5',
  },
  light: {
    ring: 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vn-ink',
    disc: 'size-9 border-vn-gray-light text-vn-ink group-hover:border-vn-ink group-hover:bg-vn-cream',
    icon: 'size-4',
  },
};

type PassThroughProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'onClick' | 'children' | 'aria-label' | 'aria-pressed'
>;

interface PauseToggleProps extends PassThroughProps {
  /** The visitor's own pause. A hold by the pointer or the focus is not shown here. */
  isPaused: boolean;
  /** The constant accessible name. It never changes with the state: aria-pressed carries that. */
  label: string;
  onToggle: () => void;
  tone: PauseToggleTone;
}

/**
 * Pauses and resumes something that moves by itself (WCAG 2.2.2). A toggle: its name stays the same and
 * aria-pressed carries the state; only the icon changes (pause, then play), and assistive tech skips it.
 * The icon button is drawn inside a 44px hit area with a focus ring that shows on the surface of its tone.
 * Everything else (a margin, a data attribute) comes through className and the rest of the props.
 */
export function PauseToggle({ isPaused, label, onToggle, tone, className, ...rest }: PauseToggleProps) {
  const Icon = isPaused ? Play : Pause;
  const look = TONE_CLASSES[tone];

  return (
    <button
      {...rest}
      type="button"
      aria-pressed={isPaused}
      aria-label={label}
      onClick={onToggle}
      className={cn('group grid size-11 shrink-0 cursor-pointer place-items-center rounded-full', look.ring, className)}
    >
      <span className={cn('grid place-items-center rounded-full border', look.disc)}>
        <Icon aria-hidden="true" className={look.icon} />
      </span>
    </button>
  );
}

export default PauseToggle;
