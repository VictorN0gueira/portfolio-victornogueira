import { vi } from 'vitest';

export interface StubbedRect {
  left?: number;
  top?: number;
  width?: number;
  height?: number;
}

const DEFAULT_RECT = { left: 10, top: 20, width: 200, height: 100 } as const;

/**
 * jsdom lays nothing out, so every box is 0 by 0 at the origin. This gives one element the box a test needs, through a
 * spy on its getBoundingClientRect (put back by vi.restoreAllMocks), and returns the rect it reports.
 */
export function stubRect(element: Element, rect: StubbedRect = {}): DOMRect {
  const { left, top, width, height } = { ...DEFAULT_RECT, ...rect };
  const box: DOMRect = {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  };
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(box);
  return box;
}
