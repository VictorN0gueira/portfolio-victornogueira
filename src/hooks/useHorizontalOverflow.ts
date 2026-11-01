import { useEffect, useState, type RefObject } from 'react';

/**
 * True while the content of the element is wider than its box, so it scrolls sideways. It measures after the
 * first render and again whenever the box or one of its children changes size (a narrower screen, a larger
 * font). The observer is disconnected on unmount. Where ResizeObserver does not exist it measures once.
 */
export function useHorizontalOverflow(ref: RefObject<HTMLElement | null>): boolean {
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const measure = () => setIsOverflowing(element.scrollWidth > element.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    Array.from(element.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [ref]);

  return isOverflowing;
}
