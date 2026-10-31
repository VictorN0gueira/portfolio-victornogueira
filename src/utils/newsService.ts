import { parseNewsDate, safeHttpUrl, safeImageUrl, sanitizeArticle, sanitizeArticles } from './newsSanitize';

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

// Dev.to API response shape (subset)
interface DevToArticle {
  title: string;
  description: string;
  url: string;
  cover_image: string | null;
  published_at: string;
  language: string;
  user: {
    name: string;
    website_url: string | null;
  };
  organization?: {
    name: string;
  } | null;
}

// TabNews API response shape (subset)
interface TabnewsArticle {
  slug: string;
  title: string;
  source_url: string | null;
  published_at: string;
  owner_username: string;
  tabcoins: number;
}

// Artigos curados de fallback, usados somente quando todas as APIs falham
const FALLBACK_ARTICLES: NewsArticle[] = [
  {
    title: 'Como a IA Generativa está transformando empresas em 2025',
    description: 'A inteligência artificial generativa está revolucionando processos empresariais, desde atendimento ao cliente até criação de conteúdo. Descubra como empresas estão adotando essa tecnologia.',
    url: 'https://www.technologyreview.com/topic/artificial-intelligence/',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    source: { name: 'MIT Technology Review', url: 'https://www.technologyreview.com' },
    language: 'pt',
  },
  {
    title: 'Automação de processos: o guia definitivo para PMEs',
    description: 'Automatizar tarefas repetitivas pode economizar até 40% do tempo da sua equipe. Conheça as ferramentas e estratégias mais eficazes para pequenas e médias empresas.',
    url: 'https://zapier.com/blog/business-automation/',
    image: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800&q=80',
    publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    source: { name: 'Zapier Blog', url: 'https://zapier.com' },
    language: 'pt',
  },
  {
    title: 'The Rise of AI Agents: What You Need to Know',
    description: 'AI agents are autonomous systems that can plan, reason, and execute tasks. Learn how this emerging technology is reshaping software development and business operations.',
    url: 'https://www.wired.com/tag/artificial-intelligence/',
    image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80',
    publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    source: { name: 'Wired', url: 'https://www.wired.com' },
    language: 'en',
  },
  {
    title: 'N8N vs Make vs Zapier: Qual ferramenta de automação escolher?',
    description: 'Comparativo completo entre as três principais plataformas de automação no-code/low-code. Prós, contras e casos de uso ideais para cada uma.',
    url: 'https://n8n.io/blog/',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    source: { name: 'N8N Blog', url: 'https://n8n.io' },
    language: 'pt',
  },
  {
    title: 'Machine Learning em produção: lições aprendidas',
    description: 'Colocar modelos de ML em produção é o maior desafio das equipes de dados. Veja as melhores práticas para deploy, monitoramento e manutenção de modelos.',
    url: 'https://ml-ops.org/',
    image: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&q=80',
    publishedAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    source: { name: 'MLOps Community', url: 'https://ml-ops.org' },
    language: 'pt',
  },
  {
    title: 'How RAG is Making AI More Reliable and Accurate',
    description: 'Retrieval-Augmented Generation combines the power of LLMs with real-time data retrieval, reducing hallucinations and improving factual accuracy in AI applications.',
    url: 'https://ai.google/discover/retrieval-augmented-generation/',
    image: 'https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=800&q=80',
    publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    source: { name: 'Google AI', url: 'https://ai.google' },
    language: 'en',
  },
  {
    title: 'Chatbots com IA: como criar experiências que realmente funcionam',
    description: 'A nova geração de chatbots vai além de respostas prontas. Saiba como integrar LLMs, RAG e automações para criar assistentes virtuais inteligentes.',
    url: 'https://www.chatbot.com/blog/',
    image: 'https://images.unsplash.com/photo-1531746790095-e5a643644c9a?w=800&q=80',
    publishedAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
    source: { name: 'Chatbot Magazine', url: 'https://chatbot.com' },
    language: 'pt',
  },
  {
    title: 'O impacto da automação no mercado de trabalho brasileiro',
    description: 'Estudo revela que 30% das tarefas em empresas brasileiras podem ser automatizadas. Entenda quais setores serão mais impactados e como se preparar.',
    url: 'https://www.mckinsey.com/br/our-insights',
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80',
    publishedAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
    source: { name: 'McKinsey Brasil', url: 'https://mckinsey.com/br' },
    language: 'pt',
  },
  {
    title: 'OpenAI, Google and Meta: The AI Race in 2025',
    description: 'The competition between major AI companies is accelerating innovation at unprecedented speeds. A comprehensive overview of the latest developments and what they mean for developers.',
    url: 'https://www.theverge.com/ai-artificial-intelligence',
    image: 'https://images.unsplash.com/photo-1636690513351-0af1363a6b17?w=800&q=80',
    publishedAt: new Date(Date.now() - 42 * 60 * 60 * 1000).toISOString(),
    source: { name: 'The Verge', url: 'https://theverge.com' },
    language: 'en',
  },
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'n8n':       ['n8n'],
  'agentes':   ['agent', 'agente', 'autonomous', 'agentic'],
  'llms':      ['llm', 'gpt', 'claude', 'gemini', 'openai', 'anthropic', 'mistral', 'llama', 'language model'],
  'ml':        ['machine learning', 'deep learning', 'neural', 'rag', 'retrieval', 'modelo de', 'treinamento'],
  'automação': ['autom', 'workflow', 'make.com', 'zapier', 'no-code', 'low-code', 'rpa', 'robotic'],
};

