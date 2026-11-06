import { describe, expect, it } from 'vitest';
import { dodgeOffset, isObscured } from './floatingDodge';
import { TAB_SIZE_PX, topBounds, type Box, type Insets, type Size } from './floatingLayout';

const NO_INSETS = { top: 0, bottom: 0, left: 0, right: 0 };
const PHONE = { width: 390, height: 844 };
const GAP = 8;
const TAB_AREA = TAB_SIZE_PX * TAB_SIZE_PX;

const tabAt = (left: number, top: number): Box => ({ left, top, width: TAB_SIZE_PX, height: TAB_SIZE_PX });
const overlapArea = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left)) *
  Math.max(0, Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top));
const moved = (tab: Box, offset: { dx: number; dy: number }): Box => ({
  ...tab,
  left: tab.left + offset.dx,
  top: tab.top + offset.dy,
});

function dodge(tab: Box, target: Box, viewport: Size = PHONE, insets: Insets = NO_INSETS) {
  const offset = dodgeOffset({ tab, target, viewport, insets });
  return { offset, next: moved(tab, offset) };
}

describe('isObscured', () => {
  const tab = tabAt(346, 316);

  it('is true when any rect of the focused element overlaps the tab', () => {
    expect(isObscured(tab, [{ left: 0, top: 330, width: 390, height: 40 }])).toBe(true);
    expect(
      isObscured(tab, [
        { left: 0, top: 0, width: 50, height: 20 },
        { left: 300, top: 300, width: 90, height: 40 },
      ]),
    ).toBe(true);
  });

  it('is false for rects that only touch the tab or lie clear of it', () => {
    expect(isObscured(tab, [{ left: 0, top: 360, width: 390, height: 40 }])).toBe(false);
    expect(isObscured(tab, [{ left: 0, top: 330, width: 346, height: 40 }])).toBe(false);
    expect(isObscured(tab, [])).toBe(false);
  });
});

describe('dodgeOffset: a place that is free', () => {
  it('does not move a tab that nothing covers, nor one whose control lies outside the window', () => {
    expect(dodge(tabAt(346, 316), { left: 0, top: 100, width: 390, height: 40 }).offset).toEqual({ dx: 0, dy: 0 });
    expect(dodge(tabAt(346, 316), { left: 0, top: 900, width: 390, height: 40 }).offset).toEqual({ dx: 0, dy: 0 });
  });

  it('puts the tab above or below a full width link, the nearer one, 8px from it', () => {
    const tab = tabAt(346, 316);
    const high = { left: 0, top: 300, width: 390, height: 40 };
    const below = dodge(tab, high).next;
    expect(overlapArea(below, high)).toBe(0);
    expect(below.left).toBe(tab.left);
    expect(below.top).toBe(high.top + high.height + GAP);
    const low = { left: 0, top: 330, width: 390, height: 40 };
    expect(dodge(tab, low).next.top).toBe(low.top - GAP - TAB_SIZE_PX);
  });

  it('goes above when below is out of reach', () => {
    const tab = tabAt(346, 700);
    const link = { left: 0, top: 740, width: 390, height: 40 };
    expect(dodge(tab, link).next.top).toBe(link.top - GAP - TAB_SIZE_PX);
  });

  it('moves a tiny control clear with the smallest step', () => {
    const tab = tabAt(346, 316);
    const tiny = { left: 350, top: 330, width: 10, height: 10 };
    const { next, offset } = dodge(tab, tiny);
    expect(overlapArea(next, tiny)).toBe(0);
    expect(offset).toEqual({ dx: 0, dy: tiny.top + tiny.height + GAP - tab.top });
  });

  it('crosses to the other side when neither above nor below is free and the other side is', () => {
    const tab = tabAt(346, 300);
    const tall = { left: 260, top: 100, width: 130, height: 700 };
    const { next } = dodge(tab, tall);
    expect(overlapArea(next, tall)).toBe(0);
    expect(next.left).toBe(0);
    expect(next.top).toBe(300);
  });

  it('respects the safe area when it crosses to the other side', () => {
    const insets = { top: 0, bottom: 0, left: 47, right: 47 };
    const tab = tabAt(844 - 47 - 44, 150);
    const link = { left: 700, top: 80, width: 100, height: 260 };
    const { next } = dodge(tab, link, { width: 844, height: 390 }, insets);
    expect(overlapArea(next, link)).toBe(0);
    expect(next.left).toBeGreaterThanOrEqual(47);
  });
});

describe('dodgeOffset: no place is free (the control is never left entirely covered)', () => {
  it('takes the place that covers least of a tall full width control', () => {
    const tab = tabAt(346, 316);
    const tall = { left: 0, top: 100, width: 390, height: 700 };
    const { next } = dodge(tab, tall);
    const bounds = topBounds('right', PHONE.height, NO_INSETS);
    expect(next.top).toBe(bounds.max);
    expect(overlapArea(next, tall)).toBe((tall.top + tall.height - bounds.max) * TAB_SIZE_PX);
    expect(overlapArea(next, tall)).toBeLessThan(TAB_AREA);
  });

  it('never hides a control that fills the window: the tab covers its own size and no more', () => {
    const wall = { left: 0, top: 0, width: 390, height: 844 };
    const { next } = dodge(tabAt(346, 316), wall);
    expect(overlapArea(next, wall)).toBe(TAB_AREA);
    expect(overlapArea(next, wall)).toBeLessThan(wall.width * wall.height);
  });

  it('picks the edge that leaves part of a small control visible when every place covers it', () => {
    // A window 60px wide and 150px tall: the tab, either side, is over the control on every height it may have.
    const viewport = { width: 60, height: 150 };
    const tab = tabAt(16, 80);
    const control = { left: 16, top: 80, width: 20, height: 20 };
    const { next } = dodge(tab, control, viewport);
    expect(overlapArea(next, control)).toBeLessThan(control.width * control.height);
    expect(next.top).toBe(topBounds('right', viewport.height, NO_INSETS).max);
  });

  it('keeps every result inside the window, under the header and over the bottom limit of its side', () => {
    const controls: Box[] = [
      { left: 0, top: 0, width: 390, height: 844 },
      { left: 0, top: 96, width: 390, height: 40 },
      { left: 300, top: 780, width: 90, height: 60 },
      { left: 0, top: 760, width: 200, height: 80 },
    ];
    for (const control of controls) {
      for (const top of [96, 300, 716]) {
        for (const left of [0, 346]) {
          const { next } = dodge(tabAt(left, top), control);
          const side = next.left < PHONE.width / 2 ? 'left' : 'right';
          const bounds = topBounds(side, PHONE.height, NO_INSETS);
          expect(next.top).toBeGreaterThanOrEqual(bounds.min);
          expect(next.top).toBeLessThanOrEqual(bounds.max);
          expect(next.left).toBeGreaterThanOrEqual(0);
          expect(next.left + TAB_SIZE_PX).toBeLessThanOrEqual(PHONE.width);
        }
      }
    }
  });
});
