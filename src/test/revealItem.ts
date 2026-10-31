/**
 * The reveal wrapper (RevealItem) a rendered element sits in: the layout classes of a section card or heading are on
 * this wrapper, not on the element itself. Throws a clear error when the element is not inside one.
 */
export function itemOf(element: HTMLElement): HTMLElement {
  const item = element.closest<HTMLElement>('[data-reveal-item]');
  if (!item) throw new Error('The element is not inside a [data-reveal-item] wrapper');
  return item;
}
