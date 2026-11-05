import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { A11Y_STORAGE_KEY } from '../contexts/AccessibilityContext';
import { useAccessibility } from '../contexts/useAccessibility';
import { REDUCED_MOTION_QUERY, stubMatchMedia } from '../test/matchMedia';
import { AllProviders } from '../test/render';
import { useScramble } from './useScramble';

const TEXT = 'Página não encontrada';
const START_MS = 400;
const TICK_MS = 28;
const TOTAL_MS = 4000;
// The title is lowercase by CSS, so the letters that stand in for it are lowercase too, plus digits and a few symbols.
const SCRAMBLE_ALPHABET = /^[a-z0-9@#$%&!?]$/;
const ACCENTED = /[ãâáàêéíóôúçñ]/i;

function renderScramble(options: { strict?: boolean } = {}) {
  return renderHook(({ text }) => ({ scramble: useScramble(text), a11y: useAccessibility() }), {
    initialProps: { text: TEXT },
    wrapper: AllProviders,
    reactStrictMode: options.strict ?? false,
  });
}

function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

/** Runs the clock in ticks, and says whether the title was scrambled at any of them. */
function sawScramble(read: () => { isScrambling: boolean }, totalMs: number): boolean {
  let hasSeen = false;
  for (let elapsed = 0; elapsed < totalMs; elapsed += TICK_MS) {
    advance(TICK_MS);
    if (read().isScrambling) hasSeen = true;
  }
  return hasSeen;
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

  it('starts on the real text, scrambles after the wait, and ends on the real text', () => {
    stubMatchMedia();
    const { result } = renderScramble();
    expect(result.current.scramble).toEqual({ shown: TEXT, isScrambling: false });

    advance(START_MS - 1);
    expect(result.current.scramble.isScrambling).toBe(false);

    const hasScrambled = sawScramble(() => result.current.scramble, TOTAL_MS);

    expect(hasScrambled).toBe(true);
    expect(result.current.scramble).toEqual({ shown: TEXT, isScrambling: false });
  });

  it('swaps letters for lowercase stand ins in the middle, keeping the length, the spaces and the accents', () => {
    stubMatchMedia();
    const { result } = renderScramble();
    advance(START_MS);
    advance(500);

    const { shown, isScrambling } = result.current.scramble;
    expect(isScrambling).toBe(true);
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

    const hasScrambled = sawScramble(() => result.current.scramble, START_MS + TOTAL_MS);

    expect(hasScrambled).toBe(false);
    expect(result.current.scramble).toEqual({ shown: TEXT, isScrambling: false });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('shows the real text, with no timer, when the saved preference turned animations off', () => {
    stubMatchMedia();
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify({ noAnimations: true }));
    const { result } = renderScramble();

    const hasScrambled = sawScramble(() => result.current.scramble, START_MS + 100);

    expect(hasScrambled).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stops in the middle and shows the real text when animations are paused while it runs', () => {
    stubMatchMedia();
    const { result } = renderScramble();
    advance(START_MS);
    advance(1000);
    expect(result.current.scramble.isScrambling).toBe(true);

    act(() => result.current.a11y.toggle('noAnimations'));

    expect(result.current.scramble).toEqual({ shown: TEXT, isScrambling: false });
    advance(500);
    expect(result.current.scramble.isScrambling).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('starts over, after the same wait, when animations are resumed after a pause in the middle', () => {
    stubMatchMedia();
    const { result } = renderScramble();
    advance(START_MS);
    advance(1000);
    act(() => result.current.a11y.toggle('noAnimations'));
    advance(1000);

    act(() => result.current.a11y.toggle('noAnimations'));
    advance(START_MS - 1);
    expect(result.current.scramble.isScrambling).toBe(false);

    advance(1);
    advance(TICK_MS * 2);
    expect(result.current.scramble.isScrambling).toBe(true);
    advance(TOTAL_MS);
    expect(result.current.scramble).toEqual({ shown: TEXT, isScrambling: false });
  });

  it('leaves a settled title alone: pausing and resuming afterwards does not scramble it again', () => {
    stubMatchMedia();
    const { result } = renderScramble();
    sawScramble(() => result.current.scramble, START_MS + TOTAL_MS);
    expect(result.current.scramble.isScrambling).toBe(false);

    act(() => result.current.a11y.toggle('noAnimations'));
    act(() => result.current.a11y.toggle('noAnimations'));
    const hasScrambled = sawScramble(() => result.current.scramble, START_MS + TOTAL_MS);

    expect(hasScrambled).toBe(false);
    expect(result.current.scramble.shown).toBe(TEXT);
  });

  it('starts again, after the wait, when the text changes', () => {
    stubMatchMedia();
    const { result, rerender } = renderScramble();
    sawScramble(() => result.current.scramble, START_MS + TOTAL_MS);

    rerender({ text: 'Outra página' });
    expect(result.current.scramble).toEqual({ shown: 'Outra página', isScrambling: false });

    const hasScrambled = sawScramble(() => result.current.scramble, START_MS + TOTAL_MS);
    expect(hasScrambled).toBe(true);
    expect(result.current.scramble).toEqual({ shown: 'Outra página', isScrambling: false });
  });

  it('works where matchMedia does not exist', () => {
    vi.stubGlobal('matchMedia', undefined);
    const { result } = renderScramble();

    const hasScrambled = sawScramble(() => result.current.scramble, START_MS + TOTAL_MS);

    expect(hasScrambled).toBe(true);
    expect(result.current.scramble).toEqual({ shown: TEXT, isScrambling: false });
  });

  it('still scrambles and ends on the exact text under StrictMode, where effects run twice', () => {
    stubMatchMedia();
    const { result } = renderScramble({ strict: true });

    const hasScrambled = sawScramble(() => result.current.scramble, START_MS + TOTAL_MS + 400);

    expect(hasScrambled).toBe(true);
    expect(result.current.scramble).toEqual({ shown: TEXT, isScrambling: false });
  });
});
