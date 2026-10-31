import { Suspense, useEffect, useRef, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import SEO from './components/SEO';
import ErrorBoundary, { ErrorPanel } from './components/layout/ErrorBoundary';
import ScrollProgress from './components/layout/ScrollProgress';
import SiteLayout from './components/layout/SiteLayout';
import { pageTransition } from './components/layout/pageTransition';
import { lazyWithRetry } from './lib/lazyWithRetry';
import { whenIdle } from './lib/whenIdle';
import HomePage from './pages/HomePage';

// Every page, the not found page, the blog and the accessibility widget are chunks of their own. A chunk that fails to
// load is retried once and then reaches an error boundary (see lazyWithRetry).
const AboutPage = lazyWithRetry(() => import('./pages/AboutPage'));
const ServicesPage = lazyWithRetry(() => import('./pages/ServicesPage'));
const ProjectsPage = lazyWithRetry(() => import('./pages/ProjectsPage'));
const ProjectDetailPage = lazyWithRetry(() => import('./pages/ProjectDetailPage'));
const ContactPage = lazyWithRetry(() => import('./pages/ContactPage'));
const PrivacyPage = lazyWithRetry(() => import('./pages/PrivacyPage'));
const LgpdPage = lazyWithRetry(() => import('./pages/LgpdPage'));
const BlogPage = lazyWithRetry(() => import('./components/BlogPage'));
const NotFound = lazyWithRetry(() => import('./components/NotFound'));
// The widget is not needed to read the page, so its chunk failing never reloads the page (the boundary hides it).
const AccessibilityWidget = lazyWithRetry(() => import('./components/AccessibilityWidget'), { canReload: false });

const BLOG_PATH = '/blog';
/** The accessibility widget is not needed to read the page: it mounts after an idle moment, and no later than this. */
const WIDGET_IDLE_TIMEOUT_MS = 1500;

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

function NotFoundRoute() {
  return (
    <>
      <SEO title="Página não encontrada" noindex />
      <NotFound />
    </>
  );
}

/** The blog keeps its own layout, outside SiteLayout, until a later plan rebuilds it. */
function BlogRoute() {
  return (
    <>
      {/* The blog background is dark, so its progress bar is white. */}
      <ScrollProgress tone="dark" />
      <motion.div initial={pageTransition.initial} animate={pageTransition.animate} transition={pageTransition.transition}>
        <ErrorBoundary fallback={(retry) => <ErrorPanel onRetry={retry} isFullScreen />}>
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
        </ErrorBoundary>
      </motion.div>
    </>
  );
}

/** Mounts the accessibility widget after an idle moment. If its chunk fails the page is fine without it. */
function DeferredAccessibilityWidget() {
  const [isDue, setIsDue] = useState(false);
  useEffect(() => whenIdle(() => setIsDue(true), WIDGET_IDLE_TIMEOUT_MS), []);
  if (!isDue) return null;

  return (
    <ErrorBoundary fallback={() => null}>
      <Suspense fallback={null}>
        <AccessibilityWidget />
      </Suspense>
    </ErrorBoundary>
  );
}

function SiteRoutes() {
  return (
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
        <Route path="*" element={<NotFoundRoute />} />
      </Route>
      <Route path={BLOG_PATH} element={<BlogRoute />} />
    </Routes>
  );
}

export default function App() {
  return (
    <>
      <ScrollResetOnLayoutSwitch />
      <SiteRoutes />
      <DeferredAccessibilityWidget />
    </>
  );
}
