import { ChevronDown } from 'lucide-react';
import { useRef, type MouseEvent } from 'react';
import { Kicker } from '../../components/ui/Kicker';
import { legalCopy } from '../../data/legalCopy';
import type { TocEntry } from './legalToc';

interface TocNavProps {
  entries: readonly TocEntry[];
  activeId: string | null;
  onGo: (id: string) => void;
  /** From the desktop width the list is a sticky column. Below it, a folded list at the top of the text. */
  isWide: boolean;
}

// A 44px tall row, so it is a target for a finger. The title being read gets the ink bar and the ink text, never the accent.
const LINK_CLASSES =
  'vn-focus-ring-ink -ml-px flex min-h-11 items-center border-l-2 border-transparent py-2 pr-2 pl-4 text-sm leading-snug ' +
  'text-vn-gray-dark [overflow-wrap:anywhere] hover:text-vn-ink aria-[current=location]:border-vn-ink ' +
  'aria-[current=location]:font-medium aria-[current=location]:text-vn-ink';

/** A plain click is handled here. A click with a modifier key or another button is left to the browser (a new tab, say). */
function isPlainClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    !event.defaultPrevented && event.button === 0 && !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
  );
}

function TocList({ entries, activeId, onGo, onChosen }: Omit<TocNavProps, 'isWide'> & { onChosen?: () => void }) {
  return (
    <ol className="m-0 list-none border-l border-vn-gray-light p-0">
      {entries.map((entry) => (
        <li key={entry.id}>
          <a
            href={`#${entry.id}`}
            aria-current={entry.id === activeId ? 'location' : undefined}
            className={LINK_CLASSES}
            onClick={(event) => {
              if (!isPlainClick(event)) return;
              event.preventDefault();
              // The folded list closes first: it is above the text, so closing it moves the title, and a scroll that
              // started before would aim at where the title used to be.
              onChosen?.();
              onGo(entry.id);
            }}
          >
            {entry.label}
          </a>
        </li>
      ))}
    </ol>
  );
}

function FoldedToc(props: Omit<TocNavProps, 'isWide'>) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  return (
    <nav aria-label={legalCopy.tocLabel} className="mb-10">
      <details ref={detailsRef} className="group rounded-card border border-vn-gray-light bg-vn-white">
        <summary className="vn-focus-ring-ink flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-card px-4 font-mono text-xs tracking-[.18em] text-vn-ink uppercase [&::-webkit-details-marker]:hidden">
          <span>{legalCopy.tocLabel}</span>
          <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-4 pb-3">
          <TocList
            {...props}
            onChosen={() => {
              if (detailsRef.current) detailsRef.current.open = false;
            }}
          />
        </div>
      </details>
    </nav>
  );
}

function StickyToc(props: Omit<TocNavProps, 'isWide'>) {
  return (
    <nav
      aria-label={legalCopy.tocLabel}
      className="sticky top-28 max-h-[calc(100dvh-8rem)] self-start overflow-y-auto overscroll-contain p-1"
    >
      <Kicker className="mb-5">{legalCopy.tocLabel}</Kicker>
      <TocList {...props} />
    </nav>
  );
}

/** The navigation of the table of contents of a legal page. It renders nothing when the page has no titles. */
export function TocNav({ isWide, ...props }: TocNavProps) {
  if (props.entries.length === 0) return null;
  return isWide ? <StickyToc {...props} /> : <FoldedToc {...props} />;
}
