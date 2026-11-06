import { useRef, type CSSProperties, type ReactNode } from 'react';
import {
  HEADER_HEIGHT,
  HEADER_HEIGHT_LANDSCAPE,
  HEADER_LANDSCAPE_LIFT,
  HEADER_TOP_OFFSET,
} from '../../components/layout/headerMetrics';
import { Container } from '../../components/ui/Container';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useScrollToHash } from '../../hooks/useScrollToHash';
import './legal.css';
import { TocNav } from './TocNav';
import { useLegalToc } from './useLegalToc';

// The same top as the PageHero of the other inner pages (copied, as the PageHero copied it from the home): the text starts
// below the floating header with room to breathe.
const BREATHING_ROOM = 'clamp(2rem, 1rem + 4vw, 5rem)';
const CONTENT_TOP_VARS = {
  '--hero-top': `calc(${HEADER_TOP_OFFSET} + ${HEADER_HEIGHT} + ${BREATHING_ROOM})`,
  '--hero-top-landscape': `calc(${HEADER_TOP_OFFSET} - ${HEADER_LANDSCAPE_LIFT} + ${HEADER_HEIGHT_LANDSCAPE} + ${BREATHING_ROOM})`,
} as CSSProperties;
const FRAME_CLASSES =
  'bg-vn-cream pt-[var(--hero-top)] pb-[clamp(4rem,3rem+5vw,9rem)] text-vn-ink vn-landscape:pt-[var(--hero-top-landscape)]';
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
        <div className={TWO_COLUMNS_CLASSES}>
          {isWide ? null : toc}
          <div ref={bodyRef} data-legal-body className="vn-legal min-w-0">
            {children}
          </div>
          {isWide ? toc : null}
        </div>
      </Container>
    </div>
  );
}
