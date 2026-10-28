/** How many characters a card shows of a testimonial before it offers the full text. */
export const EXCERPT_LIMIT = 140;
export const ELLIPSIS = '…';

// What may not end the cut: spaces and the punctuation that only makes sense before the next word, so the ellipsis
// never follows a comma or a half open parenthesis.
const TRAILING_NOISE = /[\s,;:.!?()[\]"'-]+$/;
const WHITESPACE = /\s/u;

/** Index of the last whitespace character of `chars`, or -1 when there is none. */
function lastWhitespaceIndex(chars: readonly string[]): number {
  for (let index = chars.length - 1; index >= 0; index -= 1) {
    if (WHITESPACE.test(chars[index])) return index;
  }
  return -1;
}

/**
 * The first `limit` characters of a testimonial, cut at the last whole word, with an ellipsis appended.
 * A text of `limit` characters or fewer comes back untouched. The cut keeps a word that ends exactly at the limit
 * when a space follows it, drops the punctuation and the spaces left at its end, and falls back to a cut at the limit
 * when there is no space to cut at. Characters are counted as code points, so an emoji is never split in two. The cut
 * only happens at whitespace, on purpose: when the limit falls inside a token such as 3,5 or NF-e the whole token is
 * dropped instead of being cut in the middle.
 */
export function excerptOf(text: string, limit: number = EXCERPT_LIMIT): string {
  const chars = Array.from(text);
  if (chars.length <= limit) return text;

  const head = chars.slice(0, limit);
  const endsOnWord = WHITESPACE.test(chars[limit]);
  const lastSpace = lastWhitespaceIndex(head);
  const kept = endsOnWord || lastSpace === -1 ? head : head.slice(0, lastSpace);

  return `${kept.join('').replace(TRAILING_NOISE, '')}${ELLIPSIS}`;
}
