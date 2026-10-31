import { m } from 'motion/react';
import { RotateCcw } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { A11yKey } from '../contexts/AccessibilityContext';
import { a11yWidgetCopy, activeBadgeText } from './a11yWidgetCopy';
import { AccessibilityOptions, PANEL_FOCUS_RING } from './AccessibilityOptions';
import { EASE_OUT } from '../lib/motion';

// Below sm the panel grows upward from the trigger on the right edge: 112px keeps 16px under the top and leaves the
// trigger below it. In px and not rem on purpose: the larger font grows the rem and would leave the list shorter than two
// options. A window shorter than 30rem (a phone on its side) centres the panel, and its 60px bottom margin keeps it
// off the bottom edge. The WhatsApp button has the bottom left corner, the opposite side.
const PANEL_CLASSES =
  'pointer-events-auto mr-2 flex w-[min(13rem,calc(100vw-3.5rem))] max-h-[calc(100svh-112px-env(safe-area-inset-bottom))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/98 shadow-2xl backdrop-blur-none sm:max-h-[calc(100svh-8rem)] md:bg-zinc-950/95 md:backdrop-blur-xl [@media(max-height:30rem)]:mb-[60px] [@media(max-height:30rem)]:max-h-[calc(100svh-92px)]';

interface AccessibilityPanelProps {
  id: string;
  state: Readonly<Record<A11yKey, boolean>>;
  activeCount: number;
  onToggle: (key: A11yKey) => void;
  onReset: () => void;
}

/**
 * The dialog with the six options. It is mounted only while open, so the first option takes the focus as it mounts.
 * tabIndex -1 lets a press on the header or the padding focus the panel itself, so the focus never leaves the widget
 * (which would close it) for a press that is inside it.
 */
export function AccessibilityPanel({ id, state, activeCount, onToggle, onReset }: AccessibilityPanelProps) {
  const firstOptionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstOptionRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <m.div
      id={id}
      role="dialog"
      aria-label={a11yWidgetCopy.panelLabel}
      tabIndex={-1}
      initial={{ opacity: 0, x: 16, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 16, scale: 0.95 }}
      transition={{ duration: 0.2, ease: EASE_OUT }}
      style={{ willChange: 'transform, opacity' }}
      className={PANEL_CLASSES}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-white/80">{a11yWidgetCopy.panelTitle}</span>
        {activeCount > 0 ? (
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium text-white">{activeBadgeText(activeCount)}</span>
        ) : null}
      </div>
      <AccessibilityOptions state={state} onToggle={onToggle} firstOptionRef={firstOptionRef} />
      {activeCount > 0 ? (
        <div className="shrink-0 border-t border-white/10 px-4 py-3">
          <button
            type="button"
            onClick={onReset}
            className={`flex min-h-11 w-full items-center justify-center gap-2 text-xs text-white/50 transition-colors hover:text-white/80 ${PANEL_FOCUS_RING}`}
          >
            <RotateCcw aria-hidden="true" className="size-3.5 shrink-0" />
            {a11yWidgetCopy.resetLabel}
          </button>
        </div>
      ) : null}
    </m.div>
  );
}
