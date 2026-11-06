import { CLOCK_SKEW_MS, detectCategory, type NewsArticle, type NewsOrigin } from '../../utils/newsService';
import { CAT_LABELS, blogCopy } from './blogCopy';

/** The one hint that tells a screen reader every article link opens a new tab (see NewTabHint). */
export const NEW_TAB_HINT_ID = 'blog-new-tab-hint';

const NEW_WINDOW_MS = 6 * 60 * 60 * 1000;
const WORDS_PER_MINUTE = 200;

export type LangFilter = 'all' | 'pt' | 'en';
export type CatFilter = 'all' | 'ia' | 'automação' | 'n8n' | 'agentes' | 'llms' | 'ml';

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
  if (origin === 'browser-cache') return blogCopy.dataSource.browserCache;
  if (origin === 'stale-browser-cache') return blogCopy.dataSource.staleBrowserCache;
  if (origin === 'fallback') return blogCopy.dataSource.fallback;
  return blogCopy.dataSource.live;
}

export function isNew(publishedAt: string): boolean {
  const ageMs = Date.now() - new Date(publishedAt).getTime();
  return ageMs >= -CLOCK_SKEW_MS && ageMs < NEW_WINDOW_MS;
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
