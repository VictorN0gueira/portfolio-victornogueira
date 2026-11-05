import { Suspense, useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { SEO } from './components/SEO';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { SiteLayout } from './components/layout/SiteLayout';
import { lazyWithRetry } from './lib/lazyWithRetry';
import { whenIdle } from './lib/whenIdle';
import { HomePage } from './pages/HomePage';

// Every page (the blog included), the not found page and the accessibility widget are chunks of their own. A chunk that fails to
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

/** The accessibility widget is not needed to read the page: it mounts after an idle moment, and no later than this. */
const WIDGET_IDLE_TIMEOUT_MS = 1500;

function NotFoundRoute() {
  return (
    <>
      <SEO title="Página não encontrada" noindex />
      <NotFound />
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
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/privacidade" element={<PrivacyPage />} />
        <Route path="/lgpd" element={<LgpdPage />} />
        <Route path="*" element={<NotFoundRoute />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <>
      <SiteRoutes />
      <DeferredAccessibilityWidget />
    </>
  );
}
