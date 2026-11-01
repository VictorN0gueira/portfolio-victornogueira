import { useEffect, useState } from 'react';
import { SCROLLED_AFTER_PX } from './headerMetrics';

function readScrolled(): boolean {
  return typeof window !== 'undefined' && window.scrollY > SCROLLED_AFTER_PX;
}

/** True once the page scrolled past the threshold. The listener is passive and throttled to one update per frame. */
export function useScrolled(): boolean {
  const [isScrolled, setIsScrolled] = useState(readScrolled);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      setIsScrolled(readScrolled());
    };
    const handleScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(update);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return isScrolled;
}
