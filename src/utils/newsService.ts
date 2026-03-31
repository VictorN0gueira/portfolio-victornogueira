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

interface GNewsResponse {
  totalArticles: number;
  articles: Array<{
    title: string;
    description: string;
    url: string;
    image: string;
    publishedAt: string;
    source: {
      name: string;
      url: string;
    };
  }>;
}

const CACHE_KEY = 'blog_news_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

const API_KEY = import.meta.env.VITE_GNEWS_API_KEY as string;
const BASE_URL = 'https://gnews.io/api/v4';

interface CachedData {
  articles: NewsArticle[];
  timestamp: number;
}

function getCachedArticles(): NewsArticle[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const cached: CachedData = JSON.parse(raw);
    const isExpired = Date.now() - cached.timestamp > CACHE_TTL_MS;

    if (isExpired) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return cached.articles;
  } catch {
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

function setCachedArticles(articles: NewsArticle[]): void {
  const data: CachedData = {
    articles,
    timestamp: Date.now(),
  };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage cheio — ignora silenciosamente
  }
}

async function fetchArticles(
  lang: 'pt' | 'en',
  count: number
): Promise<NewsArticle[]> {
  const query = lang === 'pt'
    ? encodeURIComponent('"inteligência artificial" OR "automação" OR "machine learning"')
    : encodeURIComponent('"artificial intelligence" OR "automation" OR "machine learning" OR "AI"');

  const url = `${BASE_URL}/search?q=${query}&lang=${lang}&max=${count}&sortby=publishedAt&apikey=${API_KEY}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`GNews API error: ${response.status}`);
  }

  const data: GNewsResponse = await response.json();

  return data.articles.map((article) => ({
    ...article,
    language: lang,
    // Fallback para imagem quando a API não retorna
    image: article.image || '',
  }));
}

export async function getNewsArticles(): Promise<NewsArticle[]> {
  // Verifica cache primeiro
  const cached = getCachedArticles();
  if (cached) return cached;

  if (!API_KEY) {
    throw new Error('VITE_GNEWS_API_KEY não configurada no .env');
  }

  try {
    // Busca 9 em PT (caso o EN falhe) e 3 em EN em paralelo
    const [ptArticles, enArticles] = await Promise.all([
      fetchArticles('pt', 9),
      fetchArticles('en', 3),
    ]);

    // Intercala: coloca as em inglês nas posições 3, 6 e 9
    const combined: NewsArticle[] = [];
    let ptIdx = 0;
    let enIdx = 0;

    for (let i = 0; i < 9; i++) {
      if ((i + 1) % 3 === 0 && enIdx < enArticles.length) {
        combined.push(enArticles[enIdx++]);
      } else if (ptIdx < ptArticles.length) {
        combined.push(ptArticles[ptIdx++]);
      } else if (enIdx < enArticles.length) {
        combined.push(enArticles[enIdx++]);
      }
    }

    setCachedArticles(combined);
    return combined;
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Falha ao buscar notícias. Tente novamente.'
    );
  }
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
