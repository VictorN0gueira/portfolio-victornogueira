import { useMemo, useRef, useState } from 'react';
import { detectCategory } from '../utils/newsService';
import { listableArticles } from '../sections/blog/articleLinks';
import { BlogFilters } from '../sections/blog/BlogFilters';
import { BlogHero } from '../sections/blog/BlogHero';
import { BlogResults } from '../sections/blog/BlogResults';
import { describeDataSource, type CatFilter, type LangFilter } from '../sections/blog/blogMeta';
import { useBlogNews } from '../sections/blog/useBlogNews';
import { SEO } from './SEO';

/**
 * The /blog page, inside SiteLayout: the layout owns the header, the main landmark, the skip link, the scroll to the top and
 * the focus after a change of page, so this is only the sections. The articles come from other sites.
 */
export default function BlogPage() {
  const { articles: fetched, isLoading, error, origin, refresh } = useBlogNews();
  const articles = useMemo(() => listableArticles(fetched), [fetched]);
  const [langFilter, setLangFilter] = useState<LangFilter>('all');
  const [catFilter, setCatFilter] = useState<CatFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const visibleArticles = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return articles.filter((article) => {
      const matchesLang = langFilter === 'all' || article.language === langFilter;
      const matchesCat = catFilter === 'all' || detectCategory(article) === catFilter;
      const matchesSearch =
        !query ||
        article.title.toLowerCase().includes(query) ||
        (article.description || '').toLowerCase().includes(query);
      return matchesLang && matchesCat && matchesSearch;
    });
  }, [articles, langFilter, catFilter, searchQuery]);

  const hasActiveFilters = langFilter !== 'all' || catFilter !== 'all' || searchQuery !== '';
  const clearFilters = () => {
    setLangFilter('all');
    setCatFilter('all');
    setSearchQuery('');
    // The clear buttons go away with the filters: the focus goes to the search field, not to the body (WCAG 2.4.3).
    searchRef.current?.focus();
  };

  return (
    <>
      <SEO path="/blog" />
      <BlogHero
        isLoading={isLoading}
        status={origin && !isLoading ? describeDataSource(origin) : ''}
        onRefresh={refresh}
      />
      <BlogFilters
        searchQuery={searchQuery}
        langFilter={langFilter}
        catFilter={catFilter}
        resultCount={visibleArticles.length}
        hasActiveFilters={hasActiveFilters}
        isDisabled={isLoading || error !== null || articles.length === 0}
        searchRef={searchRef}
        onSearchChange={setSearchQuery}
        onLangChange={setLangFilter}
        onCatChange={setCatFilter}
        onClear={clearFilters}
      />
      <BlogResults
        isLoading={isLoading}
        error={error}
        origin={origin}
        articles={articles}
        visibleArticles={visibleArticles}
        onClearFilters={clearFilters}
      />
    </>
  );
}
