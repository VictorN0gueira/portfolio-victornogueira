import { Projects } from '../components/Projects';
import { CONTACT_LABEL, PROJECT_CTA_TEXT, PROJECTS_INTRO, PROJECTS_TITLE } from '../components/projectLabels';
import { SEO } from '../components/SEO';
import { projectsCopy } from '../data/projectsCopy';
import { CtaBand } from '../sections/shared/CtaBand';
import { PageHero } from '../sections/shared/PageHero';

const CONTACT_PATH = '/contato';

export default function ProjectsPage() {
  return (
    <>
      <SEO path="/projetos" />
      <PageHero kicker={projectsCopy.listKicker} title={PROJECTS_TITLE} lead={PROJECTS_INTRO} />
      <Projects />
      <CtaBand
        heading={PROJECT_CTA_TEXT}
        body={projectsCopy.ctaBody}
        cta={{ label: CONTACT_LABEL, to: CONTACT_PATH }}
        whatsappMessage={projectsCopy.ctaWhatsappMessage}
      />
    </>
  );
}
