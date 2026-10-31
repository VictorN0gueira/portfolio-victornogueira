import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { whenIdle } from './whenIdle';

const TIMEOUT_MS = 1200;

describe('whenIdle without requestIdleCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('requestIdleCallback', undefined);
    vi.stubGlobal('cancelIdleCallback', undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('runs the callback once after the timeout', () => {
    const callback = vi.fn();

    whenIdle(callback, TIMEOUT_MS);
    vi.advanceTimersByTime(TIMEOUT_MS - 1);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('never runs the callback after it was cancelled, and leaves no timer', () => {
    const callback = vi.fn();

    whenIdle(callback, TIMEOUT_MS)();
    vi.advanceTimersByTime(TIMEOUT_MS * 2);

    expect(callback).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('whenIdle with requestIdleCallback', () => {
  const request = vi.fn<(callback: () => void, options?: { timeout: number }) => number>();
  const cancel = vi.fn<(handle: number) => void>();

  beforeEach(() => {
    request.mockReset().mockReturnValue(7);
    cancel.mockReset();
    vi.stubGlobal('requestIdleCallback', request);
    vi.stubGlobal('cancelIdleCallback', cancel);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('asks the browser for an idle moment, with the timeout as the latest it may wait', () => {
    whenIdle(() => undefined, TIMEOUT_MS);

    expect(request).toHaveBeenCalledWith(expect.any(Function), { timeout: TIMEOUT_MS });
  });

  it('runs the callback when the browser says it is idle', () => {
    const callback = vi.fn();
    whenIdle(callback, TIMEOUT_MS);

    request.mock.calls[0][0]();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('cancels the idle request it made', () => {
    whenIdle(() => undefined, TIMEOUT_MS)();

    expect(cancel).toHaveBeenCalledWith(7);
  });
});
