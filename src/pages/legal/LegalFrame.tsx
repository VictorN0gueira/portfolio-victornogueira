import { useRef, type ReactNode } from 'react';
import { CONTENT_TOP_CLASSES, CONTENT_TOP_VARS } from '../../components/layout/contentTop';
import { Container } from '../../components/ui/Container';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useScrollToHash } from '../../hooks/useScrollToHash';
import { cn } from '../../lib/utils';
import './legal.css';
import { TocNav } from './TocNav';
import { useLegalToc } from './useLegalToc';

// The text starts where the other pages start, below the floating header with room to breathe (contentTop).
const FRAME_CLASSES = cn(CONTENT_TOP_CLASSES, 'bg-vn-cream pb-[clamp(4rem,3rem+5vw,9rem)] text-vn-ink');
// The text column and the 16rem of the contents. The text is held to a reading measure and the list sits at the other edge.
const TWO_COLUMNS_CLASSES = 'lg:grid lg:grid-cols-[minmax(0,52rem)_16rem] lg:items-start lg:justify-between lg:gap-12';
// Tailwind's lg, in rem like the breakpoint itself.
const WIDE_QUERY = '(min-width: 64rem)';

/**
 * The editorial frame around a legal page. The page inside is frozen (not one character of its file changes, so its text
 * is the text the owner approved): the frame gives it a reading column, a table of contents built from its own titles and,
 * through legal.css, the look of the site. Below the desktop width the contents fold into a list above the text, and from
 * there they are a sticky column on the right.
 */
export function LegalFrame({ children }: { children: ReactNode }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const { entries, activeId, goTo } = useLegalToc(bodyRef);
  const isWide = useMediaQuery(WIDE_QUERY);
  // The titles get their ids after mounting, so a link such as /privacidade#7-seus-direitos waits for them here.
  useScrollToHash();

  const toc = <TocNav entries={entries} activeId={activeId} onGo={goTo} isWide={isWide} />;

  return (
    <div style={CONTENT_TOP_VARS} className={FRAME_CLASSES}>
      <Container>
        {/* ToC rendered before the body in DOM order on all viewports so keyboard users reach navigation links
            before the full legal text. On desktop, order-last / order-first place body left and ToC right inside
            the CSS grid without changing the DOM sequence (WCAG 2.4.3 Focus Order). */}
        <div className={TWO_COLUMNS_CLASSES}>
          <div className={isWide ? 'lg:order-last lg:self-stretch' : undefined}>
            {toc}
          </div>
          <div
            ref={bodyRef}
            data-legal-body
            className={isWide ? 'vn-legal min-w-0 lg:order-first' : 'vn-legal min-w-0'}
          >
            {children}
          </div>
        </div>
      </Container>
    </div>
  );
}
