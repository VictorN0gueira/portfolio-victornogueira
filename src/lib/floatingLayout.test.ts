import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  clamp,
  clampDragOffset,
  FLOAT_GAP_PX,
  FLOAT_MARGIN_PX,
  nearestSide,
  PANEL_GAP_PX,
  panelMaxHeight,
  placePanel,
  ratioFromTop,
  releasePosition,
  scrollBand,
  stepPosition,
  TAB_SIZE_PX,
  topBounds,
  topFromRatio,
  WHATSAPP_SIZE_PX,
} from './floatingLayout';

const NO_INSETS = { top: 0, bottom: 0 };
const PHONE = { width: 390, height: 844 };

describe('clamp', () => {
  it('keeps a value inside the range and prefers the minimum when the range is inverted', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(30, 0, 10)).toBe(10);
    expect(clamp(5, 8, 2)).toBe(8);
  });
});

describe('nearestSide', () => {
  it('picks the half of the window the centre is in, the right one on the exact middle', () => {
    expect(nearestSide(10, 400)).toBe('left');
    expect(nearestSide(199.9, 400)).toBe('left');
    expect(nearestSide(200, 400)).toBe('right');
    expect(nearestSide(390, 400)).toBe('right');
  });
});

describe('topBounds', () => {
  it('stays under the floating header (96px, the scroll padding of anchors) and 16px over the bottom on the right', () => {
    expect(topBounds('right', PHONE.height, NO_INSETS)).toEqual({ min: 96, max: 844 - 44 - 16 });
  });

  it('uses the thinner header of a phone on its side (72px, window up to 480px tall)', () => {
    expect(topBounds('right', 390, NO_INSETS).min).toBe(72);
    expect(topBounds('right', 481, NO_INSETS).min).toBe(96);
  });

  it('stacks the left side above the WhatsApp button with a 16px gap: bottom 16 + 52 + 16', () => {
    expect(topBounds('left', PHONE.height, NO_INSETS).max).toBe(844 - 44 - (16 + 52 + 16));
  });

  it('takes the larger of the margin and the safe area, like the buttons do', () => {
    const insets = { top: 47, bottom: 34 };
    // The header sits under the notch: the inset plus 84px, like the scroll padding of anchors.
    expect(topBounds('right', 844, insets)).toEqual({ min: 47 + 84, max: 844 - 44 - 34 });
    expect(topBounds('left', 844, insets).max).toBe(844 - 44 - (34 + 52 + 16));
  });

  it('never returns a maximum under the minimum on a very short window', () => {
    const bounds = topBounds('left', 100, NO_INSETS);
    expect(bounds.max).toBeGreaterThanOrEqual(bounds.min);
  });

  it('keeps the left side clear of WhatsApp on short landscape phones', () => {
    for (const height of [390, 375]) {
      const { max } = topBounds('left', height, NO_INSETS);
      const whatsAppTop = height - FLOAT_MARGIN_PX - WHATSAPP_SIZE_PX;
      expect(max + TAB_SIZE_PX + FLOAT_GAP_PX).toBeLessThanOrEqual(whatsAppTop);
    }
  });
});

describe('ratio and top', () => {
  it('turns the vertical centre into a ratio of the window and back', () => {
    const top = topFromRatio(0.5, 'right', 800, NO_INSETS);
    expect(top).toBe(400 - 22);
    expect(ratioFromTop(top, 800)).toBeCloseTo(0.5, 5);
  });

  it('clamps a ratio that no longer fits (after a rotation) inside the window', () => {
    expect(topFromRatio(0, 'right', 390, NO_INSETS)).toBe(72);
    expect(topFromRatio(1, 'right', 390, NO_INSETS)).toBe(390 - 44 - 16);
    expect(topFromRatio(1, 'left', 390, NO_INSETS)).toBe(390 - 44 - 84);
  });

  it('keeps the ratio inside 0 to 1', () => {
    expect(ratioFromTop(-100, 800)).toBe(0);
    expect(ratioFromTop(5000, 800)).toBe(1);
  });
});

describe('clampDragOffset', () => {
  const rect = { left: 346, top: 400, width: 44, height: 44 };

  it('lets the tab follow the pointer inside the window', () => {
    expect(clampDragOffset({ rect, dx: -100, dy: -50, viewport: PHONE, insets: NO_INSETS })).toEqual({ dx: -100, dy: -50 });
  });

  it('stops the tab at the edges of the window and at the margins', () => {
    expect(clampDragOffset({ rect, dx: 500, dy: 900, viewport: PHONE, insets: NO_INSETS })).toEqual({ dx: 0, dy: 844 - 44 - 16 - 400 });
    expect(clampDragOffset({ rect, dx: -900, dy: -900, viewport: PHONE, insets: NO_INSETS })).toEqual({ dx: -346, dy: 96 - 400 });
  });
});

describe('releasePosition', () => {
  it('snaps to the nearest side and keeps the vertical centre as a ratio', () => {
    expect(releasePosition({ left: 20, top: 378, width: 44, height: 44 }, PHONE)).toEqual({ side: 'left', ratio: 400 / 844 });
    expect(releasePosition({ left: 300, top: 100, width: 44, height: 44 }, PHONE)).toEqual({ side: 'right', ratio: 122 / 844 });
  });
});

