import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useScrollToHash } from './useScrollToHash';

const FRAME_MS = 16;
const RETRY_WINDOW_MS = 1000;

function routerAt(entry: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(MemoryRouter, { initialEntries: [entry] }, children);
  };
}

function mountTarget(id: string): ReturnType<typeof vi.fn> {
  const el = document.createElement('section');
  el.id = id;
  const scrollIntoView = vi.fn();
  el.scrollIntoView = scrollIntoView;
  document.body.appendChild(el);
  return scrollIntoView;
}

describe('useScrollToHash', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('scrolls smoothly to the element named by the hash', () => {
    const scrollIntoView = mountTarget('x');

    renderHook(() => useScrollToHash(), { wrapper: routerAt('/#x') });
    vi.advanceTimersByTime(FRAME_MS);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('keeps retrying and scrolls once the element mounts within one second', () => {
    renderHook(() => useScrollToHash(), { wrapper: routerAt('/#x') });
    vi.advanceTimersByTime(3 * FRAME_MS);

    const scrollIntoView = mountTarget('x');
    expect(scrollIntoView).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2 * FRAME_MS);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('still scrolls when the element mounts just inside the one second window', () => {
    renderHook(() => useScrollToHash(), { wrapper: routerAt('/#x') });
    vi.advanceTimersByTime(RETRY_WINDOW_MS - 100);

    const scrollIntoView = mountTarget('x');
    expect(scrollIntoView).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2 * FRAME_MS);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('stops scrolling retries after the element is found', () => {
    mountTarget('x');

    renderHook(() => useScrollToHash(), { wrapper: routerAt('/#x') });
    vi.advanceTimersByTime(FRAME_MS);

    expect(vi.getTimerCount()).toBe(0);
  });

  it('gives up after about one second when the element never appears', () => {
    expect(() => {
      renderHook(() => useScrollToHash(), { wrapper: routerAt('/#missing') });
      vi.advanceTimersByTime(RETRY_WINDOW_MS + 4 * FRAME_MS);
    }).not.toThrow();

    expect(vi.getTimerCount()).toBe(0);

    const late = mountTarget('missing');
    vi.advanceTimersByTime(RETRY_WINDOW_MS);
    expect(late).not.toHaveBeenCalled();
  });

  it('does nothing without a hash', () => {
    const scrollIntoView = mountTarget('x');

    renderHook(() => useScrollToHash(), { wrapper: routerAt('/') });

    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(RETRY_WINDOW_MS);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('scrolls again when the same hash is followed a second time (a new navigation, same hash)', () => {
    const scrollIntoView = mountTarget('x');
    const { result } = renderHook(
      () => {
        useScrollToHash();
        return useNavigate();
      },
      { wrapper: routerAt('/#x') },
    );
    vi.advanceTimersByTime(FRAME_MS);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);

    act(() => result.current('/#x'));
    vi.advanceTimersByTime(FRAME_MS);

    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it('does not scroll again on a re-render that is not a navigation', () => {
    const scrollIntoView = mountTarget('x');
    const { rerender } = renderHook(() => useScrollToHash(), { wrapper: routerAt('/#x') });
    vi.advanceTimersByTime(FRAME_MS);

    rerender();
    vi.advanceTimersByTime(RETRY_WINDOW_MS);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('cancels the pending retry on unmount', () => {
    const { unmount } = renderHook(() => useScrollToHash(), { wrapper: routerAt('/#x') });
    expect(vi.getTimerCount()).toBe(1);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
