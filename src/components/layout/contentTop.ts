import type { CSSProperties } from 'react';
import { HEADER_HEIGHT, HEADER_HEIGHT_LANDSCAPE, HEADER_LANDSCAPE_LIFT, HEADER_TOP_OFFSET } from './headerMetrics';

// Where the content of a page starts: below the fixed header, with room to breathe (a little more on wide screens). The
// home hero, the hero of the inner pages and the frame of the legal pages all start there, from this one definition.
// The header's own numbers come from headerMetrics, in rem, so this follows a larger font and the notch like it does.
// A phone held sideways has a shorter header that sits 0.5rem higher, so it gets its own offset.
const BREATHING_ROOM = 'clamp(2rem, 1rem + 4vw, 5rem)';

/** The two custom properties the top padding reads: set them as the style of the element that has CONTENT_TOP_CLASSES. */
export const CONTENT_TOP_VARS = {
  '--hero-top': `calc(${HEADER_TOP_OFFSET} + ${HEADER_HEIGHT} + ${BREATHING_ROOM})`,
  '--hero-top-landscape': `calc(${HEADER_TOP_OFFSET} - ${HEADER_LANDSCAPE_LIFT} + ${HEADER_HEIGHT_LANDSCAPE} + ${BREATHING_ROOM})`,
} as CSSProperties;

export const CONTENT_TOP_CLASSES = 'pt-[var(--hero-top)] vn-landscape:pt-[var(--hero-top-landscape)]';
