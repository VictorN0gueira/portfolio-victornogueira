import { Suspense, lazy, useCallback, useState } from 'react';
import SEO from '../components/SEO';
import { faqs } from '../data/faqs';
import { buildFaqJsonLd } from '../lib/faqJsonLd';
import { SectionSkeleton } from '../lib/reveal';
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

// How tall each lazy section is once it has loaded, so a late chunk does not move the anchors under it (#metodo and
// #clientes). The rems are the heights measured in Chromium at 320 to 2560px wide. On a phone one column of text wraps
// more the narrower the screen is, so the first class is a line between the height at 320px and the one at 412px
// (clamp keeps it inside them); the others hold one height per breakpoint. A section is taller with the larger font
// option, which a skeleton does not chase. The class names are written out in full for the stylesheet generator.
const SKELETON_HEIGHTS = {
  statement:
    'min-h-[clamp(79.9rem,93.78rem-53.91vw,83rem)] sm:min-h-[55rem] md:min-h-[63rem] lg:min-h-[52rem] xl:min-h-[62rem] 2xl:min-h-[65rem]',
  useCases:
    'min-h-[clamp(60.9rem,84.63rem-92.17vw,66.2rem)] sm:min-h-[57rem] md:min-h-[61rem] lg:min-h-[56rem] 2xl:min-h-[60rem]',
  services:
    'min-h-[clamp(101.1rem,150.36rem-191.3vw,112.1rem)] sm:min-h-[97rem] md:min-h-[85rem] lg:min-h-[65rem]',
  method:
    'min-h-[clamp(98.6rem,121.44rem-88.7vw,103.7rem)] sm:min-h-[94rem] md:min-h-[68rem] lg:min-h-[57rem] xl:min-h-[61rem]',
  roi: 'min-h-[clamp(74rem,78.03rem-15.65vw,74.9rem)] sm:min-h-[70rem] md:min-h-[74rem] lg:min-h-[57rem] xl:min-h-[60rem]',
  testimonials:
    'min-h-[clamp(200rem,247.02rem-182.61vw,210.5rem)] sm:min-h-[192rem] md:min-h-[130rem] lg:min-h-[106rem] xl:min-h-[109rem]',
  faq: 'min-h-[clamp(58rem,93.38rem-137.39vw,65.9rem)] sm:min-h-[54rem] md:min-h-[58rem] lg:min-h-[41rem] 2xl:min-h-[44rem]',
  finalCta: 'min-h-[clamp(83.6rem,88.53rem-19.13vw,84.7rem)] sm:min-h-[78rem] md:min-h-[82rem] lg:min-h-[60rem]',
} as const;

// The FAQPage schema comes from the same list as the accordion of the section.
const faqJsonLd = buildFaqJsonLd(faqs);

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

  const handleQuoteRequest = useCallback((message: string) => {
    setPrefillMessage(message);
    setPrefillNonce((nonce) => nonce + 1);
    document.getElementById(CONTACT_ID)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <>
      <SEO path="/" jsonLd={[faqJsonLd]} />
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
