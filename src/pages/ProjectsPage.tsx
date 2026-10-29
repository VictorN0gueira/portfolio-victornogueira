import { Suspense, lazy } from 'react';
import { motion } from 'motion/react';
import SEO from '../components/SEO';
import { revealProps, SectionSkeleton } from '../lib/reveal';

const Projects = lazy(() => import('../components/Projects'));

export default function ProjectsPage() {
  return (
    <>
      <SEO
        title="Projetos"
        description="Sistemas de atendimento, automação e IA que a gente construiu: DizPara, Hub081, diagnóstico empresarial, dashboards de CRM e mais, com as telas de cada um."
        path="/projetos"
      />
      <div className="pt-16 md:pt-20">
        <Suspense fallback={<SectionSkeleton />}>
          <motion.div {...revealProps}><Projects /></motion.div>
        </Suspense>
      </div>
    </>
  );
}
