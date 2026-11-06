import { useEffect, useRef, type RefObject } from 'react';
import { dodgeOffset, isObscured } from '../lib/floatingDodge';
import { scrollBand, TAB_SIZE_PX, TAB_SLIDE_MS, type Box, type TabPosition } from '../lib/floatingLayout';
import { readFloatingView } from '../lib/floatingView';

/** The tab reads these two lengths from its own style (a translate, see AccessibilityTrigger). The DOM holds the state. */
const DODGE_X = '--vn-dodge-x';
const DODGE_Y = '--vn-dodge-y';
/** How long a scroll has to be quiet before the tab judges where the focused control ended up. */
const SETTLE_MS = 100;
/** What the browser puts in the top layer (a modal dialog, an open popover): it paints over everything, whatever its z-index. */
const TOP_LAYER_SELECTORS = [':modal', ':popover-open'];
/** A focus this soon after a press or a release of the pointer is the one the pointer brought; a later one is not. */
const PRESS_FOCUS_MS = 500;
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
 * primary button is down on the tab. `pressedAt`: when the pointer last pressed or let go (0 for none): a focus that follows within PRESS_FOCUS_MS is the pointer's.
 * `pointerTarget`: the element that took such a focus, which counts as pointer driven for as long as no key is pressed.
 */
