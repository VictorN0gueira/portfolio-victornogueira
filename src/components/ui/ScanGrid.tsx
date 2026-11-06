import { cn } from '../../lib/utils';

type ScanGridTone = 'light' | 'dark';

interface ScanGridProps {
  /** `dark` for black sections. */
  tone?: ScanGridTone;
  /**
   * True keeps the scan line out of the content column (a Container: 1216px, centered, with its gutters), so the
   * line only sweeps the margins at the sides and never crosses a heading or a form. The grid itself stays.
   */
  keepContentClear?: boolean;
  className?: string;
}

// The Container gutters (px-4, 360px: px-5, md: px-12) as a custom property, so the clear zone follows the same steps.
const CLEAR_PAD_CLASSES = '[--scan-pad:1rem] xs:[--scan-pad:1.25rem] md:[--scan-pad:3rem]';
// The side of the page that is not content: the space beside a 1216px Container, plus its gutter.
const CLEAR_EDGE = 'calc(max(0px, (100% - 1216px) / 2) + var(--scan-pad))';
// The mask only reads the alpha of its stops: any opaque palette color does, so it is the black token, not a black literal.
const CLEAR_MASK = `linear-gradient(to right, var(--color-vn-black) ${CLEAR_EDGE}, transparent ${CLEAR_EDGE}, transparent calc(100% - ${CLEAR_EDGE}), var(--color-vn-black) calc(100% - ${CLEAR_EDGE}))`;
const CLEAR_STYLE = { maskImage: CLEAR_MASK, WebkitMaskImage: CLEAR_MASK } as const;

/**
 * Decorative 64px line grid with a scan line sweeping down it. It fills its nearest positioned
 * ancestor and sits at -z-10, so that ancestor must be a stacking context (Section is one).
 * `overflow-hidden` clips the scan line layer while it sits above the grid, so it adds no scroll.
 * The sweep is `.vn-scan-line` in tokens.css: a full size layer moved by its own height, so one
 * sweep covers the section top to bottom at any viewport. It is hidden under reduced motion and
 * `.a11y-no-animations`. With `keepContentClear` a mask on the line only lets it through beside the content column.
 */
export function ScanGrid({ tone = 'light', keepContentClear = false, className }: ScanGridProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'vn-scan-grid pointer-events-none absolute inset-0 -z-10 overflow-hidden',
        tone === 'dark' && 'vn-scan-grid--dark',
        keepContentClear && CLEAR_PAD_CLASSES,
        className,
      )}
    >
      <span className="vn-scan-line" style={keepContentClear ? CLEAR_STYLE : undefined} />
    </div>
  );
}
