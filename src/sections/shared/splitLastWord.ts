interface SplitText {
  /** Everything before the last word, with the space that follows it kept ('' for a single word). */
  head: string;
  last: string;
}

/** Splits a text at its last word, so the last word and a block that follows it (a cursor) can be kept together. */
export function splitLastWord(text: string): SplitText {
  const trimmed = text.trim();
  const lastWordStart = trimmed.lastIndexOf(' ') + 1;

  return { head: trimmed.slice(0, lastWordStart), last: trimmed.slice(lastWordStart) };
}
