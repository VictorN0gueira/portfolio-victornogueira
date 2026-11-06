import { useMemo } from 'react';
import { listableArticles } from '../sections/blog/articleLinks';
import { BlogFilters } from '../sections/blog/BlogFilters';
import { BlogHero } from '../sections/blog/BlogHero';
import { BlogResults } from '../sections/blog/BlogResults';
import { describeDataSource } from '../sections/blog/blogMeta';
import { useBlogFilters } from '../sections/blog/useBlogFilters';
import { useBlogNews } from '../sections/blog/useBlogNews';
import { SEO } from './SEO';

/**
 * The /blog page, inside SiteLayout: the layout owns the header, the main landmark, the skip link, the scroll to the top and
 * the focus after a change of page, so this is only the sections. The articles come from other sites.
 */
export default function BlogPage() {
  const { articles: fetched, isLoading, error, origin, refresh } = useBlogNews();
  const articles = useMemo(() => listableArticles(fetched), [fetched]);
  const filters = useBlogFilters(articles);

  return (
    <>
      <SEO path="/blog" />
      <BlogHero
        isLoading={isLoading}
        status={origin && !isLoading && error === null ? describeDataSource(origin) : ''}
        onRefresh={refresh}
      />
      <BlogFilters
        searchQuery={filters.query}
        langFilter={filters.language}
        catFilter={filters.category}
        resultCount={filters.visibleArticles.length}
        hasActiveFilters={filters.hasActiveFilters && articles.length > 0}
        isLoading={isLoading}
        searchRef={filters.searchRef}
        onSearchChange={filters.setQuery}
        onLangChange={filters.setLanguage}
        onCatChange={filters.setCategory}
        onClear={filters.clear}
      />
      <BlogResults
        isLoading={isLoading}
        error={error}
        origin={origin}
        articles={articles}
        visibleArticles={filters.visibleArticles}
        onClearFilters={filters.clear}
      />
    </>
  );
}
