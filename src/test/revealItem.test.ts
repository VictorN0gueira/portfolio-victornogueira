import { describe, expect, it } from 'vitest';
import { itemOf } from './revealItem';

describe('itemOf', () => {
  it('returns the closest reveal wrapper of an element', () => {
    document.body.innerHTML = '<div data-reveal-item id="outer"><div data-reveal-item id="inner"><p id="text">x</p></div></div>';

    expect(itemOf(document.getElementById('text') as HTMLElement).id).toBe('inner');
  });

  it('returns the element itself when it is the wrapper', () => {
    document.body.innerHTML = '<div data-reveal-item id="item"></div>';
    const item = document.getElementById('item') as HTMLElement;

    expect(itemOf(item)).toBe(item);
  });

  it('throws a clear error outside any wrapper, where the old inline copies returned null', () => {
    document.body.innerHTML = '<p id="text">x</p>';

    expect(() => itemOf(document.getElementById('text') as HTMLElement)).toThrow('data-reveal-item');
  });
});
