import { afterEach, describe, expect, it, vi } from 'vitest';
import { timeoutSignal } from './timeoutSignal';

const NATIVE_TIMEOUT = AbortSignal.timeout;

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  Object.defineProperty(AbortSignal, 'timeout', { value: NATIVE_TIMEOUT, configurable: true, writable: true });
});

describe('timeoutSignal', () => {
  it('uses AbortSignal.timeout when the browser has it', () => {
    const native = new AbortController().signal;
    const spy = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(native);

    expect(timeoutSignal(15_000)).toBe(native);
    expect(spy).toHaveBeenCalledWith(15_000);
  });

  it('falls back to an AbortController and a timer when it does not', () => {
    vi.useFakeTimers();
    Object.defineProperty(AbortSignal, 'timeout', { value: undefined, configurable: true, writable: true });

    const signal = timeoutSignal(1_000);
    expect(signal.aborted).toBe(false);
    vi.advanceTimersByTime(999);
    expect(signal.aborted).toBe(false);
    vi.advanceTimersByTime(1);
    expect(signal.aborted).toBe(true);
  });
});
