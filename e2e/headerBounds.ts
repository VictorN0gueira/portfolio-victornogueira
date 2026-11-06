// Where the fixed header ends, in CSS pixels, from src/components/layout/headerMetrics.ts: it sits 12px from the
// top (HEADER_TOP_OFFSET) and is 3.5rem plus its 2px border tall (HEADER_HEIGHT): 12 + 56 + 2 = 70px by default.
const HEADER_TOP_PX = 12;
const HEADER_HEIGHT_PX = 58;
export const HEADER_BOTTOM_PX = HEADER_TOP_PX + HEADER_HEIGHT_PX;

// On a phone held sideways (a viewport 480px high or less) the header sits 8px higher (HEADER_LANDSCAPE_LIFT) and is
// 3rem plus its border tall (HEADER_HEIGHT_LANDSCAPE): 4 + 48 + 2 = 54px.
const HEADER_LANDSCAPE_TOP_PX = 4;
const HEADER_LANDSCAPE_HEIGHT_PX = 50;
export const HEADER_LANDSCAPE_BOTTOM_PX = HEADER_LANDSCAPE_TOP_PX + HEADER_LANDSCAPE_HEIGHT_PX;

// The room to tell "just under the header" from rounding.
const BELOW_HEADER_PX = 2;

interface AnchorBounds {
  /** The card top must be more than this: a card left under the header fails. */
  minTopPx: number;
  /** ...and less than this. */
  maxTopPx: number;
}

// Portrait and desktop: the scroll padding of the page puts the card at about 95px, well inside the first screen.
export const ANCHOR_BOUNDS: AnchorBounds = { minTopPx: HEADER_BOTTOM_PX + BELOW_HEADER_PX, maxTopPx: 200 };

// Landscape: the scroll padding is 72px (index.css, vn-landscape) and the card lands near 71px. The upper bound sits
// just above that, so a landscape page that fell back to the portrait padding (about 95px) fails.
const LANDSCAPE_SLACK_PX = 9;
const LANDSCAPE_SCROLL_PADDING_PX = 72;
export const ANCHOR_LANDSCAPE_BOUNDS: AnchorBounds = {
  minTopPx: HEADER_LANDSCAPE_BOTTOM_PX + BELOW_HEADER_PX,
  maxTopPx: LANDSCAPE_SCROLL_PADDING_PX + LANDSCAPE_SLACK_PX,
};
