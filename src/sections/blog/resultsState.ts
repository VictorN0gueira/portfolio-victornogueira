export type ResultsState = 'error' | 'loading' | 'empty' | 'no-match' | 'articles';

/** What the list of the blog shows: one state at a time. */
export function pickState(
  isLoading: boolean,
  error: string | null,
  articleCount: number,
  visibleCount: number,
): ResultsState {
  if (isLoading) return 'loading';
  if (error) return 'error';
  if (articleCount === 0) return 'empty';
  return visibleCount === 0 ? 'no-match' : 'articles';
}
