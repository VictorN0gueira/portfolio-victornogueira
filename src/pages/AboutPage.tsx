import { SEO } from '../components/SEO';
import { aboutCopy } from '../data/aboutCopy';
import { useScrollToHash } from '../hooks/useScrollToHash';
import { CompanySection } from '../sections/about/CompanySection';
import { FounderIntro } from '../sections/about/FounderIntro';
import { Specialties } from '../sections/about/Specialties';
import { ToolsGrid } from '../sections/about/ToolsGrid';
import { MethodSteps } from '../sections/home/MethodSteps';
import { CtaBand } from '../sections/shared/CtaBand';

const CONTACT_PATH = '/contato';

// The page is already a lazy route chunk, so its sections are plain imports: nothing above #metodo can grow when a
// later chunk arrives and push the anchor away from where the hash scroll put it.
export default function AboutPage() {
  // A page that is opened with /sobre#metodo is not in the DOM yet when the browser looks for the anchor.
  useScrollToHash();

  return (
    <>
      <SEO path="/sobre" />
      <FounderIntro />
      <CompanySection />
      <Specialties />
      <MethodSteps />
      <ToolsGrid />
      <CtaBand
        heading={aboutCopy.cta.heading}
        body={aboutCopy.cta.body}
        cta={{ label: aboutCopy.cta.label, to: CONTACT_PATH }}
        whatsappMessage={aboutCopy.cta.whatsappMessage}
      />
    </>
  );
}
