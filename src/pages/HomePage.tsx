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
// #metodo and #clientes are also put back after a late chunk, see scrollToIdWhenMounted). One min-height per band of
// widths, set to the middle of the heights measured in Chromium at 30 widths from 320 to 2560 (a band spans at most
// about 100px of height, so a skeleton is off by 50px or less at the normal font). The unit is rem, so it follows the
// larger font option, and --vn-skeleton-scale (index.css) adds the extra lines the text wraps into when it is on.
// Written out in full, as the stylesheet generator reads class names from the source.
const SKELETON_HEIGHTS = {
  statement:
    'min-h-[calc(81.4rem*var(--vn-skeleton-scale,1))] min-[640px]:min-h-[calc(56.4rem*var(--vn-skeleton-scale,1))] min-[768px]:min-h-[calc(62.3rem*var(--vn-skeleton-scale,1))] min-[1024px]:min-h-[calc(54.0rem*var(--vn-skeleton-scale,1))] min-[1366px]:min-h-[calc(64.3rem*var(--vn-skeleton-scale,1))]',
  useCases:
    'min-h-[calc(63.4rem*var(--vn-skeleton-scale,1))] min-[440px]:min-h-[calc(57.3rem*var(--vn-skeleton-scale,1))] min-[768px]:min-h-[calc(62.8rem*var(--vn-skeleton-scale,1))] min-[1024px]:min-h-[calc(57.6rem*var(--vn-skeleton-scale,1))]',
  services:
    'min-h-[calc(109.4rem*var(--vn-skeleton-scale,1))] min-[375px]:min-h-[calc(102.1rem*var(--vn-skeleton-scale,1))] min-[480px]:min-h-[calc(98.0rem*var(--vn-skeleton-scale,1))] min-[768px]:min-h-[calc(83.1rem*var(--vn-skeleton-scale,1))] min-[1024px]:min-h-[calc(65.5rem*var(--vn-skeleton-scale,1))]',
  method:
    'min-h-[calc(100.7rem*var(--vn-skeleton-scale,1))] min-[520px]:min-h-[calc(95.6rem*var(--vn-skeleton-scale,1))] min-[768px]:min-h-[calc(67.4rem*var(--vn-skeleton-scale,1))] min-[1024px]:min-h-[calc(59.2rem*var(--vn-skeleton-scale,1))] min-[1700px]:min-h-[calc(63.6rem*var(--vn-skeleton-scale,1))]',
  roi:
    'min-h-[calc(73.0rem*var(--vn-skeleton-scale,1))] min-[1023px]:min-h-[calc(76.4rem*var(--vn-skeleton-scale,1))] min-[1024px]:min-h-[calc(59.7rem*var(--vn-skeleton-scale,1))] min-[1920px]:min-h-[calc(63.8rem*var(--vn-skeleton-scale,1))]',
  testimonials:
    'min-h-[calc(209.1rem*var(--vn-skeleton-scale,1))] min-[390px]:min-h-[calc(200.7rem*var(--vn-skeleton-scale,1))] min-[480px]:min-h-[calc(192.1rem*var(--vn-skeleton-scale,1))] min-[700px]:min-h-[calc(182.6rem*var(--vn-skeleton-scale,1))] min-[768px]:min-h-[calc(129.9rem*var(--vn-skeleton-scale,1))] min-[900px]:min-h-[calc(121.4rem*var(--vn-skeleton-scale,1))] min-[1024px]:min-h-[calc(108.9rem*var(--vn-skeleton-scale,1))] min-[1920px]:min-h-[calc(112.9rem*var(--vn-skeleton-scale,1))]',
  faq:
    'min-h-[calc(63.2rem*var(--vn-skeleton-scale,1))] min-[412px]:min-h-[calc(56.1rem*var(--vn-skeleton-scale,1))] min-[1023px]:min-h-[calc(59.6rem*var(--vn-skeleton-scale,1))] min-[1024px]:min-h-[calc(42.3rem*var(--vn-skeleton-scale,1))]',
  finalCta:
    'min-h-[calc(82.1rem*var(--vn-skeleton-scale,1))] min-[560px]:min-h-[calc(79.9rem*var(--vn-skeleton-scale,1))] min-[960px]:min-h-[calc(83.8rem*var(--vn-skeleton-scale,1))] min-[1024px]:min-h-[calc(61.8rem*var(--vn-skeleton-scale,1))]',
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
