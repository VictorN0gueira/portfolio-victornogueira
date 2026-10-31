/** How many characters a card shows of a testimonial before it offers the full text. */
export const EXCERPT_LIMIT = 140;
export const ELLIPSIS = '…';

// What may not end the cut: spaces and the punctuation that only makes sense before the next word, so the ellipsis
// never follows a comma or a half open parenthesis.
const TRAILING_NOISE = /[\s,;:.!?()[\]"'-]+$/;
const WHITESPACE = /\s/u;
const SENTENCE_END = /[.!?]/u;
const CLOSING_MARK = /["')\]]/u;
// A sentence cut shorter than this share of the limit would leave the card nearly empty: the word cut is used instead.
const MIN_SENTENCE_SHARE = 0.5;

/** Index of the last whitespace character of `chars`, or -1 when there is none. */
function lastWhitespaceIndex(chars: readonly string[]): number {
  for (let index = chars.length - 1; index >= 0; index -= 1) {
    if (WHITESPACE.test(chars[index])) return index;
  }
  return -1;
}

/**
 * Where the last whole sentence inside `limit` ends (the index after its period and its closing marks), or -1 when
 * there is none long enough. A period counts only when whitespace follows it, so the point of 3.5 is not an end.
 */
function lastSentenceEnd(chars: readonly string[], limit: number): number {
  // The sentence keeps `shortest` characters at least, so its closing mark sits at index `shortest - 1` or later.
  const shortest = Math.ceil(limit * MIN_SENTENCE_SHARE);
  for (let index = limit - 1; index >= shortest - 1; index -= 1) {
    if (!SENTENCE_END.test(chars[index])) continue;

    let end = index + 1;
    while (end < chars.length && CLOSING_MARK.test(chars[end])) end += 1;
    if (end === chars.length || WHITESPACE.test(chars[end])) return end;
  }
  return -1;
}

/**
 * The start of a testimonial that fits in `limit` characters. A text of `limit` characters or fewer comes back untouched.
 * Otherwise the cut is at the end of the last whole sentence inside the limit, with no ellipsis (the sentence is
 * complete, and the card offers the full text), as long as that keeps at least half of the limit. When there is no such
 * sentence the cut is at the last whole word with an ellipsis: a word that ends exactly at the limit is kept when a
 * space follows it, the punctuation and the spaces left at the end are dropped, and a cut at the limit is the
 * fallback when there is no space to cut at. Characters are counted as code points, so an emoji is never split in two.
 * The word cut only happens at whitespace, on purpose: when the limit falls inside a token such as 3,5 or NF-e the
 * whole token is dropped instead of being cut in the middle.
 */
export function excerptOf(text: string, limit: number = EXCERPT_LIMIT): string {
  const chars = Array.from(text);
  if (chars.length <= limit) return text;

  const sentenceEnd = lastSentenceEnd(chars, limit);
  if (sentenceEnd !== -1) return chars.slice(0, sentenceEnd).join('');

  const head = chars.slice(0, limit);
  const endsOnWord = WHITESPACE.test(chars[limit]);
  const lastSpace = lastWhitespaceIndex(head);
  const kept = endsOnWord || lastSpace === -1 ? head : head.slice(0, lastSpace);

  return `${kept.join('').replace(TRAILING_NOISE, '')}${ELLIPSIS}`;
}
