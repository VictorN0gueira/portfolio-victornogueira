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

  it('drops a sentence ending period and a closing parenthesis too', () => {
    const text = `${wordsOfLength(120)} fim (de frase). ${'z'.repeat(40)}`;
    const result = excerptOf(text);

    expect(result.endsWith(`frase${ELLIPSIS}`)).toBe(true);
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
    const text = `${'a'.repeat(100)} ${'b'.repeat(100)}`;

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

    it('cuts the longer ones on a word boundary, as a prefix of the verbatim text', () => {
      const long = testimonials.filter((item) => Array.from(item.text).length > EXCERPT_LIMIT);

      expect(long.length).toBeGreaterThan(0);
      for (const item of long) {
        const result = excerptOf(item.text);
        const body = result.slice(0, -1);

        expect(result.endsWith(ELLIPSIS)).toBe(true);
        expect(item.text.startsWith(body)).toBe(true);
        expect(item.text.charAt(body.length)).toMatch(/[\s,;:.]/);
        expect(Array.from(body).length).toBeLessThanOrEqual(EXCERPT_LIMIT);
      }
    });
  });
});
