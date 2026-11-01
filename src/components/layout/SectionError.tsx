import { shellCopy } from '../../data/shellCopy';
import { useTakeLostFocus } from '../../hooks/useTakeLostFocus';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';

interface SectionErrorProps {
  /** The min-height classes of the section that failed, so the sections under it do not move. */
  heightClassName: string;
  onRetry: () => void;
}

/**
 * What a section of the home shows when its chunk failed to load: a short line and a retry, in a band as tall as the
 * section, so one broken chunk leaves the rest of the page (and the anchors under it) where it was. The line is a
 * paragraph, not a heading, so the outline of the page stays the one the sections give it.
 */
export function SectionError({ heightClassName, onRetry }: SectionErrorProps) {
  const headingRef = useTakeLostFocus<HTMLParagraphElement>();

  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center justify-start gap-6 bg-vn-cream px-6 py-24 text-center text-vn-ink', heightClassName)}
    >
      <p ref={headingRef} tabIndex={-1} className="font-display text-2xl font-bold lowercase tracking-[-0.03em] text-balance">{shellCopy.sectionError.heading}</p>
      <Button type="button" onClick={onRetry}>
        {shellCopy.sectionError.retry}
      </Button>
    </div>
  );
}
