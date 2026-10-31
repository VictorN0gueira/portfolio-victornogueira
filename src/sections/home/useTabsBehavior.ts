import {
  useCallback,
  useEffect,
  useRef,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from 'react';

/**
 * How long each use case tab stays selected while the rotation runs. A panel holds a title, a paragraph and three steps
 * (about fifty words), so it needs this long to be read; the test kit reads the same constant.
 */
export const ROTATE_MS = 9000;

const COARSE_POINTER_QUERY = '(pointer: coarse)';

/**
 * True when the main pointer is a finger. A touch screen has no hover to hold the rotation under, so the rotation
 * starts paused there and the visitor starts it with the toggle. Read once, when the widget mounts.
 */
export function startsOnCoarsePointer(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(COARSE_POINTER_QUERY).matches;
}

/** Marks an element inside the held area that must never hold the cycle (the pause toggle). */
export const HOLD_EXEMPT_ATTRIBUTE = 'data-hold-exempt';
const HOLD_EXEMPT_SELECTOR = `[${HOLD_EXEMPT_ATTRIBUTE}]`;

type HoldKind = 'pointer' | 'focus';

function isExempt(target: EventTarget): boolean {
  return target instanceof Element && target.closest(HOLD_EXEMPT_SELECTOR) !== null;
}

/**
 * True when the focus on the target is the kind that shows a focus ring: the keyboard. A click or a tap that focuses the
 * tabindex 0 panel is not, so it must not hold the cycle (nothing would end that hold but a blur). Where the selector
 * is not supported (or throws), the focus counts, which is the safe side: the cycle holds.
 */
export function matchesFocusVisible(target: EventTarget): boolean {
  if (!(target instanceof Element)) return true;
  try {
    return target.matches(':focus-visible');
  } catch {
    return true;
  }
}

interface HoldHandlers {
  onPointerOver: (event: PointerEvent<HTMLElement>) => void;
  onPointerLeave: () => void;
  onFocus: (event: FocusEvent<HTMLElement>) => void;
  onBlur: (event: FocusEvent<HTMLElement>) => void;
}

/**
 * Handlers for the area that holds the cycle while the pointer is over it or the focus is inside it.
 * The two holds are kept apart and the cycle resumes only when both are off, so leaving with the pointer
 * while the focus is still inside keeps it held.
 * The pause toggle sits inside the area but is exempt: the pointer or the focus on it never holds, and moving
 * from the content onto it lets go at once. Only a focus that shows a ring (the keyboard) holds; a click that
 * focuses the panel does not. The pointer is read from pointerover (it bubbles, so every move
 * between two children re-reads it) and the focus from focus, which also bubbles. A blur that moves the focus
 * to another element inside the area does not let go, so there is no resume followed by a pause.
 */
export function useCycleHold(pause: () => void, resume: () => void): HoldHandlers {
  const holds = useRef<Record<HoldKind, boolean>>({ pointer: false, focus: false });

  const setHold = useCallback(
    (kind: HoldKind, isOn: boolean) => {
      if (holds.current[kind] === isOn) return;
      holds.current = { ...holds.current, [kind]: isOn };
      if (holds.current.pointer || holds.current.focus) pause();
      else resume();
    },
    [pause, resume],
  );

  return {
    onPointerOver: (event) => setHold('pointer', !isExempt(event.target)),
    onPointerLeave: () => setHold('pointer', false),
    onFocus: (event) => setHold('focus', !isExempt(event.target) && matchesFocusVisible(event.target)),
    onBlur: (event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setHold('focus', false);
    },
  };
}

// The room the tablist leaves around the tabs, so a focus ring is not clipped by its scroll box.
const LIST_EDGE_PX = 6;

/**
 * Brings the tab into view by scrolling the tablist itself, never the page (scrollIntoView could scroll the page
 * vertically). It aligns the tab to the start edge, which is where scroll snap rests, so the snap does not
 * move it again; near the end of the list the browser clamps that to the last scroll position.
 * The tablist is the offset parent of its tabs, so offsetLeft is measured inside it.
 */
function revealTab(list: HTMLElement, tab: HTMLElement): void {
  const start = tab.offsetLeft - LIST_EDGE_PX;
  const end = tab.offsetLeft + tab.offsetWidth + LIST_EDGE_PX;
  const isHidden = start < list.scrollLeft || end > list.scrollLeft + list.clientWidth;
  if (isHidden) list.scrollLeft = start;
}

/** Where a key sends the selection from the tab at `current`, or null for a key the tabs do not handle. */
function targetTabIndex(key: string, current: number, count: number): number | null {
  switch (key) {
    case 'ArrowRight':
      return (current + 1) % count;
    case 'ArrowLeft':
      return (current - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}

export interface TabListControls {
  listRef: RefObject<HTMLDivElement | null>;
  registerTab: (position: number, element: HTMLButtonElement | null) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

/**
 * The keyboard and the scroll of a row of tabs. The arrows (with wrap), Home and End move the focus and
 * select, from the tab that has the focus. Whenever the selected tab changes, by the rotation or by the visitor,
 * the tablist scrolls it into view; only the keyboard moves the focus, and without scrolling the page.
 */
export function useTabListControls(
  selectedIndex: number,
  count: number,
  onSelect: (index: number) => void,
): TabListControls {
  const listRef = useRef<HTMLDivElement>(null);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const list = listRef.current;
    const tab = tabs.current[selectedIndex];
    if (list && tab) revealTab(list, tab);
  }, [selectedIndex]);

  const registerTab = useCallback((position: number, element: HTMLButtonElement | null) => {
    tabs.current[position] = element;
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const current = tabs.current.findIndex((tab) => tab === event.target);
    if (current === -1 || event.altKey || event.ctrlKey || event.metaKey) return;
    const next = targetTabIndex(event.key, current, count);
    if (next === null) return;

    event.preventDefault();
    onSelect(next);
    tabs.current[next]?.focus({ preventScroll: true });
  };

  return { listRef, registerTab, onKeyDown };
}

/** The id of the tab of a use case, which the panel points at with aria-labelledby. */
export function tabIdFor(idBase: string, useCaseId: string): string {
  return `${idBase}-tab-${useCaseId}`;
}
