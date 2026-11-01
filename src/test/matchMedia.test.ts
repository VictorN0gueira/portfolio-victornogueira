import { describe, expect, it } from 'vitest';
import { createMediaQueryList } from './matchMedia';

describe('createMediaQueryList', () => {
  it('does not match and has inert listeners by default', () => {
    const list = createMediaQueryList('(min-width: 1px)');

    expect(list.matches).toBe(false);
    expect(list.media).toBe('(min-width: 1px)');
    expect(() => {
      list.addEventListener('change', () => {});
      list.removeEventListener('change', () => {});
      list.addListener(() => {});
      list.removeListener(() => {});
    }).not.toThrow();
    expect(list.dispatchEvent(new Event('change'))).toBe(false);
  });

  it('reads matches from the behavior each time, so a later flip is seen', () => {
    let matching = false;
    const list = createMediaQueryList('(min-width: 1px)', { isMatching: () => matching });

    matching = true;

    expect(list.matches).toBe(true);
  });

  it('uses the listener behavior it is given', () => {
    const added: string[] = [];
    const list = createMediaQueryList('(min-width: 1px)', {
      addEventListener: (type: string) => {
        added.push(type);
      },
    });

    list.addEventListener('change', () => {});

    expect(added).toEqual(['change']);
  });
});
