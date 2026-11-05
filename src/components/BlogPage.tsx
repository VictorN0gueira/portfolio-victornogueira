import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { m, AnimatePresence } from 'motion/react';
import { Link, useNavigationType } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Globe,
  Newspaper,
  AlertTriangle,
  Search,
  X,
} from 'lucide-react';
import {
  clearNewsCache,
  getNewsArticles,
  detectCategory,
  type NewsArticle,
  type NewsOrigin,
} from '../utils/newsService';
import { MAIN_CONTENT_ID, SkipLink } from './layout/SkipLink';
import {
  NEW_TAB_HINT_ID,
  describeDataSource,
  type CatFilter,
  type LangFilter,
} from '../sections/blog/blogMeta';
import { CAT_LABELS, LANG_LABELS, blogCopy, countLabel } from '../sections/blog/blogCopy';
import { ArticleCard } from '../sections/blog/ArticleCard';
import { BlogSkeletons } from '../sections/blog/BlogSkeletons';
import { FeaturedArticle } from '../sections/blog/FeaturedArticle';
import { NewTabHint } from './ui/NewTabHint';

const FILTER_CHIP_BASE = 'px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all vn-focus-ring';
const FILTER_CHIP_ON = 'bg-white text-black';
const FILTER_CHIP_OFF = 'bg-white/[0.05] text-vn-gray-light border border-white/[0.08] hover:border-white/20 hover:text-white';

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BlogPage() {
  const [articles, setArticles]     = useState<NewsArticle[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [origin, setOrigin] = useState<NewsOrigin | null>(null);

  const [langFilter, setLangFilter]   = useState<LangFilter>('all');
  const [catFilter, setCatFilter]     = useState<CatFilter>('all');
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

  // The answer of the sources goes into the state only after the await, so the first load (the state starts as loading)
  // never sets state inside the effect that starts it.
  const loadNews = useCallback(async (signal?: AbortSignal) => {
    try {
      const result = await getNewsArticles();
      if (signal?.aborted) return;
      setArticles(result.articles);
      setOrigin(result.origin);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : blogCopy.states.errorFallback);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  // One load is current at a time: starting another (the first one, a refresh) aborts the one before, so a slower answer of an
  // older load never lands on top of a newer one, and nothing is set after the page is gone.
  const currentLoad = useRef<AbortController | null>(null);
  const startLoad = useCallback(() => {
    currentLoad.current?.abort();
    const controller = new AbortController();
    currentLoad.current = controller;
    void loadNews(controller.signal);
  }, [loadNews]);

  // The refresh button: drops the cache and asks the sources again.
  // While a load runs the press does nothing (one load at a time), and the button stays in the tab order: a disabled
  // button that held the focus would drop it to the body (WCAG 2.4.3), so it is aria-disabled instead.
  const refreshNews = useCallback(() => {
    if (loading) return;
    setLoading(true);
    setError(null);
    clearNewsCache();
    startLoad();
  }, [loading, startLoad]);

  useEffect(() => {
    // The state is set after the await (the first render is already loading), never in the body of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    startLoad();
    return () => currentLoad.current?.abort();
  }, [startLoad]);
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      const matchesLang   = langFilter === 'all' || article.language === langFilter;
      const matchesCat    = catFilter  === 'all' || detectCategory(article) === catFilter;
      const q             = searchQuery.toLowerCase();
      const matchesSearch = !q
        || article.title.toLowerCase().includes(q)
        || (article.description || '').toLowerCase().includes(q);
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
    <div className="min-h-screen bg-zinc-950 text-white relative overflow-hidden">
      <SkipLink />
      {/* Background ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] -left-[20%] w-[600px] h-[600px] bg-purple-500/[0.04] rounded-full blur-[150px]" />
        <div className="absolute bottom-[10%] -right-[15%] w-[500px] h-[500px] bg-cyan-500/[0.04] rounded-full blur-[150px]" />
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/[0.01] rounded-full blur-[200px]" />
      </div>

      {/* Back button */}
      <header>
        <nav aria-label="Voltar">
          <Link
            to="/"
            className="fixed top-6 left-6 z-(--vn-z-header) flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-900 md:bg-white/[0.06] backdrop-blur-none md:backdrop-blur-xl border border-white/[0.1] text-sm text-zinc-300 hover:text-white hover:bg-white/[0.1] hover:border-white/[0.2] transition-all duration-300 group shadow-lg shadow-black/20"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span className="font-medium">Voltar para a VN One</span>
          </Link>
        </nav>
      </header>

      <main ref={mainRef} id={MAIN_CONTENT_ID} tabIndex={-1} aria-labelledby="blog-title" className="outline-hidden">

      {/* Hero */}
      <section className="relative pt-32 pb-10 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <m.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="max-w-3xl"
          >
            <div className="flex items-center gap-3 mb-8 flex-wrap">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08]">
                <Sparkles className="w-4 h-4 text-vn-accent" />
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">{blogCopy.kicker}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08]">
                <Globe className="w-4 h-4 text-vn-accent" />
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Português e inglês</span>
              </div>
            </div>

            <h1 id="blog-title" className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold tracking-tighter font-display italic mb-6 leading-[0.95]">
              Leituras sobre{' '}
              <span className="not-italic bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-300 to-zinc-400">
                IA e automação
              </span>
            </h1>

            <p className="text-lg md:text-xl text-zinc-400 font-light leading-relaxed max-w-2xl mb-10">
              {blogCopy.lead}
            </p>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={refreshNews}
                aria-disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] hover:border-white/[0.15] transition-all text-sm text-zinc-300 hover:text-white aria-disabled:opacity-50 aria-disabled:cursor-not-allowed vn-focus-ring"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {blogCopy.refresh}
              </button>
              <p role="status" className="text-xs text-vn-gray-light max-w-md">
                {origin && !loading ? describeDataSource(origin) : ''}
              </p>
            </div>
          </m.div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      </div>

      {/* Filtros + Busca */}
      {!loading && !error && articles.length > 0 && (
        <m.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="py-8 px-6 md:px-12"
        >
          <div className="max-w-7xl mx-auto space-y-4">
            {/* Search */}
            <div role="search" className="relative max-w-md">
              <label htmlFor="search" className="sr-only">{blogCopy.filters.searchLabel}</label>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-vn-gray-light pointer-events-none" />
              <input
                id="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={blogCopy.filters.searchPlaceholder}
                className="w-full pl-11 pr-11 py-3 rounded-2xl bg-white/[0.05] border border-white/[0.08] focus:border-white/20 vn-focus-ring text-sm text-white placeholder:text-vn-gray-mid transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label={blogCopy.filters.clearSearch}
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full text-vn-gray-light hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filtro idioma */}
            <div role="group" aria-label={blogCopy.filters.languageGroup} className="flex gap-2 overflow-x-auto pt-1 pb-1 md:overflow-visible scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0 md:flex-wrap">
              {(Object.keys(LANG_LABELS) as LangFilter[]).map(f => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={langFilter === f}
                  onClick={() => setLangFilter(f)}
                  className={`${FILTER_CHIP_BASE} ${langFilter === f ? FILTER_CHIP_ON : FILTER_CHIP_OFF}`}
                >
                  {LANG_LABELS[f].flag && <span aria-hidden="true">{LANG_LABELS[f].flag} </span>}
                  <span lang={LANG_LABELS[f].lang}>{LANG_LABELS[f].text}</span>
                </button>
              ))}
            </div>

            {/* Filtro tópico */}
            <div role="group" aria-label={blogCopy.filters.topicGroup} className="flex gap-2 overflow-x-auto pt-1 pb-1 md:overflow-visible scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0 md:flex-wrap">
              {(Object.keys(CAT_LABELS) as CatFilter[]).map(f => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={catFilter === f}
                  onClick={() => setCatFilter(f)}
                  className={`${FILTER_CHIP_BASE} ${catFilter === f ? FILTER_CHIP_ON : FILTER_CHIP_OFF}`}
                >
                  {CAT_LABELS[f]}
                </button>
              ))}
            </div>

            {/* Contador: a live region that is in the page before any filter is used, so the count is announced when it
                appears and when it changes. It is the only announcement of the results (the empty block below is plain text). */}
            <div className="flex items-center gap-3 has-[p:empty]:-mt-4">
              <p role="status" className="text-xs text-vn-gray-light uppercase tracking-widest">
                {hasActiveFilters &&
                  countLabel(filteredArticles.length)}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-[10px] text-vn-gray-light hover:text-zinc-300 uppercase tracking-widest underline underline-offset-2 transition-colors"
                >
                  {blogCopy.filters.clear}
                </button>
              )}
            </div>
          </div>
        </m.section>
      )}

      {/* Artigos */}
      <section className="relative pb-16 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {/* Error */}
            {error && !loading && (
              <m.div key="error" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-32 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2 font-display">{blogCopy.states.errorTitle}</h2>
                <p className="text-zinc-400 mb-8 max-w-md text-sm leading-relaxed">{error}</p>
              </m.div>
            )}

            {/* Loading */}
            {loading && (
              <m.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <BlogSkeletons />
              </m.div>
            )}

            {/* Empty state: sem artigos */}
            {!loading && !error && articles.length === 0 && (
              <m.div key="empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-32 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-6">
                  <Newspaper className="w-8 h-8 text-vn-gray-light" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2 font-display">{blogCopy.states.emptyTitle}</h2>
                <p className="text-zinc-400 text-sm">{blogCopy.states.emptyHint}</p>
              </m.div>
            )}

            {/* Empty state: filtros sem resultado */}
            {!loading && !error && articles.length > 0 && filteredArticles.length === 0 && (
              <m.div key="no-filter-results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center py-24 text-center gap-4"
              >
                <Search className="w-10 h-10 text-vn-gray-mid" />
                <p className="text-white font-bold text-xl font-display">{blogCopy.states.noMatchTitle}</p>
                <p className="text-vn-gray-light text-sm">{blogCopy.states.noMatchHint}</p>
                <button
                  onClick={clearFilters}
                  className="px-6 py-2.5 rounded-full border border-white/10 text-xs text-zinc-400 hover:text-white hover:border-white/20 transition-all"
                >
                  {blogCopy.filters.clear}
                </button>
              </m.div>
            )}

            {/* Artigos com featured */}
            {!loading && !error && filteredArticles.length > 0 && (
              <m.div key="articles" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h2 className="sr-only">{blogCopy.listHeading}</h2>
                <NewTabHint id={NEW_TAB_HINT_ID} />
                <div className="mb-6">
                  <FeaturedArticle article={filteredArticles[0]} isFixedList={origin === 'fallback'} />
                </div>
                {filteredArticles.length > 1 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredArticles.slice(1).map((article) => (
                      <ArticleCard key={article.url} article={article} isFixedList={origin === 'fallback'} />
                    ))}
                  </div>
                )}
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      </main>

      {/* Footer */}
      <footer className="relative py-16 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent mb-12" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <p className="text-xs text-vn-gray-light uppercase tracking-widest">
              {blogCopy.thirdPartyNote}
            </p>
            <Link
              to="/"
              className="text-xs text-vn-gray-light hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-3 h-3" />
              Voltar para a VN One
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
