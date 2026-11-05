import { useEffect, useRef, type RefObject } from 'react';
import {
  dodgeOffset,
  isObscured,
  scrollBand,
  TAB_SIZE_PX,
  TAB_SLIDE_MS,
  type Box,
  type TabPosition,
} from '../lib/floatingLayout';
import { readFloatingView } from '../lib/floatingView';

/** The tab reads these two lengths from its own style (a translate, see AccessibilityTrigger). The DOM holds the state. */
const DODGE_X = '--vn-dodge-x';
const DODGE_Y = '--vn-dodge-y';
/** How long a scroll has to be quiet before the tab judges where the focused control ended up. */
const SETTLE_MS = 100;
/** The widget sits at z-index 150 (--vn-z-widget): what is above it can never be covered by it. */
const DEFAULT_WIDGET_Z = 150;
const POINTER_EVENTS = ['pointerdown', 'touchstart', 'wheel'] as const;
const VIEW_EVENTS = ['resize', 'orientationchange'] as const;
const FOCUS_EVENTS = ['focusin', 'focusout'] as const;
const RELEASE_EVENTS = ['pointerup', 'pointercancel'] as const;

interface TabDodgeOptions {
  wrapperRef: RefObject<HTMLElement | null>;
  triggerRef: RefObject<HTMLElement | null>;
  /** The panel opens and closes: the focus moves into it and back out, so the tab is judged again. */
  isOpen: boolean;
  /** The place the tab was moved to: it slides there, and is judged once it has arrived. */
  position: TabPosition | null;
}

/** Puts the dodge in the style of the tab. The same values write nothing; `isInstant` skips the transition once. */
function setDodge(trigger: HTMLElement, dx: number, dy: number, isInstant: boolean): void {
  const x = `${dx}px`;
  const y = `${dy}px`;
  const isSet = (name: string, value: string) => (trigger.style.getPropertyValue(name) || '0px') === value;
  if (isSet(DODGE_X, x) && isSet(DODGE_Y, y)) return;
  if (isInstant) trigger.style.transition = 'none';
  trigger.style.setProperty(DODGE_X, x);
  trigger.style.setProperty(DODGE_Y, y);
  if (!isInstant) return;
  void trigger.offsetWidth;
  trigger.style.transition = '';
}

/** The tab goes home with no slide: a drag lets go of it, and the new place is laid out from where it rests. */
export function clearDodge(trigger: HTMLElement): void {
  setDodge(trigger, 0, 0, true);
}

/** True when something above the widget in z order holds the element (a dialog, the skip link). */
function isAboveWidget(element: Element, widget: Element): boolean {
  const widgetZ = Number.parseInt(getComputedStyle(widget).zIndex, 10) || DEFAULT_WIDGET_Z;
  for (let node: Element | null = element; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.position !== 'static' && Number.parseInt(style.zIndex, 10) > widgetZ) return true;
  }
  return false;
}

/**
 * The rects of the focused control the tab has to stay clear of: none when nothing is focused, when the focus is in the
 * widget (the panel), when the pointer put it there, or when the control is above the widget. The rects are those of the
 * box, not clipped by scrolling containers: a control cut off by one is judged whole, which at worst moves the tab for a
 * part that is not on screen. That costs a step aside, never a covered control, so it is accepted.
 */
