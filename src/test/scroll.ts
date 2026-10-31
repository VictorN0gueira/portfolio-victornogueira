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

/**
 * The same stub for every element, also one that does not exist yet (a page that renders its sections later scrolls
 * to an element the test cannot reach beforehand). It lives on Element.prototype, so the test must call
 * removeScrollIntoViewStub in an afterEach, or the stub leaks into the next test.
 */
export function stubScrollIntoViewEverywhere() {
  const scrollIntoView = vi.fn();
  Object.defineProperty(Element.prototype, 'scrollIntoView', { value: scrollIntoView, configurable: true, writable: true });
  return scrollIntoView;
}

/** Puts Element.prototype back to what jsdom has: no scrollIntoView. */
export function removeScrollIntoViewStub(): void {
  Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
}