// Keywords para filtrar artigos relevantes do TabNews (sem tags por categoria)
const TABNEWS_RELEVANCE_KEYWORDS = [
  'ia', 'inteligência', 'inteligencia', 'llm', 'gpt', 'claude', 'gemini', 'openai',
  'automação', 'automacao', 'n8n', 'agente', 'agent', 'machine learning', 'chatgpt',
  'anthropic', 'mistral', 'llama', 'rag', 'neural', 'deep learning', 'ai ', ' ai',
  'visão computacional', 'visao computacional', 'robótico', 'robotico',
];

export function detectCategory(article: NewsArticle): string {
  const text = `${article.title} ${article.description || ''}`.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) return cat;
  }
  return 'ia';
}

// O cache vive no localStorage, que qualquer script da origem pode escrever: o que volta de lá passa pela mesma checagem
// dos artigos que vêm da rede.
function getCachedArticles(): CachedData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) throw new Error('cache is not an object');
    const { articles, timestamp, source } = parsed as Partial<Record<keyof CachedData, unknown>>;
    if (typeof timestamp !== 'number') throw new Error('cache has no timestamp');
    return { articles: sanitizeArticles(articles), timestamp, source: typeof source === 'string' ? source : undefined };
  } catch {
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

function setCachedArticles(articles: NewsArticle[], source: string): void {
  const data: CachedData = { articles, timestamp: Date.now(), source };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage cheio, ignora silenciosamente
  }
}

function isCacheValid(cached: CachedData): boolean {
  return Date.now() - cached.timestamp < CACHE_TTL_MS;
}

// Gera descrição para artigos do TabNews que não possuem campo de resumo
function tabNewsDescription(article: TabnewsArticle): string {
  if (article.source_url) {
    try {
      const domain = new URL(article.source_url).hostname.replace('www.', '');
      return `Via ${domain} · Publicado e discutido na comunidade brasileira TabNews.`;
    } catch {
      // URL inválida
    }
  }
  return `Publicado por @${article.owner_username} e em destaque na comunidade brasileira TabNews.`;
}

// Conjunto de imagens placeholder para variar visualmente os cards sem capa
const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
  'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80',
  'https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=800&q=80',
  'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800&q=80',
  'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&q=80',
];

function pickPlaceholder(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return PLACEHOLDER_IMAGES[Math.abs(hash) % PLACEHOLDER_IMAGES.length];
}

const DEVTO_EN_TAGS = ['ai', 'machinelearning', 'llm', 'n8n', 'automation'];
const DEVTO_PT_TAGS = ['brdev', 'ia', 'inteligencia-artificial', 'automacao'];
const DEVTO_EN_QUERY = 'per_page=4&top=7';
const DEVTO_PT_QUERY = 'per_page=5&top=30';
const FEED_TIMEOUT_MS = 8000;
const DEVTO_LIMIT = 20;

// Um artigo da Dev.to no formato do blog. Links e capas passam pela checagem de newsSanitize (capa fora da lista vira placeholder).
function devToArticle(item: unknown): NewsArticle | null {
  // Um item que não é um objeto, ou que não tem link em texto, sai sozinho: as outras matérias da tag ficam.
  if (typeof item !== 'object' || item === null) return null;
  const a = item as Partial<DevToArticle>;
  const url = typeof a.url === 'string' ? a.url : '';
  return sanitizeArticle({
    title: a.title,
    description: a.description || '',
    url,
    image: safeImageUrl(a.cover_image) || pickPlaceholder(url),
    publishedAt: a.published_at,
    source: { name: a.organization?.name || a.user?.name || 'Dev.to', url: a.user?.website_url || 'https://dev.to' },
    // Usa o campo language da Dev.to, pode ser 'pt' para devs brasileiros
    language: a.language === 'pt' ? 'pt' : 'en',
  });
}

// Os artigos de uma tag da Dev.to; uma tag que falha não derruba as outras.
async function fetchDevToTag(tag: string, query: string): Promise<NewsArticle[]> {
  const res = await fetch(`https://dev.to/api/articles?tag=${tag}&${query}`, { signal: AbortSignal.timeout(FEED_TIMEOUT_MS) });
  if (!res.ok) return [];
  const data: unknown = await res.json();
  if (!Array.isArray(data)) return [];
  return data.flatMap((item) => devToArticle(item) ?? []);
}

