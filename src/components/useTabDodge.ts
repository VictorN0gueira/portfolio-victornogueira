import { useEffect, useRef, type RefObject } from 'react';
import { dodgeOffset, isObscured } from '../lib/floatingDodge';
import { scrollBand, TAB_SIZE_PX, TAB_SLIDE_MS, type Box, type TabPosition } from '../lib/floatingLayout';
import { readFloatingView } from '../lib/floatingView';

/** The tab reads these two lengths from its own style (a translate, see AccessibilityTrigger). The DOM holds the state. */
const DODGE_X = '--vn-dodge-x';
const DODGE_Y = '--vn-dodge-y';
/** How long a scroll has to be quiet before the tab judges where the focused control ended up. */
const SETTLE_MS = 100;
/** Elements of the top layer (a modal dialog, a popover) paint over everything, whatever their z-index. */
const TOP_LAYER = 'dialog[open], :modal, :popover-open';
const TEXT_ENTRY = 'input, textarea, [contenteditable]';

interface TabDodgeOptions {
  wrapperRef: RefObject<HTMLElement | null>;
  triggerRef: RefObject<HTMLElement | null>;
  /** The panel opens and closes: the focus moves into it and back out, so the tab is judged again. */
  isOpen: boolean;
  /** The place the tab was moved to: it slides there, and is judged once it has arrived. */
  position: TabPosition | null;
}

interface Refs {
  wrapperRef: RefObject<HTMLElement | null>;
  triggerRef: RefObject<HTMLElement | null>;
}

/**
 * What the pointer has told the judge, kept outside the effect so that a re-run of it loses nothing. `isHolding`: the
 * primary button is down on the tab. `isPending`: a press happened and the focus it may bring has not arrived yet.
 * `pointerTarget`: the element that took such a focus, which counts as pointer driven for as long as no key is pressed.
 */
interface Latch {
  isHolding: boolean;
  isPending: boolean;
  pointerTarget: Element | null;
}

const toBox = ({ left, top, width, height }: DOMRect): Box => ({ left, top, width, height });

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

/** How far the tab is drawn from where it rests, in px: what the dodge has put in its style. */
export function readDodge(trigger: HTMLElement): { dx: number; dy: number } {
  const read = (name: string) => Number.parseFloat(trigger.style.getPropertyValue(name)) || 0;
  return { dx: read(DODGE_X), dy: read(DODGE_Y) };
}

/** The tab goes home with no slide: a drag lets go of it, and the new place is laid out from where it rests. */
export function clearDodge(trigger: HTMLElement): void {
  setDodge(trigger, 0, 0, true);
}

function isInTopLayer(element: Element): boolean {
  try {
    return element.closest(TOP_LAYER) !== null;
  } catch {
    // A browser that does not know :modal or :popover-open still knows an open dialog.
    return element.closest('dialog[open]') !== null;
  }
}

/** True when something paints over the widget (the top layer, or a z-index above the one of the widget): it can never be covered by it. */
function isAboveWidget(element: Element, widget: Element): boolean {
  if (isInTopLayer(element)) return true;
  const widgetZ = Number.parseInt(getComputedStyle(widget).zIndex, 10);
  if (Number.isNaN(widgetZ)) return false;
  for (let node: Element | null = element; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.position !== 'static' && Number.parseInt(style.zIndex, 10) > widgetZ) return true;
  }
  return false;
}

/**
 * The focused control the tab has to stay clear of: none when nothing is focused, when the focus is in the widget (the
 * panel), when it is not keyboard driven (:focus-visible), when the pointer put it in a text field (which is always
 * focus-visible), or when the control paints over the widget.
 */
function focusedControl(widget: HTMLElement, pointerTarget: Element | null): Element | null {
  const active = document.activeElement;
  if (!active || active === document.body || active === document.documentElement || widget.contains(active))
    return null;
  if (!active.matches(':focus-visible') || (active === pointerTarget && active.matches(TEXT_ENTRY))) return null;
  return isAboveWidget(active, widget) ? null : active;
}

function intersect(a: Box, b: Box): Box | null {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.left + a.width, b.left + b.width);
  const bottom = Math.min(a.top + a.height, b.top + b.height);
  return right > left && bottom > top ? { left, top, width: right - left, height: bottom - top } : null;
}

/** The part of a rect of the control that shows: cut by every ancestor that clips its content (overflow other than visible). */
function visiblePart(rect: DOMRect, control: Element): Box | null {
  let box: Box | null = toBox(rect);
  for (let node = control.parentElement; node && box && node !== document.body; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.overflowX !== 'visible' || style.overflowY !== 'visible')
      box = intersect(box, toBox(node.getBoundingClientRect()));
  }
  return box;
}

/** One box around every rect (a link that wraps onto two lines has two). */
function around(boxes: Box[]): Box {
  const left = Math.min(...boxes.map((box) => box.left));
  const top = Math.min(...boxes.map((box) => box.top));
  return {
    left,
    top,
    width: Math.max(...boxes.map((box) => box.left + box.width)) - left,
    height: Math.max(...boxes.map((box) => box.top + box.height)) - top,
  };
}

/**
 * The box of the control that lies under the tab, or null. The clipping is worked out only when a rect overlaps the tab,
 * and only by overflow ancestors: a control that sits in a fixed or absolute box escapes a clipping ancestor that is not
 * its containing block, which is judged as clipped here. That is accepted: the cost is a missed step aside for a control
 * that a clipping ancestor does not clip, only in a layout that unusual.
 */
