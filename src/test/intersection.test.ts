import { describe, expect, it, vi } from 'vitest';
import { triggerIntersection } from './intersection';

function createElement(): HTMLElement {
  return document.createElement('div');
}

describe('triggerIntersection', () => {
  it('never fires a callback on its own', () => {
    const callback = vi.fn();
    const observer = new IntersectionObserver(callback);

    observer.observe(createElement());

    expect(callback).not.toHaveBeenCalled();
  });

  it('calls the callback with an entering entry for the observed element', () => {
    const callback = vi.fn();
    const element = createElement();
    const observer = new IntersectionObserver(callback);
    observer.observe(element);

    triggerIntersection(element);

    expect(callback).toHaveBeenCalledTimes(1);
    const [entries, receivedObserver] = callback.mock.calls[0];
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ target: element, isIntersecting: true, intersectionRatio: 1 });
    expect(receivedObserver).toBe(observer);
  });

  it('reports a leaving entry when asked for isIntersecting false', () => {
    const callback = vi.fn();
    const element = createElement();
    new IntersectionObserver(callback).observe(element);

    triggerIntersection(element, false);

    expect(callback.mock.calls[0][0][0]).toMatchObject({ isIntersecting: false, intersectionRatio: 0 });
  });

  it('reaches every observer of the element and no observer of another element', () => {
    const first = vi.fn();
    const second = vi.fn();
    const other = vi.fn();
    const element = createElement();
    new IntersectionObserver(first).observe(element);
    new IntersectionObserver(second).observe(element);
    new IntersectionObserver(other).observe(createElement());

    triggerIntersection(element);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(other).not.toHaveBeenCalled();
  });

  it('stops reaching an element after unobserve', () => {
    const callback = vi.fn();
    const element = createElement();
    const observer = new IntersectionObserver(callback);
    observer.observe(element);
    observer.unobserve(element);

    expect(() => triggerIntersection(element)).toThrow(/no IntersectionObserver is observing/);
    expect(callback).not.toHaveBeenCalled();
  });

  it('stops reaching an element after disconnect', () => {
    const callback = vi.fn();
    const element = createElement();
    const observer = new IntersectionObserver(callback);
    observer.observe(element);
    observer.disconnect();

    expect(() => triggerIntersection(element)).toThrow(/no IntersectionObserver is observing/);
    expect(callback).not.toHaveBeenCalled();
  });

  it('throws when nothing observes the element, so a test cannot pass without the visibility path', () => {
    expect(() => triggerIntersection(createElement())).toThrow(/no IntersectionObserver is observing/);
  });

  it('keeps the observer options readable', () => {
    const observer = new IntersectionObserver(vi.fn(), { rootMargin: '0px 0px -8% 0px', threshold: 0.5 });

    expect(observer.rootMargin).toBe('0px 0px -8% 0px');
    expect(observer.thresholds).toEqual([0.5]);
    expect(observer.root).toBeNull();
  });
});
