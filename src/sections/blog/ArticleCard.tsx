import { Clock, ExternalLink, Newspaper } from 'lucide-react';
import { getTimeAgo, type NewsArticle } from '../../utils/newsService';
import { ArticleCover } from './ArticleCover';
import { ArticleTags } from './ArticleTags';
import { articleHref } from './articleLinks';
import { blogCopy } from './blogCopy';
import { estimateReadTime, getCategoryTag, isNew } from './blogMeta';
import { useCardIds } from './useCardIds';

interface ArticleCardProps {
  article: NewsArticle;
  /** The fixed list has no real dates: it never says new nor how long ago, or it would look like a fresh feed. */
  isFixedList: boolean;
}

// The card is not the link: the title is (a stretched link, see vn-stretched-link), so the card is `relative` for it to cover.
const CARD_CLASSES =
  'group relative flex h-full min-w-0 flex-col overflow-hidden rounded-card border border-vn-gray-light bg-vn-white text-vn-ink vn-focus-ring-ink-card hover:border-vn-ink';
// The link is the title, at least 44px tall and as wide as the column (a one line title is not a small target).
const LINK_CLASSES = 'vn-stretched-link flex min-h-11 items-center';
// Neutral on purpose: the accent of the section belongs to the featured article.
const NEW_PILL_CLASSES =
  'inline-flex items-center rounded-full bg-vn-white px-3 py-1 font-mono text-xs font-bold uppercase tracking-[.12em] text-vn-ink';

interface CardMetaProps {
  id: string;
  article: NewsArticle;
  timeAgo: string;
}

/** Reading time and how long ago on the left, the source and the cue that the card leaves the site on the right. */
function CardMeta({ id, article, timeAgo }: CardMetaProps) {
  const readTime = estimateReadTime(article);

  return (
    <div
      id={id}
      className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-vn-gray-light pt-4 text-sm text-vn-gray-dark"
    >
      <div className="flex items-center gap-1.5">
        <Clock className="size-4 shrink-0" />
        <span>{timeAgo ? `${readTime} · ${timeAgo}` : readTime}</span>
      </div>
      <div className="flex min-w-0 items-center gap-1.5">
        <Newspaper className="size-4 shrink-0" />
        <span className="min-w-0 break-words">{article.source.name}</span>
        {/* Visible at rest: a touch screen has no hover to say the link opens another site. */}
        <ExternalLink data-external-cue="" aria-hidden="true" className="size-4 shrink-0 text-vn-ink" />
      </div>
    </div>
  );
}

interface CardBodyProps extends ArticleCardProps {
  ids: ReturnType<typeof useCardIds>;
  href: string;
}

function CardBody({ article, isFixedList, ids, href }: CardBodyProps) {
  const textLang = article.language === 'en' ? 'en' : undefined;
  const timeAgo = isFixedList ? '' : getTimeAgo(article.publishedAt);

  return (
    <div className="flex min-w-0 flex-1 flex-col p-5 md:p-6">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-describedby={ids.describedBy}
        className={LINK_CLASSES}
      >
        <h3
          lang={textLang}
          className="min-w-0 line-clamp-3 break-words text-balance font-display text-lg font-bold leading-snug tracking-[-0.01em]"
        >
          {article.title}
        </h3>
      </a>
      <p id={ids.summary} lang={textLang} className="mb-auto mt-3 line-clamp-4 break-words text-base text-vn-gray-dark">
        {article.description || blogCopy.card.noSummary}
      </p>
      <CardMeta id={ids.meta} article={article} timeAgo={timeAgo} />
    </div>
  );
}

function CardArticle({ article, isFixedList, href }: ArticleCardProps & { href: string }) {
  const hasNewPill = !isFixedList && isNew(article.publishedAt);
  const ids = useCardIds(hasNewPill);

  return (
    <article className={CARD_CLASSES}>
      <ArticleCover article={article} className="aspect-[16/10] w-full shrink-0">
        <ArticleTags id={ids.tags} tag={getCategoryTag(article)}>
          {hasNewPill && (
            <span id={ids.novo} className={NEW_PILL_CLASSES}>
              {blogCopy.card.isNew}
            </span>
          )}
        </ArticleTags>
      </ArticleCover>
      <CardBody article={article} isFixedList={isFixedList} ids={ids} href={href} />
    </article>
  );
}

/**
 * A card of the list: one link to the article, in a new tab, that sits on the title and covers the whole card (a stretched
 * link: a click anywhere opens the article, and the keyboard stops on the title, not on a box taller than the window). An
 * article whose address is not http or https gets no card at all: there is nothing safe to link to.
 */
export function ArticleCard({ article, isFixedList }: ArticleCardProps) {
  const href = articleHref(article);
  if (href === undefined) return null;

  return <CardArticle article={article} isFixedList={isFixedList} href={href} />;
}
