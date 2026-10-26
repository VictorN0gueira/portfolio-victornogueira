import { act, renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { FINE_POINTER_QUERY, stubMatchMedia } from '../test/matchMedia';
import { useFinePointer } from './useFinePointer';

describe('useFinePointer', () => {
  it('is true when the fine pointer query matches', () => {
    const media = stubMatchMedia({ [FINE_POINTER_QUERY]: true });

    const { result } = renderHook(() => useFinePointer());

    expect(result.current).toBe(true);
    expect(media.matchMedia).toHaveBeenCalledWith(FINE_POINTER_QUERY);
  });

  it('is false when the fine pointer query does not match', () => {
    stubMatchMedia({ [FINE_POINTER_QUERY]: false });

    const { result } = renderHook(() => useFinePointer());

    expect(result.current).toBe(false);
  });

  it('follows change events from the media query', () => {
    const media = stubMatchMedia({ [FINE_POINTER_QUERY]: false });
    const { result } = renderHook(() => useFinePointer());

    act(() => media.set(FINE_POINTER_QUERY, true));
    expect(result.current).toBe(true);

    act(() => media.set(FINE_POINTER_QUERY, false));
    expect(result.current).toBe(false);
  });

  it('removes its change listener on unmount', () => {
    const media = stubMatchMedia({ [FINE_POINTER_QUERY]: true });
    const { unmount } = renderHook(() => useFinePointer());
    expect(media.listenerCount(FINE_POINTER_QUERY)).toBe(1);

    unmount();

    expect(media.listenerCount(FINE_POINTER_QUERY)).toBe(0);
    expect(media.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('renders false on the server even when the device has a fine pointer', () => {
    stubMatchMedia({ [FINE_POINTER_QUERY]: true });
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
