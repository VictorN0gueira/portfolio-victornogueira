import { SCROLL_LOCK_BAR_SIZE } from '../../lib/scrollLock';

/** The page counts as scrolled once it moved more than this, and the header pill narrows. */
export const SCROLLED_AFTER_PX = 60;
// Six links and the CTA do not fit a tablet held upright, so the desktop nav starts at lg.
export const DESKTOP_NAV_QUERY = '(min-width: 1024px)';

// Inline because it compares the notch inset with 12px: pt-safe would replace the offset instead.
export const HEADER_TOP_OFFSET = 'max(12px, env(safe-area-inset-top))';
// The width is the window minus a gutter on each side, and minus the scrollbar a modal removes: that one widens the
// viewport (the percentage) and the class of lib/scrollLock.ts narrows the region the header is centred in by the same
// amount, so without this term the header would grow by the width of the bar while a modal is open.
const HEADER_GUTTER = 'max(12px, env(safe-area-inset-left), env(safe-area-inset-right))';
export const HEADER_STYLE = {
  top: HEADER_TOP_OFFSET,
  width: `calc(100% - 2 * ${HEADER_GUTTER} - ${SCROLL_LOCK_BAR_SIZE})`,
} as const;

// What a page needs to start its content below the header, in rem so it follows a larger font like the header does.
// The header is 44px controls (2.75rem), 0.375rem of padding above and below (py-1.5) and a 1px border on each side.
export const HEADER_HEIGHT = 'calc(3.5rem + 2px)';
// A phone held sideways: 0.125rem of padding (py-0.5) instead of 0.375rem, and the pill lifted by 0.5rem (-translate-y-2).
export const HEADER_HEIGHT_LANDSCAPE = 'calc(3rem + 2px)';
export const HEADER_LANDSCAPE_LIFT = '0.5rem';

// The pill is as wide as the window minus the gutters up to 68.75rem (1100px at the normal font) and narrows to
// 53.75rem (860px) once the page scrolled. Both caps are in rem, so they grow with a11y-font-large like the labels.
export const HEADER_MAX_WIDTH = '68.75rem';
export const HEADER_SCROLLED_MAX_WIDTH = '53.75rem';
/**
 * How much each side of the wide pill is cut when it narrows: half of what the width has beyond the scrolled cap, and
 * zero when the window is narrower than the cap. `cqw` is the width of the header, which is its own size container.
 */
export const HEADER_SIDE_CUT = `max(0px, calc((100cqw - ${HEADER_SCROLLED_MAX_WIDTH}) / 2))`;
