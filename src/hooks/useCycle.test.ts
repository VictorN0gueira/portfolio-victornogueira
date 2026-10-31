import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCycle } from './useCycle';
import { setVisibility } from '../test/visibility';

const INTERVAL_MS = 1000;

describe('useCycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setVisibility('visible');
  });

  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(document, 'visibilityState');
  });

  it('starts at index 0 in auto mode', () => {
    const { result } = renderHook(() => useCycle(4, INTERVAL_MS));

    expect(result.current.index).toBe(0);
    expect(result.current.isAuto).toBe(true);
  });

  it('advances every interval and wraps back to 0 after a full lap', () => {
    const { result } = renderHook(() => useCycle(4, INTERVAL_MS));

    act(() => vi.advanceTimersByTime(INTERVAL_MS));
    expect(result.current.index).toBe(1);

    act(() => vi.advanceTimersByTime(3 * INTERVAL_MS));
    expect(result.current.index).toBe(0);
  });

  it('freezes on pause and continues on resume', () => {
    const { result } = renderHook(() => useCycle(4, INTERVAL_MS));

    act(() => result.current.pause());
    act(() => vi.advanceTimersByTime(5 * INTERVAL_MS));
    expect(result.current.index).toBe(0);

    act(() => result.current.resume());
    act(() => vi.advanceTimersByTime(INTERVAL_MS));
    expect(result.current.index).toBe(1);
  });

  it('select pins the index and turns auto mode off for good', () => {
    const { result } = renderHook(() => useCycle(4, INTERVAL_MS));

    act(() => result.current.select(2));
    expect(result.current.index).toBe(2);
    expect(result.current.isAuto).toBe(false);

    act(() => vi.advanceTimersByTime(10 * INTERVAL_MS));
    expect(result.current.index).toBe(2);

    act(() => {
      result.current.pause();
      result.current.resume();
    });
    act(() => vi.advanceTimersByTime(10 * INTERVAL_MS));
    expect(result.current.index).toBe(2);
    expect(result.current.isAuto).toBe(false);
  });

  it('select wraps out of range and negative indexes into range', () => {
    const { result } = renderHook(() => useCycle(4, INTERVAL_MS));

    act(() => result.current.select(5));
    expect(result.current.index).toBe(1);

    act(() => result.current.select(-1));
    expect(result.current.index).toBe(3);
  });

  it('select ignores a non-finite index by falling back to 0', () => {
    const { result } = renderHook(() => useCycle(4, INTERVAL_MS));

    act(() => result.current.select(2));
    act(() => result.current.select(Number.NaN));

    expect(result.current.index).toBe(0);
  });

  it('never advances when enabled is false', () => {
    const { result } = renderHook(() => useCycle(4, INTERVAL_MS, { enabled: false }));

    act(() => vi.advanceTimersByTime(10 * INTERVAL_MS));

    expect(result.current.index).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('starts advancing once enabled turns true', () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => useCycle(4, INTERVAL_MS, { enabled }),
      { initialProps: { enabled: false } },
    );

    rerender({ enabled: true });
    act(() => vi.advanceTimersByTime(INTERVAL_MS));

    expect(result.current.index).toBe(1);
  });

  it('does not advance while the document is hidden', () => {
    setVisibility('hidden');
    const { result } = renderHook(() => useCycle(4, INTERVAL_MS));

    act(() => vi.advanceTimersByTime(5 * INTERVAL_MS));

    expect(result.current.index).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stops when the tab is hidden and resumes when it is visible again', () => {
    const { result } = renderHook(() => useCycle(4, INTERVAL_MS));

    act(() => setVisibility('hidden'));
    act(() => vi.advanceTimersByTime(5 * INTERVAL_MS));
    expect(result.current.index).toBe(0);
    expect(vi.getTimerCount()).toBe(0);

    act(() => setVisibility('visible'));
    act(() => vi.advanceTimersByTime(INTERVAL_MS));
    expect(result.current.index).toBe(1);
  });

  it.each([1, 0])('never schedules a timer when length is %i', (length) => {
    const { result } = renderHook(() => useCycle(length, INTERVAL_MS));

    expect(vi.getTimerCount()).toBe(0);
    act(() => vi.advanceTimersByTime(5 * INTERVAL_MS));
    expect(result.current.index).toBe(0);
  });

  it('keeps select with length 0 at index 0', () => {
    const { result } = renderHook(() => useCycle(0, INTERVAL_MS));

    act(() => result.current.select(3));

    expect(result.current.index).toBe(0);
    expect(result.current.isAuto).toBe(false);
  });

  it('keeps the index in range when length shrinks', () => {
    const { result, rerender } = renderHook(({ length }) => useCycle(length, INTERVAL_MS), {
      initialProps: { length: 4 },
    });

    act(() => result.current.select(3));
    rerender({ length: 2 });

    expect(result.current.index).toBe(1);
  });

  it('keeps the identity of select, pause and resume when length changes', () => {
    const { result, rerender } = renderHook(({ length }) => useCycle(length, INTERVAL_MS), {
      initialProps: { length: 4 },
    });
    const first = result.current;

    rerender({ length: 2 });
    rerender({ length: 6 });

    expect(result.current.select).toBe(first.select);
    expect(result.current.pause).toBe(first.pause);
    expect(result.current.resume).toBe(first.resume);
  });

  it('keeps the derived index in range through a length change in either direction', () => {
    const { result, rerender } = renderHook(({ length }) => useCycle(length, INTERVAL_MS), {
      initialProps: { length: 4 },
    });
    act(() => result.current.select(3));

    for (const length of [3, 2, 1, 5, 4]) {
      rerender({ length });
      expect(result.current.index).toBeGreaterThanOrEqual(0);
      expect(result.current.index).toBeLessThan(length);
    }
  });

  it('keeps auto advancing inside the new range after length shrinks', () => {
    const { result, rerender } = renderHook(({ length }) => useCycle(length, INTERVAL_MS), {
      initialProps: { length: 4 },
    });
    act(() => vi.advanceTimersByTime(3 * INTERVAL_MS));
    expect(result.current.index).toBe(3);

    rerender({ length: 2 });
    expect(result.current.index).toBe(1);

    act(() => vi.advanceTimersByTime(INTERVAL_MS));
    expect(result.current.index).toBe(0);
    act(() => vi.advanceTimersByTime(INTERVAL_MS));
    expect(result.current.index).toBe(1);
  });

  it('returns stable select, pause and resume across renders', () => {
    const { result, rerender } = renderHook(() => useCycle(4, INTERVAL_MS));
    const first = result.current;

    act(() => vi.advanceTimersByTime(INTERVAL_MS));
    rerender();

    expect(result.current.select).toBe(first.select);
    expect(result.current.pause).toBe(first.pause);
    expect(result.current.resume).toBe(first.resume);
  });

  it('clears every timer and listener on unmount', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    try {
      const { unmount } = renderHook(() => useCycle(4, INTERVAL_MS));
      expect(vi.getTimerCount()).toBe(1);

      unmount();

      expect(vi.getTimerCount()).toBe(0);
      expect(removeSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    } finally {
      removeSpy.mockRestore();
    }
  });

  describe('isRunning', () => {
    it('is true from the start, and the index moves with every interval while it is', () => {
      const { result } = renderHook(() => useCycle(4, INTERVAL_MS));
      expect(result.current.isRunning).toBe(true);

      act(() => vi.advanceTimersByTime(INTERVAL_MS));

      expect(result.current.index).toBe(1);
      expect(result.current.isRunning).toBe(true);
    });

    it('is false while it is disabled, and the index stays put', () => {
      const { result } = renderHook(() => useCycle(4, INTERVAL_MS, { enabled: false }));

      expect(result.current.isRunning).toBe(false);
      act(() => vi.advanceTimersByTime(3 * INTERVAL_MS));

      expect(result.current.index).toBe(0);
    });

    it('is true again when it is enabled, and the index moves', () => {
      const { result, rerender } = renderHook(({ enabled }) => useCycle(4, INTERVAL_MS, { enabled }), {
        initialProps: { enabled: false },
      });

      rerender({ enabled: true });

      expect(result.current.isRunning).toBe(true);
      act(() => vi.advanceTimersByTime(INTERVAL_MS));
      expect(result.current.index).toBe(1);
    });

    it('is false while it is paused, and true again after resume, with the index moving only then', () => {
      const { result } = renderHook(() => useCycle(4, INTERVAL_MS));

      act(() => result.current.pause());
      expect(result.current.isRunning).toBe(false);
      act(() => vi.advanceTimersByTime(3 * INTERVAL_MS));
      expect(result.current.index).toBe(0);

      act(() => result.current.resume());
      expect(result.current.isRunning).toBe(true);
      act(() => vi.advanceTimersByTime(INTERVAL_MS));
      expect(result.current.index).toBe(1);
    });

    it('is false for good once an index was selected, and the index stays on it', () => {
      const { result } = renderHook(() => useCycle(4, INTERVAL_MS));

      act(() => result.current.select(2));

      expect(result.current.isRunning).toBe(false);
      act(() => vi.advanceTimersByTime(3 * INTERVAL_MS));
      expect(result.current.index).toBe(2);
      act(() => {
        result.current.pause();
        result.current.resume();
      });
      expect(result.current.isRunning).toBe(false);
    });

    it('is false while the document is hidden, and true again when it is visible, with the index moving only then', () => {
      const { result } = renderHook(() => useCycle(4, INTERVAL_MS));

      act(() => setVisibility('hidden'));
      expect(result.current.isRunning).toBe(false);
      act(() => vi.advanceTimersByTime(3 * INTERVAL_MS));
      expect(result.current.index).toBe(0);

      act(() => setVisibility('visible'));
      expect(result.current.isRunning).toBe(true);
      act(() => vi.advanceTimersByTime(INTERVAL_MS));
      expect(result.current.index).toBe(1);
    });

    it.each([1, 0])('is false when there are %i items, since there is nothing to step through', (length) => {
      const { result } = renderHook(() => useCycle(length, INTERVAL_MS));

      expect(result.current.isRunning).toBe(false);
    });
  });

  it('restarts the interval when the interval length changes', () => {
    const { result, rerender } = renderHook(({ ms }) => useCycle(4, ms), {
      initialProps: { ms: INTERVAL_MS },
    });

    rerender({ ms: 200 });
    act(() => vi.advanceTimersByTime(200));

    expect(result.current.index).toBe(1);
  });
});
