import type { NewsArticle } from './newsService';
import type { FailureLog } from './newsFailures';
import { safeHttpUrl, safeImageUrl, sanitizeArticle } from './newsSanitize';

// The public feeds the blog reads when its edge function does not answer: dev.to and TabNews, in the browser, with no key.

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

// Keywords para filtrar artigos relevantes do TabNews (sem tags por categoria)
const TABNEWS_RELEVANCE_KEYWORDS = [
  'ia',
  'inteligência',
  'inteligencia',
  'llm',
  'gpt',
  'claude',
  'gemini',
  'openai',
  'automação',
  'automacao',
  'n8n',
  'agente',
  'agent',
  'machine learning',
  'chatgpt',
  'anthropic',
  'mistral',
  'llama',
  'rag',
  'neural',
  'deep learning',
  'ai ',
  ' ai',
  'visão computacional',
  'visao computacional',
  'robótico',
  'robotico',
];

// Gera descrição para artigos do TabNews que não possuem campo de resumo
function tabNewsDescription(article: TabnewsArticle, log: FailureLog): string {
  if (article.source_url) {
    try {
      const domain = new URL(article.source_url).hostname.replace('www.', '');
      return `Via ${domain} · Publicado e discutido na comunidade brasileira TabNews.`;
    } catch (error) {
      // URL inválida: a descrição cai no texto sem domínio.
      log.record('tabnews', error);
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
  const res = await fetch(`https://dev.to/api/articles?tag=${tag}&${query}`, {
    signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
  });
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
async function fetchFromTabnews(log: FailureLog): Promise<NewsArticle[]> {
  const res = await fetch('https://www.tabnews.com.br/api/v1/contents?strategy=relevant&per_page=30&page=1', {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`TabNews error: ${res.status}`);

  const data: unknown = await res.json();
  if (!Array.isArray(data)) throw new Error('TabNews answered with another shape');

  return (data as TabnewsArticle[])
    .filter(
      (a) =>
        typeof a?.title === 'string' && TABNEWS_RELEVANCE_KEYWORDS.some((kw) => a.title.toLowerCase().includes(kw)),
    )
    .slice(0, 8)
    .flatMap((a) => {
      // O link do autor (source_url) pode ser qualquer coisa: só http e https passam, senão fica a página do TabNews.
      const url = safeHttpUrl(a.source_url) ?? `https://www.tabnews.com.br/${a.owner_username}/${a.slug}`;
      const article = sanitizeArticle({
        title: a.title,
        description: tabNewsDescription(a, log),
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
export async function fetchFromPublicAPIs(log: FailureLog): Promise<{ articles: NewsArticle[]; source: string }> {
  const [devtoResult, tabnewsResult] = await Promise.allSettled([fetchFromDevTo(), fetchFromTabnews(log)]);
  if (devtoResult.status === 'rejected') log.record('devto', devtoResult.reason);
  if (tabnewsResult.status === 'rejected') log.record('tabnews', tabnewsResult.reason);

  const devtoArticles = devtoResult.status === 'fulfilled' ? devtoResult.value : [];
  const tabnewsArticles = tabnewsResult.status === 'fulfilled' ? tabnewsResult.value : [];

  if (devtoArticles.length === 0 && tabnewsArticles.length === 0) {
    throw new Error('All public APIs failed');
  }

  // Intercala PT e EN para manter equilíbrio no feed
  const ptArticles = [...tabnewsArticles, ...devtoArticles.filter((a) => a.language === 'pt')];
  const enArticles = devtoArticles.filter((a) => a.language === 'en');

  const merged: NewsArticle[] = [];
  const maxLen = Math.max(ptArticles.length, enArticles.length);
  for (let i = 0; i < maxLen; i++) {
    if (ptArticles[i]) merged.push(ptArticles[i]);
    if (enArticles[i]) merged.push(enArticles[i]);
  }

  const sources = [tabnewsArticles.length > 0 ? 'tabnews' : null, devtoArticles.length > 0 ? 'devto' : null]
    .filter(Boolean)
    .join('+');

  return { articles: merged.slice(0, 20), source: sources || 'public-apis' };
}
