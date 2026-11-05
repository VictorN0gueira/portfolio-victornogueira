import { fetchFromPublicAPIs } from './newsFeeds';
import { createFailureLog, type FailureLog, type SourceFailure } from './newsFailures';
import { parseNewsDate, sanitizeArticles } from './newsSanitize';

export type { SourceFailure } from './newsFailures';

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  image: string;
  publishedAt: string;
  source: {
    name: string;
    url: string;
  };
  language: 'pt' | 'en';
}

const CACHE_KEY = 'blog_news_cache';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas

// Edge Function no Supabase, proxy seguro (API key nunca exposta no frontend)
const EDGE_FUNCTION_URL = 'https://qpcwoioflaxiasmcdfbd.supabase.co/functions/v1/gnews-proxy';

interface CachedData {
  articles: NewsArticle[];
  timestamp: number;
  source?: string;
}

// Lista fixa de fallback, usada somente quando todas as fontes falham. Cada item aponta para a página de um tema na
// publicação, não para uma matéria: por isso os textos descrevem a seção, sem número, sem estudo e sem data (a página
// não mostra "novo" nem "há quantas horas" para esta lista).
const FALLBACK_ARTICLES: NewsArticle[] = [
  {
    title: 'Inteligência artificial na MIT Technology Review',
    description: 'A seção de inteligência artificial da publicação reúne reportagens e análises sobre o tema.',
    url: 'https://www.technologyreview.com/topic/artificial-intelligence/',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
    publishedAt: '',
    source: { name: 'MIT Technology Review', url: 'https://www.technologyreview.com' },
    language: 'pt',
  },
  {
    title: 'Automação de processos no blog da Zapier',
    description: 'O blog da Zapier tem guias sobre como automatizar tarefas repetitivas em equipes pequenas e grandes.',
    url: 'https://zapier.com/blog/business-automation/',
    image: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800&q=80',
    publishedAt: '',
    source: { name: 'Zapier Blog', url: 'https://zapier.com' },
    language: 'pt',
  },
  {
    title: 'AI agents in the Wired archive',
    description: 'Wired keeps a section with its reporting on artificial intelligence, agents included.',
    url: 'https://www.wired.com/tag/artificial-intelligence/',
    image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80',
    publishedAt: '',
    source: { name: 'Wired', url: 'https://www.wired.com' },
    language: 'en',
  },
  {
    title: 'Blog do N8N: workflows e automação',
    description: 'O blog oficial do N8N fala de workflows, integrações e casos de uso da ferramenta de automação.',
    url: 'https://n8n.io/blog/',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    publishedAt: '',
    source: { name: 'N8N Blog', url: 'https://n8n.io' },
    language: 'pt',
  },
  {
    title: 'Machine learning em produção no MLOps',
    description:
      'O site do MLOps reúne material sobre como colocar modelos de machine learning em produção e acompanhar o que acontece com eles.',
    url: 'https://ml-ops.org/',
    image: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&q=80',
    publishedAt: '',
    source: { name: 'MLOps Community', url: 'https://ml-ops.org' },
    language: 'pt',
  },
  {
    title: 'Retrieval-augmented generation at Google AI',
    description:
      'Google AI explains how retrieval-augmented generation connects a language model to outside sources of information.',
    url: 'https://ai.google/discover/retrieval-augmented-generation/',
    image: 'https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=800&q=80',
    publishedAt: '',
    source: { name: 'Google AI', url: 'https://ai.google' },
    language: 'en',
  },
  {
    title: 'Inteligência artificial e trabalho na McKinsey',
    description: 'A McKinsey Brasil publica textos sobre o que a automação muda nas empresas e no trabalho.',
    url: 'https://www.mckinsey.com/br/our-insights',
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80',
    publishedAt: '',
    source: { name: 'McKinsey Brasil', url: 'https://mckinsey.com/br' },
    language: 'pt',
  },
  {
    title: 'AI coverage at The Verge',
    description: 'The Verge has a section that follows the companies and products of the AI field.',
    url: 'https://www.theverge.com/ai-artificial-intelligence',
    image: 'https://images.unsplash.com/photo-1636690513351-0af1363a6b17?w=800&q=80',
    publishedAt: '',
    source: { name: 'The Verge', url: 'https://theverge.com' },
    language: 'en',
  },
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  n8n: ['n8n'],
  agentes: ['agent', 'agente', 'autonomous', 'agentic'],
  llms: ['llm', 'gpt', 'claude', 'gemini', 'openai', 'anthropic', 'mistral', 'llama', 'language model'],
  ml: ['machine learning', 'deep learning', 'neural', 'rag', 'retrieval', 'modelo de', 'treinamento'],
  automação: ['autom', 'workflow', 'make.com', 'zapier', 'no-code', 'low-code', 'rpa', 'robotic'],
};

export function detectCategory(article: NewsArticle): string {
  const text = `${article.title} ${article.description || ''}`.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) return cat;
  }
  return 'ia';
}

