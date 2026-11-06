import { createHash } from 'node:crypto';

// The text of the two legal pages, as a hash. PrivacyPage and LgpdPage are frozen (not one character changes without the
// owner's ok, items Q1 and Q2 of plan 3), and the frame the routes put around them must not change what a visitor reads.
// The hashes were measured on the pages alone, before the frame existed (Task L2 of the plan): the same hash has to come
// out of the body of the frame (Task L3). If the owner approves the layout only edit of the pages (Via 2), a hash only
// changes if a word did, so these two values are the proof that the text is the same.

/** SHA-256 (hexadecimal) of the visible text of PrivacyPage, white space collapsed. */
export const PRIVACY_TEXT_HASH = '5df0a5bccb2671f08f725332c354a39ec6925a04355816e944907c4ecaf4a9d4';
/** SHA-256 (hexadecimal) of the visible text of LgpdPage, white space collapsed. */
export const LGPD_TEXT_HASH = '15761667d1a69131da3331817fbbb6320d0b95f2726e98da8e2614b8dade89cb';

const WHITE_SPACE = /\s+/g;

/** What a visitor reads in the element: the text without scripts and styles, white space collapsed to single spaces. */
export function visibleText(element: Element): string {
  const copy = element.cloneNode(true) as Element;
  copy.querySelectorAll('script, style').forEach((node) => node.remove());
  return (copy.textContent ?? '').replace(WHITE_SPACE, ' ').trim();
}

export function hashOfText(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}
