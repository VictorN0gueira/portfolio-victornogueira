import { blogCopy } from './blogCopy';

// The picture an article gets when it has no cover or the cover fails: the ink of the brand with the words in light gray
// (the contrast of the pair is held by BlogPage.contrast.test.ts).
const COVER_BACKGROUND = '#1a1a1a';
const COVER_TEXT = '#c7c7c7';

const COVER_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" fill="${COVER_BACKGROUND}">` +
  '<rect width="800" height="400"/>' +
  `<text x="400" y="200" fill="${COVER_TEXT}" font-family="sans-serif" font-size="24" text-anchor="middle" alignment-baseline="middle">${blogCopy.card.coverUnavailable}</text>` +
  '</svg>';

export const FALLBACK_IMAGE = `data:image/svg+xml,${encodeURIComponent(COVER_SVG)}`;