describe('stepPosition', () => {
  const view = { viewportHeight: 800, insets: NO_INSETS };

  it('moves up and down by a tenth of the window from where the tab really is', () => {
    const down = stepPosition({ side: 'right', ratio: 0.5 }, 'down', view);
    const up = stepPosition({ side: 'right', ratio: 0.5 }, 'up', view);
    expect(down.ratio).toBeCloseTo(0.6, 5);
    expect(up.ratio).toBeCloseTo(0.4, 5);
    expect(down.side).toBe('right');
  });

  it('starts from the clamped place, so a press always moves the tab', () => {
    // On the left, a stored ratio of 1 is drawn at the limit over WhatsApp: Subir moves from there, not from 1.
    const limit = ratioFromTop(topFromRatio(1, 'left', 800, NO_INSETS), 800);
    const up = stepPosition({ side: 'left', ratio: 1 }, 'up', view);
    expect(up.ratio).toBeCloseTo(limit - 0.1, 5);
  });

  it('stops under the header at the top and never leaves 0 to 1', () => {
    const top = stepPosition({ side: 'right', ratio: 0 }, 'up', view);
    expect(top.ratio).toBeGreaterThanOrEqual(0);
    expect(top.ratio).toBeLessThanOrEqual(0.5);
  });
});

describe('placePanel', () => {
  const panel = { width: 208, height: 300 };
  const trigger = (left: number, top: number) => ({ left, top, width: 44, height: 44 });

  it('opens to the left of a right side tab, bottom aligned (growing upward), when it fits', () => {
    expect(placePanel({ side: 'right', trigger: trigger(346, 600), panel, viewport: PHONE, insets: NO_INSETS })).toEqual({ dx: 0, dy: 644 - 300 - 600 });
  });

  it('opens to the right of a left side tab', () => {
    expect(placePanel({ side: 'left', trigger: trigger(0, 400), panel, viewport: PHONE, insets: NO_INSETS }).dx).toBe(0);
  });

  it('flips down (clamps to 16px under the top) when there is no room above the tab', () => {
    const { dy } = placePanel({ side: 'right', trigger: trigger(346, 100), panel, viewport: PHONE, insets: NO_INSETS });
    // The preferred top is 144 - 300 = -156: it is clamped to 16.
    expect(100 + dy).toBe(16);
  });

  it('keeps the panel over the WhatsApp button on the left side', () => {
    const { dy } = placePanel({ side: 'left', trigger: trigger(0, 700), panel: { width: 208, height: 100 }, viewport: PHONE, insets: NO_INSETS });
    expect(700 + dy + 100).toBeLessThanOrEqual(844 - 84);
  });

  it('keeps the panel over the WhatsApp button on a narrow phone when the tab is low on the right, because it reaches that column', () => {
    const { dy } = placePanel({ side: 'right', trigger: trigger(276, 508), panel: { width: 208, height: 200 }, viewport: { width: 320, height: 568 }, insets: NO_INSETS });
    // The panel spans 60 to 268, and WhatsApp ends at 68: its bottom stays over the WhatsApp top minus the gap.
    expect(508 + dy + 200).toBeLessThanOrEqual(568 - 84);
  });

  it('lets the panel go down to the margin on the right when it does not reach the WhatsApp column', () => {
    const { dy } = placePanel({ side: 'right', trigger: trigger(1396, 840), panel: { width: 208, height: 100 }, viewport: { width: 1440, height: 900 }, insets: NO_INSETS });
    // Bottom aligned with the tab, whose bottom is on the 16px margin: 784 is the top, 56 px over the tab top.
    expect(dy).toBe(-56);
  });

  it('pulls the panel back inside the window sideways while the tab is mid drag on a narrow phone', () => {
    const { dx } = placePanel({ side: 'right', trigger: trigger(138, 400), panel, viewport: { width: 320, height: 568 }, insets: NO_INSETS });
    expect(138 - 8 - 208 + dx).toBe(16);
  });
});

describe('panelMaxHeight', () => {
  it('is the window minus the top margin and the bottom limit of the side', () => {
    expect(panelMaxHeight('right', { width: 1440, height: 900 }, NO_INSETS)).toBe(900 - 16 - 16);
    expect(panelMaxHeight('left', { width: 1440, height: 900 }, NO_INSETS)).toBe(900 - 16 - 84);
  });

  it('keeps the WhatsApp stack on a narrow window even on the right, where the panel reaches that column', () => {
    expect(panelMaxHeight('right', { width: 320, height: 568 }, NO_INSETS)).toBe(568 - 16 - 84);
  });
});

describe('scrollBand', () => {
  it('protects the bottom edge when the tab is in the lower half, down to its top plus 8px of air', () => {
    expect(scrollBand(700, 844)).toEqual({ edge: 'bottom', pad: 844 - 700 + 8 });
  });

  it('protects the top edge when the tab is in the upper half, down to its bottom plus 8px of air', () => {
    expect(scrollBand(100, 844)).toEqual({ edge: 'top', pad: 100 + 44 + 8 });
  });
});

describe('shared geometry', () => {
  it('keeps the numbers the markup spells in classes: size-[44px] tab (px, so the larger font does not grow it) and the 52px WhatsApp circle', () => {
    const widget = readFileSync(resolve(__dirname, '../components/AccessibilityWidget.tsx'), 'utf8');
    const whatsApp = readFileSync(resolve(__dirname, '../components/layout/WhatsAppButton.tsx'), 'utf8');
    expect(TAB_SIZE_PX).toBe(44);
    expect(widget).toContain('size-[44px]');
    expect(WHATSAPP_SIZE_PX).toBe(52);
    expect(whatsApp).toContain('size-[52px]');
    expect(whatsApp).toContain('FLOAT_MARGIN_PX');
    expect(PANEL_GAP_PX).toBe(8);
    expect(widget).toContain('right-[calc(100%+8px)]');
    expect(widget).toContain('left-[calc(100%+8px)]');
  });
});
