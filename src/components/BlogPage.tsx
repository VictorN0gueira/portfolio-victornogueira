import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Globe,
  Clock,
  Newspaper,
  Bot,
  Zap,
  AlertTriangle,
  Search,
  X,
  ArrowUpRight,
  BookOpen,
} from 'lucide-react';
import {
  getNewsArticles,
  getTimeAgo,
  detectCategory,
  type NewsArticle,
} from '../utils/newsService';

const FALLBACK_IMAGE =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="400" fill="%2318181b"%3E%3Crect width="800" height="400"/%3E%3Ctext x="400" y="200" fill="%2371717a" font-family="sans-serif" font-size="24" text-anchor="middle" alignment-baseline="middle"%3EImagem indispon%C3%ADvel%3C/text%3E%3C/svg%3E';

type LangFilter = 'all' | 'pt' | 'en';
type CatFilter  = 'all' | 'ia' | 'automação' | 'n8n' | 'agentes' | 'llms' | 'ml';

const LANG_LABELS: Record<LangFilter, string> = {
  all: 'Todos idiomas',
  pt:  '🇧🇷 Português',
  en:  '🇺🇸 English',
};

const CAT_LABELS: Record<CatFilter, string> = {
  all:       'Todos tópicos',
  ia:        'IA',
  automação: 'Automação',
  n8n:       'N8N',
  agentes:   'Agentes',
  llms:      'LLMs',
  ml:        'Machine Learning',
};

function isNew(publishedAt: string): boolean {
  return Date.now() - new Date(publishedAt).getTime() < 6 * 60 * 60 * 1000;
}

function estimateReadTime(article: NewsArticle): string {
  const words = `${article.title} ${article.description || ''}`.split(/\s+/).length;
  return `${Math.max(1, Math.round(words / 200))} min`;
}

function getCategoryTag(article: NewsArticle) {
  const cat = detectCategory(article);
  const langColor = article.language === 'en'
    ? 'from-blue-500 to-cyan-500'
    : 'from-emerald-500 to-teal-500';
  const langLabel = article.language === 'en' ? 'English' : 'Português';
  const topicIcon = cat === 'automação' || cat === 'n8n'
    ? <Zap className="w-3 h-3" />
    : <Bot className="w-3 h-3" />;
  const topicLabel = CAT_LABELS[cat as CatFilter] || 'IA';
  return { langColor, langLabel, topicIcon, topicLabel };
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.06]">
      <div className="aspect-[16/10] bg-zinc-800/50 animate-pulse" />
      <div className="p-6 space-y-4">
        <div className="flex gap-2">
          <div className="w-16 h-5 rounded-full bg-zinc-800/50 animate-pulse" />
          <div className="w-20 h-5 rounded-full bg-zinc-800/50 animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-5 bg-zinc-800/50 rounded animate-pulse w-full" />
          <div className="h-5 bg-zinc-800/50 rounded animate-pulse w-3/4" />
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-zinc-800/50 rounded animate-pulse w-full" />
          <div className="h-3 bg-zinc-800/50 rounded animate-pulse w-5/6" />
        </div>
        <div className="flex justify-between pt-2">
          <div className="h-3 bg-zinc-800/50 rounded animate-pulse w-24" />
          <div className="h-3 bg-zinc-800/50 rounded animate-pulse w-16" />
        </div>
      </div>
    </div>
  );
}

function SkeletonFeatured() {
  return (
    <div className="rounded-3xl overflow-hidden bg-white/[0.03] border border-white/[0.06] flex flex-col md:flex-row mb-6">
      <div className="w-full md:w-[55%] aspect-[16/10] md:aspect-auto bg-zinc-800/50 animate-pulse" style={{ minHeight: '288px' }} />
      <div className="flex-1 p-8 space-y-4 flex flex-col justify-center">
        <div className="flex gap-2">
          <div className="w-20 h-5 rounded-full bg-zinc-800/50 animate-pulse" />
          <div className="w-16 h-5 rounded-full bg-zinc-800/50 animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-7 bg-zinc-800/50 rounded animate-pulse w-full" />
          <div className="h-7 bg-zinc-800/50 rounded animate-pulse w-3/4" />
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-zinc-800/50 rounded animate-pulse w-full" />
          <div className="h-3 bg-zinc-800/50 rounded animate-pulse w-5/6" />
          <div className="h-3 bg-zinc-800/50 rounded animate-pulse w-4/6" />
        </div>
      </div>
    </div>
  );
}

