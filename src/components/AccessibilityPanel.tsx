import { m } from 'motion/react';
import { RotateCcw } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { A11yKey } from '../contexts/useAccessibility';
import { a11yWidgetCopy, activeBadgeText } from './a11yWidgetCopy';
import { AccessibilityOptions, PANEL_FOCUS_RING } from './AccessibilityOptions';
import { AccessibilityPositionGroup } from './AccessibilityPositionGroup';
import { cn } from '../lib/utils';
import type { StepDirection, TabSide } from '../lib/floatingLayout';
import { EASE_OUT } from '../lib/motion';

// Below sm the panel grows upward from the trigger on the right edge. The trigger is 96px over max(16px, the bottom
// inset), so the panel (which ends where the trigger ends) has to be shorter than the window by that bottom offset plus
// a 16px margin under the top: 112px plus the same max(16px, inset). In px and not rem on purpose: the larger font grows the rem and would leave the list shorter than two
// options. A window shorter than 30rem (a phone on its side) centres the panel, and its 60px bottom margin keeps it
// off the bottom edge. The WhatsApp button has the bottom left corner, the opposite side.
const PANEL_BASE_CLASSES =
  'pointer-events-auto flex w-[min(13rem,calc(100vw-3.5rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/98 shadow-2xl backdrop-blur-none md:bg-zinc-950/95 md:backdrop-blur-xl';
// The default place: the size is capped by CSS from the default place of the tab. Once the visitor has moved the tab, the
// widget caps the height in px for the side it is on, and the box that holds the panel keeps the gap to the tab.
const PANEL_DEFAULT_CLASSES =
  'mr-2 max-h-[calc(100svh-112px-max(16px,env(safe-area-inset-bottom)))] sm:max-h-[calc(100svh-8rem)] [@media(max-height:30rem)]:mb-[60px] [@media(max-height:30rem)]:max-h-[calc(100svh-92px)]';
const SLIDE_IN_PX = 16;
const WILL_CHANGE = { willChange: 'transform, opacity' } as const;

interface PositionActions {
  toSide: (side: TabSide) => void;
  step: (direction: StepDirection) => void;
  reset: () => void;
}

interface AccessibilityPanelProps {
  id: string;
  state: Readonly<Record<A11yKey, boolean>>;
  activeCount: number;
  onToggle: (key: A11yKey) => void;
  onReset: () => void;
  /** The side of the screen the tab is on: the panel opens toward the inside. */
  side: TabSide;
  /** Set once the visitor has put the tab somewhere: the panel then takes a height in px instead of the default CSS. */
  maxHeightPx: number | null;
  position: PositionActions;
}

/**
 * The dialog with the six options. It is mounted only while open, so the first option takes the focus as it mounts.
 * tabIndex -1 lets a press on the header or the padding focus the panel itself, so the focus never leaves the widget
 * (which would close it) for a press that is inside it.
 */
export function AccessibilityPanel({ id, state, activeCount, onToggle, onReset, side, maxHeightPx, position }: AccessibilityPanelProps) {
  const firstOptionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstOptionRef.current?.focus({ preventScroll: true });
  }, []);

  // The reset button leaves with the options it resets (no option is on, so it is not shown), and a focused button that
  // unmounts drops the focus to the body while the dialog stays open. The first option takes it first.
  const handleReset = () => {
    firstOptionRef.current?.focus({ preventScroll: true });
    onReset();
  };

  const slide = side === 'left' ? -SLIDE_IN_PX : SLIDE_IN_PX;

  return (
    <m.div
      id={id}
      role="dialog"
      aria-label={a11yWidgetCopy.panelLabel}
      tabIndex={-1}
      initial={{ opacity: 0, x: slide, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: slide, scale: 0.95 }}
      transition={{ duration: 0.2, ease: EASE_OUT }}
      style={maxHeightPx === null ? WILL_CHANGE : { ...WILL_CHANGE, maxHeight: maxHeightPx }}
      className={cn(PANEL_BASE_CLASSES, maxHeightPx === null && PANEL_DEFAULT_CLASSES)}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-white/80">{a11yWidgetCopy.panelTitle}</span>
        {activeCount > 0 ? (
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium text-white">{activeBadgeText(activeCount)}</span>
        ) : null}
      </div>
      {/* The options and the position group scroll together, so a short window keeps room for the options. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <AccessibilityOptions state={state} onToggle={onToggle} firstOptionRef={firstOptionRef} />
        <AccessibilityPositionGroup {...position} />
      </div>
      {activeCount > 0 ? (
        <div className="shrink-0 border-t border-white/10 px-4 py-3">
          <button
            type="button"
            onClick={handleReset}
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
