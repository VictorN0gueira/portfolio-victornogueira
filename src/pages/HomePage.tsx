import { Suspense, lazy } from 'react';
import { motion } from 'motion/react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import SEO from '../components/SEO';
import { revealProps, SectionSkeleton } from '../lib/reveal';
import { useScrollToHash } from '../lib/useScrollToHash';

const Stats = lazy(() => import('../components/Stats'));
const ProjectsTeaser = lazy(() => import('../components/ProjectsTeaser'));
const SocialProof = lazy(() => import('../components/SocialProof'));
const CTASection = lazy(() => import('../components/CTASection'));
const Contact = lazy(() => import('../components/Contact'));
const Footer = lazy(() => import('../components/Footer'));
const Chatbot = lazy(() => import('../components/Chatbot'));

export default function HomePage() {
  useScrollToHash();

  return (
    <>
      <SEO />
      <Header />
      {/* Skip-to-content para acessibilidade */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-6 focus:py-3 focus:bg-black focus:text-white focus:rounded-full focus:text-sm focus:font-bold focus:shadow-2xl"
      >
        Pular para o conteúdo
      </a>
      <main id="main-content">
        <Hero />

        <Suspense fallback={<SectionSkeleton />}>
          <motion.div {...revealProps}><Stats /></motion.div>
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <motion.div {...revealProps}><ProjectsTeaser /></motion.div>
        </Suspense>

        <Suspense fallback={null}>
          <motion.div {...revealProps}><SocialProof /></motion.div>
        </Suspense>

        <Suspense fallback={null}>
          <motion.div {...revealProps}><CTASection /></motion.div>
        </Suspense>

        <Suspense fallback={null}>
          <motion.div {...revealProps}><Contact /></motion.div>
        </Suspense>
      </main>

      <Suspense fallback={null}>
        <Footer />
        <Chatbot />
      </Suspense>
    </>
  );
}
