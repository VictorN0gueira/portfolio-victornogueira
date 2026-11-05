// The geometry of the two floating buttons, in one place: the WhatsApp circle at the bottom left and the movable
// accessibility tab. Pure functions, no DOM, so the rules (margins, the stack above WhatsApp, the panel placement) are
// testable and the two buttons cannot drift apart.

/** The margin both buttons keep from the window edges (or the safe area, when that is larger). */
export const FLOAT_MARGIN_PX = 16;
/** The gap between the tab and the WhatsApp button when the tab stacks above it on the left. */
export const FLOAT_GAP_PX = 16;
/** The tab is size-[44px], the WCAG minimum target; in px so that the larger font (rem) does not grow it. */
export const TAB_SIZE_PX = 44;
/** The WhatsApp button is size-[52px]. */
export const WHATSAPP_SIZE_PX = 52;
/** A press that moves less than this is a tap, not a drag. */
export const TAP_SLOP_PX = 8;
/** One press of Subir or Descer moves the tab by this share of the window height. */
const STEP_RATIO = 0.1;
/** The panel is w-[min(13rem,...)]: 208px at the default font size. */
const PANEL_WIDTH_PX = 208;
/** How long the tab takes to slide into its place after a drag or a move of the panel buttons. */
export const TAB_SLIDE_MS = 220;
/** The gap between the tab and the panel that opens beside it. */
export const PANEL_GAP_PX = 8;
/** Air kept between the tab and a focused control the browser scrolls into view. */
const SCROLL_AIR_PX = 8;

export type TabSide = 'left' | 'right';
export type StepDirection = 'up' | 'down';

/** Where the visitor put the tab: a side, and the vertical centre as a share (0 to 1) of the window height. */
export interface TabPosition {
  side: TabSide;
  ratio: number;
}

/** The safe area insets of the window in px (a notch, a rounded corner, the home indicator). */
export interface Insets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

interface Offset {
  dx: number;
  dy: number;
}

/** The value inside min and max; an inverted range gives min. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

/** The floating header ends here from the top of a window taller than 480px: the scroll padding of anchors (index.css). */
const HEADER_CLEARANCE_PX = 96;
const HEADER_NOTCH_GAP_PX = 84;
/** The header of a phone on its side (window up to 480px tall, the vn-landscape variant) is thinner. */
const SHORT_WINDOW_PX = 480;
const SHORT_HEADER_CLEARANCE_PX = 72;
const SHORT_HEADER_NOTCH_GAP_PX = 60;

/** Where the floating header ends, so the tab never lies over its controls (it is fixed: scrolling cannot clear them). */
function headerClearance(viewportHeight: number, insets: Insets): number {
  const isShort = viewportHeight <= SHORT_WINDOW_PX;
  return Math.max(
    isShort ? SHORT_HEADER_CLEARANCE_PX : HEADER_CLEARANCE_PX,
    insets.top + (isShort ? SHORT_HEADER_NOTCH_GAP_PX : HEADER_NOTCH_GAP_PX),
  );
}

/** The margin from an edge: 16px, or the safe area inset when it is larger (the same rule the buttons' CSS spells). */
const edgeOffset = (inset: number): number => Math.max(FLOAT_MARGIN_PX, inset);

/** How far over the bottom of the window the tab has to stay: the margin, or WhatsApp plus a gap on the left. */
function bottomLimit(side: TabSide, insets: Insets): number {
  const base = edgeOffset(insets.bottom);
  return side === 'left' ? base + WHATSAPP_SIZE_PX + FLOAT_GAP_PX : base;
}

/** The left of the tab on a side: flush with the edge of the window, or with its safe area inset. */
export function tabLeft(side: TabSide, viewportWidth: number, insets: Insets): number {
  return side === 'right' ? viewportWidth - insets.right - TAB_SIZE_PX : insets.left;
}

export function nearestSide(centerX: number, viewportWidth: number): TabSide {
  return centerX < viewportWidth / 2 ? 'left' : 'right';
}

