import { afterEach, describe, expect, it, vi } from 'vitest';
import { matchesFocusVisible } from './useTabsBehavior';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('matchesFocusVisible', () => {
  it('is what :focus-visible says for an element: true for a keyboard focus, false for a click or a tap', () => {
    const element = document.createElement('div');
    const matches = vi.spyOn(element, 'matches');

    matches.mockReturnValue(true);
    expect(matchesFocusVisible(element)).toBe(true);
    matches.mockReturnValue(false);
    expect(matchesFocusVisible(element)).toBe(false);
    expect(matches).toHaveBeenCalledWith(':focus-visible');
  });

  it('counts the focus when the selector is not supported and throws, the safe side being a hold', () => {
    const element = document.createElement('div');
    vi.spyOn(element, 'matches').mockImplementation(() => {
      throw new SyntaxError('not a valid selector');
    });

    expect(matchesFocusVisible(element)).toBe(true);
  });

  it('counts the focus for a target that is not an element', () => {
    expect(matchesFocusVisible(window)).toBe(true);
    expect(matchesFocusVisible(document)).toBe(true);
  });
});
