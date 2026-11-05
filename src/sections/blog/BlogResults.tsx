import { AnimatePresence, m } from 'motion/react';
import { Container } from '../../components/ui/Container';
import { NewTabHint } from '../../components/ui/NewTabHint';
import { RevealGroup, RevealItem } from '../../components/ui/Reveal';
import { Section } from '../../components/ui/Section';
import { useMotionAllowed } from '../../hooks/useMotionAllowed';
import type { NewsArticle, NewsOrigin } from '../../utils/newsService';
import { ArticleCard } from './ArticleCard';
import { listableArticles } from './articleLinks';
import { BlogSkeletons } from './BlogSkeletons';
import { EmptyState, ErrorState, NoMatchState } from './BlogStates';
import { blogCopy } from './blogCopy';
import { NEW_TAB_HINT_ID } from './blogMeta';
import { FeaturedArticle } from './FeaturedArticle';

interface BlogResultsProps {
  isLoading: boolean;
  error: string | null;
  origin: NewsOrigin | null;
  /** Everything the sources gave. */
  articles: NewsArticle[];
  /** What passes the filters: the first one is the featured one. */
  visibleArticles: NewsArticle[];
  onClearFilters: () => void;
}

const GRID_CLASSES = 'mt-6 grid list-none grid-cols-1 gap-6 p-0 md:grid-cols-2 lg:grid-cols-3';
const STATE_FADE_S = 0.3;
const CARD_STAGGER_S = 0.04;

function ArticleList({ articles, isFixedList }: { articles: NewsArticle[]; isFixedList: boolean }) {
  const [featured, ...rest] = articles;

  return (
    <>
      <h2 className="sr-only">{blogCopy.listHeading}</h2>
      <NewTabHint id={NEW_TAB_HINT_ID} />
      {/* The group renders a div, and a li may only have a ul for parent: the ul sits inside the group. */}
      <RevealGroup stagger={CARD_STAGGER_S}>
        <RevealItem>
          <FeaturedArticle key={featured.url} article={featured} isFixedList={isFixedList} />
        </RevealItem>
        {rest.length > 0 && (
          <ul role="list" className={GRID_CLASSES}>
            {rest.map((article) => (
              <li key={article.url} className="min-w-0">
                <RevealItem className="h-full">
                  <ArticleCard article={article} isFixedList={isFixedList} />
                </RevealItem>
              </li>
            ))}
          </ul>
        )}
      </RevealGroup>
    </>
  );
}

/**
 * The list of the blog, on a cream band: the skeleton while the sources answer, then the articles (the first as the black
 * featured card), or the error, or the empty states. The states swap one at a time, with a short fade only where motion is
 * welcome.
 */
export function BlogResults({
  isLoading,
  error,
  origin,
  articles: allArticles,
  visibleArticles: allVisible,
  onClearFilters,
}: BlogResultsProps) {
  // Only what a card can be made of, each address once: the list below and the keys of its cards depend on it.
  const articles = listableArticles(allArticles);
  const visibleArticles = listableArticles(allVisible);
  const isMotionAllowed = useMotionAllowed();
  const fade = isMotionAllowed
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: STATE_FADE_S } }
    : {};
  const isSettled = !isLoading && !error;

  return (
    <Section tone="cream" className="py-[clamp(2rem,1rem+4vw,5rem)]">
      <Container>
        <AnimatePresence mode="wait">
          {error && !isLoading && (
            <m.div key="error" {...fade}>
              <ErrorState message={error} />
            </m.div>
          )}
          {isLoading && (
            <m.div key="loading" {...fade}>
              <BlogSkeletons />
            </m.div>
          )}
          {isSettled && articles.length === 0 && (
            <m.div key="empty" {...fade}>
              <EmptyState />
            </m.div>
          )}
          {isSettled && articles.length > 0 && visibleArticles.length === 0 && (
            <m.div key="no-filter-results" {...fade}>
              <NoMatchState onClear={onClearFilters} />
            </m.div>
          )}
          {isSettled && visibleArticles.length > 0 && (
            <m.div key="articles" {...fade}>
              <ArticleList articles={visibleArticles} isFixedList={origin === 'fallback'} />
            </m.div>
          )}
        </AnimatePresence>
        <p className="mt-12 max-w-2xl text-sm text-vn-gray-dark">{blogCopy.thirdPartyNote}</p>
      </Container>
    </Section>
  );
}
