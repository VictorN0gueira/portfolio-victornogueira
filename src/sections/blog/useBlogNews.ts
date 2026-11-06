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

type Outcome = { articles: NewsArticle[]; origin: NewsOrigin } | { error: string };

/** One load of the list. It never throws: a failure becomes words the visitor can read, never the message of the error. */
async function loadList(forceRefresh: boolean): Promise<Outcome> {
  try {
    const { articles, origin } = await getNewsArticles({ forceRefresh });
    return { articles, origin };
  } catch {
    return { error: blogCopy.states.errorFallback };
  }
}

/**
 * The articles of the blog and the state of their load. One load is current at a time: starting another (the first one, a
 * refresh) aborts the one before, so a slower answer of an older load never lands on top of a newer one, and nothing is set
 * after the page is gone. A failed load leaves no list and no origin behind, so nothing on the page still talks about it.
 */
export function useBlogNews(): BlogNews {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState<NewsOrigin | null>(null);

  const currentLoad = useRef<AbortController | null>(null);
  const startLoad = useCallback((forceRefresh: boolean) => {
    currentLoad.current?.abort();
    const controller = new AbortController();
    currentLoad.current = controller;
    // The answer goes into the state only after the await, so the first load (the state starts as loading) never sets state
    // inside the effect that starts it.
    void loadList(forceRefresh).then((outcome) => {
      if (controller.signal.aborted) return;
      if ('error' in outcome) {
        setError(outcome.error);
        setArticles([]);
        setOrigin(null);
      } else {
        setArticles(outcome.articles);
        setOrigin(outcome.origin);
      }
      setIsLoading(false);
    });
  }, []);

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
