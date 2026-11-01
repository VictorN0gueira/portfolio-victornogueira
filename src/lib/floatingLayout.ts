// The geometry of the two floating buttons, in one place: the WhatsApp circle at the bottom left and the movable
// accessibility tab. Pure functions, no DOM, so the rules (margins, the stack above WhatsApp, the panel placement) are
// testable and the two buttons cannot drift apart.

/** The margin both buttons keep from the window edges (or the safe area, when that is larger). */
export const FLOAT_MARGIN_PX = 16;
/** The gap between the tab and the WhatsApp button when the tab stacks above it on the left. */
export const FLOAT_GAP_PX = 16;
/** The tab is size-11 (44px), the WCAG minimum target. */
export const TAB_SIZE_PX = 44;
/** The WhatsApp button is size-[52px]. */
export const WHATSAPP_SIZE_PX = 52;
/** The default place of the tab on a phone held upright: this far over the bottom margin. */
export const TAB_DEFAULT_BOTTOM_OFFSET_PX = 96;
/** A press that moves less than this is a tap, not a drag. */
export const TAP_SLOP_PX = 8;
/** One press of Subir or Descer moves the tab by this share of the window height. */
export const STEP_RATIO = 0.1;
/** The panel is w-[min(13rem,...)]: 208px at the default font size. */
export const PANEL_WIDTH_PX = 208;
/** The gap between the tab and the panel that opens beside it. */
export const PANEL_GAP_PX = 8;
/** Air kept between the tab and a focused control the browser scrolls into view. */
export const SCROLL_AIR_PX = 8;

export type TabSide = 'left' | 'right';
export type StepDirection = 'up' | 'down';

/** Where the visitor put the tab: a side, and the vertical centre as a share (0 to 1) of the window height. */
export interface TabPosition {
  side: TabSide;
  ratio: number;
}

export interface Insets {
  top: number;
  bottom: number;
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

export interface Offset {
  dx: number;
  dy: number;
}

/** The value inside min and max; an inverted range gives min. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

/** The margin from an edge: 16px, or the safe area inset when it is larger (the same rule the buttons' CSS spells). */
const edgeOffset = (inset: number): number => Math.max(FLOAT_MARGIN_PX, inset);

/** How far over the bottom of the window the tab has to stay: the margin, or WhatsApp plus a gap on the left. */
function bottomLimit(side: TabSide, insets: Insets): number {
  const base = edgeOffset(insets.bottom);
  return side === 'left' ? base + WHATSAPP_SIZE_PX + FLOAT_GAP_PX : base;
}

export function nearestSide(centerX: number, viewportWidth: number): TabSide {
  return centerX < viewportWidth / 2 ? 'left' : 'right';
}

/** The lowest and highest `top` the tab may have on a side. */
export function topBounds(side: TabSide, viewportHeight: number, insets: Insets): { min: number; max: number } {
  const min = edgeOffset(insets.top);
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
    dx: clamp(dx, -rect.left, viewport.width - rect.width - rect.left),
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
  const left = clamp(naturalLeft, FLOAT_MARGIN_PX, Math.max(FLOAT_MARGIN_PX, viewport.width - FLOAT_MARGIN_PX - panel.width));
  // A panel that reaches the WhatsApp column (a narrow phone, or a tab on the left) stays over the WhatsApp stack.
  const reachesWhatsApp = left < FLOAT_MARGIN_PX + WHATSAPP_SIZE_PX;
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
  const reachesWhatsApp = side === 'left' || viewport.width - TAB_SIZE_PX - PANEL_GAP_PX - PANEL_WIDTH_PX < FLOAT_MARGIN_PX + WHATSAPP_SIZE_PX;
  return Math.max(0, viewport.height - edgeOffset(insets.top) - bottomLimit(reachesWhatsApp ? 'left' : 'right', insets));
}

/** The edge of the window a focused control has to stay clear of, and how far from that edge, for a tab at `top`. */
export function scrollBand(top: number, viewportHeight: number): { edge: 'top' | 'bottom'; pad: number } {
  const isLower = top + TAB_SIZE_PX / 2 > viewportHeight / 2;
  return isLower
    ? { edge: 'bottom', pad: viewportHeight - top + SCROLL_AIR_PX }
    : { edge: 'top', pad: top + TAB_SIZE_PX + SCROLL_AIR_PX };
}
