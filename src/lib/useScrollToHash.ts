import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const RETRY_WINDOW_MS = 1000;

/**
 * Rola suavemente até a seção indicada em location.hash.
 * Retenta via requestAnimationFrame por até 1s porque as seções
 * são lazy e podem ainda não estar montadas quando a rota troca.
 */
export function useScrollToHash() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;

    const started = performance.now();
    let raf = 0;

    const tryScroll = () => {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else if (performance.now() - started < RETRY_WINDOW_MS) {
        raf = requestAnimationFrame(tryScroll);
      }
    };

    raf = requestAnimationFrame(tryScroll);
    return () => cancelAnimationFrame(raf);
  }, [hash]);
}
