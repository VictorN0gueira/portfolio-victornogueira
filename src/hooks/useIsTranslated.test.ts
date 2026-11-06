import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useIsTranslated } from './useIsTranslated';

const root = document.documentElement;

/** The mutations of the root are seen in a microtask: let it run inside act. */
async function flushObserver(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('useIsTranslated', () => {
  afterEach(() => {
    root.className = '';
    root.lang = 'pt-BR';
  });

  it('is false for the page as it was written: Portuguese, no translator class', () => {
    root.lang = 'pt-BR';

    const { result } = renderHook(() => useIsTranslated());

    expect(result.current).toBe(false);
  });

  it('is true from the first render when a translator already worked on the page (its class on the root)', () => {
    root.classList.add('translated-ltr');

    const { result } = renderHook(() => useIsTranslated());

    expect(result.current).toBe(true);
  });

  it('is true when the language of the page is not Portuguese any more (the way other translators say it)', () => {
    root.lang = 'en';

    const { result } = renderHook(() => useIsTranslated());

    expect(result.current).toBe(true);
  });

  it('turns true when the translator arrives in the middle, and false when it leaves', async () => {
    const { result } = renderHook(() => useIsTranslated());
    expect(result.current).toBe(false);

    root.classList.add('translated-rtl');
    await flushObserver();
    expect(result.current).toBe(true);

    root.classList.remove('translated-rtl');
    await flushObserver();
    expect(result.current).toBe(false);

    root.lang = 'en-US';
    await flushObserver();
    expect(result.current).toBe(true);
  });

  it('does not mistake another class of the root for a translation', () => {
    root.classList.add('a11y-font-large', 'translated');

    const { result } = renderHook(() => useIsTranslated());

    expect(result.current).toBe(false);
  });

  it('stops watching the root when the component goes away', async () => {
    const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
    const { unmount } = renderHook(() => useIsTranslated());
    expect(disconnect).not.toHaveBeenCalled();

    unmount();

    expect(disconnect).toHaveBeenCalledTimes(1);
    disconnect.mockRestore();
  });
});
