import { Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { motion, useScroll, useSpring, AnimatePresence } from 'motion/react';
import Header from './components/Header';
import Hero from './components/Hero';
import SEO from './components/SEO';
import CustomCursor from './components/CustomCursor';

// Lazy loading components below the fold for better performance
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

const revealProps: any = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.8, ease: "easeOut" }
};

function HomePage() {
  return (
    <>
      <SEO />
      <Header />
      <main>
        <Hero />
        
        <Suspense fallback={<div className="h-32 flex items-center justify-center opacity-50">Carregando...</div>}>
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

// Page transition wrapper
const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const },
};

export default function App() {
  const location = useLocation();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <div className="min-h-screen bg-brand-white text-zinc-900 font-sans selection:bg-black selection:text-white">
      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-black z-100 origin-left"
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
