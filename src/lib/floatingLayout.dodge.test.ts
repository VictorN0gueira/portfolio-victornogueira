import { describe, expect, it } from 'vitest';
import { dodgeOffset, isObscured, TAB_SIZE_PX, topBounds, type Box } from './floatingLayout';

const NO_INSETS = { top: 0, bottom: 0, left: 0, right: 0 };
const PHONE = { width: 390, height: 844 };
const GAP = 8;

const tabAt = (left: number, top: number): Box => ({ left, top, width: TAB_SIZE_PX, height: TAB_SIZE_PX });
const overlapsBox = (a: Box, b: Box) =>
  Math.min(a.left + a.width, b.left + b.width) > Math.max(a.left, b.left) &&
  Math.min(a.top + a.height, b.top + b.height) > Math.max(a.top, b.top);
const moved = (tab: Box, offset: { dx: number; dy: number }): Box => ({
  ...tab,
  left: tab.left + offset.dx,
  top: tab.top + offset.dy,
});

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

describe('dodgeOffset', () => {
  const dodge = (tab: Box, target: Box, viewport = PHONE) => dodgeOffset({ tab, target, viewport, insets: NO_INSETS });

  it('does not move a tab that nothing covers', () => {
    expect(dodge(tabAt(346, 316), { left: 0, top: 100, width: 390, height: 40 })).toEqual({ dx: 0, dy: 0 });
  });

  it('moves a tab covered by a full width link to the nearest free place above or below, 8px from the link', () => {
    const tab = tabAt(346, 316);
    // The link is over the top of the tab: below needs 32px, above needs 68px.
    const high = { left: 0, top: 300, width: 390, height: 40 };
    const nextBelow = moved(tab, dodge(tab, high)!);
    expect(overlapsBox(nextBelow, high)).toBe(false);
    expect(nextBelow.left).toBe(tab.left);
    expect(nextBelow.top).toBe(high.top + high.height + GAP);
    // The link is over the bottom of the tab: above needs 38px, below needs 62px.
    const low = { left: 0, top: 330, width: 390, height: 40 };
    expect(moved(tab, dodge(tab, low)!).top).toBe(low.top - GAP - TAB_SIZE_PX);
  });

  it('goes above when below is out of reach', () => {
    const tab = tabAt(346, 700);
    const link = { left: 0, top: 740, width: 390, height: 40 };
    const next = moved(tab, dodge(tab, link)!);
    expect(next.top).toBe(link.top - GAP - TAB_SIZE_PX);
  });

  it('crosses to the other side when a short link leaves it free, if that is the nearest free place', () => {
    const tab = tabAt(346, 300);
    // So tall that neither above nor below is inside the bounds of the tab.
    const link = { left: 260, top: 100, width: 130, height: 700 };
    const next = moved(tab, dodge(tab, link)!);
    expect(overlapsBox(next, link)).toBe(false);
    expect(next.left).toBe(0);
    expect(next.top).toBe(300);
  });

  it('keeps the tab under the header and over the WhatsApp stack on the left', () => {
    const left = tabAt(0, 300);
    const bounds = topBounds('left', PHONE.height, NO_INSETS);
    const tall = { left: 0, top: 280, width: 390, height: 520 };
    const result = dodge(left, tall);
    if (result) {
      const next = moved(left, result);
      expect(next.top).toBeGreaterThanOrEqual(bounds.min);
      expect(next.top).toBeLessThanOrEqual(bounds.max);
      expect(overlapsBox(next, tall)).toBe(false);
    }
  });

  it('gives null when no place in the window is clear of the element', () => {
    const wall = { left: 0, top: 0, width: 390, height: 844 };
    expect(dodge(tabAt(346, 316), wall)).toBeNull();
  });

  it('judges only the part of the element that is inside the window', () => {
    const tab = tabAt(346, 316);
    const below = { left: 0, top: 900, width: 390, height: 40 };
    expect(dodge(tab, below)).toEqual({ dx: 0, dy: 0 });
  });

  it('respects the safe area when it crosses to the other side', () => {
    const insets = { top: 0, bottom: 0, left: 47, right: 47 };
    const tab = tabAt(844 - 47 - 44, 150);
    const link = { left: 700, top: 80, width: 100, height: 260 };
    const next = moved(tab, dodgeOffset({ tab, target: link, viewport: { width: 844, height: 390 }, insets })!);
    expect(overlapsBox(next, link)).toBe(false);
    expect(next.left).toBeGreaterThanOrEqual(47);
  });
});
