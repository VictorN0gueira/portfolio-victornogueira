import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { stubMatchMedia } from '../test/matchMedia';
import { useMediaQuery } from './useMediaQuery';

const WIDE = '(min-width: 1024px)';
const DARK = '(prefers-color-scheme: dark)';

describe('useMediaQuery', () => {
  it('reads the initial match of the given query', () => {
    stubMatchMedia({ [WIDE]: true, [DARK]: false });

    const wide = renderHook(() => useMediaQuery(WIDE));
    const dark = renderHook(() => useMediaQuery(DARK));

    expect(wide.result.current).toBe(true);
    expect(dark.result.current).toBe(false);
  });

  it('re-renders when only its own query changes', () => {
    const media = stubMatchMedia({ [WIDE]: false, [DARK]: false });
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return useMediaQuery(WIDE);
    });
    const rendersAfterMount = renders;

    act(() => media.set(DARK, true));
    expect(renders).toBe(rendersAfterMount);

    act(() => media.set(WIDE, true));
    expect(result.current).toBe(true);
  });

  it('switches to the new query when the argument changes', () => {
    const media = stubMatchMedia({ [WIDE]: true, [DARK]: false });
    const { result, rerender } = renderHook(({ query }) => useMediaQuery(query), {
      initialProps: { query: WIDE },
    });
    expect(result.current).toBe(true);

    rerender({ query: DARK });

    expect(result.current).toBe(false);
    expect(media.listenerCount(WIDE)).toBe(0);
    expect(media.listenerCount(DARK)).toBe(1);
  });

  it('keeps one subscription across unrelated re-renders', () => {
    const media = stubMatchMedia({ [WIDE]: true });
    const { rerender } = renderHook(() => useMediaQuery(WIDE));

    rerender();
    rerender();

    expect(media.removeEventListener).not.toHaveBeenCalled();
    expect(media.listenerCount(WIDE)).toBe(1);
  });

  it('removes its listener on unmount', () => {
    const media = stubMatchMedia({ [WIDE]: true });
    const { unmount } = renderHook(() => useMediaQuery(WIDE));

    unmount();

    expect(media.listenerCount(WIDE)).toBe(0);
  });

  describe('with many components asking the same query', () => {
    const INSTANCES = 50;
    // The first render reads the query before anything is subscribed, and the first subscription opens the one list.
    const MAX_LISTS_OPENED = 3;

    it('holds one listener on the browser, not one per component', () => {
      const media = stubMatchMedia({ [WIDE]: true });

      const views = Array.from({ length: INSTANCES }, () => renderHook(() => useMediaQuery(WIDE)));

      expect(media.listenerCount(WIDE)).toBe(1);
      views.forEach((view) => view.unmount());
    });

    it('opens one MediaQueryList for all of them, and none per render', () => {
      const media = stubMatchMedia({ [WIDE]: true });

      const views = Array.from({ length: INSTANCES }, () => renderHook(() => useMediaQuery(WIDE)));
      views.forEach((view) => view.rerender());

      const opened = media.matchMedia.mock.calls.filter(([query]) => query === WIDE).length;
      expect(opened).toBeLessThanOrEqual(MAX_LISTS_OPENED);
      views.forEach((view) => view.unmount());
    });

    it('tells every one of them when the query flips', () => {
      const media = stubMatchMedia({ [WIDE]: false });
      const views = Array.from({ length: INSTANCES }, () => renderHook(() => useMediaQuery(WIDE)));

      act(() => media.set(WIDE, true));

      expect(views.every((view) => view.result.current === true)).toBe(true);
      views.forEach((view) => view.unmount());
    });

    it('keeps the listener until the last one unmounts, then lets it go', () => {
      const media = stubMatchMedia({ [WIDE]: true });
      const views = Array.from({ length: 3 }, () => renderHook(() => useMediaQuery(WIDE)));

      views[0].unmount();
      views[1].unmount();
      expect(media.listenerCount(WIDE)).toBe(1);

      views[2].unmount();
      expect(media.listenerCount(WIDE)).toBe(0);
    });

    it('keeps one listener per different query', () => {
      const media = stubMatchMedia({ [WIDE]: true, [DARK]: false });

      const views = [
        renderHook(() => useMediaQuery(WIDE)),
        renderHook(() => useMediaQuery(WIDE)),
        renderHook(() => useMediaQuery(DARK)),
        renderHook(() => useMediaQuery(DARK)),
      ];

      expect(media.listenerCount(WIDE)).toBe(1);
      expect(media.listenerCount(DARK)).toBe(1);
      views.forEach((view) => view.unmount());
    });
  });
});
