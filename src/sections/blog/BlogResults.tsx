import { AnimatePresence, m } from 'motion/react';
import { useMemo } from 'react';
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

type ResultsState = 'error' | 'loading' | 'empty' | 'no-match' | 'articles';

const GRID_CLASSES = 'mt-6 grid list-none grid-cols-1 gap-6 p-0 md:grid-cols-2 lg:grid-cols-3';
const STATE_FADE_S = 0.3;
const CARD_STAGGER_S = 0.04;

/** What the list shows: one state at a time. */
export function pickState(
  isLoading: boolean,
  error: string | null,
  articleCount: number,
  visibleCount: number,
): ResultsState {
  if (isLoading) return 'loading';
  if (error) return 'error';
  if (articleCount === 0) return 'empty';
  return visibleCount === 0 ? 'no-match' : 'articles';
}

/** A short fade between the states, only where motion is welcome. */
function useStateFade() {
  const isMotionAllowed = useMotionAllowed();
  return isMotionAllowed
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: STATE_FADE_S } }
    : {};
}

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

interface StateContentProps extends BlogResultsProps {
  state: ResultsState;
  visible: NewsArticle[];
}

function StateContent({ state, error, origin, visible, onClearFilters }: StateContentProps) {
  if (state === 'loading') return <BlogSkeletons />;
  if (state === 'error') return <ErrorState message={error ?? blogCopy.states.errorFallback} />;
  if (state === 'empty') return <EmptyState />;
  if (state === 'no-match') return <NoMatchState onClear={onClearFilters} />;
  return <ArticleList articles={visible} isFixedList={origin === 'fallback'} />;
}

/**
 * The list of the blog, on a cream band: the skeleton while the sources answer, then the articles (the first as the black
 * featured card), or the error, or the empty states. The states swap one at a time, with a short fade only where motion is
 * welcome. Only what a card can be made of is listed, each address once (the keys of the cards depend on it).
 */
export function BlogResults(props: BlogResultsProps) {
  const fade = useStateFade();
  const all = useMemo(() => listableArticles(props.articles), [props.articles]);
  const visible = useMemo(() => listableArticles(props.visibleArticles), [props.visibleArticles]);
  const state = pickState(props.isLoading, props.error, all.length, visible.length);

  return (
    <Section tone="cream" className="py-[clamp(2rem,1rem+4vw,5rem)]">
      <Container>
        <AnimatePresence mode="wait">
          <m.div key={state} {...fade}>
            <StateContent {...props} state={state} visible={visible} />
          </m.div>
        </AnimatePresence>
        <p className="mt-12 max-w-2xl text-sm text-vn-gray-dark">{blogCopy.thirdPartyNote}</p>
      </Container>
    </Section>
  );
}