function focusedRects(widget: HTMLElement, isPointerFocus: boolean): DOMRect[] {
  const active = document.activeElement;
  if (!active || active === document.body || active === document.documentElement || widget.contains(active)) return [];
  if (isPointerFocus || !active.matches(':focus-visible') || isAboveWidget(active, widget)) return [];
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

/** The box of the tab at rest: the wrapper (a fixed box, with the panel inside it while it is open) and the place of the tab in it. */
function restBox(widget: HTMLElement, trigger: HTMLElement): Box {
  const box = widget.getBoundingClientRect();
  return {
    left: box.left + trigger.offsetLeft,
    top: box.top + trigger.offsetTop,
    width: TAB_SIZE_PX,
    height: TAB_SIZE_PX,
  };
}

/**
 * True when the page has room to scroll a control out of the band of the tab (up for a tab in the upper half, down for the
 * lower half): the browser is about to do it, so judging now would only make the tab hop while the scroll is on its way.
 */
function hasRoomToScroll(home: Box): boolean {
  const { edge } = scrollBand(home.top, window.innerHeight);
  const room =
    edge === 'top' ? window.scrollY : document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
  return room > 1;
}

/**
 * WCAG 2.2 SC 2.4.11 Focus Not Obscured. While the keyboard moves the focus the browser scrolls a focused control out
 * from under the tab (the scroll padding band, index.css), but at the start or the end of a page nothing can scroll, so a
 * control of the first screen that sits where the tab is would stay under it. When the focus is keyboard driven
 * (:focus-visible, so Tab, a skip link, an arrow key, a hash) and the control is under the tab, the tab steps aside for as
 * long as it has the focus: only the button moves, with `translate` (the chosen place, the drag, the panel and the stored
 * position are untouched), and it comes back when the focus leaves. Where it goes comes from the rects of the moment
 * (dodgeOffset), so a rotation or a scroll is just another judge: no offset is kept across layout changes. With motion off
 * the stylesheet makes the slide instant (motion.css), and the pointer never moves the tab, except to send it home.
 * The judge runs a frame after a focus change (once the scroll settles, when the page has room to scroll the control clear),
 * a resize or the panel opening or closing, and again once a scroll settles. A press on the tab holds it where it is until
 * the pointer lets go, so the click and the drag start under the pointer.
 */
export function useTabDodge({ wrapperRef, triggerRef, isOpen, position }: TabDodgeOptions): void {
  const isPointerFocus = useRef(false);
  const isHolding = useRef(false);
  const lastPosition = useRef(position);

  useEffect(() => {
    let frame = 0;
    let timer = 0;

    const judge = () => {
      const widget = wrapperRef.current;
      const trigger = triggerRef.current;
      if (!widget || !trigger || isHolding.current || trigger.dataset.dragging === 'true') return;
      const rects = focusedRects(widget, isPointerFocus.current);
      const home = restBox(widget, trigger);
      const isCovered = rects.length > 0 && isObscured(home, rects);
      const { dx, dy } = isCovered
        ? dodgeOffset({ tab: home, target: around(rects), ...readFloatingView() })
        : { dx: 0, dy: 0 };
      setDodge(trigger, dx, dy, false);
    };
    const judgeSoon = () => {
      frame ||= requestAnimationFrame(() => {
        frame = 0;
        judge();
      });
    };
    const judgeSettled = (ms: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(judge, ms);
    };

    const handleFocus = () => {
      const widget = wrapperRef.current;
      const trigger = triggerRef.current;
      if (widget && trigger && hasRoomToScroll(restBox(widget, trigger))) judgeSettled(SETTLE_MS);
      else judgeSoon();
    };
    const handlePointer = (event: Event) => {
      isPointerFocus.current = true;
      const trigger = triggerRef.current;
      if (!trigger) return;
      if (event.type !== 'wheel' && event.target instanceof Node && trigger.contains(event.target)) {
        isHolding.current ||= event.type === 'pointerdown';
        return;
      }
      setDodge(trigger, 0, 0, false);
    };
    const handleRelease = () => {
      isHolding.current = false;
      judgeSoon();
    };
    const handleKey = () => {
      isPointerFocus.current = false;
    };
    const handleScroll = () => judgeSettled(SETTLE_MS);

    document.addEventListener('keydown', handleKey, true);
    document.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    for (const name of FOCUS_EVENTS) document.addEventListener(name, handleFocus, true);
    for (const name of RELEASE_EVENTS) document.addEventListener(name, handleRelease, true);
    for (const name of VIEW_EVENTS) window.addEventListener(name, judgeSoon);
    for (const name of POINTER_EVENTS) document.addEventListener(name, handlePointer, { capture: true, passive: true });

    // A tab that was moved slides first: its box is read once it has arrived. Anything else is judged in the next frame.
    const isMoved = lastPosition.current !== position;
    lastPosition.current = position;
    if (isMoved) judgeSettled(TAB_SLIDE_MS + SETTLE_MS);
    else handleFocus();

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      document.removeEventListener('keydown', handleKey, true);
      document.removeEventListener('scroll', handleScroll, true);
      for (const name of FOCUS_EVENTS) document.removeEventListener(name, handleFocus, true);
      for (const name of RELEASE_EVENTS) document.removeEventListener(name, handleRelease, true);
      for (const name of VIEW_EVENTS) window.removeEventListener(name, judgeSoon);
      for (const name of POINTER_EVENTS) document.removeEventListener(name, handlePointer, true);
    };
  }, [wrapperRef, triggerRef, isOpen, position]);
}
