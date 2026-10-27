import { act } from '@testing-library/react';

// Every observer that is still connected. An observer leaves the set on disconnect(), so a component
// that unmounts (or a test that ran before) never receives a later trigger.
const liveObservers = new Set<IntersectionObserverMock>();

/**
 * IntersectionObserver stand-in that never fires on its own, so tests that do not care about
 * visibility stay deterministic. It remembers what each instance observes, and
 * `triggerIntersection` fires the callbacks on demand. Installed globally by src/test/setup.ts.
 */
export class IntersectionObserverMock implements IntersectionObserver {
  readonly root: Element | Document | null;
  readonly rootMargin: string;
  readonly thresholds: ReadonlyArray<number>;

  private readonly callback: IntersectionObserverCallback;
  private readonly targets = new Set<Element>();

  constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit = {}) {
    this.callback = callback;
    this.root = options.root ?? null;
    this.rootMargin = options.rootMargin ?? '';
    this.thresholds = Array.isArray(options.threshold) ? options.threshold : [options.threshold ?? 0];
    liveObservers.add(this);
  }

  observe(target: Element): void {
    this.targets.add(target);
  }

  unobserve(target: Element): void {
    this.targets.delete(target);
  }

  disconnect(): void {
    this.targets.clear();
    liveObservers.delete(this);
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  isObserving(target: Element): boolean {
    return this.targets.has(target);
  }

  /** Runs the callback with one entry for `target`, the way the browser reports a visibility change. */
  fire(target: Element, isIntersecting: boolean): void {
    // jsdom has no layout, so the geometry is its zero rect.
    const rect = target.getBoundingClientRect();
    const entry: IntersectionObserverEntry = {
      target,
      isIntersecting,
      intersectionRatio: isIntersecting ? 1 : 0,
      boundingClientRect: rect,
      intersectionRect: rect,
      rootBounds: null,
      time: performance.now(),
    };
    this.callback([entry], this);
  }
}

/**
 * Reports `element` as entering (or, with `false`, leaving) the viewport to every observer that is
 * observing it, inside `act` so React state set by the callbacks is flushed before it returns.
 * Throws when nothing observes the element, which would otherwise make the test pass without
 * ever exercising the visibility path (for example when the component skipped observing).
 */
export function triggerIntersection(element: Element, isIntersecting = true): void {
  const observers = [...liveObservers].filter((observer) => observer.isObserving(element));
  if (observers.length === 0) {
    throw new Error('triggerIntersection: no IntersectionObserver is observing this element');
  }

  act(() => {
    observers.forEach((observer) => observer.fire(element, isIntersecting));
  });
}
