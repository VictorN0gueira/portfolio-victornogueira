import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { ErrorBoundary } from '../components/layout/ErrorBoundary';
import { SectionError } from '../components/layout/SectionError';
import { SectionSkeleton } from '../components/ui/SectionSkeleton';
import { faqs } from '../data/faqs';
import { shellCopy } from '../data/shellCopy';
import { useScrollToHash } from '../hooks/useScrollToHash';
import { buildFaqJsonLd } from '../lib/faqJsonLd';
import { lazyWithRetry } from '../lib/lazyWithRetry';
import { scrollToIdWhenMounted } from '../lib/scrollToIdWhenMounted';
import { whenIdle } from '../lib/whenIdle';
import { HeroSection } from '../sections/home/HeroSection';
import { IntegrationsMarquee } from '../sections/home/IntegrationsMarquee';

// Everything under the first screen loads on its own chunk. The hero and the strip under it are above the fold and
// stay in the entry chunk. A chunk that fails to load is retried once, and then one section shows a retry button
// while the rest of the page keeps working.
const StatementStats = lazyWithRetry(() => import('../sections/home/StatementStats'));
const UseCaseTabs = lazyWithRetry(() => import('../sections/home/UseCaseTabs'));
const ServicesCards = lazyWithRetry(() => import('../sections/home/ServicesCards'));
const MethodSteps = lazyWithRetry(() => import('../sections/home/MethodSteps'));
const RoiSimulator = lazyWithRetry(() => import('../sections/home/RoiSimulator'));
const Testimonials = lazyWithRetry(() => import('../sections/home/Testimonials'));
const FaqSection = lazyWithRetry(() => import('../sections/home/FaqSection'));
const FinalCta = lazyWithRetry(() => import('../sections/home/FinalCta'));

/** The id of the section the ROI quote scrolls to (the final call to action, which holds the one form of the page). */
const CONTACT_ID = 'contato';
/** The sections under the first screen are mounted after an idle moment, and no later than this. */
const SECTIONS_IDLE_TIMEOUT_MS = 1200;

// How tall each lazy section is once it has loaded, so a late chunk moves little of what is under it (the anchors
// #metodo and #clientes are also put back after a late chunk, see scrollToIdWhenMounted). The heights per width, for
// the normal and for the larger font, are in styles/skeleton.css, which holds one custom property per section. The class
// names are written out in full for the stylesheet generator, which reads them from the source.
const SKELETON_HEIGHTS = {
  statement: 'min-h-[var(--vn-skeleton-statement)]',
  useCases: 'min-h-[var(--vn-skeleton-use-cases)]',
  services: 'min-h-[var(--vn-skeleton-services)]',
  method: 'min-h-[var(--vn-skeleton-method)]',
  roi: 'min-h-[var(--vn-skeleton-roi)]',
  testimonials: 'min-h-[var(--vn-skeleton-testimonials)]',
  faq: 'min-h-[var(--vn-skeleton-faq)]',
  finalCta: 'min-h-[var(--vn-skeleton-final-cta)]',
} as const;

// The FAQPage schema comes from the same list as the accordion of the section. Built once, not on every render.
const HOME_JSON_LD = [buildFaqJsonLd(faqs)];

interface PrefillRequest {
  message: string;
  /** Changes on every request, so the same quote fills the field again after the visitor edited it. */
  nonce: number;
}

interface LazySectionProps {
  heightClassName: string;
  /** False until the sections are due: a skeleton of the same height stands in and the chunk is not requested. */
  isDue: boolean;
  children: ReactNode;
}

/** One lazy section: its skeleton while it loads, and a retry of its own height when its chunk cannot be fetched. */
function LazySection({ heightClassName, isDue, children }: LazySectionProps) {
  const skeleton = <SectionSkeleton heightClassName={heightClassName} />;
  if (!isDue) return skeleton;

  return (
    <ErrorBoundary fallback={(retry) => <SectionError heightClassName={heightClassName} onRetry={retry} />}>
      <Suspense fallback={skeleton}>{children}</Suspense>
    </ErrorBoundary>
  );
}

/** True after an idle moment (1200 ms at the latest), or at once when the URL has a hash: the visitor is headed to a section. */
function useSectionsDue(): boolean {
  const { hash } = useLocation();
  const [isIdle, setIsIdle] = useState(false);
  useEffect(() => whenIdle(() => setIsIdle(true), SECTIONS_IDLE_TIMEOUT_MS), []);
  return isIdle || hash !== '';
}

/** The field the quote goes to: the one textarea of the contact section, once it holds the message. */
function findFilledMessageField(message: string): (section: HTMLElement) => HTMLElement | null {
  return (section) => {
    const field = section.querySelector('textarea');
    return field && field.value === message ? field : null;
  };
}

/**
 * The home: the hero and the integrations strip first, then the lazy sections in the order of the brief. The one contact
 * form of the page lives in the final section. The quote the ROI simulator builds is handed to that form (one state
 * holds the message and its counter), the page scrolls there, puts focus in the message field once it holds the quote
 * and says so in a polite status.
 */
export function HomePage() {
  useScrollToHash();
  const areSectionsDue = useSectionsDue();
  const [prefill, setPrefill] = useState<PrefillRequest | undefined>();
  const [status, setStatus] = useState('');

  // The form is in a lazy section: the scroll waits for it when the chunk has not arrived yet.
  const cancelScroll = useRef<(() => void) | undefined>(undefined);
  useEffect(() => () => cancelScroll.current?.(), []);

  const handleQuoteRequest = useCallback((message: string) => {
    setPrefill((previous) => ({ message, nonce: (previous?.nonce ?? 0) + 1 }));
    setStatus('');
    cancelScroll.current?.();
    cancelScroll.current = scrollToIdWhenMounted(CONTACT_ID, {
      focus: findFilledMessageField(message),
      onFocused: () => setStatus(shellCopy.quoteFilled),
    });
  }, []);

  return (
    <>
      <SEO path="/" jsonLd={HOME_JSON_LD} />
      <HeroSection />
      <IntegrationsMarquee />

      <LazySection isDue={areSectionsDue} heightClassName={SKELETON_HEIGHTS.statement}>
        <StatementStats />
      </LazySection>
      <LazySection isDue={areSectionsDue} heightClassName={SKELETON_HEIGHTS.useCases}>
        <UseCaseTabs />
      </LazySection>
      <LazySection isDue={areSectionsDue} heightClassName={SKELETON_HEIGHTS.services}>
        <ServicesCards />
      </LazySection>
      <LazySection isDue={areSectionsDue} heightClassName={SKELETON_HEIGHTS.method}>
        <MethodSteps />
      </LazySection>
      <LazySection isDue={areSectionsDue} heightClassName={SKELETON_HEIGHTS.roi}>
        <RoiSimulator onQuoteRequest={handleQuoteRequest} />
      </LazySection>
      <LazySection isDue={areSectionsDue} heightClassName={SKELETON_HEIGHTS.testimonials}>
        <Testimonials />
      </LazySection>
      <LazySection isDue={areSectionsDue} heightClassName={SKELETON_HEIGHTS.faq}>
        <FaqSection />
      </LazySection>
      <LazySection isDue={areSectionsDue} heightClassName={SKELETON_HEIGHTS.finalCta}>
        <FinalCta prefillMessage={prefill?.message} prefillNonce={prefill?.nonce} />
      </LazySection>

      {/* Always in the page, empty until the quote is in the form: a live region speaks what is put into it. */}
      <div role="status" className="sr-only">
        {status}
      </div>
    </>
  );
}
