import { useMemo, useRef, useState } from 'react';
import { detectCategory, type NewsArticle } from '../../utils/newsService';
import type { CatFilter, LangFilter } from './blogMeta';

interface Filters {
  language: LangFilter;
  category: CatFilter;
  query: string;
}

/** The articles that pass the language, the topic and the search (in the title or the summary, whatever the case). */
export function filterArticles(
  articles: readonly NewsArticle[],
  { language, category, query }: Filters,
): NewsArticle[] {
  const needle = query.toLowerCase();
  return articles.filter((article) => {
    const matchesLanguage = language === 'all' || article.language === language;
    const matchesCategory = category === 'all' || detectCategory(article) === category;
    const matchesSearch =
      !needle ||
      article.title.toLowerCase().includes(needle) ||
      (article.description || '').toLowerCase().includes(needle);
    return matchesLanguage && matchesCategory && matchesSearch;
  });
}

/**
 * The state of the filters of the blog and the list they leave. This is the one owner of the focus after the filters are
 * cleared (by the band or by the empty block): it goes to the search field.
 */
export function useBlogFilters(articles: readonly NewsArticle[]) {
  const [language, setLanguage] = useState<LangFilter>('all');
  const [category, setCategory] = useState<CatFilter>('all');
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const visibleArticles = useMemo(
    () => filterArticles(articles, { language, category, query }),
    [articles, language, category, query],
  );

  const clear = () => {
    setLanguage('all');
    setCategory('all');
    setQuery('');
    // The clear buttons go away with the filters: the focus goes to the search field, not to the body (WCAG 2.4.3).
    searchRef.current?.focus();
  };

  return {
    language,
    category,
    query,
    searchRef,
    visibleArticles,
    hasActiveFilters: language !== 'all' || category !== 'all' || query !== '',
    setLanguage,
    setCategory,
    setQuery,
    clear,
  };
}
