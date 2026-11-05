// Where the fixed header ends, in CSS pixels, from src/components/layout/headerMetrics.ts: it sits 12px from the
// top (HEADER_TOP_OFFSET) and is 3.5rem plus its 2px border tall (HEADER_HEIGHT): 12 + 56 + 2 = 70px by default.
const HEADER_TOP_PX = 12;
const HEADER_HEIGHT_PX = 58;
export const HEADER_BOTTOM_PX = HEADER_TOP_PX + HEADER_HEIGHT_PX;

// An anchored card must start below the header: a card left under it (top under HEADER_BOTTOM_PX) fails. The 2px is
// the room to tell "just under" from rounding. The real value is the scroll padding of the page, about 95px.
export const ANCHOR_MIN_TOP_PX = HEADER_BOTTOM_PX + 2;
// ...and well inside the first screen.
export const ANCHOR_MAX_TOP_PX = 200;
