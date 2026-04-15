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
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

// Edge Function no Supabase — proxy seguro (API key nunca exposta no frontend)
const EDGE_FUNCTION_URL = 'https://qpcwoioflaxiasmcdfbd.supabase.co/functions/v1/gnews-proxy';

interface CachedData {
  articles: NewsArticle[];
  timestamp: number;
  source?: string;
}

// Artigos curados de fallback — usados quando API e cache estão indisponíveis
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

function getCachedArticles(): CachedData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const cached: CachedData = JSON.parse(raw);
    return cached;
  } catch {
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

function setCachedArticles(articles: NewsArticle[], source: string): void {
  const data: CachedData = {
    articles,
    timestamp: Date.now(),
    source,
  };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage cheio — ignora silenciosamente
  }
}

function isCacheValid(cached: CachedData): boolean {
  const now = Date.now();
  return now - cached.timestamp < CACHE_TTL_MS;
}

export async function getNewsArticles(): Promise<{ articles: NewsArticle[]; source: string }> {
  // 1. Verificar cache local válido
  const cached = getCachedArticles();
  if (cached && isCacheValid(cached) && cached.articles.length > 0) {
    return { articles: cached.articles, source: 'cache' };
  }

  // 2. Tentar buscar da Edge Function (proxy seguro)
  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (!response.ok) {
      throw new Error(`Edge function error: ${response.status}`);
    }

    const data = await response.json();

    if (data.articles && Array.isArray(data.articles) && data.articles.length > 0) {
      setCachedArticles(data.articles, data.source || 'edge-function');
      return { articles: data.articles, source: data.source || 'edge-function' };
    }

    throw new Error('No articles returned from edge function');
  } catch (error) {
    console.warn('Edge function failed, trying fallbacks:', error);
  }

  // 3. Fallback: cache expirado (melhor que nada)
  if (cached && cached.articles.length > 0) {
    console.warn('Usando cache expirado como fallback');
    return { articles: cached.articles, source: 'stale-cache' };
  }

  // 4. Último recurso: artigos estáticos curados
  console.warn('Usando artigos estáticos de fallback');
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
