import { Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { motion, useScroll, useSpring, AnimatePresence } from 'motion/react';
import type { ComponentProps } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import SEO from './components/SEO';
import CustomCursor from './components/CustomCursor';

const Stats = lazy(() => import('./components/Stats'));
const About = lazy(() => import('./components/About'));
const Process = lazy(() => import('./components/Process'));
const Skills = lazy(() => import('./components/Skills'));
const Projects = lazy(() => import('./components/Projects'));
const Testimonials = lazy(() => import('./components/Testimonials'));
const Partners = lazy(() => import('./components/Partners'));
const Contact = lazy(() => import('./components/Contact'));
const Footer = lazy(() => import('./components/Footer'));
const Chatbot = lazy(() => import('./components/Chatbot'));
const BlogPage = lazy(() => import('./components/BlogPage'));

const revealProps: ComponentProps<typeof motion.div> = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.8, ease: "easeOut" }
};

/* Skeleton de carregamento reutilizável */
function SectionSkeleton() {
  return (
    <div className="py-24 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-zinc-200 border-t-zinc-500 rounded-full animate-spin" />
        <span className="text-xs text-zinc-400 uppercase tracking-widest font-medium">Carregando...</span>
      </div>
    </div>
  );
}

function HomePage() {
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
          <motion.div {...revealProps}>
            <Stats />
          </motion.div>

          <motion.div {...revealProps}>
            <About />
          </motion.div>

          <motion.div {...revealProps}>
            <Process />
          </motion.div>

          <motion.div {...revealProps}>
            <Skills />
          </motion.div>

          <motion.div {...revealProps}>
            <Projects />
          </motion.div>

          <motion.div {...revealProps}>
            <Testimonials />
          </motion.div>

          <motion.div {...revealProps}>
            <Partners />
          </motion.div>

          <motion.div {...revealProps}>
            <Contact />
          </motion.div>
        </Suspense>
      </main>

      <Suspense fallback={null}>
        <Footer />
        <Chatbot />
      </Suspense>
    </>
  );
}

const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const },
};

export default function App() {
  const location = useLocation();
  const isBlog = location.pathname === '/blog';
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <div className="min-h-screen bg-brand-white text-zinc-900 font-sans selection:bg-black selection:text-white">
      {/* Scroll Progress Bar — cor adaptativa por rota */}
      <motion.div
        className={`fixed top-0 left-0 right-0 h-1 z-100 origin-left ${
          isBlog ? 'bg-white/80' : 'bg-black'
        }`}
        style={{ scaleX }}
      />

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <motion.div {...pageTransition}>
                <HomePage />
              </motion.div>
            }
          />
          <Route
            path="/blog"
            element={
              <motion.div {...pageTransition}>
                <Suspense
                  fallback={
                    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    </div>
                  }
                >
                  <SEO
                    title="Blog & Insights"
                    description="Notícias curadas sobre Inteligência Artificial, Automação e os benefícios que essas tecnologias trazem para o mundo."
                    path="/blog"
                  />
                  <BlogPage />
                </Suspense>
              </motion.div>
            }
          />
        </Routes>
      </AnimatePresence>

      <CustomCursor />
    </div>
  );
}