// Busca artigos da Dev.to, inglês (tags de IA/automação) + português (brdev/brasil/ia)
async function fetchFromDevTo(): Promise<NewsArticle[]> {
  const results = await Promise.allSettled([
    ...DEVTO_EN_TAGS.map((tag) => fetchDevToTag(tag, DEVTO_EN_QUERY)),
    ...DEVTO_PT_TAGS.map((tag) => fetchDevToTag(tag, DEVTO_PT_QUERY)),
  ]);

  const seen = new Set<string>();
  const articles = results
    .flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
    .filter((article) => !seen.has(article.url) && seen.add(article.url));

  if (articles.length === 0) throw new Error('No articles from Dev.to');

  return articles
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, DEVTO_LIMIT);
}

// Busca artigos em destaque do TabNews (plataforma brasileira de tech)
// Filtra por keywords relevantes a IA/automação pois a API não oferece busca por tópico
async function fetchFromTabnews(): Promise<NewsArticle[]> {
  const res = await fetch(
    'https://www.tabnews.com.br/api/v1/contents?strategy=relevant&per_page=30&page=1',
    { signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) throw new Error(`TabNews error: ${res.status}`);

  const data: unknown = await res.json();
  if (!Array.isArray(data)) throw new Error('TabNews answered with another shape');

  return (data as TabnewsArticle[])
    .filter((a) => typeof a?.title === 'string' && TABNEWS_RELEVANCE_KEYWORDS.some((kw) => a.title.toLowerCase().includes(kw)))
    .slice(0, 8)
    .flatMap((a) => {
      // O link do autor (source_url) pode ser qualquer coisa: só http e https passam, senão fica a página do TabNews.
      const url = safeHttpUrl(a.source_url) ?? `https://www.tabnews.com.br/${a.owner_username}/${a.slug}`;
      const article = sanitizeArticle({
        title: a.title,
        description: tabNewsDescription(a),
        url,
        image: pickPlaceholder(a.slug),
        publishedAt: a.published_at,
        source: { name: 'TabNews', url: 'https://www.tabnews.com.br' },
        language: 'pt',
      });
      return article ?? [];
    });
}

// Combina Dev.to + TabNews em paralelo e retorna artigos intercalados por idioma
async function fetchFromPublicAPIs(): Promise<{ articles: NewsArticle[]; source: string }> {
  const [devtoResult, tabnewsResult] = await Promise.allSettled([
    fetchFromDevTo(),
    fetchFromTabnews(),
  ]);

  const devtoArticles = devtoResult.status === 'fulfilled' ? devtoResult.value : [];
  const tabnewsArticles = tabnewsResult.status === 'fulfilled' ? tabnewsResult.value : [];

  if (devtoArticles.length === 0 && tabnewsArticles.length === 0) {
    throw new Error('All public APIs failed');
  }

  // Intercala PT e EN para manter equilíbrio no feed
  const ptArticles = [...tabnewsArticles, ...devtoArticles.filter(a => a.language === 'pt')];
  const enArticles = devtoArticles.filter(a => a.language === 'en');

  const merged: NewsArticle[] = [];
  const maxLen = Math.max(ptArticles.length, enArticles.length);
  for (let i = 0; i < maxLen; i++) {
    if (ptArticles[i]) merged.push(ptArticles[i]);
    if (enArticles[i]) merged.push(enArticles[i]);
  }

  const sources = [
    tabnewsArticles.length > 0 ? 'tabnews' : null,
    devtoArticles.length > 0 ? 'devto' : null,
  ].filter(Boolean).join('+');

  return { articles: merged.slice(0, 20), source: sources || 'public-apis' };
}

export async function getNewsArticles(): Promise<{ articles: NewsArticle[]; source: string }> {
  // 1. Cache local válido
  const cached = getCachedArticles();
  if (cached && isCacheValid(cached) && cached.articles.length > 0) {
    return { articles: cached.articles, source: 'cache' };
  }

  // 2. Edge Function Supabase (proxy seguro)
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
    if (articles.length > 0) {
      const source = typeof body.source === 'string' && body.source !== '' ? body.source : 'edge-function';
      setCachedArticles(articles, source);
      return { articles, source };
    }

    throw new Error('No articles returned from edge function');
  } catch {
    // Edge function indisponível, tenta próxima fonte
  }

  // 3. Dev.to + TabNews (gratuitas, sem autenticação, PT + EN)
  try {
    const result = await fetchFromPublicAPIs();
    setCachedArticles(result.articles, result.source);
    return result;
  } catch {
    // APIs públicas indisponíveis, segue para fallback
  }

  // 4. Cache expirado (melhor que nada)
  if (cached && cached.articles.length > 0) {
    return { articles: cached.articles, source: 'stale-cache' };
  }

  // 5. Último recurso: artigos estáticos curados
  return { articles: FALLBACK_ARTICLES, source: 'fallback' };
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
