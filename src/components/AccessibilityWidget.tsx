import { AnimatePresence } from 'motion/react';
import { Accessibility } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState, type FocusEvent, type RefObject } from 'react';
import { useAccessibility } from '../contexts/useAccessibility';
import { cn } from '../lib/utils';
import { KEEPS_PLACE_UNDER_SCROLL_LOCK } from '../lib/scrollLock';
import { a11yWidgetCopy, activeSummaryText } from './a11yWidgetCopy';
import { AccessibilityPanel } from './AccessibilityPanel';
import { useBackdropIsDark } from './useBackdropIsDark';

// Mobile: the trigger sits on the right edge, 96px over the safe area (the owner wanted it well clear of the corner), and
// the panel grows upward from it. The WhatsApp button has the opposite side, the bottom left corner. From sm up the
// trigger is centred on the right edge. A phone on its side (height under 30rem, 480px; the rem of the media query is
// the browser's, so the larger font does not move it) is centred too, because there the list would be 8px tall.
// The wrapper takes no pointer (pointer-events-none): the 60px bottom margin of the panel on a short window is a
// transparent strip of this box. Only the panel and the trigger take the pointer.
const WRAPPER_CLASSES =
  `${KEEPS_PLACE_UNDER_SCROLL_LOCK} pointer-events-none fixed right-0 bottom-[calc(max(16px,env(safe-area-inset-bottom))+96px)] z-(--vn-z-widget) flex flex-row-reverse items-end sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:items-center [@media(max-height:30rem)]:bottom-auto [@media(max-height:30rem)]:top-1/2 [@media(max-height:30rem)]:-translate-y-1/2 [@media(max-height:30rem)]:items-center`;

interface Dismissal {
  onPointerDown: () => void;
  onBlur: (event: FocusEvent<HTMLElement>) => void;
}

/**
 * How the panel closes besides the trigger: Escape (the focus goes back to the trigger, since the focused option is
 * about to unmount), a press outside the widget, and the focus leaving the widget (a Tab out, or a click on something
 * else). A blur with no destination is not a leave while the pointer is pressing inside the widget (Safari does not focus a
 * button it is clicking) or while the window itself lost the focus.
 */
function useDismissal(
  isOpen: boolean,
  close: () => void,
  wrapperRef: RefObject<HTMLElement | null>,
  triggerRef: RefObject<HTMLButtonElement | null>,
): Dismissal {
  const isPressingInside = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      close();
      triggerRef.current?.focus();
    };
    const handlePress = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) close();
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handlePress);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handlePress);
    };
  }, [isOpen, close, wrapperRef, triggerRef]);

  const onPointerDown = () => {
    isPressingInside.current = true;
    // The blur of a press comes before the next task, so the flag is cleared after it.
    window.setTimeout(() => {
      isPressingInside.current = false;
    }, 0);
  };

  const onBlur = (event: FocusEvent<HTMLElement>) => {
    const next = event.relatedTarget as Node | null;
    if (next && event.currentTarget.contains(next)) return;
    if (!next && (isPressingInside.current || !document.hasFocus())) return;
    close();
  };

  return { onPointerDown, onBlur };
}

/**
 * The accessibility button and its panel, fixed to the right edge, in an aside named like the panel. The trigger is
 * first in the DOM (the row is reversed with flex-row-reverse, not mirrored with direction: rtl), so a Tab from it goes
 * into the panel, whose first option takes the focus when it opens. The panel is a dialog that does not trap the focus
 * (no aria-modal): it closes when the focus leaves, or on Escape, and the trigger gets the focus back on Escape.
 */
export default function AccessibilityWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { state, toggle, reset } = useAccessibility();
  const panelId = useId();
  const summaryId = useId();
  const close = useCallback(() => setIsOpen(false), []);
  const wrapperRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dismissal = useDismissal(isOpen, close, wrapperRef, triggerRef);
  const isDark = useBackdropIsDark(triggerRef);
  const activeCount = Object.values(state).filter(Boolean).length;

  // Safari does not focus a button it is clicking, so the trigger takes the focus itself when it closes the panel.
  const handleTriggerClick = () => {
    if (isOpen) triggerRef.current?.focus();
    setIsOpen(!isOpen);
  };

  return (
    <aside
      ref={wrapperRef}
      aria-label={a11yWidgetCopy.panelLabel}
      className={WRAPPER_CLASSES}
      onPointerDown={dismissal.onPointerDown}
      onBlur={dismissal.onBlur}
    >
      <AccessibilityTrigger
        buttonRef={triggerRef}
        isOpen={isOpen}
        isDark={isDark}
        panelId={panelId}
        summaryId={summaryId}
        activeCount={activeCount}
        onClick={handleTriggerClick}
      />
      {activeCount > 0 ? (
        <span id={summaryId} className="sr-only">
          {activeSummaryText(activeCount)}
        </span>
      ) : null}
      <AnimatePresence>
        {isOpen ? (
          <AccessibilityPanel id={panelId} state={state} activeCount={activeCount} onToggle={toggle} onReset={reset} />
        ) : null}
      </AnimatePresence>
    </aside>
  );
}

interface AccessibilityTriggerProps {
  buttonRef: RefObject<HTMLButtonElement | null>;
  isOpen: boolean;
  isDark: boolean;
  panelId: string;
  summaryId: string;
  activeCount: number;
  onClick: () => void;
}

/**
 * The button that opens the panel. Its name is constant (a contract of the e2e specs); aria-expanded says the state,
 * aria-controls points at the panel only while it exists, and the description says how many options are on, since the
 * count badge is decoration. The colors are the opposite of the page under it, and the focus ring follows them.
 */
function AccessibilityTrigger({ buttonRef, isOpen, isDark, panelId, summaryId, activeCount, onClick }: AccessibilityTriggerProps) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      aria-controls={isOpen ? panelId : undefined}
      aria-describedby={activeCount > 0 ? summaryId : undefined}
      aria-label={a11yWidgetCopy.triggerLabel}
      className={cn(
        'pointer-events-auto relative flex size-11 items-center justify-center rounded-l-xl shadow-lg transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2',
        isDark
          ? 'bg-white text-zinc-950 focus-visible:outline-white'
          : 'border border-zinc-200 bg-zinc-950 text-white focus-visible:outline-zinc-950',
      )}
    >
      <Accessibility className="size-5" aria-hidden="true" />
      {activeCount > 0 && !isOpen ? <CountBadge count={activeCount} isDark={isDark} /> : null}
    </button>
  );
}

interface CountBadgeProps {
  count: number;
  isDark: boolean;
}

/** The number of options that are on, on the corner of the trigger. Decoration: the description says it. */
function CountBadge({ count, isDark }: CountBadgeProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'absolute -top-1 right-0 flex size-5 items-center justify-center rounded-full text-xs font-bold',
        isDark ? 'bg-zinc-950 text-white' : 'border border-zinc-200 bg-white text-zinc-950',
      )}
    >
      {count}
    </span>
  );
}
