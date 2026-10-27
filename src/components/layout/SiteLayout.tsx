import { AnimatePresence, motion } from 'motion/react';
import { Suspense } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { PageFallback } from '../../lib/reveal';
import Footer from './Footer';
import Header from './Header';
import { pageTransition } from './pageTransition';
import ScrollProgress from './ScrollProgress';
import SkipLink, { MAIN_CONTENT_ID } from './SkipLink';
import WhatsAppButton from './WhatsAppButton';

/**
 * The frame every page of the site renders in: skip link, scroll bar, floating header, one main landmark
 * that cross fades between pages, footer and the WhatsApp shortcut.
 */
export function SiteLayout() {
  const location = useLocation();
  // Captured per render so AnimatePresence keeps showing the previous page while it fades out:
  // a bare <Outlet /> would already render the next route during the exit.
  const outlet = useOutlet();

  return (
    <>
      <SkipLink />
      <ScrollProgress />
      <Header />
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="outline-none">
        <AnimatePresence
          mode="wait"
          onExitComplete={() => {
            // The one safe place to reset the scroll with mode="wait". With a hash, the destination
            // page scrolls to it (useScrollToHash) instead. Instant, because the page is invisible
            // and a smooth scroll would still be running while the next page fades in.
            if (!location.hash) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
          }}
        >
          <motion.div key={location.pathname} {...pageTransition}>
            <Suspense fallback={<PageFallback />}>{outlet}</Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}

export default SiteLayout;
