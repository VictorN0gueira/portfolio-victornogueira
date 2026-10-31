import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AllProviders } from '../test/render';
import { A11Y_STORAGE_KEY, useAccessibility } from './AccessibilityContext';

const ALL_OFF = {
  fontSize: false,
  highContrast: false,
  grayscale: false,
  noAnimations: false,
  underlineLinks: false,
  readableFont: false,
};

function renderState() {
  return renderHook(() => useAccessibility(), { wrapper: AllProviders });
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.className = '';
});

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.className = '';
});

describe('A11Y_STORAGE_KEY', () => {
  it('is the key the preferences are stored under', () => {
    expect(A11Y_STORAGE_KEY).toBe('a11y-preferences');
  });
});

describe('AccessibilityContext stored preferences', () => {
  it('reads the flags that are exactly true', () => {
    window.localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify({ fontSize: true, grayscale: true }));

    const { result } = renderState();

    expect(result.current.state).toEqual({ ...ALL_OFF, fontSize: true, grayscale: true });
    expect(document.documentElement).toHaveClass('a11y-font-large', 'a11y-grayscale');
  });

  it('does not turn a flag on for a truthy value that is not true (the string "no", 1, an object)', () => {
    window.localStorage.setItem(
      A11Y_STORAGE_KEY,
      JSON.stringify({ fontSize: 'no', highContrast: 1, grayscale: {}, noAnimations: 'true', underlineLinks: [true] }),
    );

    const { result } = renderState();

    expect(result.current.state).toEqual(ALL_OFF);
    expect(document.documentElement.className).not.toMatch(/a11y-/);
  });

  it('drops keys it does not know, and keeps them out of what it writes back', () => {
    window.localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify({ fontSize: true, __proto__: { polluted: true }, extra: true }));

    const { result } = renderState();

    expect(Object.keys(result.current.state).sort()).toEqual(Object.keys(ALL_OFF).sort());
    expect(JSON.parse(window.localStorage.getItem(A11Y_STORAGE_KEY) ?? '{}')).toEqual({ ...ALL_OFF, fontSize: true });
  });

  it('keeps exactly the six known keys in the state when the stored value adds one', () => {
    window.localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify({ fontSize: true, evil: true }));

    const { result } = renderState();

    expect(Object.keys(result.current.state)).toHaveLength(6);
    expect(Object.values(result.current.state).filter(Boolean)).toHaveLength(1);
    expect(result.current.state).not.toHaveProperty('evil');
  });

  it.each([
    ['not JSON', '{oops'],
    ['null', 'null'],
    ['a number', '42'],
    ['a string', '"a11y"'],
    ['an array', '[true, true]'],
    ['an empty string', ''],
  ])('starts with everything off when the stored value is %s', (_label, stored) => {
    window.localStorage.setItem(A11Y_STORAGE_KEY, stored);

    const { result } = renderState();

    expect(result.current.state).toEqual(ALL_OFF);
  });
});

describe('AccessibilityContext value', () => {
  it('keeps the same toggle and reset functions across renders', () => {
    const { result, rerender } = renderState();
    const { toggle, reset } = result.current;

    act(() => result.current.toggle('grayscale'));
    rerender();

    expect(result.current.toggle).toBe(toggle);
    expect(result.current.reset).toBe(reset);
  });

  it('keeps the same value object while nothing changed', () => {
    const { result, rerender } = renderState();
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });

  it('toggles a flag, stores it, and resets everything', () => {
    const { result } = renderState();

    act(() => result.current.toggle('underlineLinks'));
    expect(result.current.state.underlineLinks).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(A11Y_STORAGE_KEY) ?? '{}').underlineLinks).toBe(true);
    expect(document.documentElement).toHaveClass('a11y-underline-links');

    act(() => result.current.reset());
    expect(result.current.state).toEqual(ALL_OFF);
    expect(document.documentElement).not.toHaveClass('a11y-underline-links');
  });
});
