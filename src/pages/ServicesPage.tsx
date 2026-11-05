import { SEO } from '../components/SEO';
import { servicesCopy } from '../data/servicesCopy';
import { useScrollToHash } from '../hooks/useScrollToHash';
import { FaqSection } from '../sections/home/FaqSection';
import { ComboCards } from '../sections/services/ComboCards';
import { ServicesGrid } from '../sections/services/ServicesGrid';
import { CtaBand } from '../sections/shared/CtaBand';
import { PageHero } from '../sections/shared/PageHero';

const CONTACT_PATH = '/contato';

/**
 * The services page: the hero, one card per service (each the target of /servicos#slug), the combos, the FAQ of the
 * home and the closing band. Cream, white, black, white, black. The head comes from src/seo/routeMeta.ts.
 */
export default function ServicesPage() {
  // The page is a lazy route, so the browser looks for /servicos#slug before the cards exist: the scroll waits for them.
  useScrollToHash();
  const { hero, cta } = servicesCopy;

  return (
    <>
      <SEO path="/servicos" />
      <PageHero kicker={hero.kicker} title={hero.title} lead={hero.lead} hasCursor />
      <ServicesGrid />
      <ComboCards />
      <FaqSection />
      <CtaBand
        heading={cta.heading}
        body={cta.body}
        cta={{ label: cta.label, to: CONTACT_PATH }}
        whatsappMessage={cta.whatsappMessage}
      />
    </>
  );
}