// ─── Featured Card ────────────────────────────────────────────────────────────
function FeaturedCard({ article }: { article: NewsArticle }) {
  const [imgError, setImgError] = useState(false);
  const { langColor, langLabel, topicIcon, topicLabel } = getCategoryTag(article);
  const novo = isNew(article.publishedAt);

  return (
    <motion.a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="group relative rounded-3xl overflow-hidden bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.18] transition-all duration-500 hover:shadow-2xl hover:shadow-white/[0.04] flex flex-col md:flex-row mb-6"
    >
      {/* Imagem */}
      <div className="relative w-full md:w-[55%] aspect-[16/10] md:aspect-auto overflow-hidden bg-zinc-900 shrink-0" style={{ minHeight: '0' }}>
        <img
          src={imgError || !article.image ? FALLBACK_IMAGE : article.image}
          onError={() => setImgError(true)}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/60 hidden md:block" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent md:hidden" />

        <div className="absolute top-5 left-5 flex gap-2 flex-wrap">
          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white bg-gradient-to-r ${langColor} shadow-lg`}>
            {langLabel}
          </span>
          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white bg-white/20 md:bg-white/10 backdrop-blur-none md:backdrop-blur-md border border-white/10 flex items-center gap-1">
            {topicIcon}{topicLabel}
          </span>
          {novo && (
            <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white bg-emerald-500 shadow-lg">
              NOVO
            </span>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col justify-between p-8 md:p-10 relative z-10">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-5">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Destaque
          </span>

          <h2 className="text-2xl md:text-3xl font-bold text-white font-display leading-tight mb-4 group-hover:text-zinc-100 transition-colors line-clamp-3">
            {article.title}
          </h2>

          <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3 font-light">
            {article.description || 'Clique para ler o artigo completo.'}
          </p>
        </div>

        <div className="flex items-center justify-between mt-6 pt-5 border-t border-white/[0.06] flex-wrap gap-3">
          <div className="flex items-center gap-4 text-zinc-500 text-xs flex-wrap">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {getTimeAgo(article.publishedAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              {estimateReadTime(article)} leitura
            </span>
            <span className="flex items-center gap-1.5">
              <Newspaper className="w-3.5 h-3.5" />
              <span className="truncate max-w-[120px]">{article.source.name}</span>
            </span>
          </div>

          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-zinc-400 group-hover:text-white transition-colors">
            Ler artigo
            <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>
    </motion.a>
  );
}

// ─── News Card ────────────────────────────────────────────────────────────────
function NewsCard({ article, index }: { article: NewsArticle; index: number }) {
  const [imgError, setImgError] = useState(false);
  const { langColor, langLabel, topicIcon, topicLabel } = getCategoryTag(article);
  const novo = isNew(article.publishedAt);

  return (
    <motion.a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: Math.min(index * 0.07, 0.5), ease: [0.25, 0.46, 0.45, 0.94] }}
      className="group relative rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.15] transition-all duration-500 hover:shadow-2xl hover:shadow-white/[0.03] flex flex-col"
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
        <div className="absolute -inset-[1px] bg-gradient-to-br from-white/[0.08] via-transparent to-white/[0.04] rounded-2xl" />
      </div>

      <div className="relative aspect-[16/10] overflow-hidden bg-zinc-900">
        <img
          src={imgError || !article.image ? FALLBACK_IMAGE : article.image}
          onError={() => setImgError(true)}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white bg-gradient-to-r ${langColor} shadow-lg`}>
            {langLabel}
          </span>
          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white bg-white/20 md:bg-white/10 backdrop-blur-none md:backdrop-blur-md border border-white/10 flex items-center gap-1">
            {topicIcon}{topicLabel}
          </span>
        </div>

        {novo && (
          <span className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white bg-emerald-500 shadow-lg">
            NOVO
          </span>
        )}

        {!novo && (
          <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 md:bg-white/10 backdrop-blur-none md:backdrop-blur-md border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
            <ExternalLink className="w-3.5 h-3.5 text-white" />
          </div>
        )}
      </div>

      <div className="p-6 flex flex-col flex-1 relative z-10">
        <h3 className="text-base font-bold text-white leading-snug mb-3 line-clamp-2 group-hover:text-zinc-100 transition-colors font-display">
          {article.title}
        </h3>

        <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3 mb-auto font-light">
          {article.description || 'Clique para ler o artigo completo.'}
        </p>

        <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-1.5 text-zinc-500">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">
              {estimateReadTime(article)} · {getTimeAgo(article.publishedAt)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-500">
            <Newspaper className="w-3.5 h-3.5" />
            <span className="text-xs font-medium truncate max-w-[100px]">
              {article.source.name}
            </span>
          </div>
        </div>
      </div>
    </motion.a>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BlogPage() {
  const [articles, setArticles]     = useState<NewsArticle[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>('');

  const [langFilter, setLangFilter]   = useState<LangFilter>('all');
  const [catFilter, setCatFilter]     = useState<CatFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchNews = useCallback(async (forceRefresh = false, signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    if (forceRefresh) localStorage.removeItem('blog_news_cache');
    try {
      const result = await getNewsArticles();
      if (signal?.aborted) return;
      setArticles(result.articles);
      setDataSource(result.source);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : 'Erro ao carregar notícias');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchNews(false, controller.signal);
    return () => controller.abort();
  }, [fetchNews]);
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
      {/* Background ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] -left-[20%] w-[600px] h-[600px] bg-purple-500/[0.04] rounded-full blur-[150px]" />
        <div className="absolute bottom-[10%] -right-[15%] w-[500px] h-[500px] bg-cyan-500/[0.04] rounded-full blur-[150px]" />
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/[0.01] rounded-full blur-[200px]" />
      </div>

      {/* Back button */}
      <Link
        to="/"
        className="fixed top-6 left-6 z-50 flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-900 md:bg-white/[0.06] backdrop-blur-none md:backdrop-blur-xl border border-white/[0.1] text-sm text-zinc-300 hover:text-white hover:bg-white/[0.1] hover:border-white/[0.2] transition-all duration-300 group shadow-lg shadow-black/20"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        <span className="font-medium">Portfólio</span>
      </Link>

      {/* Hero */}
      <section className="relative pt-32 pb-10 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="max-w-3xl"
          >
            <div className="flex items-center gap-3 mb-8 flex-wrap">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08]">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Blog & Insights</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08]">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">PT & EN</span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold tracking-tighter font-display italic mb-6 leading-[0.95]">
              O futuro é{' '}
              <span className="not-italic bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-300 to-zinc-500">
                inteligente.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-zinc-400 font-light leading-relaxed max-w-2xl mb-10">
              Notícias curadas sobre{' '}
              <span className="text-zinc-200">Inteligência Artificial</span>,{' '}
              <span className="text-zinc-200">Automação</span> e os benefícios que essas tecnologias trazem para o mundo. Atualizado diariamente.
            </p>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => fetchNews(true)}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] hover:border-white/[0.15] transition-all text-sm text-zinc-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
              {dataSource && !loading && (
                <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">
                  {dataSource === 'cache'                                    && '📦 Cache local'}
                  {(dataSource === 'edge-function' || dataSource === 'gnews') && '🟢 Atualizado agora'}
                  {dataSource === 'devto'                                     && '🟢 Dev.to ao vivo'}
                  {dataSource === 'stale-cache'                              && '⚠️ Cache anterior'}
                  {dataSource === 'fallback'                                  && '📰 Artigos curados'}
                </span>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      </div>

      {/* Filtros + Busca */}
      {!loading && !error && articles.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="py-8 px-6 md:px-12"
        >
          <div className="max-w-7xl mx-auto space-y-4">
            {/* Search */}
            <div className="relative max-w-md">
              <label htmlFor="search" className="sr-only">Buscar artigos</label>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input
                id="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar artigos..."
                className="w-full pl-11 pr-10 py-3 rounded-2xl bg-white/[0.05] border border-white/[0.08] focus:border-white/20 focus:outline-none text-sm text-white placeholder:text-zinc-600 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filtro idioma */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0 md:flex-wrap">
              {(Object.keys(LANG_LABELS) as LangFilter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setLangFilter(f)}
                  className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                    langFilter === f
                      ? 'bg-white text-black'
                      : 'bg-white/[0.05] text-zinc-500 border border-white/[0.08] hover:border-white/20 hover:text-white'
                  }`}
                >
                  {LANG_LABELS[f]}
                </button>
              ))}
            </div>

            {/* Filtro tópico */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0 md:flex-wrap">
              {(Object.keys(CAT_LABELS) as CatFilter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setCatFilter(f)}
                  className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                    catFilter === f
                      ? 'bg-white text-black'
                      : 'bg-white/[0.05] text-zinc-500 border border-white/[0.08] hover:border-white/20 hover:text-white'
                  }`}
                >
                  {CAT_LABELS[f]}
                </button>
              ))}
            </div>

            {/* Contador */}
            {hasActiveFilters && (
              <div className="flex items-center gap-3">
                <p className="text-xs text-zinc-500 uppercase tracking-widest">
                  {filteredArticles.length} artigo{filteredArticles.length !== 1 ? 's' : ''} encontrado{filteredArticles.length !== 1 ? 's' : ''}
                </p>
                <button
                  onClick={clearFilters}
                  className="text-[10px] text-zinc-600 hover:text-zinc-300 uppercase tracking-widest underline underline-offset-2 transition-colors"
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        </motion.section>
      )}

      {/* Artigos */}
      <section className="relative pb-16 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {/* Error */}
            {error && !loading && (
              <motion.div key="error" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-32 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 font-display">Ops! Algo deu errado</h3>
                <p className="text-zinc-400 mb-8 max-w-md text-sm leading-relaxed">{error}</p>
              </motion.div>
            )}

            {/* Loading */}
            {loading && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <SkeletonFeatured />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              </motion.div>
            )}

            {/* Empty state — sem artigos */}
            {!loading && !error && articles.length === 0 && (
              <motion.div key="empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-32 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-6">
                  <Newspaper className="w-8 h-8 text-zinc-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 font-display">Nenhuma notícia encontrada</h3>
                <p className="text-zinc-400 text-sm">Tente atualizar em alguns instantes.</p>
              </motion.div>
            )}

            {/* Empty state — filtros sem resultado */}
            {!loading && !error && articles.length > 0 && filteredArticles.length === 0 && (
              <motion.div key="no-filter-results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center py-24 text-center gap-4"
              >
                <Search className="w-10 h-10 text-zinc-700" />
                <p className="text-white font-bold text-xl font-display">Nenhum artigo encontrado</p>
                <p className="text-zinc-500 text-sm">Tente outros filtros ou limpe a busca.</p>
                <button
                  onClick={clearFilters}
                  className="px-6 py-2.5 rounded-full border border-white/10 text-xs text-zinc-400 hover:text-white hover:border-white/20 transition-all"
                >
                  Limpar filtros
                </button>
              </motion.div>
            )}

            {/* Artigos com featured */}
            {!loading && !error && filteredArticles.length > 0 && (
              <motion.div key="articles" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <FeaturedCard article={filteredArticles[0]} />
                {filteredArticles.length > 1 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredArticles.slice(1).map((article, idx) => (
                      <NewsCard key={article.url} article={article} index={idx + 1} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Footer */}
      <section className="relative py-16 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent mb-12" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <p className="text-xs text-zinc-600 uppercase tracking-widest">
              Notícias via GNews · Cache server-side 24h
            </p>
            <Link
              to="/"
              className="text-xs text-zinc-500 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-3 h-3" />
              Voltar ao portfólio
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
