import { useEffect, type RefObject } from 'react';
import { dodgeOffset, isObscured, TAB_SLIDE_MS, type Box } from '../lib/floatingLayout';
import { readFloatingView } from '../lib/floatingView';

/** The tab reads these two lengths (and the duration of its slide) from its own style: see AccessibilityTrigger. */
const DODGE_X = '--vn-dodge-x';
const DODGE_Y = '--vn-dodge-y';
const DODGE_MS = '--vn-dodge-ms';
/** How long the focus and the scroll have to be quiet before the tab judges where the focused control ended up. */
const SETTLE_MS = 120;
/** Presses and wheel turns are the pointer: the tab does not step aside for them, and it comes home at once. */
const POINTER_EVENTS = ['pointerdown', 'touchstart', 'wheel'] as const;

interface TabDodgeOptions {
  wrapperRef: RefObject<HTMLElement | null>;
  triggerRef: RefObject<HTMLElement | null>;
  isOpen: boolean;
  isMotionAllowed: boolean;
  /** Changes whenever the tab is put somewhere else, so a step aside is judged again from the new place. */
  placeKey: string;
}

const toBox = ({ left, top, width, height }: DOMRect): Box => ({ left, top, width, height });

/** The rects of the focused element that have a size, or none when it is the page itself or lives in the widget. */
function focusedRects(widget: HTMLElement): DOMRect[] {
  const active = document.activeElement;
  if (!active || active === document.body || active === document.documentElement || widget.contains(active)) return [];
  return Array.from(active.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
}

/** One box around every rect (a link that wraps onto two lines has two). */
function around(rects: DOMRect[]): Box {
  const left = Math.min(...rects.map((rect) => rect.left));
  const top = Math.min(...rects.map((rect) => rect.top));
  return {
    left,
    top,
    width: Math.max(...rects.map((rect) => rect.right)) - left,
    height: Math.max(...rects.map((rect) => rect.bottom)) - top,
  };
}

/**
 * WCAG 2.2 SC 2.4.11 Focus Not Obscured. While the keyboard moves the focus the browser scrolls a focused control out
 * from under the tab (the scroll padding band, index.css), but at the start or the end of a page nothing can scroll, so a
 * control of the first screen that sits where the tab is would stay under it. Once the focus and the scroll have settled,
 * if the focused control is still under the tab, the tab steps aside (above or below it, or across to the other side)
 * for as long as that control has the focus, and comes back when the focus leaves. Only the button moves, with
 * `translate` (so the chosen place, the drag and the slide of the wrapper are untouched, and nothing is stored). It
 * moves only after a Tab key, never for the pointer, and not while the panel is open (the focus is inside it then).
 * With motion off the move is instant.
 */
export function useTabDodge({ wrapperRef, triggerRef, isOpen, isMotionAllowed, placeKey }: TabDodgeOptions): void {
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const trigger = triggerRef.current;
    if (isOpen || !wrapper || !trigger) return;
    let isKeyboard = false;
    let timer: number | undefined;

    const place = (dx: number, dy: number, isInstant: boolean) => {
      trigger.style.setProperty(DODGE_MS, isInstant || !isMotionAllowed ? '0ms' : `${TAB_SLIDE_MS}ms`);
      trigger.style.setProperty(DODGE_X, `${dx}px`);
      trigger.style.setProperty(DODGE_Y, `${dy}px`);
    };

    const judge = () => {
      if (!isKeyboard || trigger.dataset.dragging === 'true') return;
      const rects = focusedRects(wrapper);
      // The box of the wrapper is where the tab is at rest: the button moves inside it, with its own translate.
      const home = toBox(wrapper.getBoundingClientRect());
      const isCovered = rects.length > 0 && isObscured(home, rects);
      const offset = isCovered ? dodgeOffset({ tab: home, target: around(rects), ...readFloatingView() }) : null;
      place(offset?.dx ?? 0, offset?.dy ?? 0, false);
    };

    const schedule = () => {
      window.clearTimeout(timer);
      if (isKeyboard) timer = window.setTimeout(judge, SETTLE_MS);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      isKeyboard = true;
      schedule();
    };
    const handlePointer = () => {
      isKeyboard = false;
      window.clearTimeout(timer);
      place(0, 0, true);
    };

    document.addEventListener('keydown', handleKey, true);
    document.addEventListener('focusin', schedule, true);
    document.addEventListener('focusout', schedule, true);
    window.addEventListener('scroll', schedule, { passive: true });
    for (const name of POINTER_EVENTS) document.addEventListener(name, handlePointer, { capture: true, passive: true });
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', handleKey, true);
      document.removeEventListener('focusin', schedule, true);
      document.removeEventListener('focusout', schedule, true);
      window.removeEventListener('scroll', schedule);
      for (const name of POINTER_EVENTS) document.removeEventListener(name, handlePointer, true);
      place(0, 0, true);
    };
  }, [wrapperRef, triggerRef, isOpen, isMotionAllowed, placeKey]);
}
