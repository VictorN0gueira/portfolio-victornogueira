import { Suspense, lazy, useEffect, useRef } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import NotFound from './components/NotFound';
import SEO from './components/SEO';
import AccessibilityWidget from './components/AccessibilityWidget';
import ScrollProgress from './components/layout/ScrollProgress';
import SiteLayout from './components/layout/SiteLayout';
import { pageTransition } from './components/layout/pageTransition';
import HomePage from './pages/HomePage';

const AboutPage = lazy(() => import('./pages/AboutPage'));
const ServicesPage = lazy(() => import('./pages/ServicesPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const LgpdPage = lazy(() => import('./pages/LgpdPage'));
const BlogPage = lazy(() => import('./components/BlogPage'));

const BLOG_PATH = '/blog';

/**
 * Going between the blog (its own layout) and the rest of the site swaps the whole layout, so SiteLayout
 * cannot reset the scroll the way it does between its own pages. This does it for that switch in both
 * directions (BlogPage also resets its own scroll when it mounts).
 */
function ScrollResetOnLayoutSwitch() {
  const { pathname, hash } = useLocation();
  const isBlog = pathname === BLOG_PATH;
  const wasBlog = useRef(isBlog);

  useEffect(() => {
    if (wasBlog.current !== isBlog && !hash) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    wasBlog.current = isBlog;
  }, [isBlog, hash]);

  return null;
}

export default function App() {
  return (
    <>
      <ScrollResetOnLayoutSwitch />

      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/sobre" element={<AboutPage />} />
          <Route path="/servicos" element={<ServicesPage />} />
          <Route path="/projetos" element={<ProjectsPage />} />
          <Route path="/projetos/:slug" element={<ProjectDetailPage />} />
          <Route path="/contato" element={<ContactPage />} />
          <Route path="/privacidade" element={<PrivacyPage />} />
          <Route path="/lgpd" element={<LgpdPage />} />
          <Route
            path="*"
            element={
              <>
                <SEO title="Página não encontrada" noindex />
                <NotFound />
              </>
            }
          />
        </Route>

        {/* The blog keeps its own layout, outside SiteLayout, until a later plan rebuilds it. */}
        <Route
          path={BLOG_PATH}
          element={
            <>
              {/* The blog background is dark, so its progress bar is white. */}
              <ScrollProgress tone="dark" />
              <motion.div initial={pageTransition.initial} animate={pageTransition.animate} transition={pageTransition.transition}>
                <Suspense
                  fallback={
                    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    </div>
                  }
                >
                  <SEO
                    title="Blog e insights"
                    description="Notícias curadas sobre Inteligência Artificial, Automação e os benefícios que essas tecnologias trazem para o mundo."
                    path="/blog"
                  />
                  <BlogPage />
                </Suspense>
              </motion.div>
            </>
          }
        />
      </Routes>

      <AccessibilityWidget />
    </>
  );
}