/** The lowest and highest `top` the tab may have on a side. */
export function topBounds(side: TabSide, viewportHeight: number, insets: Insets): { min: number; max: number } {
  const min = headerClearance(viewportHeight, insets);
  return { min, max: Math.max(min, viewportHeight - TAB_SIZE_PX - bottomLimit(side, insets)) };
}

export function topFromRatio(ratio: number, side: TabSide, viewportHeight: number, insets: Insets): number {
  const { min, max } = topBounds(side, viewportHeight, insets);
  return clamp(ratio * viewportHeight - TAB_SIZE_PX / 2, min, max);
}

export function ratioFromTop(top: number, viewportHeight: number): number {
  return clamp((top + TAB_SIZE_PX / 2) / viewportHeight, 0, 1);
}

interface DragInput {
  rect: Box;
  dx: number;
  dy: number;
  viewport: Size;
  insets: Insets;
}

/** The offset the tab follows the pointer with, held inside the window (the stack above WhatsApp applies on release). */
export function clampDragOffset({ rect, dx, dy, viewport, insets }: DragInput): Offset {
  const { min, max } = topBounds('right', viewport.height, insets);
  return {
    dx: clamp(dx, insets.left - rect.left, viewport.width - insets.right - rect.width - rect.left),
    dy: clamp(dy, min - rect.top, max - rect.top),
  };
}

/** What a release stores: the nearest side and the vertical centre as a share of the window. */
export function releasePosition(rect: Box, viewport: Size): TabPosition {
  return { side: nearestSide(rect.left + rect.width / 2, viewport.width), ratio: (rect.top + rect.height / 2) / viewport.height };
}

interface View {
  viewportHeight: number;
  insets: Insets;
}

/** One press of Subir or Descer, from where the tab is drawn (the ratio clamped), so a press always moves it. */
export function stepPosition(position: TabPosition, direction: StepDirection, { viewportHeight, insets }: View): TabPosition {
  const drawn = ratioFromTop(topFromRatio(position.ratio, position.side, viewportHeight, insets), viewportHeight);
  const next = drawn + (direction === 'up' ? -STEP_RATIO : STEP_RATIO);
  return { side: position.side, ratio: clamp(next, 0, 1) };
}

interface PanelInput {
  side: TabSide;
  trigger: Box;
  panel: Size;
  viewport: Size;
  insets: Insets;
}

/**
 * How far to shift the panel from the place it has beside the tab (inward, level with the tab top) so it is bottom
 * aligned with the tab, growing upward, and always inside the window: 16px under the top, over the WhatsApp stack on the left.
 */
export function placePanel({ side, trigger, panel, viewport, insets }: PanelInput): Offset {
  const naturalLeft = side === 'right' ? trigger.left - PANEL_GAP_PX - panel.width : trigger.left + trigger.width + PANEL_GAP_PX;
  const minLeft = edgeOffset(insets.left);
  const left = clamp(naturalLeft, minLeft, Math.max(minLeft, viewport.width - edgeOffset(insets.right) - panel.width));
  // A panel that reaches the WhatsApp column (a narrow phone, or a tab on the left) stays over the WhatsApp stack.
  const reachesWhatsApp = left < minLeft + WHATSAPP_SIZE_PX;
  const minTop = edgeOffset(insets.top);
  const maxTop = Math.max(minTop, viewport.height - bottomLimit(reachesWhatsApp ? 'left' : 'right', insets) - panel.height);
  const top = clamp(trigger.top + trigger.height - panel.height, minTop, maxTop);
  return { dx: left - naturalLeft, dy: top - trigger.top };
}

/**
 * The tallest the panel may be beside a tab on a side: the window minus 16px under the top and the bottom limit. A panel
 * that reaches the WhatsApp column (always on the left, and on a window so narrow that 13rem of panel gets there from the
 * right) has to stay over the WhatsApp stack, like placePanel keeps it.
 */
export function panelMaxHeight(side: TabSide, viewport: Size, insets: Insets): number {
  const panelLeft = viewport.width - insets.right - TAB_SIZE_PX - PANEL_GAP_PX - PANEL_WIDTH_PX;
  const reachesWhatsApp = side === 'left' || panelLeft < edgeOffset(insets.left) + WHATSAPP_SIZE_PX;
  return Math.max(0, viewport.height - edgeOffset(insets.top) - bottomLimit(reachesWhatsApp ? 'left' : 'right', insets));
}

