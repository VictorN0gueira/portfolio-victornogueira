import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from './useDebouncedValue';

const DELAY_MS = 600;

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with the value it was given, so nothing is missing on the first render', () => {
    const { result } = renderHook(() => useDebouncedValue('first', DELAY_MS));

    expect(result.current).toBe('first');
  });

  it('keeps the old value until the value has been quiet for the whole delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, DELAY_MS), {
      initialProps: { value: 'first' },
    });

    rerender({ value: 'second' });
    act(() => {
      vi.advanceTimersByTime(DELAY_MS - 1);
    });
    expect(result.current).toBe('first');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('second');
  });

  it('restarts the wait on every change and settles on the last value only', () => {
    const seen: string[] = [];
    const { rerender } = renderHook(
      ({ value }) => {
        const debounced = useDebouncedValue(value, DELAY_MS);
        seen.push(debounced);
        return debounced;
      },
      { initialProps: { value: 'a' } },
    );

    for (const value of ['b', 'c', 'd']) {
      rerender({ value });
      act(() => {
        vi.advanceTimersByTime(DELAY_MS - 100);
      });
    }
    act(() => {
      vi.advanceTimersByTime(DELAY_MS);
    });

    expect(new Set(seen)).toEqual(new Set(['a', 'd']));
  });

  it('drops the pending update when it unmounts', () => {
    const { rerender, unmount } = renderHook(({ value }) => useDebouncedValue(value, DELAY_MS), {
      initialProps: { value: 'first' },
    });

    rerender({ value: 'second' });
    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
