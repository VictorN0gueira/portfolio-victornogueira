import { Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { motion, useScroll, useSpring, AnimatePresence } from 'motion/react';
import NotFound from './components/NotFound';
import SEO from './components/SEO';
import AccessibilityWidget from './components/AccessibilityWidget';
import HomePage from './pages/HomePage';
import { PageFallback } from './lib/reveal';

const AboutPage = lazy(() => import('./pages/AboutPage'));
const ServicesPage = lazy(() => import('./pages/ServicesPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const BlogPage = lazy(() => import('./components/BlogPage'));

const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const },
};

/* Wrapper padrão: transição de página + Suspense com fallback full-screen */
function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div {...pageTransition}>
      <Suspense fallback={<PageFallback />}>{children}</Suspense>
    </motion.div>
  );
}

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
    <div className="min-h-screen bg-brand-white text-zinc-900 dark:text-zinc-50 font-sans selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
      {/* Scroll Progress Bar — cor adaptativa por rota e tema */}
      <motion.div
        className={`fixed top-0 left-0 right-0 h-1 z-[100] origin-left ${
          isBlog ? 'bg-white/80' : 'bg-black dark:bg-white'
        }`}
        style={{ scaleX }}
      />

      <AnimatePresence
        mode="wait"
        onExitComplete={() => {
          // Único ponto seguro para resetar o scroll com mode="wait".
          // Com hash, o useScrollToHash da página destino assume.
          if (!location.hash) window.scrollTo(0, 0);
        }}
      >
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <motion.div {...pageTransition}>
                <HomePage />
              </motion.div>
            }
          />
          <Route path="/sobre" element={<LazyPage><AboutPage /></LazyPage>} />
          <Route path="/servicos" element={<LazyPage><ServicesPage /></LazyPage>} />
          <Route path="/projetos" element={<LazyPage><ProjectsPage /></LazyPage>} />
          <Route path="/contato" element={<LazyPage><ContactPage /></LazyPage>} />
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
          <Route
            path="*"
            element={
              <motion.div {...pageTransition}>
                <SEO title="Página não encontrada" noindex />
                <NotFound />
              </motion.div>
            }
          />
        </Routes>
      </AnimatePresence>

      <AccessibilityWidget />
    </div>
  );
}
