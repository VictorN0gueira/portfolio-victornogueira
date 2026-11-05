import { ArrowUpRight, BookOpen, Clock, Newspaper, Sparkles } from 'lucide-react';
import { useId } from 'react';
import { SpotlightCard } from '../../components/ui/SpotlightCard';
import { getTimeAgo, type NewsArticle } from '../../utils/newsService';
import { ArticleCover } from './ArticleCover';
import { ArticleTags } from './ArticleTags';
import { blogCopy } from './blogCopy';
import { cardDescribedBy, estimateReadTime, getCategoryTag, isNew } from './blogMeta';

interface FeaturedArticleProps {
  article: NewsArticle;
  /** The fixed list has no real dates: it never says new nor how long ago, or it would look like a fresh feed. */
  isFixedList: boolean;
}

const LINK_CLASSES = 'group block min-w-0 rounded-card vn-focus-ring-ink';
const SURFACE_CLASSES =
  'grid overflow-hidden rounded-card bg-vn-black text-vn-white md:grid-cols-[minmax(0,11fr)_minmax(0,9fr)]';
// The one accent of the section: it only ever sits here.
const NEW_PILL_CLASSES =
  'inline-flex items-center rounded-full bg-vn-accent px-3 py-1 font-mono text-xs font-bold uppercase tracking-[.12em] text-vn-black';
const MONO_LABEL_CLASSES = 'font-mono text-xs uppercase tracking-[.18em]';

/**
 * The first article of the list, as a black card with the cover beside the text (above it on a phone). The whole card is
 * one link in a new tab, named by the title. NOVO is the one thing of the section drawn in the accent.
 */
export function FeaturedArticle({ article, isFixedList }: FeaturedArticleProps) {
  const ids = useId();
  const titleId = `${ids}-title`;
  const tagsId = `${ids}-tags`;
  const newId = `${ids}-new`;
  const summaryId = `${ids}-summary`;
  const metaId = `${ids}-meta`;
  const textLang = article.language === 'en' ? 'en' : undefined;
  const hasNewPill = !isFixedList && isNew(article.publishedAt);
  const timeAgo = isFixedList ? '' : getTimeAgo(article.publishedAt);

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-labelledby={titleId}
      aria-describedby={cardDescribedBy(tagsId, hasNewPill && newId, summaryId, metaId)}
      className={LINK_CLASSES}
    >
      <SpotlightCard as="div" tone="dark" className={SURFACE_CLASSES}>
        <ArticleCover article={article} className="aspect-[16/10] w-full md:aspect-auto md:min-h-80">
          <ArticleTags id={tagsId} tag={getCategoryTag(article)}>
            {hasNewPill && (
              <span id={newId} className={NEW_PILL_CLASSES}>
                {blogCopy.card.isNew}
              </span>
            )}
          </ArticleTags>
        </ArticleCover>

        <div className="flex min-w-0 flex-col justify-between gap-8 p-6 md:p-10">
          <div>
            <p className={`inline-flex items-center gap-2 text-vn-gray-light ${MONO_LABEL_CLASSES}`}>
              <Sparkles className="size-4 shrink-0" />
              {blogCopy.card.featured}
            </p>
            <h3
              id={titleId}
              lang={textLang}
              className="mt-5 break-words text-balance font-display text-[length:clamp(1.5rem,1.1rem+1.6vw,2.25rem)] font-bold leading-[1.05] tracking-[-0.02em]"
            >
              {article.title}
            </h3>
            <p id={summaryId} lang={textLang} className="mt-4 line-clamp-4 break-words text-base text-vn-gray-light">
              {article.description || blogCopy.card.noSummary}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-vn-gray-dark pt-5">
            <div id={metaId} className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-vn-gray-light">
              {timeAgo && (
                <span className="flex items-center gap-1.5">
                  <Clock className="size-4 shrink-0" />
                  {timeAgo}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <BookOpen className="size-4 shrink-0" />
                {estimateReadTime(article)} {blogCopy.card.readTime}
              </span>
              <span className="flex min-w-0 items-center gap-1.5">
                <Newspaper className="size-4 shrink-0" />
                <span className="min-w-0 break-words">{article.source.name}</span>
              </span>
            </div>
            <span className={`flex items-center gap-1.5 ${MONO_LABEL_CLASSES}`}>
              {blogCopy.card.read}
              <ArrowUpRight className="size-4 shrink-0" />
            </span>
          </div>
        </div>
      </SpotlightCard>
    </a>
  );
}