interface Latch {
  isHolding: boolean;
  /** The pointer that pressed the tab: only its release or cancel ends the drag of the tab. */
  dragPointerId: number | null;
  pressedAt: number;
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

/**
 * The box a tab drawn at `drawn` rests at: drawn minus the dodge it carries. A drag from the default place pins the layout
 * there, not where the tab is drawn, or the step aside would count twice and the tab would sit off the pointer.
 */
export function restRect(trigger: HTMLElement | null, drawn: Box): Box {
  const { dx, dy } = trigger ? readDodge(trigger) : { dx: 0, dy: 0 };
  return { ...drawn, left: drawn.left - dx, top: drawn.top - dy };
}

/** The tab goes home with no slide: a drag lets go of it, and the new place is laid out from where it rests. */
export function clearDodge(trigger: HTMLElement | null): void {
  if (trigger) setDodge(trigger, 0, 0, true);
}

/** Each selector is asked on its own: a browser that does not know one of the pseudo-classes throws for the whole list. */
function isInTopLayer(element: Element): boolean {
  return TOP_LAYER_SELECTORS.some((selector) => {
    try {
      return element.closest(selector) !== null;
    } catch {
      return false; // This browser does not know the pseudo-class, so nothing is in that part of the top layer.
    }
  });
}

/** Properties that start a stacking context with any value but `none`. */
const CONTEXT_WHEN_SET = [
  'transform',
  'translate',
  'rotate',
  'scale',
  'filter',
  'backdrop-filter',
  'perspective',
  'clip-path',
  'mask-image',
  'mask-border-source',
  'view-transition-name',
  'offset-path',
  '-webkit-box-reflect',
  '-webkit-mask-box-image',
  '-webkit-mask-box-image-source',
];
/** The properties a will-change may name for the box to start a stacking context at once. */
const WILL_CHANGE_CONTEXT = new Set([
  'transform',
  'translate',
  'rotate',
  'scale',
  'opacity',
  'filter',
  'backdrop-filter',
  'perspective',
  'clip-path',
  'mask',
  'mask-image',
  'mask-border',
  'mix-blend-mode',
  'isolation',
  'contain',
  'position',
  'view-transition-name',
  'z-index',
  'content-visibility',
  'offset-path',
]);

/**
 * True when the element starts a stacking context: its z-index then caps everything inside it. The list is the one of MDN
 * ("Stacking context"), less the root and what the page never has: a positioned box with a z-index, position fixed or
 * sticky, a flex or grid item with a z-index (even static), opacity under 1, mix-blend-mode, isolation, contain
 * (layout, paint, strict, content), container-type (size, inline-size), will-change naming one of these, and any value of
 * transform, translate, rotate, scale, filter, backdrop-filter, perspective, clip-path, mask-image, mask-border-source
 * and view-transition-name. Read with getPropertyValue, which also answers for the properties the types do not know.
 */
function isStackingContext(style: CSSStyleDeclaration, parent: Element | null): boolean {
  const read = (name: string) => style.getPropertyValue(name);
  const position = read('position');
  const hasZIndex = !['', 'auto'].includes(read('z-index'));
  if (hasZIndex && position !== 'static' && position !== '') return true;
  if (position === 'fixed' || position === 'sticky') return true;
  if (hasZIndex && parent && /flex|grid/.test(getComputedStyle(parent).getPropertyValue('display'))) return true;
  const opacity = read('opacity');
  return (
    (opacity !== '' && Number(opacity) < 1) ||
    !['', 'normal'].includes(read('mix-blend-mode')) ||
    read('isolation') === 'isolate' ||
    /layout|paint|strict|content/.test(read('contain')) ||
    // MDN lists container-type size and inline-size, but Chromium measured no context for them: they count as one here,
    // the safe direction (a tab that steps aside for nothing, never a covered control).
    /size/.test(read('container-type')) ||
    ['auto', 'hidden'].includes(read('content-visibility')) ||
    read('transform-style') === 'preserve-3d' ||
    CONTEXT_WHEN_SET.some((name) => !['', 'none'].includes(read(name))) ||
    read('will-change')
      .split(',')
      .some((name) => WILL_CHANGE_CONTEXT.has(name.trim()))
  );
}

/**
 * True when something paints over the widget: the top layer, or an outermost stacking context above the one of the widget
 * (a z-index inside a context never gets out of it, so only the outermost one counts, and one without a z-index counts as 0).
 */
function isAboveWidget(element: Element, widget: Element): boolean {
  if (isInTopLayer(element)) return true;
  const widgetZ = Number.parseInt(getComputedStyle(widget).getPropertyValue('z-index'), 10);
  if (Number.isNaN(widgetZ)) return false;
  let outermost = 0;
  for (let node: Element | null = element; node && node !== document.body; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (isStackingContext(style, node.parentElement))
      outermost = Number.parseInt(style.getPropertyValue('z-index'), 10) || 0;
  }
  return outermost > widgetZ;
}

/**
 * The focused control the tab has to stay clear of: none when nothing is focused, when the focus is in the widget (the
 * panel), when it is not keyboard driven (:focus-visible), or when the pointer put it in a text field (which is always
 * focus-visible).
 */
function focusedControl(widget: HTMLElement, pointerTarget: Element | null): Element | null {
  const active = document.activeElement;
  if (!active || active === document.body || active === document.documentElement || widget.contains(active))
    return null;
  if (!active.matches(':focus-visible') || (active === pointerTarget && active.matches(TEXT_ENTRY))) return null;
  return active;
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
  // Whether the control paints over the widget is worked out last: only a control under the tab needs the walk.
  const covered = control ? coveredBox(home, control) : null;
  const target = control && covered && !isAboveWidget(control, widget) ? covered : null;
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

/** The tab goes back to where it rests, with the slide. */
function sendHome({ triggerRef }: Refs): void {
  // The tab that is being dragged is drawn by the drag: a step aside it carries is not touched until the drag ends.
  if (triggerRef.current && triggerRef.current.dataset.dragging !== 'true') setDodge(triggerRef.current, 0, 0, false);
}

/** A focus changed: judged the next frame (it only lets the tab come home while a scroll may be on its way), and again once quiet. */
function judgeFocus({ wrapperRef, triggerRef }: Refs, timing: Timing): void {
  const isRoomy =
    wrapperRef.current && triggerRef.current && hasRoomToScroll(restBox(wrapperRef.current, triggerRef.current));
  timing.soon(!isRoomy);
  timing.settled(SETTLE_MS);
}

/** What each event does to the judge and to the pointer latch. */
function createHandlers(refs: Refs, latch: Latch, timing: Timing) {
  const home = () => sendHome(refs);
  const release = () => {
    if (!latch.isHolding) return;
    // The hold and the pointer that owns it go together, whichever way the hold ends.
    latch.isHolding = false;
    latch.dragPointerId = null;
    timing.soon();
  };
  // A touch brings its focus with the mouse events after the release, so the release counts as a press too.
  const lift = (event: Event) => {
    const { pointerId } = event as PointerEvent;
    // Another pointer lifting or being cancelled while the tab is held is not the end of that press.
    if (latch.dragPointerId !== null && pointerId !== latch.dragPointerId) return;
    latch.pressedAt = Date.now();
    latch.dragPointerId = null;
    // Only the pointer that dragged ends a drag, with its release or its cancel. A key, the window blur or a context menu do
    // not end it with a release and leave the dodge alone (Escape and the blur of the button cancel the drag in
    // useTabDrag, which draws the tab where it rests). The tab is then laid out clean at its new place by
    // useTabPlacement, with no step aside left in its style, and judged again.
    if (refs.triggerRef.current?.dataset.dragging === 'true') clearDodge(refs.triggerRef.current);
    release();
  };
  return {
    judgeFocus: () => judgeFocus(refs, timing),
    release,
    lift,
    focus(event: Event) {
      if (event.type === 'focusin' && event.target instanceof Element) {
        if (Date.now() - latch.pressedAt < PRESS_FOCUS_MS) latch.pointerTarget = event.target;
        latch.pressedAt = 0;
      }
      judgeFocus(refs, timing);
    },
    press(event: Event) {
      latch.pressedAt = Date.now();
      const trigger = refs.triggerRef.current;
      if (!trigger) return;
      if (!(event.target instanceof Node && trigger.contains(event.target))) return home();
      if (event.type !== 'pointerdown' || ((event as PointerEvent).button ?? 0) !== 0) return;
      // Only the press that starts the hold owns it (useTabDrag ignores a second pointer too): a second finger on the tab,
      // or a press while the tab is being dragged, changes nothing.
      if (latch.isHolding || trigger.dataset.dragging === 'true') return;
      latch.isHolding = true;
      latch.dragPointerId = (event as PointerEvent).pointerId;
    },
    wheel() {
      home();
      timing.settled(SETTLE_MS);
    },
    key() {
      latch.pressedAt = 0;
      latch.pointerTarget = null;
      release();
    },
  };
}

/** Listens for the events that make the judge run. Returns what takes the listeners off. */
function bindEvents(handlers: ReturnType<typeof createHandlers>, timing: Timing): () => void {
  const { focus, press, wheel, key, release, lift } = handlers;
  const passive = { capture: true, passive: true };
  const bindings: Binding[] = [
    [document, 'keydown', key, { capture: true }],
    [document, 'scroll', () => timing.settled(SETTLE_MS), passive],
    [document, 'focusin', focus, { capture: true }],
    [document, 'focusout', focus, { capture: true }],
    [document, 'pointerdown', press, passive],
    [document, 'touchstart', press, passive],
    [document, 'wheel', wheel, passive],
    [document, 'pointerup', lift, { capture: true }],
    [document, 'pointercancel', lift, { capture: true }],
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
  const latch = useRef<Latch>({ isHolding: false, dragPointerId: null, pressedAt: 0, pointerTarget: null });
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