// O cache vive no localStorage, que qualquer script da origem pode escrever: o que volta de lá passa pela mesma checagem
// dos artigos que vêm da rede.
function getCachedArticles(log: FailureLog): CachedData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) throw new Error('cache is not an object');
    const { articles, timestamp, source } = parsed as Partial<Record<keyof CachedData, unknown>>;
    if (typeof timestamp !== 'number') throw new Error('cache has no timestamp');
    return { articles: sanitizeArticles(articles), timestamp, source: typeof source === 'string' ? source : undefined };
  } catch (error) {
    // The cache is reported once, here: dropping it is a consequence, not a second failure.
    log.record('cache', error);
    clearNewsCache();
    return null;
  }
}

// localStorage pode estar bloqueado (cookies desligados, navegadores embutidos): lançar aqui derrubaria o blog inteiro.
// Quem chama pode passar o registro de falhas para saber o motivo; a tela do blog não depende disso.
export function clearNewsCache(log?: FailureLog): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    // Sem acesso ao armazenamento: não há cache para limpar.
    log?.record('cache', error);
  }
}

// localStorage cheio: a lista segue para a tela e o motivo vai para o registro de falhas.
function setCachedArticles(articles: NewsArticle[], source: string, log: FailureLog): void {
  const data: CachedData = { articles, timestamp: Date.now(), source };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    log.record('cache-write', error);
  }
}

function isCacheValid(cached: CachedData): boolean {
  return Date.now() - cached.timestamp < CACHE_TTL_MS;
}

/**
 * Where the list came from, as the browser knows it. `source` is the name the server (or the feed code) gave, shown to nobody:
 * only `origin` is safe to word a status line from.
 */
export type NewsOrigin = 'live' | 'browser-cache' | 'stale-browser-cache' | 'fallback';

export interface NewsResult {
  articles: NewsArticle[];
  source: string;
  origin: NewsOrigin;
  /**
   * What went wrong on the way to this list: the sources that did not answer and why, and notes that did not stop it (a
   * cache that could not be written, an address that could not be read). The list may come from a source even when this is
   * present. Absent when there is nothing to report.
   */
  failures?: SourceFailure[];
}

export interface NewsOptions {
  /**
   * The visitor asked to load again: the sources are asked even when the saved list is still valid, and the saved list stays
   * where it is until a source gives a new one (if none does, it is what is shown, not the fixed list).
   */
  forceRefresh?: boolean;
}

/** The result with the failures beside it, and without the field when there is none. */
function withFailures(result: NewsResult, log: FailureLog): NewsResult {
  const failures = log.list();
  return failures.length > 0 ? { ...result, failures } : result;
}

interface LiveList {
  articles: NewsArticle[];
  source: string;
}

// Edge Function Supabase (proxy seguro). Indisponível: o motivo fica no registro e a próxima fonte responde.
async function readEdgeFunction(log: FailureLog): Promise<LiveList | null> {
  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) throw new Error(`Edge function error: ${response.status}`);

    // O formato da resposta é checado antes de ir para o cache: o que não passa é descartado.
    const data: unknown = await response.json();
    const body = typeof data === 'object' && data !== null ? (data as { articles?: unknown; source?: unknown }) : {};
    const articles = sanitizeArticles(body.articles);
    if (articles.length === 0) throw new Error('No articles returned from edge function');

    return { articles, source: typeof body.source === 'string' && body.source !== '' ? body.source : 'edge-function' };
  } catch (error) {
    log.record('edge-function', error);
    return null;
  }
}

// Dev.to + TabNews (gratuitas, sem autenticação, PT + EN). Indisponíveis: o motivo fica no registro.
async function readPublicFeeds(log: FailureLog): Promise<LiveList | null> {
  try {
    return await fetchFromPublicAPIs(log);
  } catch (error) {
    log.record('public-apis', error);
    return null;
  }
}

export async function getNewsArticles({ forceRefresh = false }: NewsOptions = {}): Promise<NewsResult> {
  const log = createFailureLog();

  // 1. Cache local válido
  const cached = getCachedArticles(log);
  const hasSavedList = cached !== null && cached.articles.length > 0;
  if (hasSavedList && isCacheValid(cached) && !forceRefresh) {
    return withFailures({ articles: cached.articles, source: 'cache', origin: 'browser-cache' }, log);
  }

  // 2 e 3. Edge Function, depois as fontes públicas
  const live = (await readEdgeFunction(log)) ?? (await readPublicFeeds(log));
  if (live) {
    setCachedArticles(live.articles, live.source, log);
    return withFailures({ ...live, origin: 'live' }, log);
  }

  // 4. Lista salva (a que já havia, mesmo que ainda valesse): melhor que nada
  if (hasSavedList) {
    return withFailures({ articles: cached.articles, source: 'stale-cache', origin: 'stale-browser-cache' }, log);
  }

  // 5. Último recurso: artigos estáticos curados
  return withFailures({ articles: FALLBACK_ARTICLES, source: 'fallback', origin: 'fallback' }, log);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

// Quanto tempo faz que saiu a matéria. Um valor que não é uma data ISO dá um texto vazio, nunca "Invalid Date".
export function getTimeAgo(dateString: string): string {
  const date = parseNewsDate(dateString);
  if (date === null) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Agora mesmo';
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays} dias atrás`;
  return formatDate(date);
}