/** The edge of the window a focused control has to stay clear of, and how far from that edge, for a tab at `top`. */
export function scrollBand(top: number, viewportHeight: number): { edge: 'top' | 'bottom'; pad: number } {
  const isLower = top + TAB_SIZE_PX / 2 > viewportHeight / 2;
  return isLower
    ? { edge: 'bottom', pad: viewportHeight - top + SCROLL_AIR_PX }
    : { edge: 'top', pad: top + TAB_SIZE_PX + SCROLL_AIR_PX };
}

/** The area two boxes share, in px squared (0 when they only touch or lie apart). */
const overlapArea = (a: Box, b: Box): number =>
  Math.max(0, Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left)) *
  Math.max(0, Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top));

/** True when the tab lies over any of the rects of the focused element (WCAG 2.2 SC 2.4.11 Focus Not Obscured). */
export function isObscured(tab: Box, targets: Box[]): boolean {
  return targets.some((target) => overlapArea(tab, target) > 0);
}

interface DodgeInput {
  tab: Box;
  /** The box of the focused element (all its rects together). */
  target: Box;
  viewport: Size;
  insets: Insets;
}

interface DodgePlace {
  left: number;
  top: number;
}

/** The part of a box that is inside the window, or null when none is. */
function insideWindow(box: Box, viewport: Size): Box | null {
  const left = Math.max(box.left, 0);
  const top = Math.max(box.top, 0);
  const right = Math.min(box.left + box.width, viewport.width);
  const bottom = Math.min(box.top + box.height, viewport.height);
  return right > left && bottom > top ? { left, top, width: right - left, height: bottom - top } : null;
}

/** Every place the tab may step to, all inside the window: on both sides, level, above and below the control, and at the two ends. */
function dodgePlaces(tab: Box, visible: Box, viewport: Size, insets: Insets): DodgePlace[] {
  const own = nearestSide(tab.left + tab.width / 2, viewport.width);
  const sides: TabSide[] = [own, own === 'left' ? 'right' : 'left'];
  return sides.flatMap((side) => {
    const { min, max } = topBounds(side, viewport.height, insets);
    const left = tabLeft(side, viewport.width, insets);
    const tops = [tab.top, visible.top - SCROLL_AIR_PX - TAB_SIZE_PX, visible.top + visible.height + SCROLL_AIR_PX, min, max];
    return tops.map((top) => ({ left, top: clamp(top, min, max) }));
  });
}

/**
 * How far the tab steps aside for a focused control it lies over, when the page could not scroll the control clear. It
 * judges from the tab at rest and the control as it is now, so it holds for any window size and keeps no offset of its own.
 * The places are the ones the tab may have (under the header, over the bottom limit of its side, inside the window):
 * level on either side, above the control and below it (8px of air), and the two ends. The one that covers the control
 * least wins, and the nearest among equals, so a free place is taken when there is one. WCAG 2.4.11 (AA) asks that the
 * control is not entirely hidden: when no place is free the least covering one still leaves part of it in view, because
 * the tab is 44px and a place at either end is always among the choices. The tab is never hidden. Zero when nothing is covered.
 */
export function dodgeOffset({ tab, target, viewport, insets }: DodgeInput): Offset {
  const visible = insideWindow(target, viewport);
  if (!visible || overlapArea(tab, visible) === 0) return { dx: 0, dy: 0 };
  const cost = (place: DodgePlace) => ({
    covered: overlapArea({ ...tab, ...place }, visible),
    distance: Math.hypot(place.left - tab.left, place.top - tab.top),
  });
  const [best] = dodgePlaces(tab, visible, viewport, insets)
    .map((place) => ({ place, ...cost(place) }))
    .sort((a, b) => a.covered - b.covered || a.distance - b.distance);
  return { dx: best.place.left - tab.left, dy: best.place.top - tab.top };
}
