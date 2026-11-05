import { useCallback, useEffect, useRef, useState } from 'react';
import { getNewsArticles, type NewsArticle, type NewsOrigin } from '../../utils/newsService';
import { blogCopy } from './blogCopy';

interface BlogNews {
  articles: NewsArticle[];
  isLoading: boolean;
  error: string | null;
  /** Where the list came from, as the browser knows it. Null until the first answer. */
  origin: NewsOrigin | null;
  /** Asks the sources again. The saved list stays until a source gives a new one. While a load runs the call does nothing: one load at a time. */
  refresh: () => void;
}

/**
 * The articles of the blog and the state of their load. One load is current at a time: starting another (the first one, a
 * refresh) aborts the one before, so a slower answer of an older load never lands on top of a newer one, and nothing is set
 * after the page is gone.
 */
export function useBlogNews(): BlogNews {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState<NewsOrigin | null>(null);

  // The answer of the sources goes into the state only after the await, so the first load (the state starts as loading)
  // never sets state inside the effect that starts it.
  const loadNews = useCallback(async (signal: AbortSignal, forceRefresh: boolean) => {
    try {
      const result = await getNewsArticles({ forceRefresh });
      if (signal?.aborted) return;
      setArticles(result.articles);
      setOrigin(result.origin);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : blogCopy.states.errorFallback);
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);

  const currentLoad = useRef<AbortController | null>(null);
  const startLoad = useCallback(
    (forceRefresh: boolean) => {
      currentLoad.current?.abort();
      const controller = new AbortController();
      currentLoad.current = controller;
      void loadNews(controller.signal, forceRefresh);
    },
    [loadNews],
  );

  // The refresh button stays in the tab order while a load runs (a disabled button that held the focus would drop it to the
  // body, WCAG 2.4.3): it is aria-disabled, and the press does nothing here.
  const refresh = useCallback(() => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    startLoad(true);
  }, [isLoading, startLoad]);

  useEffect(() => {
    // The state is set after the await (the first render is already loading), never in the body of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    startLoad(false);
    return () => currentLoad.current?.abort();
  }, [startLoad]);

  return { articles, isLoading, error, origin, refresh };
}
