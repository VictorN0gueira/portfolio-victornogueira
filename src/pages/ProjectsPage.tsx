import { Suspense, lazy } from 'react';
import { motion } from 'motion/react';
import Header from '../components/Header';
import SEO from '../components/SEO';
import { revealProps, SectionSkeleton } from '../lib/reveal';

const Projects = lazy(() => import('../components/Projects'));
const Footer = lazy(() => import('../components/Footer'));
const Chatbot = lazy(() => import('../components/Chatbot'));

export default function ProjectsPage() {
  return (
    <>
      <SEO
        title="Projetos & Cases"
        description="Cases reais de automação, IA e desenvolvimento web — produtos próprios e projetos entregues para clientes, com resultados mensuráveis."
        path="/projetos"
      />
      <Header />
      <main id="main-content" className="pt-16 md:pt-20">
        <Suspense fallback={<SectionSkeleton />}>
          <motion.div {...revealProps}><Projects /></motion.div>
        </Suspense>
      </main>

      <Suspense fallback={null}>
        <Footer />
        <Chatbot />
      </Suspense>
    </>
  );
}
