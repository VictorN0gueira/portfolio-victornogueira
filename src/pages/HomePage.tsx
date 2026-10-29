import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import SEO from '../components/SEO';
import { faqs } from '../data/faqs';
import { buildFaqJsonLd } from '../lib/faqJsonLd';
import { SectionSkeleton } from '../lib/reveal';
import { scrollToIdWhenMounted } from '../lib/scrollToIdWhenMounted';
import { useScrollToHash } from '../lib/useScrollToHash';
import { HeroSection } from '../sections/home/HeroSection';
import { IntegrationsMarquee } from '../sections/home/IntegrationsMarquee';

// Everything under the first screen loads on its own chunk. The hero and the strip under it are above the fold and
// stay in the entry chunk.
const StatementStats = lazy(() => import('../sections/home/StatementStats'));
const UseCaseTabs = lazy(() => import('../sections/home/UseCaseTabs'));
const ServicesCards = lazy(() => import('../sections/home/ServicesCards'));
const MethodSteps = lazy(() => import('../sections/home/MethodSteps'));
const RoiSimulator = lazy(() => import('../sections/home/RoiSimulator'));
const Testimonials = lazy(() => import('../sections/home/Testimonials'));
const FaqSection = lazy(() => import('../sections/home/FaqSection'));
const FinalCta = lazy(() => import('../sections/home/FinalCta'));

/** The id of the section the ROI quote scrolls to (the final call to action, which holds the one form of the page). */
const CONTACT_ID = 'contato';

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

/**
 * The home: the hero and the integrations strip first, then the lazy sections in the order of the brief. The one contact
 * form of the page lives in the final section. The quote the ROI simulator builds is handed to that form: the message
 * is kept here, and a counter changes on every request so the same quote fills the field again after the visitor
 * edited it.
 */
export default function HomePage() {
  useScrollToHash();
  const [prefillMessage, setPrefillMessage] = useState<string | undefined>();
  const [prefillNonce, setPrefillNonce] = useState(0);

  // The form is in a lazy section: the scroll waits for it when the chunk has not arrived yet.
  const cancelScroll = useRef<(() => void) | undefined>(undefined);
  useEffect(() => () => cancelScroll.current?.(), []);

  const handleQuoteRequest = useCallback((message: string) => {
    setPrefillMessage(message);
    setPrefillNonce((nonce) => nonce + 1);
    cancelScroll.current?.();
    cancelScroll.current = scrollToIdWhenMounted(CONTACT_ID);
  }, []);

  return (
    <>
      <SEO path="/" jsonLd={HOME_JSON_LD} />
      <HeroSection />
      <IntegrationsMarquee />

      <Suspense fallback={<SectionSkeleton heightClassName={SKELETON_HEIGHTS.statement} />}>
        <StatementStats />
      </Suspense>
      <Suspense fallback={<SectionSkeleton heightClassName={SKELETON_HEIGHTS.useCases} />}>
        <UseCaseTabs />
      </Suspense>
      <Suspense fallback={<SectionSkeleton heightClassName={SKELETON_HEIGHTS.services} />}>
        <ServicesCards />
      </Suspense>
      <Suspense fallback={<SectionSkeleton heightClassName={SKELETON_HEIGHTS.method} />}>
        <MethodSteps />
      </Suspense>
      <Suspense fallback={<SectionSkeleton heightClassName={SKELETON_HEIGHTS.roi} />}>
        <RoiSimulator onQuoteRequest={handleQuoteRequest} />
      </Suspense>
      <Suspense fallback={<SectionSkeleton heightClassName={SKELETON_HEIGHTS.testimonials} />}>
        <Testimonials />
      </Suspense>
      <Suspense fallback={<SectionSkeleton heightClassName={SKELETON_HEIGHTS.faq} />}>
        <FaqSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton heightClassName={SKELETON_HEIGHTS.finalCta} />}>
        <FinalCta prefillMessage={prefillMessage} prefillNonce={prefillNonce} />
      </Suspense>
    </>
  );
}
