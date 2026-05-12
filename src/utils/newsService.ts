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

// Edge Function no Supabase — proxy seguro (API key nunca exposta no frontend)
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

// Artigos curados de fallback — usados somente quando todas as APIs falham
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

function getCachedArticles(): CachedData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedData;
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
    // localStorage cheio — ignora silenciosamente
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

// Busca artigos da Dev.to — inglês (tags de IA/automação) + português (brdev/brasil/ia)
async function fetchFromDevTo(): Promise<NewsArticle[]> {
  const enTags = ['ai', 'machinelearning', 'llm', 'n8n', 'automation'];
  const ptTags = ['brdev', 'ia', 'inteligencia-artificial', 'automacao'];

  const seen = new Set<string>();
  const articles: NewsArticle[] = [];

  await Promise.allSettled([
    // Artigos em inglês — busca os mais recentes/relevantes
    ...enTags.map(async (tag) => {
      const res = await fetch(
        `https://dev.to/api/articles?tag=${tag}&per_page=4&top=7`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!res.ok) return;
      const data: DevToArticle[] = await res.json();
      for (const a of data) {
        if (seen.has(a.url)) continue;
        seen.add(a.url);
        articles.push({
          title: a.title,
          description: a.description || '',
          url: a.url,
          image: a.cover_image || pickPlaceholder(a.url),
          publishedAt: a.published_at,
          source: {
            name: a.organization?.name || a.user.name,
            url: a.user.website_url || 'https://dev.to',
          },
          // Usa o campo language da Dev.to — pode ser 'pt' para devs brasileiros
          language: a.language === 'pt' ? 'pt' : 'en',
        });
      }
    }),

    // Artigos com tags brasileiras/portuguesas
    ...ptTags.map(async (tag) => {
      const res = await fetch(
        `https://dev.to/api/articles?tag=${tag}&per_page=5&top=30`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!res.ok) return;
      const data: DevToArticle[] = await res.json();
      for (const a of data) {
        if (seen.has(a.url)) continue;
        seen.add(a.url);
        articles.push({
          title: a.title,
          description: a.description || '',
          url: a.url,
          image: a.cover_image || pickPlaceholder(a.url),
          publishedAt: a.published_at,
          source: {
            name: a.organization?.name || a.user.name,
            url: a.user.website_url || 'https://dev.to',
          },
          language: a.language === 'pt' ? 'pt' : 'en',
        });
      }
    }),
  ]);

  if (articles.length === 0) throw new Error('No articles from Dev.to');

  return articles
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 20);
}

// Busca artigos em destaque do TabNews (plataforma brasileira de tech)
// Filtra por keywords relevantes a IA/automação pois a API não oferece busca por tópico
async function fetchFromTabnews(): Promise<NewsArticle[]> {
  const res = await fetch(
    'https://www.tabnews.com.br/api/v1/contents?strategy=relevant&per_page=30&page=1',
    { signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) throw new Error(`TabNews error: ${res.status}`);

  const data: TabnewsArticle[] = await res.json();

  return data
    .filter(a => {
      const text = a.title.toLowerCase();
      return TABNEWS_RELEVANCE_KEYWORDS.some(kw => text.includes(kw));
    })
    .slice(0, 8)
    .map(a => ({
      title: a.title,
      description: tabNewsDescription(a),
      url: a.source_url || `https://www.tabnews.com.br/${a.owner_username}/${a.slug}`,
      image: pickPlaceholder(a.slug),
      publishedAt: a.published_at,
      source: { name: 'TabNews', url: 'https://www.tabnews.com.br' },
      language: 'pt' as const,
    }));
}

// Busca artigos do GNews diretamente — só funciona se VITE_GNEWS_API_KEY estiver definida
async function fetchFromGNews(): Promise<NewsArticle[]> {
  const apiKey = import.meta.env.VITE_GNEWS_API_KEY as string | undefined;
  if (!apiKey) throw new Error('VITE_GNEWS_API_KEY not set');

  const [ptRes, enRes] = await Promise.all([
    fetch(
      `https://gnews.io/api/v4/top-headlines?topic=technology&lang=pt&country=br&max=5&apikey=${apiKey}`,
      { signal: AbortSignal.timeout(10000) }
    ),
    fetch(
      `https://gnews.io/api/v4/top-headlines?topic=technology&lang=en&max=6&apikey=${apiKey}`,
      { signal: AbortSignal.timeout(10000) }
    ),
  ]);

  const articles: NewsArticle[] = [];

  for (const [res, lang] of [[ptRes, 'pt'], [enRes, 'en']] as [Response, 'pt' | 'en'][]) {
    if (!res.ok) continue;
    const data = await res.json();
    for (const a of data.articles || []) {
      articles.push({
        title: a.title,
        description: a.description || '',
        url: a.url,
        image: a.image || pickPlaceholder(a.url),
        publishedAt: a.publishedAt,
        source: { name: a.source.name, url: a.source.url },
        language: lang,
      });
    }
  }

  if (articles.length === 0) throw new Error('No articles from GNews');
  return articles;
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

    const data = await response.json();
    if (data.articles && Array.isArray(data.articles) && data.articles.length > 0) {
      setCachedArticles(data.articles, data.source || 'edge-function');
      return { articles: data.articles, source: data.source || 'edge-function' };
    }

    throw new Error('No articles returned from edge function');
  } catch {
    // Edge function indisponível — tenta próxima fonte
  }

  // 3. GNews API direta (se VITE_GNEWS_API_KEY estiver configurada)
  try {
    const articles = await fetchFromGNews();
    setCachedArticles(articles, 'gnews');
    return { articles, source: 'gnews' };
  } catch {
    // Chave ausente ou API falhou — tenta próxima fonte
  }

  // 4. Dev.to + TabNews (gratuitas, sem autenticação, PT + EN)
  try {
    const result = await fetchFromPublicAPIs();
    setCachedArticles(result.articles, result.source);
    return result;
  } catch {
    // APIs públicas indisponíveis — segue para fallback
  }

  // 5. Cache expirado (melhor que nada)
  if (cached && cached.articles.length > 0) {
    return { articles: cached.articles, source: 'stale-cache' };
  }

  // 6. Último recurso: artigos estáticos curados
  return { articles: FALLBACK_ARTICLES, source: 'fallback' };
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Agora mesmo';
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays} dias atrás`;
  return formatDate(dateString);
}
