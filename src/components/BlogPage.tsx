import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigationType } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { detectCategory } from '../utils/newsService';
import { BlogFilters } from '../sections/blog/BlogFilters';
import { BlogHero } from '../sections/blog/BlogHero';
import { BlogResults } from '../sections/blog/BlogResults';
import { blogCopy } from '../sections/blog/blogCopy';
import { describeDataSource, type CatFilter, type LangFilter } from '../sections/blog/blogMeta';
import { useBlogNews } from '../sections/blog/useBlogNews';
import { MAIN_CONTENT_ID, SkipLink } from './layout/SkipLink';

const BACK_LINK_CLASSES =
  'fixed left-4 top-4 z-(--vn-z-header) inline-flex min-h-11 items-center gap-2 rounded-full bg-vn-ink px-5 text-sm font-medium text-vn-white vn-focus-ring-ink';

export default function BlogPage() {
  const { articles, isLoading, error, origin, refresh } = useBlogNews();
  const [langFilter, setLangFilter] = useState<LangFilter>('all');
  const [catFilter, setCatFilter] = useState<CatFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // The first page the visitor opened (a load or a reload) and a step back or forward are read by the browser itself, so
  // the skip link stays the first tab stop. Only a visitor who arrived by a link of the site (a PUSH) gets the focus on the
  // main landmark, like the pages inside SiteLayout do. The type is read once, on arrival.
  const mainRef = useRef<HTMLElement>(null);
  const navigationType = useNavigationType();
  const arrivedByLink = useRef(navigationType === 'PUSH');
  useEffect(() => {
    if (arrivedByLink.current) mainRef.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const visibleArticles = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return articles.filter((article) => {
      const matchesLang = langFilter === 'all' || article.language === langFilter;
      const matchesCat = catFilter === 'all' || detectCategory(article) === catFilter;
      const matchesSearch =
        !query || article.title.toLowerCase().includes(query) || (article.description || '').toLowerCase().includes(query);
      return matchesLang && matchesCat && matchesSearch;
    });
  }, [articles, langFilter, catFilter, searchQuery]);

  const hasActiveFilters = langFilter !== 'all' || catFilter !== 'all' || searchQuery !== '';
  const clearFilters = () => {
    setLangFilter('all');
    setCatFilter('all');
    setSearchQuery('');
  };

  return (
    <div className="bg-vn-cream text-vn-ink">
      <SkipLink />
      <header>
        <nav aria-label="Voltar">
          <Link to="/" className={BACK_LINK_CLASSES}>
            <ArrowLeft className="size-4" />
            Voltar para a VN One
          </Link>
        </nav>
      </header>

      <main ref={mainRef} id={MAIN_CONTENT_ID} tabIndex={-1} className="outline-hidden">
        <BlogHero
          isLoading={isLoading}
          status={origin && !isLoading ? describeDataSource(origin) : ''}
          onRefresh={refresh}
        />
        {!isLoading && !error && articles.length > 0 && (
          <BlogFilters
            searchQuery={searchQuery}
            langFilter={langFilter}
            catFilter={catFilter}
            resultCount={visibleArticles.length}
            hasActiveFilters={hasActiveFilters}
            onSearchChange={setSearchQuery}
            onLangChange={setLangFilter}
            onCatChange={setCatFilter}
            onClear={clearFilters}
          />
        )}
        <BlogResults
          isLoading={isLoading}
          error={error}
          origin={origin}
          articles={articles}
          visibleArticles={visibleArticles}
          onClearFilters={clearFilters}
        />
      </main>

      <footer className="border-t border-vn-gray-light px-4 py-10 md:px-12">
        <p className="font-mono text-xs uppercase tracking-[.12em] text-vn-gray-dark">{blogCopy.thirdPartyNote}</p>
        <Link
          to="/"
          className="mt-4 inline-flex min-h-11 items-center gap-2 font-mono text-xs uppercase tracking-[.12em] text-vn-ink vn-focus-ring-ink"
        >
          <ArrowLeft className="size-3" />
          Voltar para a VN One
        </Link>
      </footer>
    </div>
  );
}
