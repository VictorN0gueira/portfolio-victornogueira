import { Suspense, lazy } from 'react';
import { motion } from 'motion/react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import SEO from '../components/SEO';
import { revealProps, SectionSkeleton } from '../lib/reveal';
import { useScrollToHash } from '../lib/useScrollToHash';

const Stats = lazy(() => import('../components/Stats'));
const About = lazy(() => import('../components/About'));
const Process = lazy(() => import('../components/Process'));
const Skills = lazy(() => import('../components/Skills'));
const Projects = lazy(() => import('../components/Projects'));
const Testimonials = lazy(() => import('../components/Testimonials'));
const Partners = lazy(() => import('../components/Partners'));
const CTASection = lazy(() => import('../components/CTASection'));
const ROICalculator = lazy(() => import('../components/ROICalculator'));
const FAQ = lazy(() => import('../components/FAQ'));
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
          <motion.div {...revealProps}><About /></motion.div>
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <motion.div {...revealProps}><Process /></motion.div>
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <motion.div {...revealProps}><Skills /></motion.div>
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <motion.div {...revealProps}><Projects /></motion.div>
        </Suspense>

        <Suspense fallback={null}>
          <motion.div {...revealProps}><Testimonials /></motion.div>
        </Suspense>

        <Suspense fallback={null}>
          <motion.div {...revealProps}><Partners /></motion.div>
        </Suspense>

        <Suspense fallback={null}>
          <motion.div {...revealProps}><ROICalculator /></motion.div>
        </Suspense>

        <Suspense fallback={null}>
          <motion.div {...revealProps}><FAQ /></motion.div>
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
