import { Suspense, lazy } from 'react';
import { motion } from 'motion/react';
import SEO from '../components/SEO';
import { revealProps, SectionSkeleton } from '../lib/reveal';

const Projects = lazy(() => import('../components/Projects'));

export default function ProjectsPage() {
  return (
    <>
      <SEO
        title="Projetos e cases"
        description="Cases reais de automação, IA e desenvolvimento web. Produtos próprios e projetos entregues para clientes, com resultados mensuráveis."
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
