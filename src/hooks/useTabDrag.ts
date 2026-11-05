import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import {
  clampDragOffset,
  nearestSide,
  releasePosition,
  TAP_SLOP_PX,
  type Box,
  type Insets,
  type Size,
  type TabPosition,
  type TabSide,
} from '../lib/floatingLayout';

interface DragView {
  viewport: Size;
  insets: Insets;
}

interface UseTabDragOptions {
  triggerRef: RefObject<HTMLElement | null>;
  /** The fixed box that moves: it gets the transform while the pointer drags. */
  wrapperRef: RefObject<HTMLElement | null>;
  readView: () => DragView;
  /** The first move past the tap slop, with the box the tab had when the press began. */
  onStart?: (rect: Box) => void;
  /** While dragging: where the tab is drawn now and the side it would snap to, so the panel can follow. */
  onLive: (rect: Box, side: TabSide) => void;
  /** On release after a drag: the place to keep, and where the tab was drawn at that moment (for the slide). */
  onRelease: (position: TabPosition, from: Box) => void;
  /** A drag that ended without a choice (pointercancel, Escape, blur). */
  onCancel: () => void;
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  rect: Box;
  view: DragView;
  last: Box;
  moved: boolean;
}

const toBox = ({ left, top, width, height }: DOMRect): Box => ({ left, top, width, height });

export interface TabDrag {
  handlers: {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerCancel: () => void;
    onBlur: () => void;
  };
  /** True once, right after a drag ended: the click the browser fires on release must not toggle the panel. */
  takeSuppressedClick: () => boolean;
}

/** A press on the tab: where it began and the box the tab had. Null when the button is gone. */
function startDrag(event: ReactPointerEvent<HTMLElement>, options: UseTabDragOptions): DragState | null {
  const trigger = options.triggerRef.current;
  if (!trigger) return null;
  const rect = toBox(trigger.getBoundingClientRect());
  try {
    trigger.setPointerCapture(event.pointerId);
  } catch {
    // Without capture the drag still follows the pointer while it stays over the button.
  }
  return {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    rect,
    view: options.readView(),
    last: rect,
    moved: false,
  };
}

/** The pointer moved by (rawX, rawY) from where it pressed: past the tap slop it is a drag and the tab follows it. */
function moveDrag(state: DragState, rawX: number, rawY: number, options: UseTabDragOptions): void {
  const { triggerRef, wrapperRef, onStart, onLive } = options;
  if (!state.moved && Math.hypot(rawX, rawY) < TAP_SLOP_PX) return;
  if (!state.moved) {
    if (triggerRef.current) triggerRef.current.dataset.dragging = 'true';
    onStart?.(state.rect);
  }
  state.moved = true;
  const { dx, dy } = clampDragOffset({ rect: state.rect, dx: rawX, dy: rawY, ...state.view });
  if (wrapperRef.current) {
    wrapperRef.current.style.transition = 'none';
    wrapperRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
  }
  state.last = { ...state.rect, left: state.rect.left + dx, top: state.rect.top + dy };
  onLive(state.last, nearestSide(state.last.left + state.last.width / 2, state.view.viewport.width));
}

/** The drawing side of the end of a press: the transform goes (cancel) or the place is kept (release). */
function endDrag(state: DragState, isCancel: boolean, options: UseTabDragOptions): void {
  const { triggerRef, wrapperRef, onRelease, onCancel } = options;
  if (triggerRef.current) delete triggerRef.current.dataset.dragging;
  if (!state.moved) return;
  if (!isCancel) {
    onRelease(releasePosition(state.last, state.view.viewport), state.last);
    return;
  }
  if (wrapperRef.current) wrapperRef.current.style.transform = '';
  onCancel();
}

/** Escape anywhere on the page calls `onEscape`. */
function useEscapeKey(onEscape: () => void) {
  useEffect(() => {
    const listen = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onEscape();
    };
    document.addEventListener('keydown', listen);
    return () => document.removeEventListener('keydown', listen);
  }, [onEscape]);
}

/**
 * The click the browser fires on release must not toggle the panel after a drag. It comes in the same task as the
 * release, so the flag lives for one task. A drag cancelled with the pointer still down (Escape, blur) has no release
 * yet: the pointer is remembered and the flag is raised when that pointer is released, however late.
 */
function useClickSuppression() {
  const isSuppressed = useRef(false);
  const awaitingRelease = useRef<number | null>(null);

  const suppressNext = useCallback(() => {
    isSuppressed.current = true;
    window.setTimeout(() => {
      isSuppressed.current = false;
    }, 0);
  }, []);

  /** A new press on the tab: nothing from an earlier one is pending any more. */
  const startPress = useCallback((pointerId: number) => {
    isSuppressed.current = false;
    if (awaitingRelease.current === pointerId) awaitingRelease.current = null;
  }, []);

  /** A drag was cancelled while this pointer is still down. */
  const awaitRelease = useCallback((pointerId: number) => {
    awaitingRelease.current = pointerId;
  }, []);

  /** This pointer went up: if a cancelled drag was waiting for it, its click is swallowed. */
  const release = useCallback(
    (pointerId: number) => {
      if (awaitingRelease.current !== pointerId) return;
      awaitingRelease.current = null;
      suppressNext();
    },
    [suppressNext],
  );

  /** True once, right after a drag ended. */
  const take = useCallback(() => {
    const wasDrag = isSuppressed.current;
    isSuppressed.current = false;
    return wasDrag;
  }, []);

  return { suppressNext, startPress, awaitRelease, release, take };
}

/**
 * Drags the tab with a mouse, a finger or a pen (Pointer Events, pointer capture on the button). The tab follows the
 * pointer in real time with a transform on the wrapper only, held inside the window. A press that moves less than
 * TAP_SLOP_PX is a tap: nothing here runs and the click opens the panel. The page keeps its scroll: the browser is only
 * told to leave touches alone on the button itself (touch-none on the trigger).
 */
export function useTabDrag(options: UseTabDragOptions): TabDrag {
  const optionsRef = useRef(options);
  const stateRef = useRef<DragState | null>(null);
  const { suppressNext, startPress, awaitRelease, release, take } = useClickSuppression();

  useEffect(() => {
    optionsRef.current = options;
  });

  const finish = useCallback(
    (isCancel: boolean) => {
      const state = stateRef.current;
      if (!state) return;
      stateRef.current = null;
      if (state.moved && isCancel) awaitRelease(state.pointerId);
      if (state.moved && !isCancel) suppressNext();
      endDrag(state, isCancel, optionsRef.current);
    },
    [awaitRelease, suppressNext],
  );

  useEscapeKey(useCallback(() => finish(true), [finish]));

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (stateRef.current) return;
    startPress(event.pointerId);
    stateRef.current = startDrag(event, optionsRef.current);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const state = stateRef.current;
    if (!state || event.pointerId !== state.pointerId) return;
    moveDrag(state, event.clientX - state.startX, event.clientY - state.startY, optionsRef.current);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    if (stateRef.current?.pointerId === event.pointerId) finish(false);
    else release(event.pointerId);
  };

  return {
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: () => finish(true), onBlur: () => finish(true) },
    takeSuppressedClick: take,
  };
}
