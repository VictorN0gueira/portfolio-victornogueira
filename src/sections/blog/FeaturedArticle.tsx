import { ArrowUpRight, BookOpen, Clock, Newspaper, Sparkles } from 'lucide-react';
import { SpotlightCard } from '../../components/ui/SpotlightCard';
import { getTimeAgo, type NewsArticle } from '../../utils/newsService';
import { ArticleCover } from './ArticleCover';
import { ArticleTags } from './ArticleTags';
import { articleHref } from './articleLinks';
import { blogCopy } from './blogCopy';
import { estimateReadTime, getCategoryTag, isNew } from './blogMeta';
import { useCardIds } from './useCardIds';

interface FeaturedArticleProps {
  article: NewsArticle;
  /** The fixed list has no real dates: it never says new nor how long ago, or it would look like a fresh feed. */
  isFixedList: boolean;
}

type CardIds = ReturnType<typeof useCardIds>;

// The card is not the link: the title is (a stretched link, see vn-stretched-link). The link covers its nearest positioned
// ancestor, which here is the SpotlightCard (`relative isolate`, the only child of the article and as big as it): the
// article itself needs no `relative`.
const CARD_CLASSES = 'group block min-w-0 rounded-card vn-focus-ring-ink-card';
// The link is the title, at least 44px tall and as wide as the column (a one line title is not a small target).
const LINK_CLASSES = 'vn-stretched-link mt-5 flex min-h-11 items-center';
const SURFACE_CLASSES =
  'grid overflow-hidden rounded-card bg-vn-black text-vn-white md:grid-cols-[minmax(0,11fr)_minmax(0,9fr)]';
// The one accent of the section: it only ever sits here.
const NEW_PILL_CLASSES =
  'inline-flex items-center rounded-full bg-vn-accent px-3 py-1 font-mono text-xs font-bold uppercase tracking-[.12em] text-vn-black';
const MONO_LABEL_CLASSES = 'font-mono text-xs uppercase tracking-[.18em]';

function FeaturedText({ article, ids, href }: { article: NewsArticle; ids: CardIds; href: string }) {
  const textLang = article.language === 'en' ? 'en' : undefined;

  return (
    <div>
      <p className={`inline-flex items-center gap-2 text-vn-gray-light ${MONO_LABEL_CLASSES}`}>
        <Sparkles className="size-4 shrink-0" />
        {blogCopy.card.featured}
      </p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-describedby={ids.describedBy}
        className={LINK_CLASSES}
      >
        <h3
          lang={textLang}
          className="min-w-0 break-words text-balance font-display text-[length:clamp(1.5rem,1.1rem+1.6vw,2.25rem)] font-bold leading-[1.05] tracking-[-0.02em]"
        >
          {article.title}
        </h3>
      </a>
      <p id={ids.summary} lang={textLang} className="mt-4 break-words text-base text-vn-gray-light">
        {article.description || blogCopy.card.noSummary}
      </p>
    </div>
  );
}

function FeaturedFooter({ article, ids, timeAgo }: { article: NewsArticle; ids: CardIds; timeAgo: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-vn-gray-dark pt-5">
      <div id={ids.meta} className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-vn-gray-light">
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
  );
}

function FeaturedCard({ article, isFixedList, href }: FeaturedArticleProps & { href: string }) {
  const hasNewPill = !isFixedList && isNew(article.publishedAt);
  const ids = useCardIds(hasNewPill);
  const timeAgo = isFixedList ? '' : getTimeAgo(article.publishedAt);

  return (
    <article className={CARD_CLASSES}>
      <SpotlightCard as="div" tone="dark" className={SURFACE_CLASSES}>
        <ArticleCover article={article} className="aspect-[16/10] w-full md:aspect-auto md:min-h-80">
          <ArticleTags id={ids.tags} tag={getCategoryTag(article)}>
            {hasNewPill && (
              <span id={ids.novo} className={NEW_PILL_CLASSES}>
                {blogCopy.card.isNew}
              </span>
            )}
          </ArticleTags>
        </ArticleCover>
        <div className="flex min-w-0 flex-col justify-between gap-8 p-6 md:p-10">
          <FeaturedText article={article} ids={ids} href={href} />
          <FeaturedFooter article={article} ids={ids} timeAgo={timeAgo} />
        </div>
      </SpotlightCard>
    </article>
  );
}

/**
 * The first article of the list, as a black card with the cover beside the text (above it on a phone). One link in a new
 * tab sits on the title and covers the whole card (a stretched link: a click anywhere opens the article, and the keyboard
 * stops on the title, not on a box taller than the window). NOVO is the one thing of the section drawn in the accent.
 * The text is never clamped here. An article whose address is not http or https gets no card at all.
 */
export function FeaturedArticle({ article, isFixedList }: FeaturedArticleProps) {
  const href = articleHref(article);
  if (href === undefined) return null;

  return <FeaturedCard article={article} isFixedList={isFixedList} href={href} />;
}
