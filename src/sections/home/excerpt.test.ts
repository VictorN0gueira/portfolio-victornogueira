import { describe, expect, it } from 'vitest';
import { testimonials } from '../../data/testimonials';
import { EXCERPT_LIMIT, ELLIPSIS, excerptOf } from './excerpt';

/** A text of exactly `length` characters made of 4 letter words and single spaces, ending on a letter. */
function wordsOfLength(length: number): string {
  const text = 'abcd '.repeat(length).slice(0, length);
  return text.endsWith(' ') ? `${text.slice(0, -1)}x` : text;
}

describe('excerptOf', () => {
  it('uses 140 characters and a single ellipsis character', () => {
    expect(EXCERPT_LIMIT).toBe(140);
    expect(ELLIPSIS).toBe('…');
  });

  it('returns the text whole, without the ellipsis, when it has exactly 140 characters', () => {
    const text = wordsOfLength(140);

    expect(text).toHaveLength(140);
    expect(excerptOf(text)).toBe(text);
  });

  it('returns a shorter text whole and an empty text as it is', () => {
    expect(excerptOf('Texto curto.')).toBe('Texto curto.');
    expect(excerptOf('')).toBe('');
  });

  it('cuts a text of 141 characters at the last word and appends the ellipsis', () => {
    const text = wordsOfLength(141);
    const result = excerptOf(text);

    expect(text).toHaveLength(141);
    expect(result.endsWith(ELLIPSIS)).toBe(true);
    expect(result.length).toBeLessThanOrEqual(EXCERPT_LIMIT + 1);
    // The 141st character is a letter of the last word, so that word does not fit and goes.
    expect(result).toBe(`${text.slice(0, text.lastIndexOf(' ', 139))}${ELLIPSIS}`);
  });

  it('never ends in the middle of a word', () => {
    const text = `${'palavra '.repeat(30)}fim`;
    const body = excerptOf(text).slice(0, -1);

    expect(body.length).toBeLessThanOrEqual(EXCERPT_LIMIT);
    expect(body.endsWith('palavra')).toBe(true);
  });

  it('keeps the last word when it ends exactly at character 140 and a space follows', () => {
    const head = wordsOfLength(140);
    const text = `${head} resto do texto`;

    expect(excerptOf(text)).toBe(`${head}${ELLIPSIS}`);
  });

  it('cuts hard at 140 characters when there is no space to cut at', () => {
    const text = 'a'.repeat(300);

    expect(excerptOf(text)).toBe(`${'a'.repeat(140)}${ELLIPSIS}`);
  });

  it('drops the comma that ends the kept words, so the ellipsis never follows a comma', () => {
    // The long last word does not fit: the cut falls after "alpha," and the comma goes with the word that follows.
    const text = `${wordsOfLength(125)} alpha, b${'e'.repeat(50)}`;
    const result = excerptOf(text);

    expect(result.endsWith(`alpha${ELLIPSIS}`)).toBe(true);
    expect(result).not.toMatch(/[,;:.\s]…$/);
  });

  it('drops a run of spaces and a comma that sit right before the cut', () => {
    const text = `${wordsOfLength(120)} fim de frase,   ${'z'.repeat(40)}`;
    const result = excerptOf(text);

    expect(result.endsWith(`frase${ELLIPSIS}`)).toBe(true);
  });

  it('drops a period and a closing parenthesis that sit right before a word cut', () => {
    // No sentence end after the half of the limit: the period is at 18, so the word cut is used.
    const text = `fim (de frase). ${wordsOfLength(125)} ${'z'.repeat(40)}`;
    const result = excerptOf(text);

    expect(result.endsWith(ELLIPSIS)).toBe(true);
    expect(result).not.toMatch(/[,;:.\s]…$/);
  });

  describe('sentence cut', () => {
    const FIRST = `${wordsOfLength(95)}.`;
    const SECOND = `${wordsOfLength(60)}.`;

    it('ends on the last whole sentence inside the limit, with no ellipsis', () => {
      const text = `${FIRST} ${SECOND}`;

      expect(excerptOf(text)).toBe(FIRST);
    });

    it('prefers the later sentence when two fit', () => {
      const short = `${wordsOfLength(40)}.`;
      const text = `${short} ${wordsOfLength(60)}. ${wordsOfLength(80)}.`;

      expect(excerptOf(text)).toBe(`${short} ${wordsOfLength(60)}.`);
    });

    it('keeps the closing quote or parenthesis of the sentence', () => {
      const text = `${wordsOfLength(90)}.") ${wordsOfLength(80)}.`;

      expect(excerptOf(text)).toBe(`${wordsOfLength(90)}.")`);
    });

    it('takes a question mark and an exclamation mark as the end of a sentence', () => {
      expect(excerptOf(`${wordsOfLength(100)}? ${wordsOfLength(80)}.`)).toBe(`${wordsOfLength(100)}?`);
      expect(excerptOf(`${wordsOfLength(100)}! ${wordsOfLength(80)}.`)).toBe(`${wordsOfLength(100)}!`);
    });

    it('does not take the point of a decimal number as the end of a sentence', () => {
      const text = `${wordsOfLength(100)} 3.5 ${wordsOfLength(80)}`;

      expect(excerptOf(text).endsWith(ELLIPSIS)).toBe(true);
    });

    it('falls back to the word cut when the only sentence end is in the first half of the limit', () => {
      const text = `${wordsOfLength(30)}. ${wordsOfLength(200)}`;
      const result = excerptOf(text);

      expect(result.endsWith(ELLIPSIS)).toBe(true);
      expect(result.length).toBeGreaterThan(100);
    });

    it('keeps a sentence of exactly half of the limit (70 of 140 characters), and drops one a character shorter (R8 M14)', () => {
      const half = EXCERPT_LIMIT / 2;
      const atHalf = `${wordsOfLength(half - 1)}.`;
      const belowHalf = `${wordsOfLength(half - 2)}.`;
      const rest = wordsOfLength(200);

      expect(Array.from(atHalf)).toHaveLength(half);
      expect(excerptOf(`${atHalf} ${rest}`)).toBe(atHalf);
      expect(excerptOf(`${belowHalf} ${rest}`).endsWith(ELLIPSIS)).toBe(true);
    });

    it('never ends a cut sentence past the limit by more than its closing marks', () => {
      const text = `${wordsOfLength(139)}. ${wordsOfLength(50)}`;

      expect(Array.from(excerptOf(text)).length).toBeLessThanOrEqual(EXCERPT_LIMIT);
    });
  });

  it('counts accented letters as one character each', () => {
    const word = 'ação';
    const text = `${`${word} `.repeat(40)}fim`;
    const body = excerptOf(text).slice(0, -1);

    expect(Array.from(body).length).toBeLessThanOrEqual(EXCERPT_LIMIT);
    expect(body.endsWith(word)).toBe(true);
    // 28 words of 4 letters and a space are 140 characters: the cut takes them all, not a few less.
    expect(body.split(' ')).toHaveLength(28);
  });

  it('does not split an astral character (emoji) when it has to cut hard', () => {
    const text = '\u{1F600}'.repeat(200);
    const result = excerptOf(text);

    expect(Array.from(result)).toHaveLength(EXCERPT_LIMIT + 1);
    expect(result).toBe(`${'\u{1F600}'.repeat(EXCERPT_LIMIT)}${ELLIPSIS}`);
  });

  it('breaks at a no break space like at a plain one', () => {
    // The character between the two runs is a non-breaking space (U+00A0), written as an escape on purpose: raw, it looks like a plain space.
    const text = `${'a'.repeat(100)}\u00A0${'b'.repeat(100)}`;

    expect(excerptOf(text)).toBe(`${'a'.repeat(100)}${ELLIPSIS}`);
  });

  it('keeps an emoji whole when it has to cut hard in the middle of a run of them', () => {
    // 139 letters and 5 emoji: the limit falls after the first emoji, which stays whole, and the other four go.
    const text = `${'a'.repeat(139)}${'\u{1F600}'.repeat(5)}`;

    expect(excerptOf(text)).toBe(`${'a'.repeat(139)}\u{1F600}${ELLIPSIS}`);
  });

  // The cut only happens at whitespace, on purpose: a token such as 3,5 or NF-e is dropped whole instead of being cut
  // in the middle (3 followed by an ellipsis would change the number, NF- followed by one would break the word).
  it.each([
    ['a decimal number cut at its comma', wordsOfLength(138), '3,5 mais texto'],
    ['a hyphenated word cut after its hyphen', wordsOfLength(136), 'NF-e dos clientes'],
  ])('drops the last token whole when the limit falls inside %s', (_label, filler, rest) => {
    expect(excerptOf(`${filler} ${rest}`)).toBe(`${filler}${ELLIPSIS}`);
  });

  it('accepts another limit', () => {
    expect(excerptOf('um dois tres quatro cinco', 10)).toBe(`um dois${ELLIPSIS}`);
    expect(excerptOf('um dois tres', 12)).toBe('um dois tres');
  });

  describe('with the real testimonials', () => {
    it('shows a text of 140 characters or fewer whole', () => {
      const short = testimonials.filter((item) => Array.from(item.text).length <= EXCERPT_LIMIT);

      expect(short.length).toBeGreaterThan(0);
      for (const item of short) expect(excerptOf(item.text)).toBe(item.text);
    });

    it('cuts the longer ones on a sentence or a word boundary, as a prefix of the verbatim text', () => {
      const long = testimonials.filter((item) => Array.from(item.text).length > EXCERPT_LIMIT);

      expect(long.length).toBeGreaterThan(0);
      for (const item of long) {
        const result = excerptOf(item.text);
        const isSentenceCut = !result.endsWith(ELLIPSIS);
        const body = isSentenceCut ? result : result.slice(0, -1);

        expect(item.text.startsWith(body)).toBe(true);
        expect(item.text.charAt(body.length)).toMatch(/[\s,;:.]/);
        expect(Array.from(body).length).toBeLessThanOrEqual(EXCERPT_LIMIT);
      }
    });

    it('never leaves an ellipsis in the middle of a sentence when the card has a whole sentence to show (V:D4)', () => {
      for (const item of testimonials) {
        const result = excerptOf(item.text);

        if (result.endsWith(ELLIPSIS)) continue;
        expect(result).toMatch(/[.!?]["')\]]*$/);
      }
    });
  });
});
