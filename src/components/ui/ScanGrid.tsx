import { cn } from '../../lib/utils';

export type ScanGridTone = 'light' | 'dark';

interface ScanGridProps {
  /** `dark` for black sections. */
  tone?: ScanGridTone;
  className?: string;
}

/**
 * Decorative 64px line grid with a scan line sweeping down it. It fills its nearest positioned
 * ancestor and sits at -z-10, so that ancestor must be a stacking context (Section is one).
 * `overflow-hidden` keeps the sweeping line from adding scroll to the page. The sweep is
 * `.vn-scan-line` in tokens.css and is hidden under reduced motion and `.a11y-no-animations`.
 */
export function ScanGrid({ tone = 'light', className }: ScanGridProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'vn-scan-grid pointer-events-none absolute inset-0 -z-10 overflow-hidden',
        tone === 'dark' && 'vn-scan-grid--dark',
        className,
      )}
    >
      <span className="vn-scan-line absolute inset-x-0 top-0 block h-px" />
    </div>
  );
}

export default ScanGrid;
