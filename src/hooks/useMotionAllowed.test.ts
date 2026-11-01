import { act, renderHook } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAccessibility } from '../contexts/useAccessibility';
import { REDUCED_MOTION_QUERY, stubMatchMedia } from '../test/matchMedia';
import { AllProviders } from '../test/render';
import { useCycle } from './useCycle';
import { useMotionAllowed } from './useMotionAllowed';
import { A11Y_STORAGE_KEY } from '../contexts/AccessibilityContext';

const INTERVAL_MS = 1000;

describe('useMotionAllowed', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('is true when nothing asks for less motion', () => {
    stubMatchMedia();

    const { result } = renderHook(() => useMotionAllowed(), { wrapper: AllProviders });

    expect(result.current).toBe(true);
  });

  it('is false when the system prefers reduced motion', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });

    const { result } = renderHook(() => useMotionAllowed(), { wrapper: AllProviders });

    expect(result.current).toBe(false);
  });

  it('is false when the saved accessibility preference turns animations off', () => {
    stubMatchMedia();
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify({ noAnimations: true }));

    const { result } = renderHook(() => useMotionAllowed(), { wrapper: AllProviders });

    expect(result.current).toBe(false);
  });

  it('flips from true to false, and back, when the system setting changes, without remounting', () => {
    const media = stubMatchMedia();
    let mounts = 0;
    const { result } = renderHook(
      () => {
        useEffect(() => {
          mounts += 1;
        }, []);
        return useMotionAllowed();
      },
      { wrapper: AllProviders },
    );
    expect(result.current).toBe(true);

    act(() => media.set(REDUCED_MOTION_QUERY, true));
    expect(result.current).toBe(false);

    act(() => media.set(REDUCED_MOTION_QUERY, false));
    expect(result.current).toBe(true);
    expect(mounts).toBe(1);
  });

  it('reacts when the accessibility toggle changes at runtime', () => {
    stubMatchMedia();
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

  it('stays false while either source asks for less motion', () => {
    const media = stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });
    const { result } = renderHook(
      () => ({ allowed: useMotionAllowed(), a11y: useAccessibility() }),
      { wrapper: AllProviders },
    );

    act(() => result.current.a11y.toggle('noAnimations'));
    act(() => media.set(REDUCED_MOTION_QUERY, false));
    expect(result.current.allowed).toBe(false);

    act(() => result.current.a11y.toggle('noAnimations'));
    expect(result.current.allowed).toBe(true);
  });

  it('throws outside the accessibility provider', () => {
    stubMatchMedia();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      expect(() => renderHook(() => useMotionAllowed())).toThrow(/AccessibilityProvider/);
    } finally {
      errorSpy.mockRestore();
    }
  });

  describe('driving autoplay', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('stops a running useCycle when the system turns reduced motion on mid session', () => {
      const media = stubMatchMedia();
      const { result } = renderHook(
        () => {
          const allowed = useMotionAllowed();
          return useCycle(4, INTERVAL_MS, { enabled: allowed });
        },
        { wrapper: AllProviders },
      );
      act(() => vi.advanceTimersByTime(INTERVAL_MS));
      expect(result.current.index).toBe(1);

      act(() => media.set(REDUCED_MOTION_QUERY, true));
      act(() => vi.advanceTimersByTime(5 * INTERVAL_MS));

      expect(result.current.index).toBe(1);
      expect(vi.getTimerCount()).toBe(0);
    });
  });
});
