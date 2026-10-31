import { describe, expect, it } from 'vitest';
import { faqs } from '../data/faqs';
import { buildFaqJsonLd } from './faqJsonLd';
import { serializeJsonLd } from './jsonLd';

const BREAKOUT = '</script><img src=x onerror=alert(1)>';

describe('serializeJsonLd', () => {
  it('writes no "<" at all, so no string can close the script element', () => {
    const text = serializeJsonLd({ answer: BREAKOUT, nested: [{ comment: '<!-- x -->' }] });

    expect(text).not.toContain('<');
    expect(text).toContain('\\u003c/script>');
  });

  it('reads back as the same value', () => {
    const value = { answer: BREAKOUT, list: ['a<b', 'c'], count: 2, flag: true, nothing: null };

    expect(JSON.parse(serializeJsonLd(value))).toEqual(value);
  });

  it('escapes the line and paragraph separators, which older script parsers read as line ends', () => {
    const text = serializeJsonLd({ text: 'one\u2028two\u2029three' });

    expect(text).not.toMatch(/[\u2028\u2029]/);
    expect(text).toContain('\\u2028');
    expect(text).toContain('\\u2029');
    expect(JSON.parse(text)).toEqual({ text: 'one\u2028two\u2029three' });
  });

  it('leaves a plain schema exactly as JSON.stringify writes it', () => {
    const schema = buildFaqJsonLd(faqs);

    expect(serializeJsonLd(schema)).toBe(JSON.stringify(schema));
  });

  it('serialises an FAQ answer that carries markup with no "<"', () => {
    const [first] = faqs;
    const text = serializeJsonLd(buildFaqJsonLd([{ ...first, answer: BREAKOUT }]));

    expect(text).not.toContain('<');
    expect(JSON.parse(text).mainEntity[0].acceptedAnswer.text).toBe(BREAKOUT);
  });
});
