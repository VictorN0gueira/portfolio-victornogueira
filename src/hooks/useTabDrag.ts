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

/**
 * Drags the tab with a mouse, a finger or a pen (Pointer Events, pointer capture on the button). The tab follows the
 * pointer in real time with a transform on the wrapper only, held inside the window. A press that moves less than
 * TAP_SLOP_PX is a tap: nothing here runs and the click opens the panel. The page keeps its scroll: the browser is only
 * told to leave touches alone on the button itself (touch-none on the trigger).
 */
export function useTabDrag(options: UseTabDragOptions): TabDrag {
  const optionsRef = useRef(options);
  const stateRef = useRef<DragState | null>(null);
  const suppressClick = useRef(false);
  // A drag cancelled with the pointer still down: when it is released, however late, the browser fires a click on the
  // button (the pointer is captured there) and that click must not toggle the panel.
  const awaitingRelease = useRef<number | null>(null);

  useEffect(() => {
    optionsRef.current = options;
  });

  const suppressNextClick = useCallback(() => {
    suppressClick.current = true;
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 0);
  }, []);

  const finish = useCallback(
    (isCancel: boolean) => {
      const state = stateRef.current;
      if (!state) return;
      stateRef.current = null;
      const { triggerRef, wrapperRef, onRelease, onCancel } = optionsRef.current;
      if (triggerRef.current) delete triggerRef.current.dataset.dragging;
      if (!state.moved) return;
      suppressNextClick();
      if (isCancel) {
        awaitingRelease.current = state.pointerId;
        if (wrapperRef.current) wrapperRef.current.style.transform = '';
        onCancel();
      } else {
        onRelease(releasePosition(state.last, state.view.viewport), state.last);
      }
    },
    [suppressNextClick],
  );

  useEffect(() => {
    const cancelOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish(true);
    };
    document.addEventListener('keydown', cancelOnEscape);
    return () => document.removeEventListener('keydown', cancelOnEscape);
  }, [finish]);

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (stateRef.current) return;
    const trigger = optionsRef.current.triggerRef.current;
    if (!trigger) return;
    suppressClick.current = false;
    awaitingRelease.current = null;
    const rect = toBox(trigger.getBoundingClientRect());
    stateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      rect,
      view: optionsRef.current.readView(),
      last: rect,
      moved: false,
    };
    try {
      trigger.setPointerCapture(event.pointerId);
    } catch {
      // Without capture the drag still follows the pointer while it stays over the button.
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const state = stateRef.current;
    const { triggerRef, wrapperRef, onLive } = optionsRef.current;
    if (!state || event.pointerId !== state.pointerId) return;
    const rawX = event.clientX - state.startX;
    const rawY = event.clientY - state.startY;
    if (!state.moved && Math.hypot(rawX, rawY) < TAP_SLOP_PX) return;
    if (!state.moved) {
      if (triggerRef.current) triggerRef.current.dataset.dragging = 'true';
      optionsRef.current.onStart?.(state.rect);
    }
    state.moved = true;
    const { dx, dy } = clampDragOffset({ rect: state.rect, dx: rawX, dy: rawY, ...state.view });
    if (wrapperRef.current) {
      wrapperRef.current.style.transition = 'none';
      wrapperRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    }
    state.last = { ...state.rect, left: state.rect.left + dx, top: state.rect.top + dy };
    onLive(state.last, nearestSide(state.last.left + state.last.width / 2, state.view.viewport.width));
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    if (stateRef.current && event.pointerId === stateRef.current.pointerId) {
      finish(false);
      return;
    }
    if (!stateRef.current && awaitingRelease.current === event.pointerId) {
      awaitingRelease.current = null;
      suppressNextClick();
    }
  };

  return {
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: () => finish(true), onBlur: () => finish(true) },
    takeSuppressedClick: () => {
      const wasDrag = suppressClick.current;
      suppressClick.current = false;
      return wasDrag;
    },
  };
}
