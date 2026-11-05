import { Clock, Newspaper } from 'lucide-react';
import { useId } from 'react';
import { getTimeAgo, type NewsArticle } from '../../utils/newsService';
import { ArticleCover } from './ArticleCover';
import { ArticleTags } from './ArticleTags';
import { blogCopy } from './blogCopy';
import { cardDescribedBy, estimateReadTime, getCategoryTag, isNew } from './blogMeta';

interface ArticleCardProps {
  article: NewsArticle;
  /** The fixed list has no real dates: it never says new nor how long ago, or it would look like a fresh feed. */
  isFixedList: boolean;
}

const LINK_CLASSES =
  'group flex h-full min-w-0 flex-col overflow-hidden rounded-card border border-vn-gray-light bg-vn-white text-vn-ink vn-focus-ring-ink hover:border-vn-ink';
// Neutral on purpose: the accent of the section belongs to the featured article.
const NEW_PILL_CLASSES =
  'inline-flex items-center rounded-full bg-vn-white px-3 py-1 font-mono text-xs font-bold uppercase tracking-[.12em] text-vn-ink';

/**
 * A card of the list: one link to the article, in a new tab. The name of the link is the title, and the rest of the card
 * (language and topic, NOVO, summary, time and source) is its description, with the new tab hint.
 */
export function ArticleCard({ article, isFixedList }: ArticleCardProps) {
  const ids = useId();
  const titleId = `${ids}-title`;
  const tagsId = `${ids}-tags`;
  const newId = `${ids}-new`;
  const summaryId = `${ids}-summary`;
  const metaId = `${ids}-meta`;
  const textLang = article.language === 'en' ? 'en' : undefined;
  const hasNewPill = !isFixedList && isNew(article.publishedAt);
  const timeAgo = isFixedList ? '' : getTimeAgo(article.publishedAt);
  const readTime = estimateReadTime(article);

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-labelledby={titleId}
      aria-describedby={cardDescribedBy(tagsId, hasNewPill && newId, summaryId, metaId)}
      className={LINK_CLASSES}
    >
      <ArticleCover article={article} className="aspect-[16/10] w-full shrink-0">
        <ArticleTags id={tagsId} tag={getCategoryTag(article)}>
          {hasNewPill && (
            <span id={newId} className={NEW_PILL_CLASSES}>
              {blogCopy.card.isNew}
            </span>
          )}
        </ArticleTags>
      </ArticleCover>

      <div className="flex min-w-0 flex-1 flex-col p-5 md:p-6">
        <h3
          id={titleId}
          lang={textLang}
          className="break-words text-balance font-display text-lg font-bold leading-snug tracking-[-0.01em]"
        >
          {article.title}
        </h3>
        <p id={summaryId} lang={textLang} className="mb-auto mt-3 line-clamp-3 break-words text-base text-vn-gray-dark">
          {article.description || blogCopy.card.noSummary}
        </p>
        <div
          id={metaId}
          className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-vn-gray-light pt-4 text-sm text-vn-gray-dark"
        >
          <div className="flex items-center gap-1.5">
            <Clock className="size-4 shrink-0" />
            <span>{timeAgo ? `${readTime} · ${timeAgo}` : readTime}</span>
          </div>
          <div className="flex min-w-0 items-center gap-1.5">
            <Newspaper className="size-4 shrink-0" />
            <span className="min-w-0 break-words">{article.source.name}</span>
          </div>
        </div>
      </div>
    </a>
  );
}
