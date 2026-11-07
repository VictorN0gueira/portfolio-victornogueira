// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STALE_TAB_RETURN_MS, useBlogNews } from './useBlogNews';

const getNewsArticles = vi.hoisted(() => vi.fn());

vi.mock('../../utils/newsService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/newsService')>()),
  getNewsArticles,
}));

const ARTICLE = {
  title: 'Artigo visível',
  description: 'Resumo',
  url: 'https://example.com/artigo-1',
  image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800',
  publishedAt: new Date().toISOString(),
  source: { name: 'Fonte', url: 'https://example.com' },
  language: 'pt' as const,
};

function hide() {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  document.dispatchEvent(new Event('visibilitychange'));
}

function show() {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  getNewsArticles.mockReset();
  getNewsArticles.mockResolvedValue({ articles: [ARTICLE], source: 'supabase', origin: 'live' });
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('useBlogNews tab visibility', () => {
  it('refreshes once when the tab was hidden for more than 30 minutes', async () => {
    const { result } = renderHook(() => useBlogNews());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const callsBefore = getNewsArticles.mock.calls.length;
    const hiddenAt = Date.now();

    act(() => hide());

    // Mock Date.now() so returning looks like STALE_TAB_RETURN_MS later
    vi.spyOn(Date, 'now').mockReturnValue(hiddenAt + STALE_TAB_RETURN_MS + 1_000);
    act(() => show());

    await waitFor(() => expect(getNewsArticles.mock.calls.length).toBe(callsBefore + 1));
  });

  it('does not refresh when the tab was hidden for less than 30 minutes', async () => {
    const { result } = renderHook(() => useBlogNews());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const callsBefore = getNewsArticles.mock.calls.length;
    const hiddenAt = Date.now();

    act(() => hide());

    // Return 5 minutes later: not stale
    vi.spyOn(Date, 'now').mockReturnValue(hiddenAt + 5 * 60 * 1000);
    act(() => show());

    // Brief pause; loading should not start
    await act(async () => {
      /* flush microtasks */
    });
    expect(result.current.isLoading).toBe(false);
    expect(getNewsArticles.mock.calls.length).toBe(callsBefore);
  });

  it('does not refresh when the tab was not hidden before returning', async () => {
    const { result } = renderHook(() => useBlogNews());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const callsBefore = getNewsArticles.mock.calls.length;

    // Show event without a preceding hide
    act(() => show());

    await act(async () => {
      /* flush microtasks */
    });
    expect(result.current.isLoading).toBe(false);
    expect(getNewsArticles.mock.calls.length).toBe(callsBefore);
  });

  it('removes the visibilitychange listener when the hook unmounts', async () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');

    const { result, unmount } = renderHook(() => useBlogNews());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(addSpy.mock.calls.some(([type]) => type === 'visibilitychange')).toBe(true);

    unmount();

    expect(removeSpy.mock.calls.some(([type]) => type === 'visibilitychange')).toBe(true);
  });
});
