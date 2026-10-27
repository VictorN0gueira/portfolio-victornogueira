import { Suspense, lazy } from 'react';
import { motion } from 'motion/react';
import SEO from '../components/SEO';
import { HeroSection } from '../sections/home/HeroSection';
import { revealProps, SectionSkeleton } from '../lib/reveal';
import { useScrollToHash } from '../lib/useScrollToHash';

const Stats = lazy(() => import('../components/Stats'));
const ProjectsTeaser = lazy(() => import('../components/ProjectsTeaser'));
const SocialProof = lazy(() => import('../components/SocialProof'));
const CTASection = lazy(() => import('../components/CTASection'));
const Contact = lazy(() => import('../components/Contact'));

export default function HomePage() {
  useScrollToHash();

  return (
    <>
      <SEO />
      <div>
        <HeroSection />

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
      </div>
    </>
  );
}
