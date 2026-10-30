import { Suspense, lazy } from 'react';
import SEO from '../components/SEO';
import { SectionSkeleton } from '../lib/reveal';

const Projects = lazy(() => import('../components/Projects'));

export const PROJECTS_PAGE_TITLE = 'Projetos';
export const PROJECTS_PAGE_DESCRIPTION =
  'Sistemas de atendimento, automação e IA que a gente construiu, com as telas de cada um: DizPara, Hub081, diagnóstico empresarial, dashboard de CRM e outros.';

// About as tall as the loaded page at each width (measured), so the footer is not pushed down when the chunk arrives.
const PROJECTS_SKELETON_HEIGHT = 'min-h-[5200px] md:min-h-[4800px] lg:min-h-[3900px]';

export default function ProjectsPage() {
  return (
    <>
      <SEO title={PROJECTS_PAGE_TITLE} description={PROJECTS_PAGE_DESCRIPTION} path="/projetos" />
      <div className="pt-16 md:pt-20">
        <Suspense fallback={<SectionSkeleton heightClassName={PROJECTS_SKELETON_HEIGHT} />}>
          <Projects />
        </Suspense>
      </div>
    </>
  );
}
