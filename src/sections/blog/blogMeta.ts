import { detectCategory, type NewsArticle, type NewsOrigin } from '../../utils/newsService';

/** The one hint that tells a screen reader every article link opens a new tab (see NewTabHint). */
export const NEW_TAB_HINT_ID = 'blog-new-tab-hint';

const NEW_WINDOW_MS = 6 * 60 * 60 * 1000;
const WORDS_PER_MINUTE = 200;

export type LangFilter = 'all' | 'pt' | 'en';
export type CatFilter = 'all' | 'ia' | 'automação' | 'n8n' | 'agentes' | 'llms' | 'ml';

export const CAT_LABELS: Record<CatFilter, string> = {
  all: 'Todos tópicos',
  ia: 'IA',
  automação: 'Automação',
  n8n: 'N8N',
  agentes: 'Agentes',
  llms: 'LLMs',
  ml: 'Machine Learning',
};

/**
 * The name of a card link is the title of the article. The rest of the card (language and topic, summary, time and source)
 * is its description, together with the new tab hint, so the name stays short and nothing is lost.
 */
export function cardDescribedBy(...ids: Array<string | false>): string {
  return [...ids, NEW_TAB_HINT_ID].filter(Boolean).join(' ');
}

/**
 * Says where the list on screen comes from, and only what is true of it: a list that is not fresh never says it was loaded now.
 * It goes by the origin the browser knows (see NewsOrigin), never by the source name a server reports, which can be any string.
 */
export function describeDataSource(origin: NewsOrigin): string {
  if (origin === 'browser-cache') return 'Lista salva neste navegador';
  if (origin === 'stale-browser-cache') return 'As fontes não responderam. Esta é a última lista salva neste navegador.';
  if (origin === 'fallback') return 'As fontes não responderam. Esta é uma lista fixa de artigos.';
  return 'Lista carregada agora';
}

export function isNew(publishedAt: string): boolean {
  return Date.now() - new Date(publishedAt).getTime() < NEW_WINDOW_MS;
}

export function estimateReadTime(article: NewsArticle): string {
  const words = `${article.title} ${article.description || ''}`.split(/\s+/).length;
  return `${Math.max(1, Math.round(words / WORDS_PER_MINUTE))} min`;
}

export interface CategoryTag {
  langLabel: string;
  topicLabel: string;
  /** Which icon the topic wears: the bolt for automation, the robot for the rest. The page maps it to a drawing. */
  topicIcon: 'zap' | 'bot';
}

export function getCategoryTag(article: NewsArticle): CategoryTag {
  const cat = detectCategory(article);
  return {
    langLabel: article.language === 'en' ? 'English' : 'Português',
    topicLabel: CAT_LABELS[cat as CatFilter] || 'IA',
    topicIcon: cat === 'automação' || cat === 'n8n' ? 'zap' : 'bot',
  };
}
