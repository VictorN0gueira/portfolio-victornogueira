import { cn } from '../../lib/utils';

interface SectionSkeletonProps {
  /**
   * The min-height classes (one per breakpoint) of what the lazy section will be about as tall as. A section that loads
   * late grows from this height to its own, so the closer this is, the less the sections below it (and an anchor such
   * as #metodo) move when it arrives. Full class names, written out, so the stylesheet generator can see them.
   */
  heightClassName: string;
}

// The band is cream like the body of the page: the label is gray-dark (7.5:1 on cream; gray-mid would be 3.1:1 at this
// size) and the spinner, a graphic, is gray-mid (3.1:1).
const SPINNER_CLASSES = 'size-10 rounded-full border-2 border-vn-gray-mid/40 border-t-vn-gray-mid motion-safe:animate-spin';
const LABEL_CLASSES = 'font-mono text-xs font-medium uppercase tracking-[0.18em] text-vn-gray-dark';

/**
 * Placeholder of a lazy section of the home: a cream band of the given height, the spinner near its top. It is only a
 * picture of loading, so it is hidden from assistive tech: the sections of a page are several, and each one would
 * announce "Carregando..." again, while every section brings its own heading when it arrives.
 */
export function SectionSkeleton({ heightClassName }: SectionSkeletonProps) {
  return (
    <div aria-hidden="true" className={cn('flex items-start justify-center bg-vn-cream py-24', heightClassName)}>
      <div className="flex flex-col items-center gap-4">
        <div className={SPINNER_CLASSES} />
        <span className={LABEL_CLASSES}>Carregando...</span>
      </div>
    </div>
  );
}
