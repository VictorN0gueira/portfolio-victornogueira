import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { A11Y_STORAGE_KEY } from '../contexts/AccessibilityContext';
import { useAccessibility } from '../contexts/useAccessibility';
import { REDUCED_MOTION_QUERY, stubMatchMedia } from '../test/matchMedia';
import { AllProviders } from '../test/render';
import { useScramble } from './useScramble';

const TEXT = 'Página não encontrada';
const START_MS = 400;
const TOTAL_MS = 4000;
// The title is lowercase by CSS, so the letters that stand in for it are lowercase too, plus digits and a few symbols.
const SCRAMBLE_ALPHABET = /^[a-z0-9@#$%&!?]$/;
const ACCENTED = /[ãâáàêéíóôúçñ]/i;

function renderScramble(text = TEXT, options: { strict?: boolean } = {}) {
  return renderHook(() => useScramble(text), {
    wrapper: AllProviders,
    reactStrictMode: options.strict ?? false,
  });
}

describe('useScramble', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('starts on the real text and ends on it, with no letter left scrambled', () => {
    stubMatchMedia();
    const { result } = renderScramble();
    expect(result.current).toBe(TEXT);

    act(() => {
      vi.advanceTimersByTime(START_MS + TOTAL_MS);
    });

    expect(result.current).toBe(TEXT);
  });

  it('waits before it starts and then swaps letters for lowercase stand ins, keeping spaces and accents', () => {
    stubMatchMedia();
    const { result } = renderScramble();
    act(() => {
      vi.advanceTimersByTime(START_MS);
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    const shown = result.current;
    expect(shown).not.toBe(TEXT);
    expect(shown).toHaveLength(TEXT.length);
    shown.split('').forEach((char, index) => {
      const real = TEXT[index];
      if (real === ' ' || ACCENTED.test(real)) {
        expect(char).toBe(real);
      } else {
        expect(char === real || SCRAMBLE_ALPHABET.test(char), `"${char}" at ${index}`).toBe(true);
      }
    });
  });

  it('shows the real text at once, with no timer, when the visitor asks for reduced motion', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });
    const { result } = renderScramble();

    act(() => {
      vi.advanceTimersByTime(START_MS + TOTAL_MS);
    });

    expect(result.current).toBe(TEXT);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('shows the real text, with no timer, when the saved preference turned animations off', () => {
    stubMatchMedia();
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify({ noAnimations: true }));
    const { result } = renderScramble();

    act(() => {
      vi.advanceTimersByTime(START_MS + 100);
    });

    expect(result.current).toBe(TEXT);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stops in the middle and shows the real text when animations are paused while it runs', () => {
    stubMatchMedia();
    const { result } = renderHook(() => ({ text: useScramble(TEXT), a11y: useAccessibility() }), {
      wrapper: AllProviders,
    });
    act(() => {
      vi.advanceTimersByTime(START_MS);
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.text).not.toBe(TEXT);

    act(() => result.current.a11y.toggle('noAnimations'));

    expect(result.current.text).toBe(TEXT);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.text).toBe(TEXT);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('works where matchMedia does not exist', () => {
    vi.stubGlobal('matchMedia', undefined);
    const { result } = renderScramble();

    act(() => {
      vi.advanceTimersByTime(START_MS + TOTAL_MS);
    });

    expect(result.current).toBe(TEXT);
  });

  it('still ends on the exact text under StrictMode, where effects run twice', () => {
    stubMatchMedia();
    const { result } = renderScramble(TEXT, { strict: true });

    act(() => {
      vi.advanceTimersByTime(START_MS + TOTAL_MS + 400);
    });

    expect(result.current).toBe(TEXT);
  });
});
