import { safeHttpUrl } from '../../utils/newsSanitize';
import type { NewsArticle } from '../../utils/newsService';

// newsSanitize already holds every address back before it is cached or shown. These are the same checks once more at the
// edge of the render, so the safety of an href or a src never depends on the code that fed the page alone.

/** The address the card links to, when it is an http or https address, and undefined for anything else. */
export function articleHref(article: NewsArticle): string | undefined {
  return safeHttpUrl(article.url);
}

/** The cover to draw, when it is an http or https address, and undefined for anything else (the card shows its own picture). */
export function coverSource(article: NewsArticle): string | undefined {
  return safeHttpUrl(article.image);
}

/** The articles a card can be made of: a usable address, and each address once, in the order they came. */
export function listableArticles(articles: readonly NewsArticle[]): NewsArticle[] {
  const seen = new Set<string>();
  return articles.filter((article) => {
    const href = articleHref(article);
    if (href === undefined || seen.has(href)) return false;
    seen.add(href);
    return true;
  });
}
