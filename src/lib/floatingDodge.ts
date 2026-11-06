// Where the accessibility tab steps to when a control the keyboard focused lies under it (WCAG 2.2 SC 2.4.11). Pure
// functions on boxes, like floatingLayout.ts, but in a module of their own: only the widget (a lazy chunk) needs them, so
// they stay out of the entry chunk that the WhatsApp button shares floatingLayout with.
import {
  clamp,
  nearestSide,
  SCROLL_AIR_PX,
  tabLeft,
  TAB_SIZE_PX,
  topBounds,
  type Box,
  type Insets,
  type Offset,
  type Size,
  type TabSide,
} from './floatingLayout';

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
    const tops = [
      tab.top,
      visible.top - SCROLL_AIR_PX - TAB_SIZE_PX,
      visible.top + visible.height + SCROLL_AIR_PX,
      min,
      max,
    ];
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
