import { useEffect, useRef, useState } from 'react';

/** The new page is lazy, so its title can arrive after the route changed: this is the longest the announcer waits for it. */
const MAX_TITLE_WAIT_MS = 3000;

interface RouteAnnouncerProps {
  pathname: string;
}

/**
 * Speaks the title of the page a route change leads to, in a polite status region only screen readers perceive.
 * It stays quiet on the first load (the browser reads the page itself) and when the path does not change (a hash
 * link). The title is set by the new page after it mounts, so the announcer waits, frame by frame, for it to change
 * (up to MAX_TITLE_WAIT_MS) and then says whatever title the document has.
 */
export function RouteAnnouncer({ pathname }: RouteAnnouncerProps) {
  const [announcement, setAnnouncement] = useState('');
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;

    setAnnouncement('');
    const titleBefore = document.title;
    const startedAt = performance.now();
    let frame = 0;

    const check = () => {
      if (document.title !== titleBefore || performance.now() - startedAt >= MAX_TITLE_WAIT_MS) {
        setAnnouncement(document.title);
        return;
      }
      frame = requestAnimationFrame(check);
    };
    frame = requestAnimationFrame(check);

    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return (
    <div role="status" className="sr-only">
      {announcement}
    </div>
  );
}
