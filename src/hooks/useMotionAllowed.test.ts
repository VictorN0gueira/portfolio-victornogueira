import { act, renderHook } from '@testing-library/react';
import { useReducedMotion } from 'motion/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { AllProviders } from '../test/render';
import { useMotionAllowed } from './useMotionAllowed';

vi.mock('motion/react', () => ({ useReducedMotion: vi.fn() }));

const A11Y_STORAGE_KEY = 'a11y-preferences';

describe('useMotionAllowed', () => {
  beforeEach(() => {
    vi.mocked(useReducedMotion).mockReturnValue(false);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('is true when nothing asks for less motion', () => {
    const { result } = renderHook(() => useMotionAllowed(), { wrapper: AllProviders });

    expect(result.current).toBe(true);
  });

  it('is true when useReducedMotion has no answer yet (null)', () => {
    vi.mocked(useReducedMotion).mockReturnValue(null);

    const { result } = renderHook(() => useMotionAllowed(), { wrapper: AllProviders });

    expect(result.current).toBe(true);
  });

  it('is false when the system prefers reduced motion', () => {
    vi.mocked(useReducedMotion).mockReturnValue(true);

    const { result } = renderHook(() => useMotionAllowed(), { wrapper: AllProviders });

    expect(result.current).toBe(false);
  });

  it('is false when the saved accessibility preference turns animations off', () => {
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify({ noAnimations: true }));

    const { result } = renderHook(() => useMotionAllowed(), { wrapper: AllProviders });

    expect(result.current).toBe(false);
  });

  it('reacts when the accessibility toggle changes at runtime', () => {
    const { result } = renderHook(
      () => ({ allowed: useMotionAllowed(), a11y: useAccessibility() }),
      { wrapper: AllProviders },
    );
    expect(result.current.allowed).toBe(true);

    act(() => result.current.a11y.toggle('noAnimations'));
    expect(result.current.allowed).toBe(false);

    act(() => result.current.a11y.toggle('noAnimations'));
    expect(result.current.allowed).toBe(true);
  });

  it('throws outside the accessibility provider', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => renderHook(() => useMotionAllowed())).toThrow(/AccessibilityProvider/);

    errorSpy.mockRestore();
  });
});
