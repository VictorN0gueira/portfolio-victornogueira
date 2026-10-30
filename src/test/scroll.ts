import { vi } from 'vitest';

/**
 * jsdom has no scrollIntoView. This gives one element a recording stub and returns it, so a test can assert on
 * the call without touching Element.prototype (which would leak into the next test).
 */
export function stubScrollIntoView(element: Element) {
  const scrollIntoView = vi.fn();
  element.scrollIntoView = scrollIntoView;
  return scrollIntoView;
}
