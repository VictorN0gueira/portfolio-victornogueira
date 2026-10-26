import { act, renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { useFinePointer } from './useFinePointer';

const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';

type ChangeListener = (event: MediaQueryListEvent) => void;

function stubMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<ChangeListener>();
  const addEventListener = vi.fn((type: string, listener: ChangeListener) => {
    if (type === 'change') listeners.add(listener);
  });
  const removeEventListener = vi.fn((type: string, listener: ChangeListener) => {
    if (type === 'change') listeners.delete(listener);
  });
  const matchMedia = vi.fn((query: string) => ({
    get matches() {
      return matches;
    },
    media: query,
    addEventListener,
    removeEventListener,
  }));
  vi.stubGlobal('matchMedia', matchMedia);

  return {
    matchMedia,
    listeners,
    removeEventListener,
    change(next: boolean) {
      matches = next;
      listeners.forEach((listener) => listener({ matches: next } as MediaQueryListEvent));
    },
  };
}

describe('useFinePointer', () => {
  it('is true when the fine pointer query matches', () => {
    const media = stubMatchMedia(true);

    const { result } = renderHook(() => useFinePointer());

    expect(result.current).toBe(true);
    expect(media.matchMedia).toHaveBeenCalledWith(FINE_POINTER_QUERY);
  });

  it('is false when the fine pointer query does not match', () => {
    stubMatchMedia(false);

    const { result } = renderHook(() => useFinePointer());

    expect(result.current).toBe(false);
  });

  it('follows change events from the media query', () => {
    const media = stubMatchMedia(false);
    const { result } = renderHook(() => useFinePointer());

    act(() => media.change(true));
    expect(result.current).toBe(true);

    act(() => media.change(false));
    expect(result.current).toBe(false);
  });

  it('removes its change listener on unmount', () => {
    const media = stubMatchMedia(true);
    const { unmount } = renderHook(() => useFinePointer());
    expect(media.listeners.size).toBe(1);

    unmount();

    expect(media.listeners.size).toBe(0);
    expect(media.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('renders false on the server even when the device has a fine pointer', () => {
    stubMatchMedia(true);
    function Probe() {
      return createElement('span', null, String(useFinePointer()));
    }

    expect(renderToString(createElement(Probe))).toContain('false');
  });

  it('is false when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);

    const { result } = renderHook(() => useFinePointer());

    expect(result.current).toBe(false);
  });
});
