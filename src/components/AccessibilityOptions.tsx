import { ALargeSmall, Contrast, Droplet, Pause, Type, Underline, type LucideIcon } from 'lucide-react';
import type { Ref } from 'react';
import type { A11yKey } from '../contexts/useAccessibility';
import { cn } from '../lib/utils';
import { a11yOptionLabels } from './a11yWidgetCopy';

// The brand fonts lack the arrow, half circle and pause glyphs the panel once used as icons: these are lucide icons.
const OPTION_ICONS: Readonly<Record<A11yKey, LucideIcon>> = {
  fontSize: ALargeSmall,
  highContrast: Contrast,
  grayscale: Droplet,
  noAnimations: Pause,
  underlineLinks: Underline,
  readableFont: Type,
};

const OPTION_KEYS = Object.keys(OPTION_ICONS) as A11yKey[];

/** The ring of a control on the dark panel. The offset is negative: the panel clips what lies outside it. */
export const PANEL_FOCUS_RING = 'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white';

interface AccessibilityOptionsProps {
  state: Readonly<Record<A11yKey, boolean>>;
  onToggle: (key: A11yKey) => void;
  /** Receives the first option, which the panel focuses when it opens. */
  firstOptionRef: Ref<HTMLButtonElement>;
}

/** The six switches, each a button with aria-pressed and at least 44px tall. */
export function AccessibilityOptions({ state, onToggle, firstOptionRef }: AccessibilityOptionsProps) {
  return (
    <ul className="py-1">
      {OPTION_KEYS.map((key, position) => {
        const Icon = OPTION_ICONS[key];
        const isActive = state[key];
        return (
          <li key={key}>
            <button
              ref={position === 0 ? firstOptionRef : undefined}
              type="button"
              onClick={() => onToggle(key)}
              aria-pressed={isActive}
              className={cn(
                'flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors sm:py-2.5',
                PANEL_FOCUS_RING,
                isActive ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/8 hover:text-white/90',
              )}
            >
              <Icon aria-hidden="true" className="size-5 shrink-0" />
              <span>{a11yOptionLabels[key]}</span>
              {isActive ? <span className="ml-auto size-1.5 shrink-0 rounded-full bg-white" aria-hidden="true" /> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
