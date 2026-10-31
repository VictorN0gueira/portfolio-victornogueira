import { AnimatePresence, motion } from 'motion/react';
import { Suspense, useEffect, useRef } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { focusAndGuard } from '../../lib/focusGuard';
import ErrorBoundary from './ErrorBoundary';
import Footer from './Footer';
import Header from './Header';
import PageFallback from './PageFallback';
import { pageTransition } from './pageTransition';
import RouteAnnouncer from './RouteAnnouncer';
import ScrollProgress from './ScrollProgress';
import SkipLink, { MAIN_CONTENT_ID } from './SkipLink';
import WhatsAppButton from './WhatsAppButton';

/**
 * The frame every page of the site renders in: skip link, scroll bar, floating header, one main landmark
 * that cross fades between pages, footer and the WhatsApp shortcut. A page that fails to render or to load shows the
 * recovery panel inside the main landmark, with the header and the footer still there. After a change of page focus
 * moves to the main landmark (and stays there against a menu that returns it to its button) and the title of the new page is announced, so a keyboard or screen reader visitor
 * knows the page changed.
 */
export function SiteLayout() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const stopFocusGuard = useRef<(() => void) | undefined>(undefined);
  useEffect(() => () => stopFocusGuard.current?.(), []);
  // Captured per render so AnimatePresence keeps showing the previous page while it fades out:
  // a bare <Outlet /> would already render the next route during the exit.
  const outlet = useOutlet();

  return (
    <>
      <SkipLink />
      <ScrollProgress />
      <Header />
      <RouteAnnouncer pathname={location.pathname} />
      <main ref={mainRef} id={MAIN_CONTENT_ID} tabIndex={-1} className="outline-none">
        <AnimatePresence
          mode="wait"
          onExitComplete={() => {
            // Runs only when the page changed (a change of the hash alone keeps the same page, so nothing exits), and
            // never on the first load. The one safe place to reset the scroll with mode="wait". With a hash, the
            // destination page scrolls to it (useScrollToHash) instead. Instant, because the page is invisible
            // and a smooth scroll would still be running while the next page fades in.
            if (!location.hash) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            // Focus does not scroll here: the reset above (or the hash scroll) owns the position.
            // Held for a moment: the mobile menu gives focus back to its button when its close animation ends, which on
            // a slow phone is after this. A move the visitor makes (a key, a tap) is left alone.
            stopFocusGuard.current?.();
            if (mainRef.current) stopFocusGuard.current = focusAndGuard(mainRef.current);
          }}
        >
          <motion.div key={location.pathname} {...pageTransition}>
            <ErrorBoundary>
              <Suspense fallback={<PageFallback />}>{outlet}</Suspense>
            </ErrorBoundary>
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}

export default SiteLayout;
