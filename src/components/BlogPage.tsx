import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import {
  getNewsArticles,
  getTimeAgo,
  type NewsArticle,
} from '../utils/newsService';

const FALLBACK_IMAGE =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="400" fill="%2318181b"%3E%3Crect width="800" height="400"/%3E%3Ctext x="400" y="200" fill="%2371717a" font-family="sans-serif" font-size="24" text-anchor="middle" alignment-baseline="middle"%3EImagem indisponível%3C/text%3E%3C/svg%3E';

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

function NewsCard({
  article,
  index,
}: {
  article: NewsArticle;
  index: number;
}) {
  const [imgError, setImgError] = useState(false);

  const categoryTag =
    article.language === 'en'
      ? { label: 'English', color: 'from-blue-500 to-cyan-500' }
      : { label: 'Português', color: 'from-emerald-500 to-teal-500' };

  const topicIcon = article.title.toLowerCase().includes('autom') ? (
    <Zap className="w-3 h-3" />
  ) : (
    <Bot className="w-3 h-3" />
  );

  const topicLabel = article.title.toLowerCase().includes('autom')
    ? 'Automação'
    : 'IA';

  return (
    <motion.a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="group relative rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.15] transition-all duration-500 hover:shadow-2xl hover:shadow-white/[0.03] flex flex-col"
    >
      {/* Hover glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
        <div className="absolute -inset-[1px] bg-gradient-to-br from-white/[0.08] via-transparent to-white/[0.04] rounded-2xl" />
      </div>

      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-zinc-900">
        <img
          src={imgError || !article.image ? FALLBACK_IMAGE : article.image}
          alt={article.title}
          onError={() => setImgError(true)}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Tags flutuantes sobre a imagem */}
        <div className="absolute top-4 left-4 flex gap-2">
          <span
            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white bg-gradient-to-r ${categoryTag.color} shadow-lg`}
          >
            {categoryTag.label}
          </span>
          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white bg-white/10 backdrop-blur-md border border-white/10 flex items-center gap-1">
            {topicIcon}
            {topicLabel}
          </span>
        </div>

        {/* External link icon */}
        <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
          <ExternalLink className="w-3.5 h-3.5 text-white" />
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col flex-1 relative z-10">
        <h3 className="text-base font-bold text-white leading-snug mb-3 line-clamp-2 group-hover:text-zinc-100 transition-colors font-display">
          {article.title}
        </h3>

        <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3 mb-auto font-light">
          {article.description || 'Clique para ler o artigo completo.'}
        </p>

        <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 text-zinc-500">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">
              {getTimeAgo(article.publishedAt)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-zinc-500">
            <Newspaper className="w-3.5 h-3.5" />
            <span className="text-xs font-medium truncate max-w-[120px]">
              {article.source.name}
            </span>
          </div>
        </div>
      </div>
    </motion.a>
  );
}

export default function BlogPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    if (forceRefresh) {
      localStorage.removeItem('blog_news_cache');
    }

    try {
      const data = await getNewsArticles();
      setArticles(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao carregar notícias'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // Scroll pro topo ao montar
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white relative overflow-hidden">
      {/* Background ambient effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] -left-[20%] w-[600px] h-[600px] bg-purple-500/[0.04] rounded-full blur-[150px]" />
        <div className="absolute bottom-[10%] -right-[15%] w-[500px] h-[500px] bg-cyan-500/[0.04] rounded-full blur-[150px]" />
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/[0.01] rounded-full blur-[200px]" />
      </div>

      {/* Floating back button */}
      <Link
        to="/"
        className="fixed top-6 left-6 z-50 flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.06] backdrop-blur-xl border border-white/[0.1] text-sm text-zinc-300 hover:text-white hover:bg-white/[0.1] hover:border-white/[0.2] transition-all duration-300 group shadow-lg shadow-black/20"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        <span className="font-medium">Portfólio</span>
      </Link>

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="max-w-3xl"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08]">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                  Blog & Insights
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08]">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                  PT & EN
                </span>
              </div>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter font-display italic mb-6 leading-[0.95]">
              O futuro é{' '}
              <span className="not-italic bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-300 to-zinc-500">
                inteligente.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-zinc-400 font-light leading-relaxed max-w-2xl mb-10">
              Notícias curadas sobre{' '}
              <span className="text-zinc-200">Inteligência Artificial</span>,{' '}
              <span className="text-zinc-200">Automação</span> e os
              benefícios que essas tecnologias trazem para o mundo. Atualizado
              diariamente.
            </p>

            {/* Refresh button */}
            <button
              onClick={() => fetchNews(true)}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/[0.06] border border-white/[0.1] text-sm text-zinc-300 hover:text-white hover:bg-white/[0.1] hover:border-white/[0.2] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed group"
            >
              <RefreshCw
                className={`w-4 h-4 transition-transform ${
                  loading ? 'animate-spin' : 'group-hover:rotate-180'
                }`}
              />
              <span className="font-medium">
                {loading ? 'Atualizando...' : 'Atualizar Notícias'}
              </span>
            </button>
          </motion.div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      </div>

      {/* Content Section */}
      <section className="relative py-16 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {/* Error State */}
            {error && !loading && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center justify-center py-32 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 font-display">
                  Ops! Algo deu errado
                </h3>
                <p className="text-zinc-400 mb-8 max-w-md text-sm leading-relaxed">
                  {error}
                </p>
                <button
                  onClick={() => fetchNews(true)}
                  className="flex items-center gap-2 px-8 py-3 rounded-full bg-white text-black text-sm font-bold uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95"
                >
                  <RefreshCw className="w-4 h-4" />
                  Tentar Novamente
                </button>
              </motion.div>
            )}

            {/* Loading State */}
            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {Array.from({ length: 9 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </motion.div>
            )}

            {/* Articles Grid */}
            {!loading && !error && articles.length > 0 && (
              <motion.div
                key="articles"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {articles.map((article, idx) => (
                  <NewsCard
                    key={article.url}
                    article={article}
                    index={idx}
                  />
                ))}
              </motion.div>
            )}

            {/* Empty State */}
            {!loading && !error && articles.length === 0 && (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-32 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-6">
                  <Newspaper className="w-8 h-8 text-zinc-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 font-display">
                  Nenhuma notícia encontrada
                </h3>
                <p className="text-zinc-400 text-sm">
                  Tente atualizar em alguns instantes.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Footer area */}
      <section className="relative py-16 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent mb-12" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <p className="text-xs text-zinc-600 uppercase tracking-widest">
              Notícias via GNews • Atualizado a cada 24h
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