function coveredBox(home: Box, control: Element): Box | null {
  const rects = Array.from(control.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
  if (!isObscured(home, rects.map(toBox))) return null;
  const shown = rects.flatMap((rect) => visiblePart(rect, control) ?? []);
  return isObscured(home, shown) ? around(shown) : null;
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
 * lower half): the browser is about to do it, so stepping aside now would only make the tab hop while the scroll is on its way.
 */
function hasRoomToScroll(home: Box): boolean {
  const { edge } = scrollBand(home.top, window.innerHeight);
  const room =
    edge === 'top' ? window.scrollY : document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
  return room > 1;
}

/** One judge: where the tab should be for the focused control of this moment. `canDodge` false only lets it come home. */
function judge({ wrapperRef, triggerRef }: Refs, latch: Latch, canDodge: boolean): void {
  const widget = wrapperRef.current;
  const trigger = triggerRef.current;
  if (!widget || !trigger || latch.isHolding || trigger.dataset.dragging === 'true') return;
  const home = restBox(widget, trigger);
  const control = focusedControl(widget, latch.pointerTarget);
  const target = control ? coveredBox(home, control) : null;
  if (target && !canDodge) return;
  const { dx, dy } = target ? dodgeOffset({ tab: home, target, ...readFloatingView() }) : { dx: 0, dy: 0 };
  setDodge(trigger, dx, dy, false);
}

/** When the judge runs: the next frame (the moves of a quick run count once), or once the scroll has been quiet. */
function createTiming(run: (canDodge: boolean) => void) {
  let frame = 0;
  let timer = 0;
  let canDodge = true;
  return {
    soon(isDodgeAllowed = true) {
      canDodge &&= isDodgeAllowed;
      frame ||= requestAnimationFrame(() => {
        frame = 0;
        run(canDodge);
        canDodge = true;
      });
    },
    settled(ms: number) {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => run(true), ms);
    },
    cancel() {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    },
  };
}

type Timing = ReturnType<typeof createTiming>;
type Binding = [EventTarget, string, EventListener, AddEventListenerOptions];

/** What each event does to the judge and to the pointer latch. */
function createHandlers(refs: Refs, latch: Latch, timing: Timing) {
  const home = () => {
    const trigger = refs.triggerRef.current;
    if (trigger) setDodge(trigger, 0, 0, false);
  };
  const judgeFocus = () => {
    const { wrapperRef, triggerRef } = refs;
    const isRoomy =
      wrapperRef.current && triggerRef.current && hasRoomToScroll(restBox(wrapperRef.current, triggerRef.current));
    timing.soon(!isRoomy);
    timing.settled(SETTLE_MS);
  };
  const release = () => {
    if (!latch.isHolding) return;
    latch.isHolding = false;
    timing.soon();
  };
  return {
    judgeFocus,
    release,
    focus(event: Event) {
      if (event.type === 'focusin' && latch.isPending && event.target instanceof Element) {
        latch.pointerTarget = event.target;
        latch.isPending = false;
      }
      judgeFocus();
    },
    press(event: Event) {
      latch.isPending = true;
      const trigger = refs.triggerRef.current;
      if (!trigger) return;
      if (!(event.target instanceof Node && trigger.contains(event.target))) return home();
      latch.isHolding ||= event.type === 'pointerdown' && ((event as PointerEvent).button ?? 0) === 0;
    },
    wheel() {
      home();
      timing.settled(SETTLE_MS);
    },
    key() {
      latch.isPending = false;
      latch.pointerTarget = null;
      release();
    },
  };
}

/** Listens for the events that make the judge run. Returns what takes the listeners off. */
function bindEvents(handlers: ReturnType<typeof createHandlers>, timing: Timing): () => void {
  const { focus, press, wheel, key, release } = handlers;
  const passive = { capture: true, passive: true };
  const bindings: Binding[] = [
    [document, 'keydown', key, { capture: true }],
    [document, 'scroll', () => timing.settled(SETTLE_MS), passive],
    [document, 'focusin', focus, { capture: true }],
    [document, 'focusout', focus, { capture: true }],
    [document, 'pointerdown', press, passive],
    [document, 'touchstart', press, passive],
    [document, 'wheel', wheel, passive],
    [document, 'pointerup', release, { capture: true }],
    [document, 'pointercancel', release, { capture: true }],
    [document, 'contextmenu', release, { capture: true }],
    [window, 'blur', release, {}],
    [window, 'resize', () => timing.soon(), {}],
    [window, 'orientationchange', () => timing.soon(), {}],
  ];
  for (const [target, name, listener, options] of bindings) target.addEventListener(name, listener, options);
  return () => {
    for (const [target, name, listener, options] of bindings) {
      target.removeEventListener(name, listener, Boolean(options.capture));
    }
  };
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
 * The judge runs the frame after a focus change, a resize, or the panel opening or closing, and again once a scroll has
 * been quiet: when the page has room to scroll the control clear the first run only lets the tab come home, so it does
 * not hop while the scroll is on its way, and the second one decides. A press on the tab holds it where it is until the
 * pointer lets go, so the click and the drag start under the pointer.
 */
export function useTabDodge({ wrapperRef, triggerRef, isOpen, position }: TabDodgeOptions): void {
  const latch = useRef<Latch>({ isHolding: false, isPending: false, pointerTarget: null });
  const lastPosition = useRef(position);

  useEffect(() => {
    const refs = { wrapperRef, triggerRef };
    const timing = createTiming((canDodge) => judge(refs, latch.current, canDodge));
    const handlers = createHandlers(refs, latch.current, timing);
    const unbind = bindEvents(handlers, timing);
    // A tab that was moved slides first: its box is read once it has arrived. Anything else is judged in the next frame.
    if (lastPosition.current !== position) timing.settled(TAB_SLIDE_MS + SETTLE_MS);
    else handlers.judgeFocus();
    lastPosition.current = position;
    return () => {
      timing.cancel();
      unbind();
    };
  }, [wrapperRef, triggerRef, isOpen, position]);
}
